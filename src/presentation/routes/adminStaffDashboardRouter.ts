import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { FullStackContactModel } from "../../infrastructure/database/fullStackContact/fullStackContactModel";
import { ImportedCustomerModel } from "../../infrastructure/database/importedCustomer/importedCustomerModel";
import { DailyDutyModel } from "../../infrastructure/database/dailyDuty/dailyDutyModel";
import { SystemUserModel } from "../../infrastructure/database/systemUser/systemUserModel";
import { authMiddleware } from "../middleware/authMiddleware";

export const adminStaffDashboardRouter = Router();

adminStaffDashboardRouter.use(authMiddleware);

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

/** Dates are stored/compared as UTC YYYY-MM-DD strings across the app */
const dayKey = (d: Date | string): string => new Date(d).toISOString().slice(0, 10);

type SourceKey = "fss" | "platform";

interface SourceConfig {
  key: SourceKey;
  label: string;
  converted: string[];
  lost: string[];
}

const SOURCES: Record<SourceKey, SourceConfig> = {
  fss: { key: "fss", label: "Full Stack Solutions", converted: ["Converted", "Completed"], lost: ["Lost"] },
  platform: {
    key: "platform",
    label: "Contact List",
    converted: ["Completed", "Processing Application"],
    lost: ["Not Interested", "Rejected Application"],
  },
};

const FOLLOW_UP_STATUSES = ["Need Follow Up", "Re-contacted", "Recontacted"];

// GET / - Dashboard data for one staff member.
// Staff always get their own data; admins may pass ?staffId= to look at a specific staff member.
adminStaffDashboardRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.user as any;
    const staffId: string =
      me?.role === "staff" ? String(me.userId) : String(req.query.staffId || me?.userId || "");

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      res.status(400).json({ success: false, message: "Invalid staff id" });
      return;
    }

    const staffUser: any = await SystemUserModel.findById(staffId).select("fullName username role").lean();
    if (!staffUser) {
      res.status(404).json({ success: false, message: "Staff member not found" });
      return;
    }

    const sid = new mongoose.Types.ObjectId(staffId);
    const today = dayKey(new Date());
    // FSS activity entries store the actor's username/name as a string; platform entries store the user id
    const actorNames = new Set(
      [staffUser.username, staffUser.fullName].filter(Boolean).map((n: string) => n.toLowerCase())
    );

    const [fssLeads, platformLeads, duties] = await Promise.all([
      FullStackContactModel.find({ assignedTo: sid })
        .select("name companyName status scheduledDate activityLog")
        .lean(),
      ImportedCustomerModel.find({ assignedTo: sid }).select("name status scheduledDate activityLog").lean(),
      DailyDutyModel.find({ assignedTo: sid, dutyDate: today }).select("status").lean(),
    ]);

    const sourceLeads: Array<{ cfg: SourceConfig; leads: any[] }> = [
      { cfg: SOURCES.fss, leads: fssLeads },
      { cfg: SOURCES.platform, leads: platformLeads },
    ];

    // ---- Lead KPIs + status breakdown + follow-up list ----
    let totalLeads = 0;
    let pending = 0;
    let converted = 0;
    let lost = 0;
    let followUpsToday = 0;
    let missedFollowUps = 0;

    const statusCounts = new Map<string, { fss: number; platform: number }>();
    const followUps: Array<{
      name: string;
      source: string;
      status: string;
      scheduledDate: string;
      overdue: boolean;
    }> = [];

    for (const { cfg, leads } of sourceLeads) {
      for (const lead of leads) {
        totalLeads++;
        const status: string = lead.status || "Pending";
        const row = statusCounts.get(status) || { fss: 0, platform: 0 };
        row[cfg.key]++;
        statusCounts.set(status, row);

        const isConverted = cfg.converted.includes(status);
        const isLost = cfg.lost.includes(status);
        if (status === "Pending") pending++;
        if (isConverted) converted++;
        if (isLost) lost++;

        if (isConverted || isLost || !lead.scheduledDate) continue;
        const scheduled = dayKey(lead.scheduledDate);
        const overdue = scheduled < today && FOLLOW_UP_STATUSES.includes(status);
        if (scheduled === today) followUpsToday++;
        if (overdue) missedFollowUps++;
        if (scheduled === today || overdue) {
          followUps.push({
            name: lead.companyName || lead.name,
            source: cfg.label,
            status,
            scheduledDate: scheduled,
            overdue,
          });
        }
      }
    }

    followUps.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    // ---- Activity chart + recent activity feed (only actions performed by this staff member) ----
    const sinceKey = dayKey(new Date(Date.now() - (CHART_DAYS - 1) * DAY_MS));
    const perDay = new Map<string, { fss: number; platform: number }>();
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      perDay.set(dayKey(new Date(Date.now() - i * DAY_MS)), { fss: 0, platform: 0 });
    }

    const recent: Array<{
      source: string;
      leadName: string;
      type: string;
      from: string;
      to: string;
      at: string;
    }> = [];
    let actionsToday = 0;

    for (const { cfg, leads } of sourceLeads) {
      for (const lead of leads) {
        for (const a of lead.activityLog || []) {
          if (!a?.at || a.type === "assignment") continue;
          const byThisStaff =
            cfg.key === "platform"
              ? a.by && String(a.by) === staffId
              : typeof a.by === "string" && actorNames.has(a.by.toLowerCase());
          if (!byThisStaff) continue;

          const k = dayKey(a.at);
          if (k === today) actionsToday++;
          if (k >= sinceKey && perDay.has(k)) perDay.get(k)![cfg.key]++;

          recent.push({
            source: cfg.label,
            leadName: lead.companyName || lead.name,
            type: a.type,
            from: a.from || "",
            to: a.to || "",
            at: new Date(a.at).toISOString(),
          });
        }
      }
    }

    recent.sort((a, b) => b.at.localeCompare(a.at));

    const dutiesDone = duties.filter((d: any) => ["completed", "validated"].includes(d.status)).length;

    res.status(200).json({
      success: true,
      data: {
        staff: { _id: staffId, fullName: staffUser.fullName, username: staffUser.username },
        kpis: {
          totalLeads,
          pending,
          followUpsToday,
          missedFollowUps,
          converted,
          lost,
          conversionRate: totalLeads ? Math.round((converted / totalLeads) * 1000) / 10 : 0,
          actionsToday,
          dutiesToday: { total: duties.length, completed: dutiesDone },
        },
        statusBreakdown: [...statusCounts.entries()]
          .map(([status, c]) => ({ status, fss: c.fss, platform: c.platform, total: c.fss + c.platform }))
          .sort((a, b) => b.total - a.total),
        activityByDay: [...perDay.entries()].map(([date, c]) => ({ date, fss: c.fss, platform: c.platform })),
        followUps: followUps.slice(0, 8),
        recentActivities: recent.slice(0, 12),
      },
    });
  } catch (error) {
    next(error);
  }
});
