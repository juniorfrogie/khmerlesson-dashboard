// import { Router } from "express"
// import { OAuth2Client } from "google-auth-library"

// const router = Router()

// const webClientId = process.env.GOOGLE_WEB_CLIENT_ID
// const client = new OAuth2Client(webClientId)

// async function verifyGoogleToken(idToken: string) {
//     try {
//         const ticket = await client.verifyIdToken({
//         idToken: idToken,
//         audience: webClientId // Specify the client ID of the app that accesses the backend
//     });
//         const payload = ticket.getPayload()
//         return payload
//     } catch (error) {
//         console.error('Error verifying Google ID token:', error)
//         return null // Token verification failed
//     }
// }

// router.post("/auth/verify-google-id-token", async (req, res) => {
//     const { idToken } = req.body
//     const userData = await verifyGoogleToken(idToken)

//     if (userData) {
//         // Token is valid, proceed with user authentication or registration
//         res.status(200).json({ message: 'Google token verified successfully', user: userData })
//     } else {
//         // Token is invalid
//         res.status(401).json({ message: 'Google token verification failed' })
//     }
// })

// export default router