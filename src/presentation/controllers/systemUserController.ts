import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  SystemUserModel,
  computeIsOnline,
  getCompletedMsForDay,
  getIstDayStart,
  hasOpenSession,
} from "../../infrastructure/database/systemUser/systemUserModel";
import { StaffAuthLogModel } from "../../infrastructure/database/systemUser/staffAuthLogModel";

export const systemUserController = {
  // Called periodically by the logged-in admin/staff dashboard to mark the user as online.
  // Also returns today's logged-in time so the dashboard can show a running timer.
  heartbeat: async (req: Request, res: Response) => {
    try {
      const { userId, role } = req.user || ({} as any);
      const now = new Date();
      if (!(role === "admin" || role === "staff") || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(200).json({ success: true, data: { todayCompletedMs: 0, currentSessionStart: null, serverNow: now } });
        return;
      }

      const user = await SystemUserModel.findByIdAndUpdate(
        userId,
        { $set: { lastSeenAt: now, isOnline: true } },
        { new: true }
      ).lean();

      // Time from today's earlier sessions (kept on the user record by login/logout).
      const todayCompletedMs = user ? getCompletedMsForDay(user, now) : 0;

      // Current open session, clipped to today.
      let currentSessionStart: Date | null = null;
      if (user && hasOpenSession(user)) {
        const todayStart = getIstDayStart(now);
        const loginAt = new Date(user.lastLoginAt as Date);
        currentSessionStart = loginAt > todayStart ? loginAt : todayStart;
      }

      res.status(200).json({
        success: true,
        data: { todayCompletedMs, currentSessionStart, serverNow: now },
      });
    } catch (error: any) {
      console.error("Error recording heartbeat:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getUsers: async (req: Request, res: Response) => {
    try {
      const users = await SystemUserModel.find({}).select('-password').lean();
      const now = new Date();
      const data = users.map((u: any) => ({ ...u, isOnline: computeIsOnline(u, now) }));
      res.status(200).json({ success: true, data });
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

  getAuthLogs: async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const userId = (req.query.userId as string) || "all";
      const action = (req.query.action as string) || "all";
      const date = (req.query.date as string) || "";

      const query: any = {};

      if (userId && userId !== "all") {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          query.userId = new mongoose.Types.ObjectId(userId);
        } else {
          query.username = userId;
        }
      }

      if (action && (action === "LOGIN" || action === "LOGOUT")) {
        query.action = action;
      }

      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split("-").map(Number);
        // IST day boundaries (UTC+5:30)
        const istStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
        const istEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);
        query.createdAt = { $gte: istStart, $lte: istEnd };
      }

      // Compute IST start/end of today for today's login counts
      const now = new Date();
      const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const todayYear = istNow.getUTCFullYear();
      const todayMonth = istNow.getUTCMonth();
      const todayDay = istNow.getUTCDate();
      const todayStart = new Date(Date.UTC(todayYear, todayMonth, todayDay, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
      const todayEnd = new Date(Date.UTC(todayYear, todayMonth, todayDay, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);

      const [logs, total, allUsers, todayLoginAgg, totalLoginAgg] = await Promise.all([
        StaffAuthLogModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        StaffAuthLogModel.countDocuments(query),
        SystemUserModel.find({}).select("-password").lean(),
        StaffAuthLogModel.aggregate([
          {
            $match: {
              action: "LOGIN",
              createdAt: { $gte: todayStart, $lte: todayEnd },
            },
          },
          {
            $group: {
              _id: "$userId",
              count: { $sum: 1 },
            },
          },
        ]),
        StaffAuthLogModel.aggregate([
          {
            $match: { action: "LOGIN" },
          },
          {
            $group: {
              _id: "$userId",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const todayCountMap = new Map<string, number>();
      todayLoginAgg.forEach((row: any) => {
        if (row._id) todayCountMap.set(String(row._id), row.count || 0);
      });

      const totalCountMap = new Map<string, number>();
      totalLoginAgg.forEach((row: any) => {
        if (row._id) totalCountMap.set(String(row._id), row.count || 0);
      });

      const staffSummary = allUsers.map((u: any) => {
        const uid = String(u._id);
        const isOnline = computeIsOnline(u, now);

        return {
          _id: uid,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt || null,
          lastLogoutAt: u.lastLogoutAt || null,
          lastSeenAt: u.lastSeenAt || null,
          isOnline,
          todayLoginCount: todayCountMap.get(uid) || 0,
          totalLoginCount: totalCountMap.get(uid) || 0,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          logs,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
          staffSummary,
        },
      });
    } catch (error: any) {
      console.error("Error getting staff auth logs:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};
