import { Types } from "mongoose";
import { Request, Response } from "express";
import { DecodedUser } from "../../express";
import {
  loginZodSchema,
  registerZodSchema,
  resendOTPZodSchema,
  otpVerificationZodSchema,
  verifyEmailZodSchema,
  updatePasswordZodSchema,
} from "../../infrastructure/zod/auth.zod";
import {
  LoginUseCase,
  RegisterUseCase,
  ResendOtpUseCase,
  VerifyOTPUseCase,
  CheckUserStatusUseCase,
  VerifyEmailUseCase,
  UpdatePasswordUseCase,
} from "../../application/authUse-cases/authUseCases";
import { appConfig } from "../../config/env";
import { HandleError } from "../../infrastructure/error/error";
import { SignedUrlService } from "../../infrastructure/service/generateSignedUrl";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { AddressRepositoryImpl } from "../../infrastructure/database/address/addressRepositoryImpl";
import { SignedUrlRepositoryImpl } from "../../infrastructure/database/signedUrl/signedUrlRepositoryImpl";
import { CareerDataRepositoryImpl } from "../../infrastructure/database/careerData/careerDataRepositoryImpl";
import { JWTService } from "../../infrastructure/security/jwt";

const userRepositoryImpl = new UserRepositoryImpl();
const addressRepositoryImpl = new AddressRepositoryImpl();
const signedUrlRepositoryImpl = new SignedUrlRepositoryImpl();
const careerDataRepositoryImpl = new CareerDataRepositoryImpl();

const verifyOTPUseCase = new VerifyOTPUseCase(userRepositoryImpl);
const resendOtpUseCase = new ResendOtpUseCase(userRepositoryImpl);
const verifyEmailUseCase = new VerifyEmailUseCase(userRepositoryImpl);
const updatePasswordUseCase = new UpdatePasswordUseCase(userRepositoryImpl);
const checkUserStatusUseCase = new CheckUserStatusUseCase(userRepositoryImpl);
const signedUrlService = new SignedUrlService(signedUrlRepositoryImpl); const registerUseCase = new RegisterUseCase(userRepositoryImpl);
const loginUseCase = new LoginUseCase(userRepositoryImpl, signedUrlService, addressRepositoryImpl, careerDataRepositoryImpl);

const isProduction = appConfig.nodeEnv === "production";

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private verifyOTPUseCase: VerifyOTPUseCase,
    private resendOtpUseCase: ResendOtpUseCase,
    private loginUseCase: LoginUseCase,
    private checkUserStatusUseCase: CheckUserStatusUseCase,
    private verifyEmailUseCase: VerifyEmailUseCase,
    private updatePasswordUseCase: UpdatePasswordUseCase,
  ) {
    this.register = this.register.bind(this);
    this.verifyOTP = this.verifyOTP.bind(this);
    this.resendOtp = this.resendOtp.bind(this);
    this.login = this.login.bind(this);
    this.checkUserStatus = this.checkUserStatus.bind(this);
    this.googleCallback = this.googleCallback.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const validateData = registerZodSchema.parse(req.body);
      const result = await this.registerUseCase.execute(validateData);

      res.cookie("token", result.user.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 2 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const { token: token, ...authUserWithoutToken } = result.user;
      const resultWithoutToken = {
        ...result,
        user: authUserWithoutToken,
      };
      res.status(200).json(resultWithoutToken);
    } catch (error) {
      HandleError.handle(error, res);
    }
  };

  async verifyOTP(req: Request, res: Response) {
    try {
      const validateData = otpVerificationZodSchema.parse(req.body);
      const { otp, verificationToken, role } = validateData;
      if (!otp || !verificationToken || !role)
        throw new Error("Invalid request.");
      const result = await this.verifyOTPUseCase.execute({
        otp,
        verificationToken,
        role,
      });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async resendOtp(req: Request, res: Response) {
    try {
      const validateData = resendOTPZodSchema.parse(req.body);
      const { role, verificationToken, email } = validateData;
      if (!role || (!verificationToken && !email))
        throw new Error("Invalid request.");
      const result = await this.resendOtpUseCase.execute({
        role,
        verificationToken,
        email,
      });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validateData = loginZodSchema.parse(req.body);
      const { email, password, role } = validateData;
      if (!email || !password || !role) throw new Error("Invalid request.");
      const { success, message, user, token, address, careerData } = await this.loginUseCase.execute({
        email,
        password,
        role,
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 2 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const resultWithoutToken = {
        success,
        message,
        user,
        address,
        careerData
      };

      res.status(200).json(resultWithoutToken);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      res.clearCookie("token");
      res
        .status(200)
        .json({ success: true, message: "Logged out successfully." });
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async checkUserStatus(req: Request, res: Response) {
    try {
      const user = (req.user as DecodedUser);
      if (!user) throw new Error("User not found");
      const result = await this.checkUserStatusUseCase.execute({
        id: new Types.ObjectId(user.userId),
        role: user.role,
      });
      res.status(result.status).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async googleCallback(req: Request, res: Response) {
    try {
      if (!req.user) {
        const frontendUrl = appConfig.frontendUrl;
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }

      const user = (req.user as any);

      const token = JWTService.generateToken({
        email: user.email,
        role: user.role,
        userId: user._id || user.id
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 2 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const frontendUrl = appConfig.frontendUrl;
      res.redirect(`${frontendUrl}/`);
    } catch (error) {
      const frontendUrl = appConfig.frontendUrl;
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const validatedData = verifyEmailZodSchema.parse(req.body);
      const result = await this.verifyEmailUseCase.execute({ email: validatedData.email });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updatePassword(req: Request, res: Response) {
    try {
      const validatedDate = updatePasswordZodSchema.parse(req.body);
      const result = await this.updatePasswordUseCase.execute(validatedDate);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}


export const authController = new AuthController(
  registerUseCase,
  verifyOTPUseCase,
  resendOtpUseCase,
  loginUseCase,
  checkUserStatusUseCase,
  verifyEmailUseCase,
  updatePasswordUseCase
);