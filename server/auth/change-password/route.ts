import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";

const router = Router()
const controller = new UserController()

router.put('/', async (req: any, res: any) => {
    try{
      const { id, currentPassword, newPassword, confirmPassword } = req.body
  
      if(newPassword !== confirmPassword){
        return res.status(403).json({message: 'Password does not match!'})
      }
  
      // Find the user with the given id and update their password
      // const user = await storage.getUserByResetToken(token)
      // if (user) {
      //   await storage.changePassword()
      //   res.status(200).send('Password updated successfully');
      // } else {
      //   res.status(404).send('User not found')
      // }

      const user = await controller.changePassword(id, currentPassword, newPassword)
      if (user) {
        res.status(200).json({message: 'Password updated successfully'});
      } else {
        res.status(404).json({message: 'User not found'})
      }
    }catch(error){
      console.error("Change pasword error:", error);
      res.status(500).send('Failed to change password')
    }
});

export default router;