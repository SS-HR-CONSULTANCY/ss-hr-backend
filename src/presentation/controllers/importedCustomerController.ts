import { Request, Response } from "express";
import { ImportedCustomerModel } from "../../infrastructure/database/importedCustomer/importedCustomerModel";

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

      const query: any = {};
      
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
        sortQuery = { [sortBy]: sortOrder === 'desc' ? -1 : 1, _id: 1 };
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

      const customers = await ImportedCustomerModel.find(listQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit);

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
      const { status, comment, scheduledDate, state } = req.body;
      
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
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

      if (activities.length > 0) {
        updateOp.$push = { activityLog: { $each: activities } };
      }

      const customer = await ImportedCustomerModel.findByIdAndUpdate(
        id,
        updateOp,
        { new: true }
      );

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
  }
};
