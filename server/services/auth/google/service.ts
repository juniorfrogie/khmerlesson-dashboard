import { OAuth2Client } from "google-auth-library"

const webClientId = process.env.GOOGLE_WEB_CLIENT_ID
const client = new OAuth2Client(webClientId)

async function verifyGoogleToken(idToken: string) {
    try {
        const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: webClientId // Specify the client ID of the app that accesses the backend
    });
        const payload = ticket.getPayload()
        return payload
    } catch (error) {
        console.error('Error verifying Google ID token:', error)
        return null // Token verification failed
    }
}