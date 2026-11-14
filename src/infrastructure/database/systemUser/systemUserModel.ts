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
  lastSeenAt?: Date | null;
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
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A staff member counts as online only if their browser has sent a heartbeat recently.
// The frontend pings every 60s; 3 minutes tolerates background-tab timer throttling.
export const PRESENCE_TIMEOUT_MS = 3 * 60 * 1000;

export const computeIsOnline = (
  u: { isOnline?: boolean; lastSeenAt?: Date | string | null; lastLogoutAt?: Date | string | null },
  now: Date = new Date()
): boolean => {
  if (!u.isOnline || !u.lastSeenAt) return false;
  const lastSeen = new Date(u.lastSeenAt);
  if (now.getTime() - lastSeen.getTime() > PRESENCE_TIMEOUT_MS) return false;
  if (u.lastLogoutAt && new Date(u.lastLogoutAt) >= lastSeen) return false;
  return true;
};

export const SystemUserModel = mongoose.model<ISystemUser>('SystemUser', SystemUserSchema);
