import jwt from "jsonwebtoken"
import crypto from "crypto"

async function getAppleSigningKeys() {
    const response = await fetch('https://appleid.apple.com/auth/keys')
    if (!response.ok) {
        throw new Error('Failed to fetch Apple signing keys.')
    }
    const { keys } = await response.json()
    return keys
}

export async function verifyAppleToken(idToken: string) {
    try{
        const decodedToken = jwt.decode(idToken, { complete: true })
        if(!decodedToken){
            throw new Error('Failed to decode Apple token.')
        }
        const kid = decodedToken.header.kid

        const appleKeys = await getAppleSigningKeys()
        const signingKey = appleKeys.find((key: { kid: string | undefined }) => key.kid === kid)
        if (!signingKey) {
            throw new Error('Apple signing key not found for the given KID.');
        }

        const publicKey = crypto.createPublicKey({ key: signingKey, format: 'jwk' });
        const verifiedPayload = jwt.verify(idToken, publicKey, {
            algorithms: ['RS256'],
            audience: process.env.APPLE_ID,
            issuer: 'https://appleid.apple.com'
        })
        return verifiedPayload
    }catch(error){
        console.error('Error verifying Apple ID token:', error)
        return null // Token verification failed
    }
}