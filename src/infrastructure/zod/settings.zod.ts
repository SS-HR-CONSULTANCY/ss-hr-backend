import z, { email } from "zod";
import { enumField } from "./zodUtilities";
import { fullName, limitedRoleSchema, password, phone } from "./common.zod";

// admin create new admin zod schema
export const createAdminZodSchema = z.object({
    fullName,
    email,
    password,
    phone,
    role: limitedRoleSchema,
    createrRole: enumField("creatorRole", ["admin"])
});
