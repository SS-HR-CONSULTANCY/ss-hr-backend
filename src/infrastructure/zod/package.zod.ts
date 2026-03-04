import { z } from "zod";
import { packageName } from "./common.zod";

export const createPackageSchema = z.object({
  packageName,
  price: z.string().min(1, "Price is required"),
  currency: z.enum(["Rs.", "AED"] as [string, ...string[]], { error: "Currency must be Rs. or AED" }),
  packageIncludes: z.string().min(5, "Package includes must be at least 5 characters").max(2000),
  packageCategory: z.enum(["general", "visitvisa", "visa"] as [string, ...string[]], { error: "Invalid package category" }),
});
