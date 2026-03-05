import { Types } from "mongoose";
import { PaymentMethodType, PaymentStatusType } from "../../infrastructure/zod/common.zod";

export class Payment {
    constructor(
        public _id: Types.ObjectId,
        public customerName: string,
        public packageName: string,
        public totalAmount: number,
        public paidAmount: number,
        public balanceAmount: number,
        public paymentMethod: PaymentMethodType,
        public paymentDate: Date,
        public adminNotes: string,
        public referenceId: string,
        public paymentProof: string,
        public invoiceUrl: string,
        public paymentStatus: PaymentStatusType,
        public createdAt: Date,
        public updatedAt: Date,
    ) { }

}