import { Types } from "mongoose";

export class Testimonial {
  constructor(
    public _id: Types.ObjectId,
    public clientName: string,
    public designation: string,
    public testimonial: string,
    public isVisible: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}
}
