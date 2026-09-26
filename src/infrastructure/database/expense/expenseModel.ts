import mongoose, { Document, Schema } from "mongoose";

export interface IExpensePayment {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  paymentMethod?: string;
  note?: string;
}

export interface IExpense extends Document {
  title: string;
  category: string;
  vendorName?: string;
  billRef?: string;
  currency: "AED" | "INR";
  amount: number;
  paymentHistory: IExpensePayment[];
  paidAmount: number;
  balanceAmount: number;
  status: "pending" | "partially_paid" | "paid";
  dueDate?: Date;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpensePaymentSchema = new Schema<IExpensePayment>({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: "cash" },
  note: { type: String, default: "" },
});

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true },
    category: { type: String, default: "" },
    vendorName: { type: String, default: "" },
    billRef: { type: String, default: "" },
    currency: { type: String, enum: ["AED", "INR"], default: "AED" },
    amount: { type: Number, required: true, default: 0 },
    paymentHistory: { type: [ExpensePaymentSchema], default: [] },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "partially_paid", "paid"],
      default: "pending",
    },
    dueDate: { type: Date },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

ExpenseSchema.pre("save", function (next) {
  const totalPaid = this.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
  this.paidAmount = totalPaid;
  this.balanceAmount = Math.max(0, this.amount - totalPaid);
  
  if (this.amount > 0 && totalPaid >= this.amount) {
    this.status = "paid";
  } else if (totalPaid > 0) {
    this.status = "partially_paid";
  } else {
    this.status = "pending";
  }
  next();
});

export const ExpenseModel = mongoose.model<IExpense>("Expense", ExpenseSchema);
