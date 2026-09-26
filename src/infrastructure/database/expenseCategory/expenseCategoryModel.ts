import mongoose, { Document, Schema } from "mongoose";

export interface IExpenseCategory extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const ExpenseCategoryModel = mongoose.model<IExpenseCategory>(
  "ExpenseCategory",
  expenseCategorySchema
);
