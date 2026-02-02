import { forgotPasswordSchema } from "@shared/schema";
import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";
import { mailTemplate } from "server/mail/mail_template";
import { z } from "zod"
import crypto from "crypto"
import nodemailer from "nodemailer"

const router = Router()
const controller = new UserController()

router.post('/forgot-password', async (req, res) => {
    try{
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await controller.getUserByEmail(email)
  
      // Check if the email exists in your user database
      if (user) {
        if (!user.isActive) {
          return res.status(401).json({ message: "Account is disabled" })
        }
        if(user.registrationType !== "authenication"){
          return res.status(401).json({ message: "Invalid email" });
        }
        // Generate a reset token
        const token = crypto.randomBytes(20).toString('hex');
        // Store the token with the user's email in a database or in-memory store
        await controller.updateUserResetToken(email, token)
        // Send the reset token to the user's email
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: parseInt(process.env.MAIL_PORT?.toString() ?? "465"),
          auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
          }
        });
  
        const resetPasswordLink = req.protocol + '://' + req.get('host') + `/reset-password/${token}`
  
        const mailOptions = {
          from: process.env.MAIL_USERNAME,
          to: email,
          subject: 'Password Reset',
          //text: `Click the following link to reset your password: ${resetPasswordLink}`,
          html: mailTemplate(user.firstName ?? "", resetPasswordLink)
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            res.status(500).json({message: 'Error sending email'});
          } else {
            console.log(`Email sent: ${info.response}`);
            res.status(200).json({message: 'Check your email for instructions on resetting your password'});
          }
        });
      } else {
        res.status(404).json({message: "Email not found!"});
      }
    }catch(error){
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Forgot pasword error:", error);
      res.status(500).json({ message: "Failed to forgot password" });
    }
});

export default router;