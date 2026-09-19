import { Types } from "mongoose";

export class Account {
  constructor(
    public readonly _id: Types.ObjectId | string,
    public name: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly leadsCount?: number
  ) {}
}
