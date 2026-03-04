import { Address } from "../../domain/entities/address";
import { Application } from "../../domain/entities/application";
import { CareerData } from "../../domain/entities/careerData";
import { Job } from "../../domain/entities/job";
import { User } from "../../domain/entities/user";

export type CreateAdminRequest = Pick<User, "fullName" | "email" | "password" | "phone" | "role" | "profileImage">;

export type CreateAdminResponse = Pick<User, "_id" | "fullName" | "email" | "phone" | "profileImage" | "role" | "isBlocked" | "createdAt">;


export type adminFetchApplicationsJobFields = Pick<Job, "_id" | "designation" | "companyName" | "jobUniqueId">; 

export type AdminFetchAllApplicationsResponse = Array<{
  _id: Application["_id"];
  updatedAt: Application["updatedAt"];
  status: Application["status"];
  applicationUniqueId: Application["applicationUniqueId"];
  userName: string;
} & adminFetchApplicationsJobFields>;

export type AdminFetchApplicationDetailsRequest = Pick<Application, "_id">;
export type adminfetchApplicationJobDetailFields = Pick<Job, "designation" | "companyName" | "vacancy" | "currency" | "createdAt" | "benifits" | "location" | "jobDescription" | "salary" | "jobUniqueId">;
export type adminFetchApplicationUserDetails = Pick<User, "fullName" | "email" | "dob" | "gender" | "linkedInUsername" | "nationality" | "phone" | "serialNumber" | "portfolioUrl" | "profileImage" | "phoneTwo" | "professionalStatus" | "resume">;
export type AdminFetchApplicationDetailsResponse = Pick<Application, "createdAt" | "status" | "updatedAt" | "applicationUniqueId"> & {
    jobId: adminfetchApplicationJobDetailFields;
    userId: adminFetchApplicationUserDetails;
  };


export type AdminFetchUserDetailsRequest = Pick<User, "_id">;
export type AdminfetchUserDetailFields = Pick<User, "createdAt" | "dob" | "email" | "fullName" | "gender" | "isBlocked" | "isVerified" | "linkedInUsername" | "nationality" | "phone" | "phoneTwo" | "portfolioUrl" | "professionalStatus" | "profileImage" | "resume" | "serialNumber" | "updatedAt">;
export type AdminFetchUserAddressDetails = Pick<Address, "addressLine1" | "addressLine2" | "city" | "country" | "createdAt" | "district" | "landmark" | "postalCode" | "primary" | "state" | "updatedAt">;
export type AdminFetchUserCareerDataDetailsResponse = Pick<CareerData, "createdAt" | "currentCompany" | "currentJobType" | "expectedSalary" | "currentDesignation" | "currentSalary" | "experience" | "immediateJoiner" | "industry" | "noticePeriod" | "preferredJobTypes" | "preferredWorkModes" | "updatedAt">;
export interface AdminFetchUserDetailsResponse {
  userData: AdminfetchUserDetailFields,
  address: AdminFetchUserAddressDetails | null,
  careerData: AdminFetchUserCareerDataDetailsResponse | null,
}


export type AdminUpdateApplicationStatusRequest = Pick<Application, "_id" | "status">;

export interface GetOverviewStatsResponse {
  totalUsers: number;
  totalPackages: number;
  totalJobsAvailable: number;
  totalCompanies: number;
  totalPostions: number;
  totalApplications: number;
}

export interface GetOverviewGraphDataResponse {
  usersGragphData: Array<{
    date: string;
    newUsers: number;
    oldUsers: number;
  }>;
  applicationsGraphData: Array<{
    date: string;
    users: number; // Represents applications here, likely mapped from 'count'
    applications: number; // Represents something else or just total? Assuming 'users' -> applicants, 'applications' -> placements? Need to check frontend mapping.
    // Frontend AdminOverview.tsx: 
    // AreaGroupedChart: usersGraphData -> newUsers, oldUsers
    // BarChartVertical: applicationsGraphData -> users, applications
  }>;
}