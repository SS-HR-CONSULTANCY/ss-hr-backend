import { z } from "zod";
import { stringField } from "./zodUtilities";

export const createEnquirySchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(["pending", "contacted", "need_follow_up", "not_interested", "processing_application", "completed", "rejected_application"] as [string, ...string[]]),
});
