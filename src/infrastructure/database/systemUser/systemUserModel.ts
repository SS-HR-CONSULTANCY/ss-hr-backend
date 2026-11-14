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
  workDate?: string | null;
  workCompletedMs?: number;
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
    // Logged-in time already finished on `workDate` (IST, YYYY-MM-DD).
    workDate: { type: String, default: null },
    workCompletedMs: { type: Number, default: 0 },
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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** IST calendar date (YYYY-MM-DD) for a moment in time. */
export const getIstDateKey = (date: Date): string =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Midnight IST of the day containing `date`, as a UTC Date. */
export const getIstDayStart = (date: Date): Date => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS
  );
};

type SessionFields = {
  lastLoginAt?: Date | string | null;
  lastLogoutAt?: Date | string | null;
  workDate?: string | null;
  workCompletedMs?: number | null;
};

export const hasOpenSession = (u: SessionFields): boolean =>
  Boolean(
    u.lastLoginAt && (!u.lastLogoutAt || new Date(u.lastLoginAt) > new Date(u.lastLogoutAt))
  );

/** Finished logged-in time for the IST day containing `now` (0 if it belongs to another day). */
export const getCompletedMsForDay = (u: SessionFields, now: Date): number =>
  u.workDate === getIstDateKey(now) ? Math.max(0, Number(u.workCompletedMs) || 0) : 0;

/**
 * Closes the user's open session at `endAt` and adds its time (the part on endAt's IST day)
 * to that day's total. Returns the fields to $set, or null if there is no open session.
 */
export const closeSessionUpdate = (
  u: SessionFields,
  endAt: Date
): { workDate: string; workCompletedMs: number } | null => {
  if (!hasOpenSession(u)) return null;
  const dayStart = getIstDayStart(endAt);
  const loginAt = new Date(u.lastLoginAt as Date);
  const start = loginAt > dayStart ? loginAt : dayStart;
  const durationMs = Math.max(0, endAt.getTime() - start.getTime());
  return {
    workDate: getIstDateKey(endAt),
    workCompletedMs: getCompletedMsForDay(u, endAt) + durationMs,
  };
};

/**
 * Total logged-in time for today (IST). An open session counts up to `now` while the user
 * is online; if they went offline without logging out, it counts only up to their last heartbeat.
 */
export const getTodayWorkMs = (
  u: SessionFields & { lastSeenAt?: Date | string | null },
  now: Date,
  isOnline: boolean
): number => {
  let total = getCompletedMsForDay(u, now);
  if (hasOpenSession(u)) {
    const dayStart = getIstDayStart(now);
    const loginAt = new Date(u.lastLoginAt as Date);
    const start = loginAt > dayStart ? loginAt : dayStart;
    let end = now;
    if (!isOnline) {
      const seenAt = u.lastSeenAt ? new Date(u.lastSeenAt) : loginAt;
      end = seenAt < now ? seenAt : now;
    }
    total += Math.max(0, end.getTime() - start.getTime());
  }
  return total;
};

export const SystemUserModel = mongoose.model<ISystemUser>('SystemUser', SystemUserSchema);
