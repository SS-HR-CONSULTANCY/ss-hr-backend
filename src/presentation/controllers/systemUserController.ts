import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SystemUserModel } from "../../infrastructure/database/systemUser/systemUserModel";

export const systemUserController = {
  getUsers: async (req: Request, res: Response) => {
    try {
      const users = await SystemUserModel.find({}).select('-password');
      res.status(200).json({ success: true, data: users });
    } catch (error: any) {
      console.error("Error getting system users:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  createUser: async (req: Request, res: Response) => {
    try {
      const { username, password, fullName, role, permissions } = req.body;

      if (!username || !password || !fullName || !role) {
        res.status(400).json({ success: false, message: "Missing required fields" });
        return;
      }

      const existingUser = await SystemUserModel.findOne({ username });
      if (existingUser) {
        res.status(400).json({ success: false, message: "Username already exists" });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await SystemUserModel.create({
        username,
        password: hashedPassword,
        fullName,
        role,
        permissions: permissions || [],
      });

      const userObject = newUser.toObject();
      delete userObject.password;

      res.status(201).json({ success: true, data: userObject, message: "User created successfully" });
    } catch (error: any) {
      console.error("Error creating system user:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  updateUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fullName, role, permissions, password } = req.body;

      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (role) updateData.role = role;
      if (permissions) updateData.permissions = permissions;

      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const updatedUser = await SystemUserModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).select('-password');

      if (!updatedUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.status(200).json({ success: true, data: updatedUser, message: "User updated successfully" });
    } catch (error: any) {
      console.error("Error updating system user:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedUser = await SystemUserModel.findByIdAndDelete(id);

      if (!deletedUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting system user:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};
