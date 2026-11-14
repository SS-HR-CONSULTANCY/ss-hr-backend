import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  SystemUserModel,
  computeIsOnline,
  accrueActiveTime,
  getIstDayStart,
  hasOpenSession,
  getTodayWorkMs,
  getIstDateKey,
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

      const prev: any = await SystemUserModel.findById(userId)
        .select("isOnline lastSeenAt workDate workCompletedMs")
        .lean();
      if (!prev) {
        res.status(200).json({ success: true, data: { todayCompletedMs: 0, currentSessionStart: null, serverNow: now } });
        return;
      }

      // Add the time since the previous heartbeat to today's total. The lastSeenAt match makes
      // this a compare-and-set, so two tabs pinging at once can't count the same gap twice.
      const accrued = accrueActiveTime(prev, now);
      const result = await SystemUserModel.updateOne(
        { _id: userId, lastSeenAt: prev.lastSeenAt ?? null },
        { $set: { lastSeenAt: now, isOnline: true, ...accrued } }
      );

      let todayCompletedMs = accrued.workCompletedMs;
      if (result.matchedCount === 0) {
        // Another heartbeat won the race; it already counted this time.
        const latest: any = await SystemUserModel.findById(userId)
          .select("workDate workCompletedMs")
          .lean();
        todayCompletedMs = latest?.workDate === accrued.workDate ? latest.workCompletedMs || 0 : 0;
      }

      // The client keeps counting from now until the next heartbeat.
      const currentSessionStart = now;

      res.status(200).json({
        success: true,
        data: { todayCompletedMs, currentSessionStart, serverNow: now },
      });
    } catch (error: any) {
      console.error("Error recording heartbeat:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Login/logout sessions of one user, grouped by IST day (newest first).
  getSessionHistory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: "Invalid user id" });
        return;
      }
      const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || "30"), 10) || 30));

      const user: any = await SystemUserModel.findById(id).select("-password").lean();
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const now = new Date();
      const rangeStart = new Date(getIstDayStart(now).getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const logs: any[] = await StaffAuthLogModel.find({
        userId: new mongoose.Types.ObjectId(id),
        createdAt: { $gte: rangeStart, $lte: now },
      })
        .sort({ createdAt: 1 })
        .select("action createdAt sessionDurationMs ipAddress userAgent")
        .lean();

      type Session = {
        loginAt: Date | null;
        logoutAt: Date | null;
        durationMs: number | null;
        status: "completed" | "active" | "no-logout";
        ipAddress?: string;
        userAgent?: string;
      };

      const sessions: Session[] = [];
      let open: Session | null = null;

      for (const log of logs) {
        const at = new Date(log.createdAt);
        if (log.action === "LOGIN") {
          if (open) {
            // Logged in again without logging out: previous session ended at an unknown time.
            open.status = "no-logout";
            sessions.push(open);
          }
          open = {
            loginAt: at,
            logoutAt: null,
            durationMs: null,
            status: "active",
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
          };
        } else {
          const duration =
            typeof log.sessionDurationMs === "number" && log.sessionDurationMs > 0
              ? log.sessionDurationMs
              : open?.loginAt
                ? at.getTime() - open.loginAt.getTime()
                : null;
          if (open) {
            open.logoutAt = at;
            open.durationMs = duration;
            open.status = "completed";
            sessions.push(open);
            open = null;
          } else {
            // Login happened before the selected range.
            sessions.push({
              loginAt: duration ? new Date(at.getTime() - duration) : null,
              logoutAt: at,
              durationMs: duration,
              status: "completed",
              ipAddress: log.ipAddress,
              userAgent: log.userAgent,
            });
          }
        }
      }

      if (open) {
        const isCurrent =
          hasOpenSession(user) &&
          user.lastLoginAt &&
          Math.abs(new Date(user.lastLoginAt).getTime() - open.loginAt!.getTime()) < 60 * 1000;
        if (isCurrent) {
          const isOnline = computeIsOnline(user, now);
          const seenAt = user.lastSeenAt ? new Date(user.lastSeenAt) : open.loginAt!;
          const end = isOnline ? now : seenAt < now ? seenAt : now;
          open.durationMs = Math.max(0, end.getTime() - open.loginAt!.getTime());
          open.status = "active";
        } else {
          open.status = "no-logout";
        }
        sessions.push(open);
      }

      const byDay = new Map<string, { date: string; totalMs: number; sessions: Session[] }>();
      for (const sess of sessions) {
        const ref = sess.loginAt || sess.logoutAt;
        if (!ref) continue;
        const key = getIstDateKey(ref);
        if (!byDay.has(key)) byDay.set(key, { date: key, totalMs: 0, sessions: [] });
        const day = byDay.get(key)!;
        day.sessions.push(sess);
        day.totalMs += sess.durationMs || 0;
      }

      const dayList = Array.from(byDay.values())
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((d) => ({
          ...d,
          sessions: d.sessions.sort(
            (a, b) =>
              new Date(b.loginAt || b.logoutAt!).getTime() - new Date(a.loginAt || a.logoutAt!).getTime()
          ),
        }));

      res.status(200).json({
        success: true,
        data: {
          user: { _id: String(user._id), fullName: user.fullName, username: user.username, role: user.role },
          days: dayList,
          rangeDays: days,
          serverNow: now,
        },
      });
    } catch (error: any) {
      console.error("Error getting session history:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getUsers: async (req: Request, res: Response) => {
    try {
      const users = await SystemUserModel.find({}).select('-password').lean();
      const now = new Date();
      const data = users.map((u: any) => {
        const isOnline = computeIsOnline(u, now);
        return { ...u, isOnline, todayWorkMs: getTodayWorkMs(u, now, isOnline) };
      });
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
