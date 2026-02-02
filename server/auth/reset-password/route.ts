import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";

const router = Router()
const controller = new UserController()

router.post('/reset-password', async (req: any, res: any) => {
    try{
      const { token, password, confirmPassword } = req.body
  
      if(password !== confirmPassword){
        res.status(403).send('Password does not match!')
        return
      }
  
      // Find the user with the given token and update their password
      const user = await controller.getUserByResetToken(token)
      if (user) {
        await controller.updatePassword(user.id, password)
        //user.password = password;
        //delete user.resetToken; // Remove the reset token after the password is updated
        res.status(200).send('Password updated successfully');
      } else {
        res.status(404).send('Invalid or expired token')
      }
    }catch(error){
      console.error("Reset pasword error:", error);
      res.status(500).send('Failed to reset password')
    }
});

export default router;