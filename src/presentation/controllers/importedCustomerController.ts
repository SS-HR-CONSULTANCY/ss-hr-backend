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
      const search = req.query.search as string || "";

      const query: any = {
        phone: { $exists: true, $nin: ["", null] }
      };
      
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
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } }
        ];
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
      const listQuery: any = { ...query };
      if (status && status !== 'all') {
        listQuery.status = status === 'Pending'
          ? { $in: ['Pending', null, ''] }
          : status;
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

      res.status(200).json({
        success: true,
        data: {
          customers,
          total: filteredTotal,
          page,
          totalPages: Math.ceil(filteredTotal / limit),
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
