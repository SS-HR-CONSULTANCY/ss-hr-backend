import { Router, Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { DailyDutyModel } from "../../infrastructure/database/dailyDuty/dailyDutyModel";
import { DailyReportModel } from "../../infrastructure/database/dailyReport/dailyReportModel";
import { SystemUserModel } from "../../infrastructure/database/systemUser/systemUserModel";
import { authMiddleware } from "../middleware/authMiddleware";

export const adminDailyDutyRouter = Router();

adminDailyDutyRouter.use(authMiddleware);

// Helper to get formatted YYYY-MM-DD
const getTodayString = (): string => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// Helper to parse deadline timestamp
const computeDeadline = (dutyDate: string, deadlineTime?: string): Date | undefined => {
  if (!dutyDate) return undefined;
  if (!deadlineTime) {
    const endOfDay = new Date(`${dutyDate}T23:59:59.999Z`);
    return isNaN(endOfDay.getTime()) ? undefined : endOfDay;
  }
  // Try parsing time e.g. "17:00" or "05:00 PM"
  let hours = 18;
  let minutes = 0;
  const match = deadlineTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  }
  const d = new Date(`${dutyDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000`);
  return isNaN(d.getTime()) ? undefined : d;
};

// ==========================================
// 1. GET /staff-members - Active Staff & Admins
// ==========================================
adminDailyDutyRouter.get("/staff-members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await SystemUserModel.find({ isActive: true })
      .select("_id fullName username role")
      .sort({ role: 1, fullName: 1 })
      .lean();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. GET / - List duties with filters & stats
// ==========================================
adminDailyDutyRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isStaff = req.user?.role === "staff";
    const currentUserId = req.user?.userId;

    const date = (req.query.date as string) || getTodayString();
    const staffId = req.query.staffId as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const category = req.query.category as string;
    const search = ((req.query.search as string) || "").trim();

    const query: any = {};

    // Date filtering (if date is not 'all')
    if (date && date !== "all") {
      query.dutyDate = date;
    }

    // Role-based staff filtering
    if (isStaff) {
      if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
        query.assignedTo = new Types.ObjectId(currentUserId);
      } else {
        query.assignedTo = { $exists: true, $ne: null, $in: [] };
      }
    } else if (staffId && staffId !== "all") {
      if (Types.ObjectId.isValid(staffId)) {
        query.assignedTo = new Types.ObjectId(staffId);
      }
    }

    // Status filtering
    if (status && status !== "all") {
      query.status = status;
    }

    // Priority filtering
    if (priority && priority !== "all") {
      query.priority = priority;
    }

    // Category filtering
    if (category && category !== "all") {
      query.category = category;
    }

    // Search query in title or description
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    // Fetch matching duties
    const duties = await DailyDutyModel.find(query)
      .populate("assignedTo", "fullName username role")
      .populate("assignedBy", "fullName username")
      .populate("validationInfo.validatedBy", "fullName username")
      .sort({ priority: -1, deadline: 1, createdAt: -1 })
      .lean();

    // Calculate aggregated stats for the selected date scope (or overall if date='all')
    const statsQuery: any = {};
    if (date && date !== "all") {
      statsQuery.dutyDate = date;
    }
    if (isStaff && currentUserId && Types.ObjectId.isValid(currentUserId)) {
      statsQuery.assignedTo = new Types.ObjectId(currentUserId);
    } else if (staffId && staffId !== "all" && Types.ObjectId.isValid(staffId)) {
      statsQuery.assignedTo = new Types.ObjectId(staffId);
    }

    const allDateDuties = await DailyDutyModel.find(statsQuery).select("status deadline stuckInfo").lean();

    const now = new Date();
    let pendingCount = 0;
    let inProgressCount = 0;
    let stuckCount = 0;
    let completedCount = 0;
    let validatedCount = 0;
    let overdueCount = 0;

    for (const d of allDateDuties) {
      if (d.status === "pending") pendingCount++;
      if (d.status === "in_progress") inProgressCount++;
      if (d.status === "stuck" || (d.stuckInfo && d.stuckInfo.isStuck)) stuckCount++;
      if (d.status === "completed") completedCount++;
      if (d.status === "validated") validatedCount++;

      // Check overdue if not finished
      if (
        d.status !== "completed" &&
        d.status !== "validated" &&
        d.status !== "cancelled" &&
        d.deadline &&
        new Date(d.deadline) < now
      ) {
        overdueCount++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        duties,
        total: allDateDuties.length,
        stats: {
          total: allDateDuties.length,
          pending: pendingCount,
          inProgress: inProgressCount,
          stuck: stuckCount,
          completed: completedCount,
          validated: validatedCount,
          overdue: overdueCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. POST / - Assign Daily Duty (Admin or Staff)
// ==========================================
adminDailyDutyRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description = "",
      assignedTo,
      assignedToStaffIds, // Optional bulk assignment array
      dutyDate = getTodayString(),
      deadlineTime = "18:00",
      priority = "medium",
      category = "other",
      targetCount = 0,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: "Duty title is required" });
      return;
    }

    const assignedById = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
      ? new Types.ObjectId(req.user.userId)
      : undefined;

    const deadline = computeDeadline(dutyDate, deadlineTime);

    // Support single or multi-staff assignment
    const targetStaffIds: string[] = [];
    if (Array.isArray(assignedToStaffIds) && assignedToStaffIds.length > 0) {
      targetStaffIds.push(...assignedToStaffIds);
    } else if (assignedTo) {
      targetStaffIds.push(assignedTo);
    }

    if (targetStaffIds.length === 0) {
      res.status(400).json({ success: false, message: "Please select at least one staff member" });
      return;
    }

    const createdDuties = [];
    for (const staffId of targetStaffIds) {
      if (!Types.ObjectId.isValid(staffId)) continue;
      const duty = await DailyDutyModel.create({
        title: title.trim(),
        description: description.trim(),
        assignedTo: new Types.ObjectId(staffId),
        assignedBy: assignedById,
        dutyDate,
        deadlineTime,
        deadline,
        priority,
        category,
        targetCount: Number(targetCount) || 0,
        status: "pending",
        progress: 0,
        stuckInfo: { isStuck: false },
        validationInfo: { isValidated: false },
        comments: [],
      });
      createdDuties.push(duty);
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdDuties.length} daily duty task(s)`,
      data: createdDuties,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. PUT /:id - Edit Duty Details
// ==========================================
adminDailyDutyRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid duty ID" });
      return;
    }

    const {
      title,
      description,
      assignedTo,
      dutyDate,
      deadlineTime,
      priority,
      category,
      targetCount,
      completedCount,
    } = req.body;

    const update: any = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description.trim();
    if (assignedTo && Types.ObjectId.isValid(assignedTo)) {
      update.assignedTo = new Types.ObjectId(assignedTo);
    }
    if (dutyDate !== undefined) update.dutyDate = dutyDate;
    if (deadlineTime !== undefined) update.deadlineTime = deadlineTime;
    if (priority !== undefined) update.priority = priority;
    if (category !== undefined) update.category = category;
    if (targetCount !== undefined) update.targetCount = Number(targetCount);
    if (completedCount !== undefined) update.completedCount = Number(completedCount);

    if (update.dutyDate || update.deadlineTime) {
      const existing = await DailyDutyModel.findById(id).select("dutyDate deadlineTime").lean();
      const dateToUse = update.dutyDate || existing?.dutyDate || getTodayString();
      const timeToUse = update.deadlineTime !== undefined ? update.deadlineTime : existing?.deadlineTime;
      update.deadline = computeDeadline(dateToUse, timeToUse);
    }

    const updated = await DailyDutyModel.findByIdAndUpdate(id, update, { new: true })
      .populate("assignedTo", "fullName username role")
      .populate("assignedBy", "fullName username")
      .populate("validationInfo.validatedBy", "fullName username");

    if (!updated) {
      res.status(404).json({ success: false, message: "Duty not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Duty updated successfully", data: updated });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. PATCH /:id/progress - Update Progress & Status
// ==========================================
adminDailyDutyRouter.patch("/:id/progress", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid duty ID" });
      return;
    }

    const { progress, completedCount, status, notes = "", proofLink = "" } = req.body;

    const duty = await DailyDutyModel.findById(id);
    if (!duty) {
      res.status(404).json({ success: false, message: "Duty not found" });
      return;
    }

    if (progress !== undefined) {
      duty.progress = Math.min(100, Math.max(0, Number(progress)));
    }
    if (completedCount !== undefined) {
      duty.completedCount = Number(completedCount);
    }

    if (status) {
      duty.status = status;
    } else if (duty.progress === 100) {
      duty.status = "completed";
    } else if (duty.progress > 0 && duty.status === "pending") {
      duty.status = "in_progress";
    }

    if (duty.status === "completed") {
      duty.completionInfo = {
        completedAt: new Date(),
        notes: notes || duty.completionInfo?.notes || "",
        proofLink: proofLink || duty.completionInfo?.proofLink || "",
      };
    } else if (notes || proofLink) {
      duty.completionInfo = {
        ...duty.completionInfo,
        notes: notes || duty.completionInfo?.notes || "",
        proofLink: proofLink || duty.completionInfo?.proofLink || "",
      };
    }

    await duty.save();

    const populated = await DailyDutyModel.findById(id)
      .populate("assignedTo", "fullName username role")
      .populate("assignedBy", "fullName username")
      .populate("validationInfo.validatedBy", "fullName username");

    res.status(200).json({ success: true, message: "Progress updated", data: populated });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. PATCH /:id/stuck - Report or Resolve Blocker
// ==========================================
adminDailyDutyRouter.patch("/:id/stuck", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid duty ID" });
      return;
    }

    const { isStuck, reason = "" } = req.body;

    const duty = await DailyDutyModel.findById(id);
    if (!duty) {
      res.status(404).json({ success: false, message: "Duty not found" });
      return;
    }

    const currentUserName = (req.user as any)?.username || (req.user as any)?.fullName || "User";
    const currentUserRole: "admin" | "staff" = req.user?.role === "staff" ? "staff" : "admin";
    const currentUserId = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
      ? new Types.ObjectId(req.user.userId)
      : new Types.ObjectId();

    if (isStuck) {
      duty.status = "stuck";
      duty.stuckInfo = {
        isStuck: true,
        reason: reason.trim(),
        stuckAt: new Date(),
      };

      duty.comments.push({
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        text: `🚨 Flagged as STUCK / BLOCKED: ${reason.trim() || "No specific reason provided."}`,
        createdAt: new Date(),
      });
    } else {
      duty.status = duty.progress > 0 ? "in_progress" : "pending";
      duty.stuckInfo = {
        isStuck: false,
        reason: duty.stuckInfo?.reason || "",
        stuckAt: duty.stuckInfo?.stuckAt,
        resolvedAt: new Date(),
      };

      duty.comments.push({
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        text: `✅ Blocker marked as resolved by ${currentUserName}`,
        createdAt: new Date(),
      });
    }

    await duty.save();

    const populated = await DailyDutyModel.findById(id)
      .populate("assignedTo", "fullName username role")
      .populate("assignedBy", "fullName username")
      .populate("validationInfo.validatedBy", "fullName username");

    res.status(200).json({
      success: true,
      message: isStuck ? "Blocker reported successfully" : "Blocker resolved",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 7. PATCH /:id/validate - Validate / Approve Duty (Admin)
// ==========================================
adminDailyDutyRouter.patch("/:id/validate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === "staff") {
      res.status(403).json({ success: false, message: "Only administrators can validate duties" });
      return;
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid duty ID" });
      return;
    }

    const { isValidated, feedback = "", rating = 5 } = req.body;

    const duty = await DailyDutyModel.findById(id);
    if (!duty) {
      res.status(404).json({ success: false, message: "Duty not found" });
      return;
    }

    const currentUserName = (req.user as any)?.username || (req.user as any)?.fullName || "Admin";
    const currentUserId = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
      ? new Types.ObjectId(req.user.userId)
      : new Types.ObjectId();

    if (isValidated) {
      duty.status = "validated";
      duty.validationInfo = {
        isValidated: true,
        validatedBy: currentUserId,
        validatedAt: new Date(),
        rating: Number(rating) || 5,
        feedback: feedback.trim(),
      };
      duty.progress = 100;

      duty.comments.push({
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: "admin",
        text: `⭐ Duty VALIDATED & APPROVED by Admin${feedback ? `: "${feedback}"` : ""}`,
        createdAt: new Date(),
      });
    } else {
      duty.status = "in_progress";
      duty.validationInfo = {
        isValidated: false,
        feedback: feedback.trim(),
      };

      duty.comments.push({
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: "admin",
        text: `⚠️ Validation returned for revisions: "${feedback.trim() || "Please review and complete remaining items"}"`,
        createdAt: new Date(),
      });
    }

    await duty.save();

    const populated = await DailyDutyModel.findById(id)
      .populate("assignedTo", "fullName username role")
      .populate("assignedBy", "fullName username")
      .populate("validationInfo.validatedBy", "fullName username");

    res.status(200).json({
      success: true,
      message: isValidated ? "Duty verified & validated" : "Revision requested",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 8. POST /:id/comment - Add comment to duty thread
// ==========================================
adminDailyDutyRouter.post("/:id/comment", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid duty ID" });
      return;
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: "Comment text cannot be empty" });
      return;
    }

    const currentUserName = (req.user as any)?.username || (req.user as any)?.fullName || "User";
    const currentUserRole: "admin" | "staff" = req.user?.role === "staff" ? "staff" : "admin";
    const currentUserId = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
      ? new Types.ObjectId(req.user.userId)
      : new Types.ObjectId();

    const duty = await DailyDutyModel.findById(id);
    if (!duty) {
      res.status(404).json({ success: false, message: "Duty not found" });
      return;
    }

    const newComment = {
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      text: text.trim(),
      createdAt: new Date(),
    };

    duty.comments.push(newComment);
    await duty.save();

    const populated = await DailyDutyModel.findById(id)
      .populate("assignedTo", "fullName username role")
      .populate("assignedBy", "fullName username")
      .populate("validationInfo.validatedBy", "fullName username");

    res.status(200).json({ success: true, message: "Comment added", data: populated });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 9. DELETE /:id - Delete Duty (Admin only)
// ==========================================
adminDailyDutyRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === "staff") {
      res.status(403).json({ success: false, message: "Only administrators can delete duties" });
      return;
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid duty ID" });
      return;
    }

    const deleted = await DailyDutyModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Duty not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Duty deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 10. DAILY REPORTS - GET /reports/daily
// ==========================================
adminDailyDutyRouter.get("/reports/daily", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isStaff = req.user?.role === "staff";
    const currentUserId = req.user?.userId;
    const date = (req.query.date as string) || getTodayString();
    const staffId = req.query.staffId as string;

    const reportQuery: any = { date };
    if (isStaff && currentUserId && Types.ObjectId.isValid(currentUserId)) {
      reportQuery.staffId = new Types.ObjectId(currentUserId);
    } else if (staffId && staffId !== "all" && Types.ObjectId.isValid(staffId)) {
      reportQuery.staffId = new Types.ObjectId(staffId);
    }

    const reports = await DailyReportModel.find(reportQuery)
      .populate("staffId", "fullName username role")
      .populate("reviewedBy", "fullName username")
      .sort({ updatedAt: -1 })
      .lean();

    // Also calculate aggregated performance metrics per staff for this date
    const dutiesMatch: any = { dutyDate: date };
    if (isStaff && currentUserId && Types.ObjectId.isValid(currentUserId)) {
      dutiesMatch.assignedTo = new Types.ObjectId(currentUserId);
    } else if (staffId && staffId !== "all" && Types.ObjectId.isValid(staffId)) {
      dutiesMatch.assignedTo = new Types.ObjectId(staffId);
    }

    const duties = await DailyDutyModel.find(dutiesMatch).lean();

    const staffSummaryMap: Record<string, any> = {};
    for (const d of duties) {
      const sId = d.assignedTo ? d.assignedTo.toString() : "unknown";
      if (!staffSummaryMap[sId]) {
        staffSummaryMap[sId] = {
          total: 0,
          pending: 0,
          inProgress: 0,
          stuck: 0,
          completed: 0,
          validated: 0,
        };
      }
      staffSummaryMap[sId].total++;
      if (d.status === "pending") staffSummaryMap[sId].pending++;
      if (d.status === "in_progress") staffSummaryMap[sId].inProgress++;
      if (d.status === "stuck" || (d.stuckInfo && d.stuckInfo.isStuck)) staffSummaryMap[sId].stuck++;
      if (d.status === "completed") staffSummaryMap[sId].completed++;
      if (d.status === "validated") staffSummaryMap[sId].validated++;
    }

    res.status(200).json({
      success: true,
      data: {
        date,
        reports,
        staffDutyMetrics: staffSummaryMap,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 11. DAILY REPORTS - POST /reports/daily
// ==========================================
adminDailyDutyRouter.post("/reports/daily", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date = getTodayString(), summary, challenges = "", tomorrowPlan = "" } = req.body;

    if (!summary || !summary.trim()) {
      res.status(400).json({ success: false, message: "Summary of work done is required" });
      return;
    }

    const staffId = req.user?.userId;
    if (!staffId || !Types.ObjectId.isValid(staffId)) {
      res.status(401).json({ success: false, message: "Invalid user session" });
      return;
    }

    // Auto calculate duty stats for today
    const duties = await DailyDutyModel.find({
      assignedTo: new Types.ObjectId(staffId),
      dutyDate: date,
    }).lean();

    let totalCompleted = 0;
    let totalValidated = 0;
    let totalStuck = 0;
    for (const d of duties) {
      if (d.status === "completed") totalCompleted++;
      if (d.status === "validated") totalValidated++;
      if (d.status === "stuck" || (d.stuckInfo && d.stuckInfo.isStuck)) totalStuck++;
    }

    const totalAssigned = duties.length;
    const successfulTasks = totalCompleted + totalValidated;
    const completionRate = totalAssigned > 0 ? Math.round((successfulTasks / totalAssigned) * 100) : 0;

    const report = await DailyReportModel.findOneAndUpdate(
      { staffId: new Types.ObjectId(staffId), date },
      {
        summary: summary.trim(),
        challenges: challenges.trim(),
        tomorrowPlan: tomorrowPlan.trim(),
        status: "submitted",
        stats: {
          totalAssigned,
          totalCompleted,
          totalValidated,
          totalStuck,
          completionRate,
        },
      },
      { upsert: true, new: true }
    )
      .populate("staffId", "fullName username role")
      .populate("reviewedBy", "fullName username");

    res.status(200).json({ success: true, message: "Daily report submitted successfully", data: report });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 12. DAILY REPORTS - PATCH /reports/:reportId/review
// ==========================================
adminDailyDutyRouter.patch("/reports/:reportId/review", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === "staff") {
      res.status(403).json({ success: false, message: "Only administrators can review reports" });
      return;
    }

    const { reportId } = req.params;
    if (!Types.ObjectId.isValid(reportId)) {
      res.status(400).json({ success: false, message: "Invalid report ID" });
      return;
    }

    const { adminFeedback = "" } = req.body;
    const adminId = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
      ? new Types.ObjectId(req.user.userId)
      : undefined;

    const updated = await DailyReportModel.findByIdAndUpdate(
      reportId,
      {
        adminFeedback: adminFeedback.trim(),
        status: "reviewed",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      { new: true }
    )
      .populate("staffId", "fullName username role")
      .populate("reviewedBy", "fullName username");

    if (!updated) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Report reviewed", data: updated });
  } catch (error) {
    next(error);
  }
});
