import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffAuthLog extends Document {
  userId?: mongoose.Types.ObjectId | null;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
  action: 'LOGIN' | 'LOGOUT';
  ipAddress?: string;
  userAgent?: string;
  sessionDurationMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAuthLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'SystemUser', default: null, index: true },
    username: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    action: { type: String, enum: ['LOGIN', 'LOGOUT'], required: true, index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    sessionDurationMs: { type: Number, default: null },
  },
  { timestamps: true }
);

StaffAuthLogSchema.index({ createdAt: -1 });
StaffAuthLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const StaffAuthLogModel = mongoose.model<IStaffAuthLog>('StaffAuthLog', StaffAuthLogSchema);

