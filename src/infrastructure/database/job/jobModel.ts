import mongoose, { Document, Schema, Types } from "mongoose";
import { REGEX_BENEFITS, REGEX_INDUSTRY, REGEX_LONG_TEXT, REGEX_NATIONALITY, REGEX_SKILLS, REGEX_TEXT_DOT_AMP } from "../../zod/regex";
import { CounterModel } from "../counter/counterModel";

export interface IJob extends Document {
  _id: Types.ObjectId;
  companyName: string;
  location: string;
  designation: string;
  salary: number;
  benifits: string;
  vacancy: number;
  currency: string;
  jobDescription: string;
  jobUniqueId: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },

    salary: {
      type: Number,
      required: [true, "Salary is required"],
      min: [0, "Salary cannot be negative"],
    },
    vacancy: {
      type: Number,
      default: 1,
    },
    currency: {
      type: String,
      enum: ["Rs", "AED"],
      default: "Rs",
    },
    benifits: {
      type: String,
    },

    jobDescription: {
      type: String,
      required: [true, "Job description is required"],
    },

    jobUniqueId: {
      type: String,
      unique: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

JobSchema.pre<IJob>("save", async function (next) {
  if (!this.jobUniqueId) {
    try {
      const counter = await CounterModel.findOneAndUpdate(
        { name: "job" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true } 
      );

      const seqNumber = counter.seq.toString().padStart(5, "0");
      this.jobUniqueId = `SHJ-${seqNumber}`;
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

export const JobModel = mongoose.model<IJob>("Job", JobSchema);
