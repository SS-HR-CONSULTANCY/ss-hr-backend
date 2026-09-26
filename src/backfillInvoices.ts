import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { BillModel } from "./infrastructure/database/bill/billModel";
import { EnquiryModel } from "./infrastructure/database/enquiry/enquiryModel";
import { WhatsappEnquiryModel } from "./infrastructure/database/whatsappEnquiry/whatsappEnquiryModel";

async function backfillInvoices() {
  try {
    const mongoUri = process.env.MONGODB_LOCAL_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_LOCAL_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const statusesToBill = ["processing_application", "completed"];

    // Process Website Enquiries
    const webEnquiries = await EnquiryModel.find({ status: { $in: statusesToBill } });
    console.log(`Found ${webEnquiries.length} website enquiries in billing states.`);
    
    for (const enq of webEnquiries) {
      const existing = await BillModel.findOne({ enquiryId: enq._id });
      if (!existing) {
        const bill = new BillModel({ enquiryId: enq._id, enquiryType: "Website" });
        await bill.save();
        console.log(`Created bill for Web Enquiry ${enq._id} -> ${bill.invoiceNumber}`);
      }
    }

    // Process WhatsApp Enquiries
    const waEnquiries = await WhatsappEnquiryModel.find({ status: { $in: statusesToBill } });
    console.log(`Found ${waEnquiries.length} WhatsApp enquiries in billing states.`);
    
    for (const enq of waEnquiries) {
      const existing = await BillModel.findOne({ enquiryId: enq._id });
      if (!existing) {
        const bill = new BillModel({ enquiryId: enq._id, enquiryType: "WhatsApp" });
        await bill.save();
        console.log(`Created bill for WhatsApp Enquiry ${enq._id} -> ${bill.invoiceNumber}`);
      }
    }

    console.log("Backfill complete!");
  } catch (error) {
    console.error("Error during backfill:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

backfillInvoices();
