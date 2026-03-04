import { Types } from "mongoose";

export type CurrencyType = "Rs." | "AED";
export type PackageCategoryType = "general" | "visitvisa" | "visa";

export class Package {
    constructor(
        public _id: Types.ObjectId,
        public packageName: string,
        public price: string,
        public currency: CurrencyType,
        public packageIncludes: string,
        public packageCategory: PackageCategoryType,
        public createdAt: string,
        public updatedAt: string,
    ) { }
}