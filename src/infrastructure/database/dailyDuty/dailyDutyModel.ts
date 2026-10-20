import mongoose, { Document, Schema, Types } from "mongoose";

export type DutyPriority = "low" | "medium" | "high" | "urgent";
export type DutyStatus = "pending" | "in_progress" | "stuck" | "completed" | "validated" | "cancelled";
export type DutyCategory =
  | "telecalling"
  | "client_followup"
  | "documentation"
  | "full_stack"
  | "data_entry"
  | "operations"
  | "marketing"
  | "other";

export interface IDutyComment {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderRole: "admin" | "staff";
  text: string;
  createdAt: Date;
}

export interface IDailyDuty extends Document {
  title: string;
  description: string;
  assignedTo: Types.ObjectId; // SystemUser
  assignedBy?: Types.ObjectId; // SystemUser (Admin)
  dutyDate: string; // YYYY-MM-DD
  deadlineTime?: string; // e.g. "17:00" or "05:00 PM"
  deadline?: Date;
  priority: DutyPriority;
  category: DutyCategory;
  targetCount?: number;
  completedCount: number;
  status: DutyStatus;
  progress: number; // 0 - 100
  isCarriedForward?: boolean;
  originalDutyDate?: string;
  carriedForwardFrom?: string;
  carriedForwardAt?: Date;
  stuckInfo?: {
    isStuck: boolean;
    reason?: string;
    stuckAt?: Date;
    resolvedAt?: Date;
  };
  completionInfo?: {
    completedAt?: Date;
    notes?: string;
    proofLink?: string;
  };
  validationInfo?: {
    isValidated: boolean;
    validatedBy?: Types.ObjectId;
    validatedAt?: Date;
    rating?: number;
    feedback?: string;
  };
  comments: IDutyComment[];
  createdAt: Date;
  updatedAt: Date;
}

const DutyCommentSchema = new Schema<IDutyComment>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "SystemUser", required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ["admin", "staff"], required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DailyDutySchema = new Schema<IDailyDuty>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "SystemUser", required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "SystemUser" },
    dutyDate: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    deadlineTime: { type: String, default: "" },
    deadline: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    category: {
      type: String,
      enum: [
        "telecalling",
        "client_followup",
        "documentation",
        "full_stack",
        "data_entry",
        "operations",
        "marketing",
        "other",
      ],
      default: "other",
      index: true,
    },
    targetCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "stuck", "completed", "validated", "cancelled"],
      default: "pending",
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    isCarriedForward: { type: Boolean, default: false, index: true },
    originalDutyDate: { type: String, index: true },
    carriedForwardFrom: { type: String, index: true },
    carriedForwardAt: { type: Date },
    stuckInfo: {
      isStuck: { type: Boolean, default: false, index: true },
      reason: { type: String, default: "" },
      stuckAt: { type: Date },
      resolvedAt: { type: Date },
    },
    completionInfo: {
      completedAt: { type: Date },
      notes: { type: String, default: "" },
      proofLink: { type: String, default: "" },
    },
    validationInfo: {
      isValidated: { type: Boolean, default: false, index: true },
      validatedBy: { type: Schema.Types.ObjectId, ref: "SystemUser" },
      validatedAt: { type: Date },
      rating: { type: Number, min: 1, max: 5 },
      feedback: { type: String, default: "" },
    },
    comments: [DutyCommentSchema],
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes
DailyDutySchema.index({ dutyDate: 1, assignedTo: 1, status: 1 });
DailyDutySchema.index({ dutyDate: 1, "stuckInfo.isStuck": 1 });

export const DailyDutyModel = mongoose.model<IDailyDuty>("DailyDuty", DailyDutySchema);
