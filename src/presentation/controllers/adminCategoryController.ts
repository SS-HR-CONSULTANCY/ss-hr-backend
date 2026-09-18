import { Request, Response, NextFunction } from "express";
import { CategoryModel } from "../../infrastructure/database/category/categoryModel";
import { HandleError } from "../../infrastructure/error/error";

export class AdminCategoryController {
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: "Category name is required" });
        return;
      }
      
      const existing = await CategoryModel.findOne({ name });
      if (existing) {
        res.status(400).json({ success: false, message: "Category already exists" });
        return;
      }

      const category = await CategoryModel.create({ name });
      res.status(201).json({ success: true, message: "Category created successfully", data: category });
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryModel.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, message: "Categories fetched successfully", data: categories });
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}
