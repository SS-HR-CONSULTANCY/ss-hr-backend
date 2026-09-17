import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { adminConfig } from '../../config/env';
import { User } from '../../domain/entities/user';
import { Address } from '../../domain/entities/address';
import { CareerData } from '../../domain/entities/careerData';
import { JWTService } from '../../infrastructure/security/jwt';
import { ApiResponse } from '../../infrastructure/dtos/common.dts';
import { OTPService } from '../../infrastructure/service/otpService';
import { LimitedRole, Role } from '../../infrastructure/zod/common.zod';
import { CreateLocalUser } from '../../domain/repositories/IUserRepository';
import { handleUseCaseError } from '../../infrastructure/error/useCaseError';
import { PasswordHasher } from '../../infrastructure/security/passwordHasher';
import { SignedUrlService } from '../../infrastructure/service/generateSignedUrl';
import { UserRepositoryImpl } from '../../infrastructure/database/user/userRepositoryImpl';
import { AddressRepositoryImpl } from '../../infrastructure/database/address/addressRepositoryImpl';
import { CareerDataRepositoryImpl } from '../../infrastructure/database/careerData/careerDataRepositoryImpl';
import { CheckUserStatusRequest, CheckUserStatusResponse, LoginRequest, LoginResponse, OTPVerificationRequest, RegisterRequest, RegisterResponse, ResendOtpRequest, ResendOtpResponse, UpdatePasswordRequest, VerifyEmailRequest, VerifyEmailResponse } from '../../infrastructure/dtos/auth.dto';

export class RegisterUseCase {
  constructor(
    private userRepositoryImpl: UserRepositoryImpl
  ) { }

  async execute(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const { email, password, fullName, role } = data;

      const existingUser = await this.userRepositoryImpl.findUserByEmailWithRole(email, role);
      if (existingUser?.isVerified) throw new Error("User already exists with this email");

      const hashedPassword = await PasswordHasher.hashPassword(password);

      const verificationToken = uuidv4();
      if (!verificationToken) throw new Error("Unexpected error, please try again.");

      const otp = await OTPService.setOtp(verificationToken);
      if (!otp) throw new Error("Unexpected error, please try again.");

      await OTPService.sendOTP(email, otp);

      if (existingUser) {
        existingUser.verificationToken = verificationToken;
        existingUser.password = hashedPassword;
        await this.userRepositoryImpl.updateUser(existingUser as User);
      } else {
        await this.userRepositoryImpl.createUser<CreateLocalUser>({
          fullName: fullName,
          email: email,
          password: hashedPassword,
          verificationToken: verificationToken,
          role: role,
        });
      }

      const token = JWTService.generateToken({ email, role });

      return { success: true, message: `OTP sent to email`, user: { verificationToken, role, token } };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in VerifyOTPUseCase");
    }
  }
}

export class VerifyOTPUseCase {
  constructor(private userRepository: UserRepositoryImpl) { }

  async execute(data: OTPVerificationRequest): Promise<ApiResponse> {
    try {
      const { otp, verificationToken, role } = data;
      if (!otp || !verificationToken || !role) throw new Error("Invalid request.");

      const user = await this.userRepository.verifyUser(verificationToken);
      if (!user) throw new Error("Verification failed, please try again");

      const isValidOTP = await OTPService.verifyOTP(verificationToken, otp);
      if (!isValidOTP) throw new Error("Invalid or expired OTP.");

      user.isVerified = true;
      await this.userRepository.updateUser(user);

      return { success: true, message: 'OTP verified successfully.' };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in VerifyOTPUseCase");
    }
  }
}


export class ResendOtpUseCase {

  constructor(private userRepositoryImpl: UserRepositoryImpl) { }

  async execute(data: ResendOtpRequest): Promise<ResendOtpResponse> {
    try {

      const { role, verificationToken, email } = data;
      if (!role || (!verificationToken && !email)) throw new Error("Invalid request.");

      let user: User | null = null;

      if (email && role) {
        if (role === LimitedRole.User) {
          user = await this.userRepositoryImpl.findUserByEmailWithRole(email, role);
        }

      } else if (verificationToken && role) {
        user = await this.userRepositoryImpl.verifyUser(verificationToken);
      } else {
        throw new Error("Invalid request.");
      }

      if (!user || !user?.email || !user?.verificationToken) throw new Error("Please register.")

      const otp = await OTPService.setOtp(user?.verificationToken);
      if (!otp) throw new Error("Unexpected error, please try again.");

      await OTPService.sendOTP(user?.email, otp);

      return { success: true, message: `OTP sent to email.`, user: { verificationToken: user.verificationToken, role } };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in VerifyOTPUseCase");
    }
  }
}


export class LoginUseCase {
  constructor(
    private userRepositoryImpl: UserRepositoryImpl,
    private signedUrlService: SignedUrlService,
    private addressRepositoryImpl: AddressRepositoryImpl,
    private careerDataRepositoryImpl: CareerDataRepositoryImpl,
  ) { }

  async execute(data: LoginRequest): Promise<LoginResponse> {
    try {
      const { email, password, role } = data;
      if (!email || !password || !role) throw new Error("Invalid request.");

      let user: User | null = null;

      if (role === LimitedRole.User) {
        user = await this.userRepositoryImpl.findUserByEmailWithRole(email, role);
      } else if (role === Role.Admin) {
        if (email !== adminConfig.adminEmail || password !== adminConfig.adminPassword) {
          throw new Error("Invalid credentials.");
        }
        const token = JWTService.generateToken({ email: email, role: role });
        return { success: true, message: "Logged In Successfully.", user: { fullName: "Super Admin", profileImage: "", role: role }, token };
      } else {
        throw new Error("Invalid request.");
      }

      if (!user) throw new Error("Invalid credentials")

      if (user.isBlocked) throw new Error("Your account is blocked, please contact us.");
      if (!user.isVerified) throw new Error("Your registration was incomplete, please register again.");

      const valid = await PasswordHasher.comparePassword(password, user.password);

      if (!valid) throw new Error("Invalid credentials.");

      const token = JWTService.generateToken({ userId: user._id, role: role });

      let profileImageSignedUrl: string = "";
      let resumeSignedUrl: string = "";

      if (user.profileImage) {
        profileImageSignedUrl = await this.signedUrlService.generateSignedUrl(user.profileImage);
      }

      if (user.resume) {
        resumeSignedUrl = await this.signedUrlService.generateSignedUrl(user.resume);
      }

      let userAddress: Address | null = null;
      let careerData: CareerData | null = null;

      if (role === LimitedRole.User) {
        userAddress = await this.addressRepositoryImpl.findAddressesByUserId(user._id);
        careerData = await this.careerDataRepositoryImpl.findCareerDataByUserId(user._id);
      }

      return {
        success: true,
        message: 'Logged In Successfully.',
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profileImage: profileImageSignedUrl,
          role: role,
          dob: user.dob,
          gender: user.gender,
          nationality: user.nationality,
          phone: user.phone,
          phoneTwo: user.phoneTwo,
          linkedInUsername: user.linkedInUsername,
          portfolioUrl: user.portfolioUrl,
          resume: resumeSignedUrl,
          professionalStatus: user.professionalStatus
        },
        token,
        address: userAddress ?? null,
        careerData: careerData ?? null
      };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in VerifyOTPUseCase");
    }
  }
}


export class CheckUserStatusUseCase {
  constructor(private userRepository: UserRepositoryImpl) { }

  async execute(data: CheckUserStatusRequest): Promise<CheckUserStatusResponse> {
    const { id, role } = data;

    if (role === Role.Admin || role === "admin") {
      return { 
        status: 200, 
        success: true, 
        message: "Your account is active.",
        user: {
          _id: "admin-id" as any,
          fullName: "Admin",
          email: adminConfig.adminEmail,
          role: role,
        } as any
      };
    }

    if (!id) {
       return { status: 404, success: false, message: "User ID missing." };
    }

    const user = await this.userRepository.findUserById(new Types.ObjectId(id));
    if (!user) {
      return { status: 404, success: false, message: "User not found." };
    }
    if (user.isBlocked) {
      return { status: 403, success: false, message: "Your account has been blocked." };
    } else {
      return { 
        status: 200, 
        success: true, 
        message: "Your account is active.",
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profileImage: user.profileImage,
          role: user.role,
          phone: user.phone,
          phoneTwo: user.phoneTwo,
          gender: user.gender,
          nationality: user.nationality,
          dob: user.dob,
          linkedInUsername: user.linkedInUsername,
          portfolioUrl: user.portfolioUrl,
          resume: user.resume,
          professionalStatus: user.professionalStatus
        }
      };
    }
  }
}


export class VerifyEmailUseCase {
  constructor(
    private userRepositoryImpl: UserRepositoryImpl,
  ) { }

  async execute(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    try {
      const { email } = data;

      const user = await this.userRepositoryImpl.findUserByEmail(email);
      if (!user) throw new Error("Invalid credential");

      const otp = await OTPService.setOtp(user.verificationToken);
      if (!otp) throw new Error("Failed to generate otp.");

      await OTPService.sendOTP(email, otp);
      return {
        success: true, message: "Otp has been sent.", data: {
          email: user.email,
          verificationToken: user.verificationToken,
          role: user.role
        }
      }
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in VerifyEmailUseCase");
    }
  }
}


export class UpdatePasswordUseCase {
  constructor(
    private userRepositoryImpl: UserRepositoryImpl
  ) { }

  async execute(data: UpdatePasswordRequest): Promise<ApiResponse> {
    try {
      const { email, password, role, verificationToken } = data;

      const user = await this.userRepositoryImpl.findUserByEmailWithRole(email, role);
      if (user?.verificationToken !== verificationToken.toString()) {
        throw new Error("You are not able to update password, please try again");
      }

      const hashedPassword = await PasswordHasher.hashPassword(password);
      if (!hashedPassword) throw new Error("Failed to update password");

      user.password = hashedPassword;

      const updatedUser = await this.userRepositoryImpl.updateUser(user);
      if (!updatedUser) throw new Error("Failed to update password");

      return { success: true, message: "Password has been updated successfully." };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in UpdatePasswordUseCase");
    }
  }
}