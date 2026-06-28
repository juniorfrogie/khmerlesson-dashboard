import jwt, { JwtPayload } from "jsonwebtoken"
import { AppStoreServerAPIClient, Environment, OfferType, SignedDataVerifier } from "@apple/app-store-server-library"

const { NODE_ENV,
    APPLE_ISSUER_ID,
    APPLE_KEY_ID,
    BUNDLE_ID,
    APPLE_ROOT_CA_BASE64,
    APPLE_PRIVATE_KEY_BASE64,
    APP_APPLE_ID } = process.env
const ENVIRONMENT = NODE_ENV === "development" ? Environment.SANDBOX : Environment.PRODUCTION
const PRIVATE_KEY = Buffer.from(APPLE_PRIVATE_KEY_BASE64 ?? "", "base64").toString("utf-8")

const client = new AppStoreServerAPIClient(PRIVATE_KEY,
    APPLE_KEY_ID as string,
    BUNDLE_ID as string,
    APPLE_ISSUER_ID as string,
    ENVIRONMENT
)

// Brief in-memory cache of recently verified transaction IDs (5 min TTL).
const verifiedCache = new Map<string, number>()

export const markVerified = (transactionId: string): void => {
    verifiedCache.set(transactionId, Date.now() + 5 * 60 * 1000)
}

export const isTransactionVerified = (transactionId: string): boolean => {
    const expiry = verifiedCache.get(transactionId)
    if (!expiry) return false
    if (Date.now() > expiry) {
        verifiedCache.delete(transactionId)
        return false
    }
    return true
}

export const decodeJWSPayload = (jws: string): JwtPayload | null => {
    const decoded = jwt.decode(jws, { complete: true })
    return (decoded?.payload as JwtPayload) ?? null
}

export interface VerifyResult {
    ok: boolean
    reason: string
    // Populated on success for subscription processing
    productId?: string
    originalTransactionId?: string
    transactionId?: string
    expiresDate?: Date
    isIntroductoryOffer?: boolean  // offerType === INTRODUCTORY_OFFER (1) — covers free trials
}

const loadRootCAs = () => {
    const decoded = Buffer.from(APPLE_ROOT_CA_BASE64 as string, "base64")
    return [decoded]
}

export const verifySubscription = async (jws: string): Promise<VerifyResult> => {
    const payload = decodeJWSPayload(jws)
    if (!payload) {
        return { ok: false, reason: "JWS could not be decoded — not a valid JWT" }
    }

    const { transactionId, originalTransactionId, environment, type, bundleId, productId,
        expiresDate, offerType } = payload

    const successFields = {
        productId: productId as string,
        originalTransactionId: (originalTransactionId ?? transactionId) as string,
        transactionId: transactionId as string,
        expiresDate: expiresDate ? new Date(expiresDate as number) : undefined,
        isIntroductoryOffer: offerType === 1,
    }

    // Xcode simulator: trust JWS payload directly — Apple's API returns 404 for simulator transactions.
    if (environment === "Xcode") {
        if (type !== "Auto-Renewable Subscription") {
            return { ok: false, reason: `Xcode: expected type "Auto-Renewable Subscription", got "${type}"` }
        }
        if (bundleId !== BUNDLE_ID) {
            return { ok: false, reason: `Xcode: bundleId mismatch — got "${bundleId}", expected "${BUNDLE_ID}"` }
        }
        return { ok: true, reason: "Xcode environment — JWS payload accepted without Apple API call", ...successFields }
    }

    try {
        const transactionResponse = await client.getTransactionInfo(transactionId)
        const signedTransactionInfo = transactionResponse.signedTransactionInfo
        if (!signedTransactionInfo) {
            return { ok: false, reason: "Apple API returned no signedTransactionInfo" }
        }

        const isProduction = NODE_ENV === "production"
        const appleRootCAs = isProduction ? loadRootCAs() : []
        const appAppleId = isProduction ? parseInt(APP_APPLE_ID as string) : undefined

        const verifier = new SignedDataVerifier(appleRootCAs, isProduction, ENVIRONMENT, BUNDLE_ID as string, appAppleId)
        const transaction = await verifier.verifyAndDecodeTransaction(signedTransactionInfo)

        if (transaction.type !== "Auto-Renewable Subscription") {
            return { ok: false, reason: `Apple: expected type "Auto-Renewable Subscription", got "${transaction.type}"` }
        }
        if (transaction.bundleId !== BUNDLE_ID) {
            return { ok: false, reason: `Apple: bundleId mismatch — got "${transaction.bundleId}", expected "${BUNDLE_ID}"` }
        }

        return {
            ok: true,
            reason: "Apple verification passed",
            productId: transaction.productId,
            originalTransactionId: (transaction.originalTransactionId ?? transaction.transactionId) as string,
            transactionId: transaction.transactionId as string,
            expiresDate: transaction.expiresDate ? new Date(transaction.expiresDate as number) : undefined,
            isIntroductoryOffer: transaction.offerType === OfferType.INTRODUCTORY_OFFER,
        }
    } catch (err: any) {
        return { ok: false, reason: `Apple API error: ${err?.message ?? err}` }
    }
}
