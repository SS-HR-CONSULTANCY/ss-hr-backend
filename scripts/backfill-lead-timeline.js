/**
 * One-time backfill: seeds `activityLog` for ImportedCustomer documents that
 * have no timeline yet, based on their current status / comment / schedule date.
 * Entries are dated with the lead's `updatedAt` (approximate). Idempotent: only
 * touches documents whose activityLog is missing or empty. Raw collection writes
 * are used so `updatedAt` is not modified.
 *
 * Usage:  node scripts/backfill-lead-timeline.js          (dry run)
 *         node scripts/backfill-lead-timeline.js --apply  (write changes)
 */
const mongoose = require("mongoose");
require("dotenv").config();
require("dns").setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const APPLY = process.argv.includes("--apply");
const uri =
  process.env.NODE_ENV === "development"
    ? process.env.MONGODB_LOCAL_URI
    : process.env.MONGODB_PRODUCTION_URI;

const toDay = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

(async () => {
  await mongoose.connect(uri);
  const col = mongoose.connection.collection("importedcustomers");

  const cursor = col.find({
    $or: [{ activityLog: { $exists: false } }, { activityLog: { $size: 0 } }],
  });

  const ops = [];
  let scanned = 0;
  for await (const doc of cursor) {
    scanned++;
    const at = doc.updatedAt || doc.createdAt || new Date();
    const log = [];
    if (doc.status && doc.status !== "Pending") {
      log.push({ type: "status", from: "Pending", to: doc.status, at });
    }
    if (doc.comment && String(doc.comment).trim()) {
      log.push({ type: "comment", from: "", to: String(doc.comment).trim(), at });
    }
    if (doc.scheduledDate) {
      log.push({ type: "schedule", from: "", to: toDay(doc.scheduledDate), at });
    }
    if (log.length === 0) continue;
    ops.push({
      updateOne: {
        filter: {
          _id: doc._id,
          $or: [{ activityLog: { $exists: false } }, { activityLog: { $size: 0 } }],
        },
        update: { $set: { activityLog: log } },
      },
    });
  }

  console.log(`Scanned ${scanned} leads without a timeline; ${ops.length} need backfill.`);
  if (APPLY && ops.length) {
    for (let i = 0; i < ops.length; i += 500) {
      const res = await col.bulkWrite(ops.slice(i, i + 500), { ordered: false });
      console.log(`Batch ${i / 500 + 1}: modified ${res.modifiedCount}`);
    }
    console.log("Backfill applied.");
  } else if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to write changes.");
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
