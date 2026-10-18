import { Request, Response } from "express";
import mongoose from "mongoose";
import { ImportedCustomerModel } from "../../infrastructure/database/importedCustomer/importedCustomerModel";
import { SystemUserModel } from "../../infrastructure/database/systemUser/systemUserModel";

export const importedCustomerController = {
  syncCustomers: async (req: Request, res: Response) => {
    try {
      const customers = req.body;

      if (!Array.isArray(customers)) {
         res.status(400).json({ success: false, message: "Expected an array of customers in request body" });
         return;
      }

      const operations = customers
        .filter((c: any) => c.email)
        .map((customer: any) => ({
          updateOne: {
            filter: { email: customer.email },
            update: {
              $set: {
                name: customer.name,
                phone: customer.phone,
                state: customer.state,
                designations: customer.designations || [],
                cvUrl: customer.cvUrl,
                linkedinUrl: customer.linkedinUrl,
                source: customer.source || 'ShareMyApps'
              },
              $setOnInsert: {
                status: 'Pending',
                isNewLead: true
              }
            },
            upsert: true
          }
        }));

      let result;
      if (operations.length > 0) {
        result = await ImportedCustomerModel.bulkWrite(operations);
      }

      const results = {
        inserted: result?.upsertedCount || 0,
        updated: result?.modifiedCount || 0,
        failed: customers.length - operations.length,
      };

      res.status(200).json({
        success: true,
        message: "Customer sync completed via bulkWrite",
        data: results
      });
    } catch (error: any) {
      console.error("Error syncing imported customers:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getCustomers: async (req: Request, res: Response) => {
    try {
      // Auto-forward past pending scheduled dates to today
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await ImportedCustomerModel.updateMany(
        {
          status: 'Pending',
          scheduledDate: { $lt: today, $ne: null }
        },
        {
          $set: { scheduledDate: today }
        }
      );

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string || "").trim();

      // Role-based filtering: staff users can ONLY see contacts assigned to them
      const isStaff = req.user?.role === 'staff';
      const currentUserId = req.user?.userId;

      const query: any = {};

      if (isStaff) {
        if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
          query.assignedTo = new mongoose.Types.ObjectId(currentUserId);
        } else {
          query.assignedTo = { $exists: true, $ne: null, $in: [] };
        }
      } else {
        // Admin: can optionally filter by assigned staff
        const assignedTo = req.query.assignedTo as string;
        if (assignedTo === 'unassigned') {
          query.assignedTo = { $in: [null, undefined] };
        } else if (assignedTo && assignedTo !== 'all') {
          if (mongoose.Types.ObjectId.isValid(assignedTo)) {
            query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
          }
        }
      }
      
      const scheduledDate = req.query.scheduledDate as string;
      if (scheduledDate === 'any') {
        query.scheduledDate = { $exists: true, $ne: null };
      } else if (scheduledDate) {
        // e.g., '2026-10-04'
        const start = new Date(scheduledDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(scheduledDate);
        end.setUTCHours(23, 59, 59, 999);
        query.scheduledDate = { $gte: start, $lte: end };
      }

      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const orConditions: any[] = [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
          { phone: { $regex: escapedSearch, $options: "i" } },
          { state: { $regex: escapedSearch, $options: "i" } },
          { designations: { $regex: escapedSearch, $options: "i" } }
        ];

        const cleanDigits = search.replace(/[\s-]/g, '');
        if (/^\+?\d{3,}$/.test(cleanDigits)) {
          const phonePattern = cleanDigits.split('').map(c => c === '+' ? '\\+' : c).join('[\\s-]*');
          orConditions.push({ phone: { $regex: phonePattern, $options: "i" } });
        }

        query.$or = orConditions;
      } else {
        // When not searching, filter for leads with phone numbers by default
        query.phone = { $exists: true, $nin: ["", null] };
      }

      const skip = (page - 1) * limit;

      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as string;
      let sortQuery: any = { createdAt: 1, _id: 1 };
      if (sortBy) {
        sortQuery = { [sortBy]: sortOrder === 'desc' ? -1 : 1, createdAt: 1, _id: 1 };
      }

      // Optional status filter (applies to table rows only, not to stats)
      const status = req.query.status as string;
      const state = req.query.state as string;
      const listQuery: any = { ...query };
      if (status && status !== 'all') {
        listQuery.status = status === 'Pending'
          ? { $in: ['Pending', null, ''] }
          : status;
      }
      if (state && state !== 'all') {
        const escapedState = state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        listQuery.state = { $regex: `^${escapedState}$`, $options: 'i' };
      }

      const statusPriorityExpr = {
        $cond: {
          if: {
            $in: [
              { $toLower: { $ifNull: ["$status", ""] } },
              ["not interested", "rejected application"]
            ]
          },
          then: 1,
          else: 0
        }
      };

      const pagedIds = await ImportedCustomerModel.aggregate([
        { $match: listQuery },
        { $addFields: { statusPriority: statusPriorityExpr } },
        {
          $sort: {
            statusPriority: 1,
            ...sortQuery
          }
        },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 1 } }
      ]);

      const ids = pagedIds.map((item: any) => item._id);
      const docs = await ImportedCustomerModel.find({ _id: { $in: ids } })
        .populate('assignedTo', 'fullName username role');

      const docMap = new Map(docs.map((d: any) => [d._id.toString(), d]));
      const customers = ids.map((id: any) => docMap.get(id.toString())).filter(Boolean);

      const filteredTotal = await ImportedCustomerModel.countDocuments(listQuery);
      const total = await ImportedCustomerModel.countDocuments(query);

      const pendingCount = await ImportedCustomerModel.countDocuments({ ...query, status: 'Pending' });
      const contactedCount = await ImportedCustomerModel.countDocuments({ ...query, status: 'Contacted' });
      const needFollowUpCount = await ImportedCustomerModel.countDocuments({ ...query, status: 'Need Follow Up' });

      const rawStates = await ImportedCustomerModel.distinct('state', { state: { $exists: true, $nin: ['', null] } });
      const getStatePriority = (name: string): number => {
        const clean = name.trim().toLowerCase().replace(/\s+/g, '');
        if (clean === 'kerala') return 0;
        if (clean === 'tamilnadu') return 1;
        if (clean === 'karnataka') return 2;
        return 999;
      };
      const states = (rawStates as string[])
        .filter(Boolean)
        .sort((a, b) => {
          const pA = getStatePriority(a);
          const pB = getStatePriority(b);
          if (pA !== pB) return pA - pB;
          return a.localeCompare(b);
        });

      res.status(200).json({
        success: true,
        data: {
          customers,
          total: filteredTotal,
          page,
          totalPages: Math.ceil(filteredTotal / limit),
          states,
          stats: {
            total,
            pending: pendingCount,
            contacted: contactedCount,
            needFollowUp: needFollowUpCount
          }
        }
      });
    } catch (error: any) {
      console.error("Error getting imported customers:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  updateTelecallStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, comment, scheduledDate, state, assignedTo } = req.body;
      
      const updateData: any = {};
      if (status !== undefined) {
        updateData.status = status;
        if (status !== "Pending") {
          updateData.isNewLead = false;
        }
      }
      if (comment !== undefined) updateData.comment = comment;
      if (state !== undefined) updateData.state = state;
      
      let updateOp: any = { $set: updateData };
      if (scheduledDate !== undefined) {
        if (scheduledDate === null || scheduledDate === "") {
           updateOp.$unset = { scheduledDate: 1 };
        } else {
           updateData.scheduledDate = scheduledDate;
        }
      }

      const existing = await ImportedCustomerModel.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, message: "Customer not found" });
        return;
      }

      const now = new Date();
      const activities: any[] = [];
      const toDay = (d?: Date | string | null) =>
        d ? new Date(d).toISOString().split("T")[0] : "";

      if (status !== undefined && status !== existing.status) {
        activities.push({ type: "status", from: existing.status || "Pending", to: status, at: now });
      }
      if (comment !== undefined && (comment || "").trim() !== (existing.comment || "").trim()) {
        activities.push({ type: "comment", from: existing.comment || "", to: (comment || "").trim(), at: now });
      }
      if (state !== undefined && (state || "").trim() !== (existing.state || "").trim()) {
        activities.push({ type: "state", from: existing.state || "", to: (state || "").trim(), at: now });
      }
      if (scheduledDate !== undefined) {
        const newDay = scheduledDate === null || scheduledDate === "" ? "" : toDay(scheduledDate);
        const oldDay = toDay(existing.scheduledDate);
        if (newDay !== oldDay) {
          activities.push({ type: "schedule", from: oldDay, to: newDay, at: now });
          if (newDay) {
            updateData.scheduledAt = now;
          } else {
            updateOp.$unset = { ...(updateOp.$unset || {}), scheduledAt: 1 };
          }
        }
      }
      if (assignedTo !== undefined) {
        if (!assignedTo || assignedTo === "unassigned") {
          updateOp.$unset = { ...(updateOp.$unset || {}), assignedTo: 1 };
          if (existing.assignedTo) {
            activities.push({ type: "assignment", from: "Assigned", to: "Unassigned", at: now });
          }
        } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          const staffUser = await SystemUserModel.findById(assignedTo);
          updateData.assignedTo = new mongoose.Types.ObjectId(assignedTo);
          activities.push({
            type: "assignment",
            from: existing.assignedTo ? "Reassigned" : "Unassigned",
            to: staffUser ? (staffUser.fullName || staffUser.username) : "Staff",
            at: now
          });
        }
      }

      if (activities.length > 0) {
        updateOp.$push = { activityLog: { $each: activities } };
      }

      const customer = await ImportedCustomerModel.findByIdAndUpdate(
        id,
        updateOp,
        { new: true }
      ).populate('assignedTo', 'fullName username role');

      if (!customer) {
        res.status(404).json({ success: false, message: "Customer not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Status updated successfully",
        data: customer
      });
    } catch (error: any) {
      console.error("Error updating telecall status:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  assignStaff: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { staffId } = req.body;

      const existing = await ImportedCustomerModel.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, message: "Customer not found" });
        return;
      }

      const now = new Date();
      const updateData: any = {};
      const updateOp: any = {};
      let staffName = "Unassigned";

      if (!staffId || staffId === "unassigned") {
        updateOp.$unset = { assignedTo: 1 };
        updateOp.$push = {
          activityLog: {
            type: "assignment",
            from: "Assigned",
            to: "Unassigned",
            at: now
          }
        };
      } else {
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
          res.status(400).json({ success: false, message: "Invalid staff ID" });
          return;
        }
        const staff = await SystemUserModel.findById(staffId);
        if (!staff) {
          res.status(404).json({ success: false, message: "Staff user not found" });
          return;
        }
        staffName = staff.fullName || staff.username;
        updateData.assignedTo = new mongoose.Types.ObjectId(staffId);
        updateOp.$set = updateData;
        updateOp.$push = {
          activityLog: {
            type: "assignment",
            from: existing.assignedTo ? "Reassigned" : "Unassigned",
            to: staffName,
            at: now
          }
        };
      }

      const customer = await ImportedCustomerModel.findByIdAndUpdate(
        id,
        updateOp,
        { new: true }
      ).populate("assignedTo", "fullName username role");

      res.status(200).json({
        success: true,
        message: staffId && staffId !== "unassigned" ? `Contact assigned to ${staffName}` : "Contact unassigned",
        data: customer
      });
    } catch (error: any) {
      console.error("Error assigning staff:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getStaffStats: async (req: Request, res: Response) => {
    try {
      const isSuperAdmin =
        req.user?.role === "admin" &&
        (req.user?.email === "tony" ||
          (req.user as any)?.username === "tony" ||
          req.user?.userId === "tony" ||
          (req.user as any)?.fullName === "Super Admin");

      if (!isSuperAdmin) {
        res.status(403).json({ success: false, message: "Access denied. Super Admin only." });
        return;
      }

      // Fetch all staff members from SystemUserModel
      const staffMembers = await SystemUserModel.find({ role: "staff" }).select("-password").lean();

      // Aggregate importedcustomers by assignedTo and status
      const statusAggregation = await ImportedCustomerModel.aggregate([
        {
          $group: {
            _id: {
              assignedTo: "$assignedTo",
              status: "$status"
            },
            count: { $sum: 1 }
          }
        }
      ]);

      // Scheduled contacts for today
      const today = new Date().toISOString().split("T")[0];
      const todayStart = new Date(today);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setUTCHours(23, 59, 59, 999);

      const scheduledTodayAgg = await ImportedCustomerModel.aggregate([
        {
          $match: {
            scheduledDate: { $gte: todayStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: "$assignedTo",
            count: { $sum: 1 }
          }
        }
      ]);

      const scheduledTodayMap = new Map<string, number>();
      scheduledTodayAgg.forEach((item) => {
        const key = item._id ? item._id.toString() : "unassigned";
        scheduledTodayMap.set(key, item.count);
      });

      // Missed follow ups
      const missedAgg = await ImportedCustomerModel.aggregate([
        {
          $match: {
            scheduledDate: { $lt: todayStart },
            status: { $in: ["Pending", "Contacted", "Need Follow Up", null, ""] }
          }
        },
        {
          $group: {
            _id: "$assignedTo",
            count: { $sum: 1 }
          }
        }
      ]);

      const missedMap = new Map<string, number>();
      missedAgg.forEach((item) => {
        const key = item._id ? item._id.toString() : "unassigned";
        missedMap.set(key, item.count);
      });

      const totalLeads = await ImportedCustomerModel.countDocuments();

      let unassignedTotal = 0;
      let unassignedPending = 0;
      let unassignedContacted = 0;
      let unassignedNeedFollowUp = 0;
      let unassignedCompleted = 0;

      const staffStats = staffMembers.map((staff) => {
        const staffIdStr = staff._id.toString();

        let totalAssigned = 0;
        let pending = 0;
        let contacted = 0;
        let needFollowUp = 0;
        let processingApplication = 0;
        let completed = 0;
        let rejectedApplication = 0;
        let notInterested = 0;

        statusAggregation.forEach((row) => {
          if (row._id.assignedTo && row._id.assignedTo.toString() === staffIdStr) {
            const count = row.count || 0;
            totalAssigned += count;
            const status = row._id.status;
            if (!status || status === "Pending") pending += count;
            else if (status === "Contacted") contacted += count;
            else if (status === "Need Follow Up") needFollowUp += count;
            else if (status === "Processing Application") processingApplication += count;
            else if (status === "Completed") completed += count;
            else if (status === "Rejected Application") rejectedApplication += count;
            else if (status === "Not Interested") notInterested += count;
          }
        });

        const activeEngaged = contacted + needFollowUp + processingApplication + completed;
        const contactRate = totalAssigned > 0 ? Math.round((activeEngaged / totalAssigned) * 100) : 0;
        const conversionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

        return {
          staffId: staffIdStr,
          fullName: staff.fullName,
          username: staff.username,
          isActive: staff.isActive,
          totalAssigned,
          pending,
          contacted,
          needFollowUp,
          processingApplication,
          completed,
          rejectedApplication,
          notInterested,
          scheduledToday: scheduledTodayMap.get(staffIdStr) || 0,
          missedFollowUp: missedMap.get(staffIdStr) || 0,
          contactRate,
          conversionRate,
        };
      });

      statusAggregation.forEach((row) => {
        if (!row._id.assignedTo) {
          const count = row.count || 0;
          unassignedTotal += count;
          const status = row._id.status;
          if (!status || status === "Pending") unassignedPending += count;
          else if (status === "Contacted") unassignedContacted += count;
          else if (status === "Need Follow Up") unassignedNeedFollowUp += count;
          else if (status === "Completed") unassignedCompleted += count;
        }
      });

      const totalAssignedLeads = totalLeads - unassignedTotal;

      res.status(200).json({
        success: true,
        data: {
          overall: {
            totalLeads,
            totalAssigned: totalAssignedLeads,
            totalUnassigned: unassignedTotal,
            activeStaffCount: staffMembers.filter((s) => s.isActive).length,
          },
          staffStats,
          unassignedStats: {
            total: unassignedTotal,
            pending: unassignedPending,
            contacted: unassignedContacted,
            needFollowUp: unassignedNeedFollowUp,
            completed: unassignedCompleted,
            scheduledToday: scheduledTodayMap.get("unassigned") || 0,
            missedFollowUp: missedMap.get("unassigned") || 0,
          },
        },
      });
    } catch (error: any) {
      console.error("Error fetching staff stats:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};
