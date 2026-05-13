import { Router } from "express"
import { OAuth2Client } from "google-auth-library"
import { UserController } from "server/features/users/controller/controller"
import { generateTokenPair } from "server/auth/token/token-service"

const router = Router()
const userController = new UserController()

const webClientId = process.env.GOOGLE_WEB_CLIENT_ID
const client = new OAuth2Client(webClientId)

async function verifyGoogleToken(idToken: string) {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: webClientId,
        })
        return ticket.getPayload()
    } catch (error) {
        console.error("Error verifying Google ID token:", error)
        return null
    }
}

router.post("/verify-google-id-token", async (req, res) => {
    const { idToken, firstName, lastName } = req.body

    const googlePayload = await verifyGoogleToken(idToken)
    if (!googlePayload) {
        return res.status(401).json({ success: false, message: "Google token verification failed" })
    }

    try {
        const email = googlePayload.email
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in Google token" })
        }

        let user = await userController.getUserByEmail(email)

        if (!user) {
            user = await userController.createUserWithAuthService({
                email,
                firstName: firstName ?? googlePayload.given_name ?? "",
                lastName: lastName ?? googlePayload.family_name ?? "",
                registrationType: "google_service",
            })
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: "Account is disabled" })
        }

        const { token, refreshToken } = generateTokenPair({ id: user.id, email: user.email })
        await userController.updateUserLastLogin(user.id)

        const { password, resetToken, registrationType, ...userResponse } = user
        return res.status(200).json({
            success: true,
            message: "Google sign-in successful",
            user: userResponse,
            token,
            refreshToken,
        })
    } catch (error) {
        console.error("Google sign-in error:", error)
        return res.status(500).json({ success: false, message: "Google sign-in failed" })
    }
})

export default router
