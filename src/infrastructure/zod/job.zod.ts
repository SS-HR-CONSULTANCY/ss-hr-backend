import { z } from "zod";
import { benifits, companyName, designation, location, jobDescription, salary } from "./common.zod";

// admin create job zod schema
export const createJobZodSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  designation: z.string().trim().min(1, "Designation is required"),
  jobDescription: z.string().trim().min(1, "Job description is required"),
  benifits: z.string().trim().optional(),
  salary: z.coerce.number().min(0, "Salary must be valid"),
  location: z.string().trim().min(1, "Location is required"),
  vacancy: z.coerce.number().min(1, "Vacancy must be at least 1"),
  currency: z.enum(["Rs", "AED"]).default("Rs"),
});