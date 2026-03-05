import mongoose, { Document, Schema, Types } from "mongoose";
import { PaymentMethod, PaymentMethodType, PaymentStatus, PaymentStatusType } from "../../zod/common.zod";
import { REGEXT_NOTE_TEXT } from "../../zod/regex";

export interface IPayment extends Document {
  _id: Types.ObjectId,
  customerName: string,
  packageName: string,
  totalAmount: number,
  paidAmount: number,
  balanceAmount: number,
  paymentMethod: PaymentMethodType,
  paymentDate: Date,
  adminNotes: string,
  referenceId: string,
  paymentProof: string,
  invoiceUrl: string,
  paymentStatus: PaymentStatusType,
  createdAt: Date,
  updatedAt: Date,
}

const PaymentSchema = new Schema<IPayment>(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      ref: "User",
    },
    packageName: {
      type: String,
      required: [true, "Package name is required"],
      ref: "Package",
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
      max: [100000000, "Total amount cannot exceed 100,000,000"],
    },
    paidAmount: {
      type: Number,
      required: [true, "Paid amount is required"],
      min: [0, "Paid amount cannot be negative"],
      max: [100000000, "Paid amount cannot exceed 100,000,000"],
      default: 0,
    },
    balanceAmount: {
      type: Number,
      required: [true, "Balance amount is required"],
      min: [0, "Balance amount cannot be negative"],
      max: [100000000, "Balance amount cannot exceed 100,000,000"],
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, "Payment method is required"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
    },
    adminNotes: {
      type: String,
      maxlength: [500, "Admin notes must be at most 500 characters"],
      match: [REGEXT_NOTE_TEXT, "Admin notes contain invalid characters"],
      trim: true,
      default: null,
    },
    referenceId: {
      type: String,
      maxlength: [500, "Reference must be at most 500 characters"],
      trim: true,
      default: null,
    },
    paymentProof: {
      type: String,
      maxlength: [600, "Payment proof must be at most 500 characters"],
      trim: true,
      default: null,
    },
    invoiceUrl: {
      type: String,
      maxlength: [600, "Invoice URL must be at most 600 characters"],
      trim: true,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: [true, "Payment status is required"],
      default: PaymentStatus.pending,
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ packageId: 1 });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ paymentDate: -1 });

export const PaymentModel = mongoose.model<IPayment>("Payment", PaymentSchema);
