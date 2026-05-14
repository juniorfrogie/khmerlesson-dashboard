import jwt, { JwtPayload } from "jsonwebtoken"
import { AppStoreServerAPIClient, Environment, SignedDataVerifier } from "@apple/app-store-server-library"

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
// Lets purchase-history skip the second Apple API call when verify-purchase ran moments earlier.
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
}

const loadRootCAs = () => {
    const decoded = Buffer.from(APPLE_ROOT_CA_BASE64 as string, "base64")
    return [decoded]
}

export const verifyPurchase = async (jws: string, expectedProductId?: string): Promise<VerifyResult> => {
    const payload = decodeJWSPayload(jws)
    if (!payload) {
        return { ok: false, reason: "JWS could not be decoded — not a valid JWT" }
    }

    const { transactionId, environment, type, bundleId, productId } = payload

    // Xcode simulator always uses transactionId "0"; Apple's API returns 404 for it.
    // Trust the JWS payload structure directly — no remote verification possible.
    if (environment === "Xcode") {
        if (type !== "Non-Consumable") {
            return { ok: false, reason: `Xcode: expected type "Non-Consumable", got "${type}"` }
        }
        if (bundleId !== BUNDLE_ID) {
            return { ok: false, reason: `Xcode: bundleId mismatch — got "${bundleId}", expected "${BUNDLE_ID}"` }
        }
        if (expectedProductId && productId !== expectedProductId) {
            return { ok: false, reason: `Xcode: productId mismatch — got "${productId}", expected "${expectedProductId}"` }
        }
        return { ok: true, reason: "Xcode environment — JWS payload accepted without Apple API call" }
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

        if (transaction.type !== "Non-Consumable") {
            return { ok: false, reason: `Apple: expected type "Non-Consumable", got "${transaction.type}"` }
        }
        if (transaction.bundleId !== BUNDLE_ID) {
            return { ok: false, reason: `Apple: bundleId mismatch — got "${transaction.bundleId}", expected "${BUNDLE_ID}"` }
        }
        if (expectedProductId && transaction.productId !== expectedProductId) {
            return { ok: false, reason: `Apple: productId mismatch — got "${transaction.productId}", expected "${expectedProductId}"` }
        }
        return { ok: true, reason: "Apple verification passed" }
    } catch (err: any) {
        return { ok: false, reason: `Apple API error: ${err?.message ?? err}` }
    }
}
