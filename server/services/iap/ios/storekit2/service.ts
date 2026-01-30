import jwt, { JwtHeader, JwtPayload } from "jsonwebtoken"
import { AppStoreServerAPIClient, Environment, SignedDataVerifier } from "@apple/app-store-server-library"

const { NODE_ENV, 
    APPLE_ISSUER_ID, 
    APPLE_KEY_ID, 
    BUNDLE_ID, 
    PRODUCT_ID,
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

const createAppleSignedJWT = () => {

    const now = Math.floor(Date.now() / 1000); // Issued At
    const expiration = now + 1800; // Expire in 1h:30
    const token = jwt.sign({
        iss: APPLE_ISSUER_ID,
        aud: "appstoreconnect-v1",
        iat: now,
        exp: expiration,
        bid: BUNDLE_ID
    }, PRIVATE_KEY, {
        algorithm: "ES256",
        header: {
            kid: APPLE_KEY_ID,
            typ: "JWT"
        } as JwtHeader
    })
    return token
}

export const verifyTransaction = async (jws: string) => {
    try{
        const token = createAppleSignedJWT()
        const data = await getTransactionInfo(token, "0")
        return data
    }catch(error: any){
        console.error('Verication Failed:', error.message)
    }
}

const loadRootCAs = () => {    
    const decoded = Buffer.from(APPLE_ROOT_CA_BASE64 as string, "base64")
    return [decoded]
}

export const verifyPurchase = async (jws: string) => {
    const decoded = jwt.decode(jws, { complete: true })
    const payload = decoded?.payload as JwtPayload
    const transactionId = payload.transactionId

    try{
        const transactionResponse = await client.getTransactionInfo(transactionId)
        const signedTransactionInfo = transactionResponse.signedTransactionInfo
        if(!signedTransactionInfo){
            throw new Error("Invalid signed transaction.")
        }

        const isProduction = NODE_ENV === "production"
        const appleRootCAs = isProduction ? loadRootCAs() : []
        const appAppleId = isProduction ? parseInt(APP_APPLE_ID as string) : undefined

        const verifier = new SignedDataVerifier(appleRootCAs, isProduction, ENVIRONMENT, BUNDLE_ID as string, appAppleId)
        const transaction = await verifier.verifyAndDecodeTransaction(signedTransactionInfo)
        return transaction.type === "Non-Consumable"
            && transaction.bundleId === BUNDLE_ID 
            && transaction.productId === PRODUCT_ID
    }catch(err){
        console.error(err)
    }
}

const getTransactionInfo = async (token: string, transactionId: string) => {
    try{
        const BASE_URL = NODE_ENV === "development" ? "https://api.storekit-sandbox.itunes.apple.com" 
            : "https://api.storekit.itunes.apple.com"; 
        const response = await fetch(`${BASE_URL}/inApps/v1/transactions/${transactionId}`, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        if(response.status !== 200) throw new Error("Error during get transaction history.")
        return await response.json()
    }catch(error: any){
        console.error('Get transaction history Failed:', error.message)
    }
}