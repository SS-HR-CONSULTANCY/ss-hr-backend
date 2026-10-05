import { z } from 'zod';
import { email, fullName, limitedRoleSchema, otp, password, roleSchema, verificationToken, LimitedRole } from './common.zod';

// register user zod validation
export const registerZodSchema = z.object({
  fullName,
  email,
  password,
  role: z.literal(LimitedRole.User)
});

// otp verification zod validation
export const otpVerificationZodSchema = z.object({
  otp,
  verificationToken,
  role: limitedRoleSchema
});

// resend otp controller zod validation
export const resendOTPZodSchema = z.object({
  role: limitedRoleSchema,
  verificationToken: verificationToken.optional(),
  email: email.optional()
});

// login controller zod validation
export const loginZodSchema = z.object({ 
  email: z.union([email, z.literal("")]).optional(), 
  username: z.union([z.string(), z.literal("")]).optional(), 
  password, 
  role: roleSchema 
});

// verify email controller zod validation
export const verifyEmailZodSchema = z.object({ email });

// update password zod validation
export const updatePasswordZodSchema = z.object({
  role: limitedRoleSchema,
  email,
  verificationToken: verificationToken,
  password
});

