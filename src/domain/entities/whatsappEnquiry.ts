import { Types } from "mongoose";
import { EnquiryStatusType } from "./enquiry";

export class WhatsappEnquiry {
  constructor(
    public readonly _id: Types.ObjectId | string,
    public name: string,
    public contactNumber: string,
    public subject: string,
    public status: EnquiryStatusType,
    public date: Date,
    public createdAt?: Date,
    public updatedAt?: Date,
    public readonly account?: string,
    public readonly category?: string,
    public readonly comment?: string,
    public readonly reminder?: Date,
    public readonly statusHistory: Array<{ status: string; date: Date }> = [],
  ) {}
}
