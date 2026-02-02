import { InsertUser, InsertUserWithAuthService, UpdateUser, User, users } from "@shared/schema";
import { and, eq, not } from "drizzle-orm";
import { db } from "server/db";
import bcrypt from "bcryptjs";
import generatorPassword from "generate-password"

export class UserController{
    // static instance: UserController | null = null;
    // constructor(){
    //     if(UserController.instance){
    //         return UserController.instance;
    //     }
    //     UserController.instance = this;
    // }

    async getAllUsers(): Promise<User[]> {
        const result = await db.select()
            .from(users)
            .orderBy(users.createdAt);
        return result;
    }

    async getUsersPageData(limit: number, offset: number): Promise<User[]> {
        const result = await db.select()
            .from(users)
            .limit(limit)
            .offset(offset)
            .orderBy(users.createdAt);
        return result;
    }
    
    async getUserCount(): Promise<number> {
        const result = await db.$count(users)
        return result
    }
    
    async getUserByEmail(email: string): Promise<User | undefined> {
        const [user] = await db.select()
            .from(users)
            .where(and(eq(users.email, email), not(eq(users.role, "admin"))));
        return user;
    }
    
    async getUserById(id: number): Promise<User | undefined> {
        const [user] = await db.select()
            .from(users)
            .where(eq(users.id, id));
        return user;
    }
    
    async getUserByResetToken(resetToken: string): Promise<User | undefined> {
        const [user] = await db.select()
            .from(users)
            .where(eq(users.resetToken, resetToken));
        return user;
    }
    
    async createUser(insertUser: InsertUser): Promise<User> {
        // Hash the password before storing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
        
        const userToInsert = {
          ...insertUser,
          password: hashedPassword,
        };
    
        const [user] = await db.insert(users).values(userToInsert).returning();
        return user;
    }
    
    async createUserWithAuthService(insertUser: InsertUserWithAuthService): Promise<User> {
        const password = generatorPassword.generate({
          length: 12,
          uppercase: true,
          lowercase: true,
          symbols: true
        })
    
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userToInsert = {
          ...insertUser,
          password: hashedPassword
        };
    
        const [user] = await db.insert(users).values(userToInsert).returning();
        return user;
    }
    
      async updateUser(id: number, updateUser: UpdateUser): Promise<User | undefined> {
        const [user] = await db
          .update(users)
          .set({ ...updateUser, updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning();
        return user;
      }
    
    async updateUserResetToken(email: string, resetToken: string): Promise<User | undefined> {
        const [user] = await db
          .update(users)
          .set({ resetToken: resetToken, updatedAt: new Date() })
          .where(eq(users.email, email))
          .returning();
        return user;
    }
    
    async updateUserLastLogin(id: number): Promise<User | undefined> {
        const [user] = await db
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, id))
            .returning();
        return user;
    }

    async deleteUser(id: number): Promise<boolean> {
        const result = await db.delete(users).where(eq(users.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    
    async verifyPassword(email: string, password: string): Promise<User | null> {
        const user = await this.getUserByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? user : null;
    }

    async loginByAdmin(email: string, password: string): Promise<User | null> {
        const [user] = await db.select()
            .from(users)
            .where(and(eq(users.email, email), eq(users.role, "admin")));
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? user : null;
    }
    
    async updatePassword(id: number, password: string): Promise<User | null> {
        // Hash the password before storing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [user] = await db
            .update(users)
            .set({ password: hashedPassword, resetToken: null, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();
        return user;
    }
    
    async changePassword(id: number, currentPassword: string, newPassword: string): Promise<User | null> {
        //const currentUser = await this.getUserById(id)
        const [currentUser] = await db.select({
            password: users.password
        }).from(users).where(eq(users.id, id))
        if(!currentUser) return null

        const isValid = await bcrypt.compare(currentPassword, currentUser.password);
        if(!isValid) return null

        // Hash the password before storing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const [user] = await db
            .update(users)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();
        return user;
    }
}

// const instance = new UserController();
// Object.freeze(instance);
// export default instance;