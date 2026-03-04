import { Types } from "mongoose";

export class Job {
    constructor(
        public _id: Types.ObjectId,
        public companyName: string,
        public designation: string,
        public salary: number,
        public benifits: string,
        public location: string,
        public vacancy: number,
        public currency: string,
        public jobDescription: string,
        public jobUniqueId: string,
        public createdAt: Date,
        public updatedAt: Date,
    ) { }
}




