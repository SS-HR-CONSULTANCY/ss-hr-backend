import { ApiResponse } from "../../infrastructure/dtos/common.dts";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { PasswordHasher } from "../../infrastructure/security/passwordHasher";
import { CreateLocalUserByAdmin } from "../../domain/repositories/IUserRepository";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { AddressRepositoryImpl } from "../../infrastructure/database/address/addressRepositoryImpl";
import { CareerDataRepositoryImpl } from "../../infrastructure/database/careerData/careerDataRepositoryImpl";
import { AdminFetchUserDetailsRequest, AdminFetchUserDetailsResponse, GetOverviewGraphDataResponse, GetOverviewStatsResponse } from "../../infrastructure/dtos/admin.dtos";
import {CreateUserByAdminRequest,CreateUserByAdminResponse,UpdateUserRequest,UpdateUserResponse,DeleteUserRequest,GetUserByIdRequest,GetUserByIdResponse} from "../../infrastructure/dtos/user.dto";
import { SignedUrlService } from "../../infrastructure/service/generateSignedUrl";
import { IApplicationRepository } from "../../domain/repositories/IApplicationRepository";
import { IPackageRepository } from "../../domain/repositories/IPackageRepository";
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";
import { IJobRepository } from "../../domain/repositories/IJobRepository";
import { ICompanyRepository } from "../../domain/repositories/ICompanyRepository";
import { CompanyRepositoryImpl } from "../../infrastructure/database/company/companyRepositoryImpl";
import { JobRepositoryImpl } from "../../infrastructure/database/job/jobRepositoryImpl";

export class CreateUserByAdminUseCase {
  constructor(
    private userRepository: UserRepositoryImpl,
  ) {}

  async execute(
    data: CreateUserByAdminRequest
  ): Promise<CreateUserByAdminResponse> {
    try {
      const { fullName, email, password, role, phone, phoneTwo } = data;

      const existingUser = await this.userRepository.findUserByEmail(email);
      if (existingUser) throw new Error("User already exists with this email");

      const hashedPassword = await PasswordHasher.hashPassword(password);
            
      const createdUser = await this.userRepository.createUser<CreateLocalUserByAdmin>({
        fullName,
        email,
        password: hashedPassword,
        role,
        phone: phone || "",
        phoneTwo: phoneTwo || "",
        isVerified: true,
      });

      return {
        success: true,
        message: "User created successfully",
        user: {
          _id: createdUser._id,
          serialNumber: createdUser.serialNumber,
          fullName: createdUser.fullName,
          email: createdUser.email,
          role: createdUser.role,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to create user");
    }
  }
}

export class UpdateUserUseCase {
  constructor(private userRepository: UserRepositoryImpl) {}

  async execute(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    try {
      const { _id, ...updateData } = data;

      const existingUser = await this.userRepository.findUserById(_id);
      if (!existingUser) throw new Error("User not found");

      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findUserByEmail(
          updateData.email
        );
        if (emailExists) throw new Error("Email already exists");
      }

      existingUser.fullName = updateData.fullName;
      existingUser.email = updateData.email;
      existingUser.isBlocked = updateData.isBlocked;
      existingUser.isVerified = updateData.isVerified;
      existingUser.isVerified = updateData.isVerified;
      existingUser.phone = updateData.phone;
      existingUser.phoneTwo = updateData.phoneTwo;

      const result = await this.userRepository.updateUser(existingUser);
      if (!result) throw new Error("Failed to update user");

      return {
        success: true,
        message: "User updated successfully",
        user: {
          _id: result._id,
          serialNumber: result.serialNumber,
          fullName: result.fullName,
          email: result.email,
          role: result.role,
          isBlocked: result.isBlocked,
          isVerified: result.isVerified,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update user");
    }
  }
}

export class DeleteUserUseCase {
  constructor(private userRepository: UserRepositoryImpl) {}

  async execute(data: DeleteUserRequest): Promise<ApiResponse> {
    try {
      const { userId } = data;

      const existingUser = await this.userRepository.findUserById(userId);
      if (!existingUser) throw new Error("User not found");

      const deleted = await this.userRepository.deleteUser(userId);
      if (!deleted) throw new Error("Failed to delete user");

      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to delete user");
    }
  }
}

export class GetUserByIdUseCase {
  constructor(private userRepository: UserRepositoryImpl) {}

  async execute(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    try {
      const { userId } = data;

      const user = await this.userRepository.findUserById(userId);
      if (!user) throw new Error("User not found");

      return {
        success: true,
        message: "User retrieved successfully",
        user: {
          _id: user._id,
          serialNumber: user.serialNumber,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          phoneTwo: user.phoneTwo,
          isBlocked: user.isBlocked,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get user");
    }
  }
}

export class GetAllUsersUseCase {
  constructor(private userRepository: UserRepositoryImpl) {}

  async execute(data: { page: number; limit: number }) {
    try {
      const result = await this.userRepository.findAllUsers(data);
      return {
        success: true,
        message: "Users retrieved successfully",
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get users");
    }
  }
}

export class GetUserStatsUseCase {
  constructor(
    private userRepository: UserRepositoryImpl,
    private applicationRepository: IApplicationRepository,
    private paymentRepository: IPaymentRepository
  ) {}

  async execute() {
    try {
      const totalUsers = await this.userRepository.getTotalCount();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsers = await this.userRepository.getNewUsersCount(thirtyDaysAgo);
      const oldUsers = totalUsers - newUsers;
      
      const jobApplications = await this.applicationRepository.getTotalCount();
      const packageUsedUsers = await this.paymentRepository.getTotalCount(); // Using total payments as proxy for now

      return {
        success: true,
        message: "User stats retrieved successfully",
        stats: { 
          totalUsers,
          newUsers,
          oldUsers,
          jobApplications,
          packageUsedUsers
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get user stats");
    }
  }
}

export class GetUserGraphDataUseCase {
  constructor(private userRepository: UserRepositoryImpl) {}

  async execute() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const graphData = await this.userRepository.getUserGraphData(thirtyDaysAgo);
      
      // Process data for usersLineGraphData
      const usersLineGraphData = graphData.map((item: any) => ({
        date: item._id,
        totalUsers: item.count, // Simplified for now
        newUsers: item.count,
        oldUsers: 0,
        jobApplicants: 0,
        packageUsedUsers: 0
      }));

      // Process data for usersRadialGragphData (Day of week)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const radialDataMap = new Map<string, number>();
      
      graphData.forEach((item: any) => {
        const date = new Date(item._id);
        const dayName = days[date.getDay()];
        radialDataMap.set(dayName, (radialDataMap.get(dayName) || 0) + item.count);
      });

      const usersRadialGragphData = Array.from(radialDataMap.entries()).map(([day, count]) => ({
        day,
        count
      }));

      return {
        success: true,
        message: "User graph data retrieved successfully",
        data: {
          usersRadialGragphData,
          usersLineGraphData
        }
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get user graph data");
    }
  }
}

export class AdminFetchUserDetailsUseCase {
  constructor(
    private userRepositoryImpl: UserRepositoryImpl,
    private addressRepositoryImpl: AddressRepositoryImpl,
    private careerDataRepositoryImpl: CareerDataRepositoryImpl,
    private signedUrlService: SignedUrlService
  ) { }

  async execute(data: AdminFetchUserDetailsRequest): Promise<ApiResponse<AdminFetchUserDetailsResponse>> {
    try {

      const userData = await this.userRepositoryImpl.findUserById(data._id);
      if(!userData) throw new Error("No user found");

      const address = await this.addressRepositoryImpl.findAddressesByUserId(data._id);
      const careerData = await this.careerDataRepositoryImpl.findCareerDataByUserId(data._id);

      const { _id: userId, password, verificationToken, role, googleId, ...userResult} = userData;

      if(userResult.profileImage) {
        userResult.profileImage = await this.signedUrlService.generateSignedUrl(userResult.profileImage);
      }

      if(userResult.resume) {
        userResult.resume = await this.signedUrlService.generateSignedUrl(userResult.resume);
      }

      const addressResult = address
        ? (({ _id, ...rest }) => rest)(address)
        : null;

      const careerDataResult = careerData
        ? (({ _id, ...rest }) => rest)(careerData)
        : null;

      return {
        success: true,
        message: "User details fetched",
        data : {
          userData: userResult,
          address: addressResult,
          careerData: careerDataResult
        }
      }

    } catch (error) {
      throw handleUseCaseError(error || "Failed to fetch user details");
    }
  }
}

export class GetOverviewStatsUseCase {
  constructor(
    private userRepository: UserRepositoryImpl,
    private packageRepository: IPackageRepository,
    private companyRepository: CompanyRepositoryImpl,
    private jobRepository: JobRepositoryImpl,
    private applicationRepository: IApplicationRepository,
  ) {}

  async execute(): Promise<ApiResponse<GetOverviewStatsResponse>> {
    try {
      const totalUsers = await this.userRepository.getTotalCount();
      const totalPackages = await this.packageRepository.getTotalCount();
      const totalJobsAvailable = await this.jobRepository.countJobs();
      const totalCompanies = await this.companyRepository.countCompanies();
      const totalPostions = await this.jobRepository.countJobs(); // Assuming positions ~= jobs for now
      const totalApplications = await this.applicationRepository.getTotalCount();

      return {
        success: true,
        message: "Overview stats retrieved successfully",
        data: {
          totalUsers,
          totalPackages,
          totalJobsAvailable,
          totalCompanies,
          totalPostions,
          totalApplications
        }
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get overview stats");
    }
  }
}

export class GetOverviewGraphDataUseCase {
  constructor(
      private userRepository: UserRepositoryImpl,
      private applicationRepository: IApplicationRepository
  ) {}

  async execute(): Promise<ApiResponse<GetOverviewGraphDataResponse>> {
      try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const userGraphData = await this.userRepository.getUserGraphData(thirtyDaysAgo);
          const appGraphData = await this.applicationRepository.getApplicationGraphData(thirtyDaysAgo);

          const usersGragphData = userGraphData.map((item: any) => ({
              date: item._id,
              newUsers: item.count,
              oldUsers: 0 // Simplification
          }));

          const applicationsGraphData = appGraphData.map((item: any) => ({
              date: item._id,
              users: item.count, // Using total applications count as 'users' for now to match frontend expectations
              applications: item.placedCount // Using placed count as 'applications' (successful)
          }));

          return {
              success: true,
              message: "Overview graph data retrieved successfully",
              data: {
                  usersGragphData,
                  applicationsGraphData
              }
          };
      } catch (error) {
          throw handleUseCaseError(error || "Failed to get overview graph data");
      }
  }
}