import { Types } from "mongoose";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { JobRepositoryImpl } from "../../infrastructure/database/job/jobRepositoryImpl";
import { ApiPaginationRequest, ApiResponse } from "../../infrastructure/dtos/common.dts";
import { AdminCreateNewJob, AdminFetchAllJobs, AdminFetchJobDetailsResponse, AdminUpdateJob } from "../../infrastructure/dtos/adminJob.dtos";

export class CreateJobUseCase {

  constructor(private jobRepository: JobRepositoryImpl) { }

  async execute(payload: AdminCreateNewJob): Promise<ApiResponse> {
    try {
      const { benifits, companyName, designation, location, vacancy, currency, jobDescription, salary } = payload;
      if (
        !companyName ||
        !designation ||
        !location ||
        !vacancy ||
        !currency ||
        !jobDescription ||
        !salary ||
        !benifits
      ) {
        throw new Error("All fields are required");
      }

      const job = await this.jobRepository.createJob(payload);
      if(!job) throw new Error("Job creating failed");

      return { success: true, message: "Job created successfully" };

    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in CreateJobUseCase");
    }
  }
}

export class GetAllJobsUseCase {
  constructor(private jobRepository: JobRepositoryImpl) { }

  async execute(payload: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllJobs>> {
    try {

      const { page, limit } = payload;
      const jobs = await this.jobRepository.adminFindAllJobs({ page, limit })

      return {
        success: true,
        message: "Jobs retrieved successfully",
        data: jobs as AdminFetchAllJobs,
        currentPage: jobs.currentPage,
        totalCount: jobs.totalCount,
        totalPages: jobs.totalPages,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in GetAllJobsUseCase");
    }
  }
}

export class GetJobByIdUseCase {
  constructor(private jobRepository: JobRepositoryImpl) { }

  async execute(jobId: Types.ObjectId ): Promise<ApiResponse<AdminFetchJobDetailsResponse>> {
    try {

      if (!jobId) {
        throw new Error("Job ID is required");
      }

      const job = await this.jobRepository.findJobById(jobId, true);
      if (!job) throw new Error("Job not found");

      return {
        success: true,
        message: "Job retrieved successfully",
        data: job as AdminFetchJobDetailsResponse
      };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in GetJobByIdUseCase");
    }
  }
}

export class UpdateJobUseCase {
  constructor(private jobRepository: JobRepositoryImpl) { }

  async execute(payload: AdminUpdateJob): Promise<ApiResponse> {
    try {
      const { jobId, updatedData } = payload;

      if (!jobId) throw new Error("Job ID is required");

      const existingJob = await this.jobRepository.findJobById(jobId, true);
      if (!existingJob) throw new Error("Job not found")

      const updatedJob = await this.jobRepository.updateJob(jobId, updatedData);
      if (!updatedJob) throw new Error("Failed to update job")

      return {
        success: true,
        message: "Job updated successfully",
      };
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in UpdateJobUseCase");
    }
  }
}


export class DeleteJobUseCase {
  constructor(private jobRepository: JobRepositoryImpl) { }

  async execute(jobId: Types.ObjectId): Promise<ApiResponse> {
    try {

      if (!jobId) throw new Error("Job ID is required");

      const existingJob = await this.jobRepository.findJobById(jobId, true);
      if (!existingJob) throw new Error("Job not found");

      const deleted = await this.jobRepository.deleteJob(jobId);
      if (!deleted) throw new Error("Failed to delete job");

      return {
        success: true,
        message: "Job deleted successfully"
      };
      
    } catch (error) {
      throw handleUseCaseError(error || "Unexpected error in DeleteJobUseCase");
    }
  }
}