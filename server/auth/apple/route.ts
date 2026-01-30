import { Router } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import crypto from "crypto"

const router = Router()

export async function getAppleSigningKeys() {
    const response = await fetch('https://appleid.apple.com/auth/keys')
    if (!response.ok) {
        throw new Error('Failed to fetch Apple signing keys.')
    }
    const { keys } = await response.json()
    return keys
}

async function verifyAppleToken(idToken: string) {
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

router.post("/verify-apple-id-token", async (req, res) => {
    const { idToken } = req.body
    const verifedPayload = await verifyAppleToken(idToken)
    
    if (verifedPayload) {
        // Token is valid, proceed with user authentication or registration
        const payload = (verifedPayload as JwtPayload)
        const user = {
            email: payload["email"]
        }
        res.status(200).json({success: true, message: 'Apple token verified successfully', user: user})
    } else {
        // Token is invalid
        res.status(401).json({success: false, message: 'Apple token verification failed'})
    }
})

export default router