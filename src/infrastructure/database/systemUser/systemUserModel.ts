import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemUser extends Document {
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'staff';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date | null;
  lastLogoutAt?: Date | null;
  isOnline?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemUserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], required: true },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    lastLogoutAt: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SystemUserModel = mongoose.model<ISystemUser>('SystemUser', SystemUserSchema);
