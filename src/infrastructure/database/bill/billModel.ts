import mongoose, { Document, Schema, Types } from "mongoose";
import { CounterModel } from "../counter/counterModel";

export interface IBill extends Document {
  enquiryId: Types.ObjectId;
  enquiryType: "Website" | "WhatsApp";
  invoiceNumber: string;
  currency: "AED" | "INR";
  invoiceAmount: number;
  paymentHistory: Array<{ date: Date; amount: number }>;
  balanceAmount: number;
  status: "pending" | "partially_paid" | "paid";
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema = new Schema<IBill>(
  {
    enquiryId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "enquiryType",
    },
    enquiryType: {
      type: String,
      required: true,
      enum: ["Website", "WhatsApp"], // Note: Should match the model names if refPath is used dynamically, but here we can just use these strings and manage populate manually if needed. Actually, Mongoose requires refPath to match the registered model name. Enquiry model is "Enquiry", Whatsapp model is "WhatsappEnquiry".
    },
    invoiceNumber: {
      type: String,
      unique: true,
    },
    currency: {
      type: String,
      enum: ["AED", "INR"],
      default: "AED",
    },
    invoiceAmount: {
      type: Number,
      default: 0,
    },
    paymentHistory: {
      type: [
        {
          date: { type: Date, required: true },
          amount: { type: Number, required: true },
        },
      ],
      default: [],
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "partially_paid", "paid"],
      default: "pending",
    },
    comment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

BillSchema.pre("save", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const counter = await CounterModel.findOneAndUpdate(
        { name: "invoiceNumber" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      // Format to INV-001, INV-002, etc.
      this.invoiceNumber = `INV-${counter.seq.toString().padStart(3, "0")}`;
      next();
    } catch (error: any) {
      next(error);
    }
  } else {
    next();
  }
});

export const BillModel = mongoose.model<IBill>("Bill", BillSchema);
