import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { FullStackContactModel } from "../../infrastructure/database/fullStackContact/fullStackContactModel";
import { authMiddleware } from "../middleware/authMiddleware";

export const adminFullStackContactRouter = Router();

adminFullStackContactRouter.use(authMiddleware);

// GET / - List contacts with filters, search, pagination, and stats
adminFullStackContactRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string || "").trim();
    const status = req.query.status as string;
    const service = req.query.service as string;
    const state = req.query.state as string;
    const assignedTo = req.query.assignedTo as string;
    const scheduledDate = req.query.scheduledDate as string;

    const isStaff = req.user?.role === "staff";
    const currentUserId = req.user?.userId;

    const query: any = {};

    if (isStaff) {
      if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        query.assignedTo = new mongoose.Types.ObjectId(currentUserId);
      } else {
        query.assignedTo = { $exists: true, $ne: null, $in: [] };
      }
    } else {
      if (assignedTo === "unassigned") {
        query.assignedTo = { $in: [null, undefined] };
      } else if (assignedTo && assignedTo !== "all") {
        if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        }
      }
    }

    if (scheduledDate === "any") {
      query.scheduledDate = { $exists: true, $ne: null };
    } else if (scheduledDate) {
      const start = new Date(scheduledDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(scheduledDate);
      end.setUTCHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: start, $lte: end };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const orConditions: any[] = [
        { name: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { companyName: { $regex: escaped, $options: "i" } },
        { service: { $regex: escaped, $options: "i" } },
        { state: { $regex: escaped, $options: "i" } },
      ];
      query.$or = orConditions;
    }

    const listQuery: any = { ...query };
    if (status && status !== "all") {
      listQuery.status = status;
    }
    if (service && service !== "all") {
      listQuery.service = service;
    }
    if (state && state !== "all") {
      listQuery.state = state;
    }

    const skip = (page - 1) * limit;

    const [contacts, filteredTotal, total, pendingCount, contactedCount, needFollowUpCount, convertedCount, rawServices, rawStates] = await Promise.all([
      FullStackContactModel.find(listQuery)
        .populate("assignedTo", "fullName username role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FullStackContactModel.countDocuments(listQuery),
      FullStackContactModel.countDocuments(query),
      FullStackContactModel.countDocuments({ ...query, status: "Pending" }),
      FullStackContactModel.countDocuments({ ...query, status: "Contacted" }),
      FullStackContactModel.countDocuments({ ...query, status: "Need Follow Up" }),
      FullStackContactModel.countDocuments({ ...query, status: { $in: ["Converted", "Completed"] } }),
      FullStackContactModel.distinct("service"),
      FullStackContactModel.distinct("state", { state: { $exists: true, $nin: ["", null] } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        contacts,
        total: filteredTotal,
        page,
        totalPages: Math.ceil(filteredTotal / limit) || 1,
        services: rawServices.filter(Boolean),
        states: rawStates.filter(Boolean),
        stats: {
          total,
          pending: pendingCount,
          contacted: contactedCount,
          needFollowUp: needFollowUpCount,
          converted: convertedCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST / - Create a contact manually
adminFullStackContactRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      phone,
      email,
      companyName,
      service,
      state,
      city,
      budget,
      projectDescription,
      status = "Pending",
      comment = "",
      scheduledDate,
      assignedTo,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Contact name is required" });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ success: false, message: "Phone number is required" });
      return;
    }

    const creatorName = (req.user as any)?.username || (req.user as any)?.fullName || "Admin";

    const initialActivity: any[] = [
      {
        type: "status",
        from: "",
        to: status,
        at: new Date(),
        by: creatorName,
      },
    ];

    if (comment && comment.trim()) {
      initialActivity.push({
        type: "comment",
        from: "",
        to: comment.trim(),
        at: new Date(),
        by: creatorName,
      });
    }

    const contact = new FullStackContactModel({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : "",
      companyName: companyName ? companyName.trim() : "",
      service: service || "Web Development",
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      budget: budget ? budget.trim() : "",
      projectDescription: projectDescription ? projectDescription.trim() : "",
      status,
      comment: comment ? comment.trim() : "",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      assignedTo: assignedTo && mongoose.Types.ObjectId.isValid(assignedTo) ? new mongoose.Types.ObjectId(assignedTo) : null,
      activityLog: initialActivity,
    });

    await contact.save();
    const populated = await contact.populate("assignedTo", "fullName username role");

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Edit contact details
adminFullStackContactRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid contact ID" });
      return;
    }

    const contact = await FullStackContactModel.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, message: "Contact not found" });
      return;
    }

    const {
      name,
      phone,
      email,
      companyName,
      service,
      state,
      city,
      budget,
      projectDescription,
      status,
      assignedTo,
    } = req.body;

    if (name) contact.name = name.trim();
    if (phone) contact.phone = phone.trim();
    if (email !== undefined) contact.email = email.trim();
    if (companyName !== undefined) contact.companyName = companyName.trim();
    if (service) contact.service = service;
    if (state !== undefined) contact.state = state.trim();
    if (city !== undefined) contact.city = city.trim();
    if (budget !== undefined) contact.budget = budget.trim();
    if (projectDescription !== undefined) contact.projectDescription = projectDescription.trim();
    if (status && status !== contact.status) {
      contact.activityLog.push({
        type: "status",
        from: contact.status,
        to: status,
        at: new Date(),
        by: (req.user as any)?.username || "Admin",
      });
      contact.status = status;
    }
    if (assignedTo !== undefined) {
      contact.assignedTo = assignedTo && mongoose.Types.ObjectId.isValid(assignedTo) ? new mongoose.Types.ObjectId(assignedTo) : null;
    }

    await contact.save();
    const updated = await contact.populate("assignedTo", "fullName username role");

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/telecall - Update telecalling status & scheduled follow-up
adminFullStackContactRouter.patch("/:id/telecall", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, comment, scheduledDate, scheduledAt } = req.body;

    const contact = await FullStackContactModel.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, message: "Contact not found" });
      return;
    }

    const actor = (req.user as any)?.username || (req.user as any)?.fullName || "Admin";

    if (status && status !== contact.status) {
      contact.activityLog.push({
        type: "status",
        from: contact.status,
        to: status,
        at: new Date(),
        by: actor,
      });
      contact.status = status;
    }

    if (comment && comment.trim()) {
      contact.activityLog.push({
        type: "comment",
        from: contact.comment || "",
        to: comment.trim(),
        at: new Date(),
        by: actor,
      });
      contact.comment = comment.trim();
    }

    if (scheduledDate) {
      const newDate = new Date(scheduledDate);
      contact.activityLog.push({
        type: "schedule",
        from: contact.scheduledDate ? contact.scheduledDate.toISOString().split("T")[0] : "None",
        to: newDate.toISOString().split("T")[0],
        at: new Date(),
        by: actor,
      });
      contact.scheduledDate = newDate;
    }

    if (scheduledAt) {
      contact.scheduledAt = new Date(scheduledAt);
    }

    await contact.save();
    const populated = await contact.populate("assignedTo", "fullName username role");

    res.status(200).json({
      success: true,
      message: "Telecall status updated",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/assign - Assign contact to a staff member
adminFullStackContactRouter.patch("/:id/assign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const contact = await FullStackContactModel.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, message: "Contact not found" });
      return;
    }

    const previousStaff = contact.assignedTo ? String(contact.assignedTo) : "Unassigned";
    contact.assignedTo = staffId && mongoose.Types.ObjectId.isValid(staffId) ? new mongoose.Types.ObjectId(staffId) : null;

    contact.activityLog.push({
      type: "assignment",
      from: previousStaff,
      to: staffId ? String(staffId) : "Unassigned",
      at: new Date(),
      by: (req.user as any)?.username || "Admin",
    });

    await contact.save();
    const populated = await contact.populate("assignedTo", "fullName username role");

    res.status(200).json({
      success: true,
      message: "Staff assigned successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete a contact
adminFullStackContactRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await FullStackContactModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    next(error);
  }
});
