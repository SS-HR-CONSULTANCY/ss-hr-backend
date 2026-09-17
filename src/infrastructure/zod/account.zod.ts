import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").trim(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").trim(),
});
