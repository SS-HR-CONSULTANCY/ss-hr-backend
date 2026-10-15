/**
 * One-time backfill of `scheduledAt` (when a lead's schedule date was last set)
 * for leads that already have a scheduledDate. Uses the most recent "schedule"
 * entry in activityLog, otherwise the lead's updatedAt (approximate).
 * Idempotent: only touches leads where scheduledAt is missing.
 *
 * Usage:  node scripts/backfill-scheduled-at.js          (dry run)
 *         node scripts/backfill-scheduled-at.js --apply  (write changes)
 */
const mongoose = require("mongoose");
require("dotenv").config();
require("dns").setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const APPLY = process.argv.includes("--apply");
const uri =
  process.env.NODE_ENV === "development"
    ? process.env.MONGODB_LOCAL_URI
    : process.env.MONGODB_PRODUCTION_URI;

(async () => {
  await mongoose.connect(uri);
  const col = mongoose.connection.collection("importedcustomers");

  const cursor = col.find({
    scheduledDate: { $exists: true, $ne: null },
    scheduledAt: { $exists: false },
  });

  const ops = [];
  for await (const doc of cursor) {
    const scheduleEntries = (doc.activityLog || []).filter((a) => a.type === "schedule");
    const last = scheduleEntries.length ? scheduleEntries[scheduleEntries.length - 1].at : null;
    const scheduledAt = last || doc.updatedAt || doc.createdAt || new Date();
    ops.push({
      updateOne: {
        filter: { _id: doc._id, scheduledAt: { $exists: false } },
        update: { $set: { scheduledAt } },
      },
    });
  }

  console.log(`${ops.length} scheduled leads need scheduledAt.`);
  if (APPLY && ops.length) {
    const res = await col.bulkWrite(ops, { ordered: false });
    console.log(`Modified ${res.modifiedCount}. Backfill applied.`);
  } else if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to write changes.");
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
