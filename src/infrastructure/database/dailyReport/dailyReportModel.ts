import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDailyReport extends Document {
  staffId: Types.ObjectId; // SystemUser
  date: string; // YYYY-MM-DD
  summary: string; // Key achievements & work done
  challenges: string; // Blockers, issues faced, learnings
  tomorrowPlan: string; // Plan for the next working day
  stats?: {
    totalAssigned: number;
    totalCompleted: number;
    totalValidated: number;
    totalStuck: number;
    completionRate: number;
  };
  status: "draft" | "submitted" | "reviewed";
  adminFeedback?: string;
  reviewedBy?: Types.ObjectId; // SystemUser (Admin)
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReportSchema = new Schema<IDailyReport>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "SystemUser", required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    summary: { type: String, required: true, trim: true },
    challenges: { type: String, default: "", trim: true },
    tomorrowPlan: { type: String, default: "", trim: true },
    stats: {
      totalAssigned: { type: Number, default: 0 },
      totalCompleted: { type: Number, default: 0 },
      totalValidated: { type: Number, default: 0 },
      totalStuck: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "reviewed"],
      default: "submitted",
      index: true,
    },
    adminFeedback: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "SystemUser" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// One report per staff per date
DailyReportSchema.index({ staffId: 1, date: 1 }, { unique: true });

export const DailyReportModel = mongoose.model<IDailyReport>("DailyReport", DailyReportSchema);
