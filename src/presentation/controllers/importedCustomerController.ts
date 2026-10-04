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

      const results = {
        inserted: 0,
        updated: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const customer of customers) {
        if (!customer.email) {
          results.failed++;
          results.errors.push({ customer, error: "Email is required" });
          continue;
        }

        try {
          const updateData = {
            name: customer.name,
            phone: customer.phone,
            state: customer.state,
            designations: customer.designations || [],
            cvUrl: customer.cvUrl,
            source: customer.source || 'ShareMyApps'
          };

          const result = await ImportedCustomerModel.updateOne(
            { email: customer.email },
            { $set: updateData },
            { upsert: true }
          );

          if (result.upsertedCount > 0) {
            results.inserted++;
          } else if (result.modifiedCount > 0) {
            results.updated++;
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push({ customer, error: err.message });
        }
      }

      res.status(200).json({
        success: true,
        message: "Customer sync completed",
        data: results
      });
    } catch (error: any) {
      console.error("Error syncing imported customers:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getCustomers: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || "";

      const query: any = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } }
        ];
      }

      const skip = (page - 1) * limit;

      const customers = await ImportedCustomerModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ImportedCustomerModel.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          customers,
          total,
          page,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error("Error getting imported customers:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};
