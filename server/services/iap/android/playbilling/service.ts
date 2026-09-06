import { GoogleAuth } from "google-auth-library"

const { GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON } = process.env

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher"

// Same shape as server/services/iap/ios/storekit2/service.ts's VerifyResult —
// server/api.ts's subscription route treats both platforms' results
// identically once verification returns.
export interface VerifyResult {
    ok: boolean
    reason: string
    productId?: string
    originalTransactionId?: string
    transactionId?: string
    expiresDate?: Date
    isIntroductoryOffer?: boolean
}

// https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
// (V2 — the API Google currently recommends; the older purchases.subscriptions.get is deprecated)
interface SubscriptionPurchaseV2 {
    subscriptionState?: string
    latestOrderId?: string
    acknowledgementState?: string
    lineItems?: Array<{
        productId?: string
        expiryTime?: string
        // Oneof — populated with whichever phase is currently active.
        // freeTrial's presence is the only reliable trial signal; there is no
        // separate boolean/enum field for it (confirmed against the current
        // API reference — unlike Apple's explicit offerType).
        offerPhase?: {
            freeTrial?: Record<string, unknown>
            introductoryPrice?: Record<string, unknown>
            basePrice?: Record<string, unknown>
            prorationPeriod?: Record<string, unknown>
        }
    }>
}

// Constructed lazily, not at module load — these env vars don't exist yet
// (see khmerlesson-app/context/progress-tracker.md's "Credentials /
// Configuration Needed From User" table: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
// needs a Play Console app + service account created first). Throwing at
// import time would crash the whole server on every deploy until then.
let cachedAuth: GoogleAuth | null = null
const getAuth = (): GoogleAuth => {
    if (cachedAuth) return cachedAuth
    if (!GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
        throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured")
    }
    // Same base64-encoded-JSON-blob-in-an-env-var convention as
    // APPLE_PRIVATE_KEY_BASE64 in the iOS service, rather than a file path —
    // this app has no persistent local filesystem to read a key file from in
    // production (DigitalOcean).
    const credentials = JSON.parse(Buffer.from(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, "base64").toString("utf-8"))
    cachedAuth = new GoogleAuth({ credentials, scopes: [ANDROID_PUBLISHER_SCOPE] })
    return cachedAuth
}

export const verifySubscription = async (purchaseToken: string, productId: string): Promise<VerifyResult> => {
    if (!GOOGLE_PLAY_PACKAGE_NAME) {
        return { ok: false, reason: "GOOGLE_PLAY_PACKAGE_NAME is not configured" }
    }

    let accessToken: string | null | undefined
    try {
        accessToken = await getAuth().getAccessToken()
    } catch (err: any) {
        return { ok: false, reason: `Google Play credentials not configured: ${err?.message ?? err}` }
    }
    if (!accessToken) {
        return { ok: false, reason: "Google Play credentials did not yield an access token" }
    }

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PLAY_PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) {
            const body = await response.text()
            console.error("[IAP][Android] Play Developer API error:", {
                status: response.status,
                body,
                packageName: GOOGLE_PLAY_PACKAGE_NAME,
            })
            return { ok: false, reason: `Play Developer API error: ${response.status}` }
        }

        const purchase = await response.json() as SubscriptionPurchaseV2

        // UNSPECIFIED is the one state meaning the token itself didn't
        // resolve to a real purchase. Every other state (including
        // CANCELED/EXPIRED/ON_HOLD) is reported as-is — same pattern as the
        // iOS service, which never hard-fails on Apple's own "already
        // expired" transactions either. The actual access cutoff happens one
        // layer up, via currentPeriodEndsAt (server/api.ts /
        // getActiveSubscription), not here.
        if (!purchase.subscriptionState || purchase.subscriptionState === "SUBSCRIPTION_STATE_UNSPECIFIED") {
            return { ok: false, reason: `Play: unexpected subscriptionState "${purchase.subscriptionState}"` }
        }

        // A purchase can carry more than one line item (e.g. mid-upgrade) —
        // match the plan the client actually says it bought rather than
        // assuming lineItems[0].
        const lineItem = purchase.lineItems?.find(item => item.productId === productId) ?? purchase.lineItems?.[0]
        if (!lineItem) {
            return { ok: false, reason: "Play: subscription purchase has no lineItems" }
        }
        if (lineItem.productId !== productId) {
            return { ok: false, reason: `Play: productId mismatch — got "${lineItem.productId}", expected "${productId}"` }
        }

        return {
            ok: true,
            reason: "Play verification passed",
            productId: lineItem.productId,
            // Play has no Apple-style original-vs-current transaction pair —
            // the purchaseToken itself is the stable identifier for a
            // subscription's lifetime (it changes only on an upgrade/
            // downgrade or a fresh resubscribe, exactly the "new chain" case
            // the subscriptions table's originalTransactionId uniqueness
            // constraint is meant to catch). latestOrderId is the closest
            // analogue to Apple's per-renewal transactionId.
            originalTransactionId: purchaseToken,
            transactionId: purchase.latestOrderId ?? purchaseToken,
            expiresDate: lineItem.expiryTime ? new Date(lineItem.expiryTime) : undefined,
            isIntroductoryOffer: !!lineItem.offerPhase?.freeTrial,
        }
    } catch (err: any) {
        console.error("[IAP][Android] verifySubscription error:", {
            message: err?.message,
            packageName: GOOGLE_PLAY_PACKAGE_NAME,
        })
        return { ok: false, reason: `Play API error: ${err?.message ?? err}` }
    }
}
