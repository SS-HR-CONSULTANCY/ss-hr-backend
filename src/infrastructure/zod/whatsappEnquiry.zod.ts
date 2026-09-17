import { z } from "zod";

export const createWhatsappEnquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactNumber: z.string().min(6, "Contact number is required"),
  subject: z.string().min(2, "Subject is required"),
  date: z.string().or(z.date()).optional(),
  status: z.enum(["pending", "contacted", "under_processing", "delivered"] as [string, ...string[]]).optional(),
  account: z.string().optional().nullable(),
});

export const updateWhatsappEnquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  contactNumber: z.string().min(6, "Contact number is required").optional(),
  subject: z.string().min(2, "Subject is required").optional(),
  date: z.string().or(z.date()).optional(),
  status: z.enum(["pending", "contacted", "under_processing", "delivered"] as [string, ...string[]]).optional(),
  account: z.string().optional().nullable(),
});

export const updateWhatsappEnquiryStatusSchema = z.object({
  status: z.enum(["pending", "contacted", "under_processing", "delivered"] as [string, ...string[]]),
});
