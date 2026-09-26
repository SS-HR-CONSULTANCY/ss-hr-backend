import { Router, Request, Response, NextFunction } from "express";
import { ExpenseModel } from "../../infrastructure/database/expense/expenseModel";
import { ExpenseCategoryModel } from "../../infrastructure/database/expenseCategory/expenseCategoryModel";
import { authMiddleware } from "../middleware/authMiddleware";

export const adminExpenseRouter = Router();

adminExpenseRouter.use(authMiddleware);

// Get all expense categories
adminExpenseRouter.get("/categories", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await ExpenseCategoryModel.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// Create new expense category
adminExpenseRouter.post("/categories", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Category name is required" });
      return;
    }

    const trimmed = name.trim();
    let category = await ExpenseCategoryModel.findOne({ name: trimmed });
    if (!category) {
      category = new ExpenseCategoryModel({ name: trimmed });
      await category.save();
    }

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// Get all expenses
adminExpenseRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, status, search } = req.query;
    const query: any = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { billRef: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
      ];
    }

    const expenses = await ExpenseModel.find(query).sort({ createdAt: -1 });

    const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPaidAmount = expenses.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
    const totalBalanceAmount = expenses.reduce((sum, e) => sum + (e.balanceAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: expenses,
      summary: {
        totalExpenseAmount,
        totalPaidAmount,
        totalBalanceAmount,
        count: expenses.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create new expense
adminExpenseRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category, vendorName, billRef, currency, amount, date, dueDate, comment } = req.body;

    if (!title || amount === undefined) {
      res.status(400).json({ success: false, message: "Title and amount are required" });
      return;
    }

    const expense = new ExpenseModel({
      title,
      category: category || "",
      vendorName: vendorName || "",
      billRef: billRef || "",
      currency: currency || "AED",
      amount: Number(amount),
      createdAt: date ? new Date(date) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      comment: comment || "",
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// Update expense
adminExpenseRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseModel.findById(id);

    if (!expense) {
      res.status(404).json({ success: false, message: "Expense not found" });
      return;
    }

    const fields = ["title", "category", "vendorName", "billRef", "currency", "amount", "dueDate", "comment", "status"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "dueDate") {
          expense.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;
        } else if (field === "amount") {
          expense.amount = Number(req.body.amount);
        } else {
          (expense as any)[field] = req.body[field];
        }
      }
    });

    await expense.save();

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// Add payment to expense
adminExpenseRouter.post("/:id/payments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { date, amount, paymentMethod, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ success: false, message: "Valid payment amount is required" });
      return;
    }

    const expense = await ExpenseModel.findById(id);
    if (!expense) {
      res.status(404).json({ success: false, message: "Expense not found" });
      return;
    }

    expense.paymentHistory.push({
      date: date ? new Date(date) : new Date(),
      amount: Number(amount),
      paymentMethod: paymentMethod || "cash",
      note: note || "",
    });

    await expense.save();

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// Delete expense
adminExpenseRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseModel.findByIdAndDelete(id);

    if (!expense) {
      res.status(404).json({ success: false, message: "Expense not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});
