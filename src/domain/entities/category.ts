import { Types } from "mongoose";

export class Category {
  constructor(
    public readonly _id: Types.ObjectId,
    public name: string,
    public createdAt?: Date,
    public updatedAt?: Date
  ) {}
}
