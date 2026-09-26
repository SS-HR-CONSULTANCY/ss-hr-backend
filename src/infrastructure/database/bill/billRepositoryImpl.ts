import { Types } from "mongoose";
import { BillModel, IBill } from "./billModel";
import { EnquiryModel } from "../enquiry/enquiryModel";
import { WhatsappEnquiryModel } from "../whatsappEnquiry/whatsappEnquiryModel";
import { ApiPaginationRequest } from "../../dtos/common.dts";

export class BillRepositoryImpl {
  async getCompletedEnquiriesWithBills(params: ApiPaginationRequest) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    
    // Fetch all enquiries (both Website and WhatsApp) with status 'processing_application' or 'completed'
    // and sort them by date descending.

    // Get Website Enquiries
    const webEnquiries = await EnquiryModel.find({ status: { $in: ["processing_application", "completed"] } }).lean();
    
    // Get WhatsApp Enquiries
    const waEnquiries = await WhatsappEnquiryModel.find({ status: { $in: ["processing_application", "completed"] } }).lean();

    // Map them into a standard format
    const formattedWeb = webEnquiries.map((w: any) => ({
      ...w,
      enquiryType: "Website",
      name: `${w.firstName || ""} ${w.lastName || ""}`.trim(),
      phone: w.phone,
      date: w.createdAt,
    }));

    const formattedWa = waEnquiries.map((w: any) => ({
      ...w,
      enquiryType: "WhatsApp",
      name: w.name,
      phone: w.contactNumber,
      date: w.createdAt || w.date,
    }));

    let allCompleted = [...formattedWeb, ...formattedWa];

    // Filter by search if needed
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      allCompleted = allCompleted.filter(e => 
        searchRegex.test(e.name) || searchRegex.test(e.phone)
      );
    }

    // Sort by date descending
    allCompleted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const totalCount = allCompleted.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedEnquiries = allCompleted.slice(skip, skip + limit);

    // Fetch bills for these paginated enquiries
    const enquiryIds = paginatedEnquiries.map(e => e._id);
    const bills = await BillModel.find({ enquiryId: { $in: enquiryIds } }).lean();

    const billsMap = new Map();
    bills.forEach(b => billsMap.set(b.enquiryId.toString(), b));

    // Combine them
    const data = paginatedEnquiries.map(enq => {
      const bill = billsMap.get(enq._id.toString());
      return {
        _id: enq._id,
        enquiryType: enq.enquiryType,
        name: enq.name,
        phone: enq.phone,
        date: enq.date, // The date the enquiry was created
        billId: bill?._id || null,
        invoiceNumber: bill?.invoiceNumber || null,
        currency: bill?.currency || "AED",
        invoiceAmount: bill?.invoiceAmount || 0,
        paymentHistory: bill?.paymentHistory || [],
        balanceAmount: bill?.balanceAmount || 0,
        status: bill?.status || "pending",
        comment: bill?.comment || "",
      };
    });

    return {
      success: true,
      data,
      totalCount,
      totalPages,
      currentPage: page,
    };
  }

  async updateOrCreateBill(
    enquiryId: string, 
    enquiryType: string, 
    data: { 
      invoiceAmount?: number;
      currency?: "AED" | "INR";
      status?: "pending" | "partially_paid" | "paid";
      comment?: string;
    }
  ) {
    let bill = await BillModel.findOne({ enquiryId });
    if (!bill) {
      bill = new BillModel({
        enquiryId,
        enquiryType,
        ...data,
      });
      await bill.save(); // pre-save will generate invoiceNumber
    } else {
      if (data.invoiceAmount !== undefined) {
        bill.invoiceAmount = data.invoiceAmount;
        // Recalculate balance
        const totalPaid = bill.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        bill.balanceAmount = Math.max(0, bill.invoiceAmount - totalPaid);
      }
      if (data.currency) bill.currency = data.currency;
      if (data.status) bill.status = data.status;
      if (data.comment !== undefined) bill.comment = data.comment;
      
      await bill.save();
    }
    return bill;
  }

  async addPayment(enquiryId: string, enquiryType: string, payment: { date: Date, amount: number }) {
    let bill = await BillModel.findOne({ enquiryId });
    if (!bill) {
      bill = new BillModel({
        enquiryId,
        enquiryType,
        paymentHistory: [payment],
        balanceAmount: 0 // Will recalculate below
      });
    } else {
      bill.paymentHistory.push(payment);
    }
    
    // Recalculate balance
    const totalPaid = bill.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    bill.balanceAmount = Math.max(0, bill.invoiceAmount - totalPaid);
    
    // Auto update status? 
    if (bill.balanceAmount === 0 && bill.invoiceAmount > 0) {
      bill.status = "paid";
    } else if (totalPaid > 0) {
      bill.status = "partially_paid";
    }
    
    await bill.save();
    return bill;
  }
}
