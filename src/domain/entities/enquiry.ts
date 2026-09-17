import { Types } from "mongoose";

export type EnquiryStatusType = "pending" | "contacted" | "need_follow_up" | "not_interested" | "processing_application" | "completed" | "rejected_application";

export class Enquiry {
  constructor(
    public readonly _id: Types.ObjectId,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly subject: string,
    public readonly message: string,
    public readonly status: EnquiryStatusType,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly account?: string,
  ) {}
}
