import { Job } from "../../domain/entities/job";

export type AdminCreateNewJob = Pick<Job, "companyName" | "designation" | "jobDescription" | "benifits" | "salary" | "location" | "vacancy" | "currency">;

export type AdminFetchAllJobs = Array<Pick<Job, "_id" | "companyName" | "salary" | "currency" | "designation" | "createdAt" | "jobUniqueId" | "vacancy">>;

export type AdminFetchJobDetailsResponse = Omit<Job, "updatedAt">;

export interface AdminUpdateJob {
    jobId: Job["_id"];
    updatedData: Partial<AdminCreateNewJob>;
}