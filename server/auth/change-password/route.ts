import { Router } from "express";
import { UserController } from "server/features/users/controller/controller";

const router = Router()
const controller = new UserController()

router.put('/', async (req: any, res: any) => {
    try{
      // Security fix: use req.user.id (from JWT) instead of req.body.id.
      // Previously an authenticated user could change any other user's password
      // by sending a different 'id' in the request body.
      const id = req.user?.id
      if (!id) {
        return res.status(401).json({ message: 'Unauthorized: no user session' })
      }

      const { currentPassword, newPassword, confirmPassword } = req.body
  
      if(newPassword !== confirmPassword){
        return res.status(403).json({message: 'Password does not match!'})
      }
  
      const user = await controller.changePassword(id, currentPassword, newPassword)
      if (user) {
        res.status(200).json({message: 'Password updated successfully'});
      } else {
        res.status(404).json({message: 'User not found'})
      }
    }catch(error){
      console.error("Change password error:", error);
      res.status(500).send('Failed to change password')
    }
});

export default router;