import mongoose, { Document, Schema } from "mongoose";

export type LogAction = "CREATE" | "UPDATE" | "DELETE";
export type LogModule =
  | "Bill"
  | "BillPayment"
  | "Expense"
  | "ExpensePayment"
  | "Enquiry"
  | "WhatsappEnquiry"
  | "User"
  | "Job"
  | "Package"
  | "Application"
  | "Account"
  | "Payment"
  | "Testimonial"
  | "Category";

export interface IAdminLog extends Document {
  action: LogAction;
  module: LogModule;
  description: string;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, any>;
  performedBy?: string;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE"],
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
    },
    entityName: {
      type: String,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    performedBy: {
      type: String,
      default: "Admin",
    },
  },
  { timestamps: true }
);

// TTL index — auto-delete logs older than 90 days
AdminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AdminLogModel = mongoose.model<IAdminLog>("AdminLog", AdminLogSchema);
