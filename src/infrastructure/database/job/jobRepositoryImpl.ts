import { Types } from "mongoose";
import { IJob, JobModel } from "./jobModel";
import { Job } from "../../../domain/entities/job";
import { ApiPaginationRequest, ApiResponse } from "../../dtos/common.dts";
import { IJobRepository } from "../../../domain/repositories/IJobRepository";
import { UserFetchAllJobsResponse, UserFetchJobDetailsResponse } from "../../dtos/user.dto";
import { AdminCreateNewJob, AdminFetchAllJobs, AdminFetchJobDetailsResponse } from "../../dtos/adminJob.dtos";

export class JobRepositoryImpl implements IJobRepository {

  private mapToEntity(job: IJob): Job {
    return new Job(
      job._id,
      job.companyName,
      job.designation,
      job.salary,
      job.benifits,
      job.location,
      job.vacancy,
      job.currency,
      job.jobDescription,
      job.jobUniqueId,
      job.createdAt,
      job.updatedAt,
    );
  }

  async createJob(payload: AdminCreateNewJob): Promise<Job | null> {
    try {
      const newJob = await JobModel.create(payload);
      return newJob ? this.mapToEntity(newJob) : null;
    } catch (error) {
      throw new Error("Unable to create job, please try again.");
    }
  }

  async adminFindAllJobs({ page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllJobs>> {
    try {
      const adminGetAllJobsProject = {
        _id: 1,
        companyName: 1,
        designation: 1,
        salary: 1,
        jobUniqueId: 1,
        createdAt: 1
      };

      const project = adminGetAllJobsProject;
      const skip = (page - 1) * limit;

      const [jobs, totalCount] = await Promise.all([
        JobModel.find({}, project).skip(skip).limit(limit).lean(),
        JobModel.countDocuments(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: jobs.map(job => ({
          _id: job._id,
          companyName: job.companyName,
          designation: job.designation,
          salary: job.salary,
          currency: job.currency,
          vacancy: job.vacancy,
          jobUniqueId: job.jobUniqueId,
          createdAt: job.createdAt,
        })),
        totalPages,
        currentPage: page,
        totalCount
      };
    } catch (error) {
      throw new Error("Failed to fetch jobs from database.");
    }
  }


  async findJobById(jobId: Types.ObjectId, admin: boolean): Promise<AdminFetchJobDetailsResponse | UserFetchJobDetailsResponse | null> {
    try {
      const adminGetAllJobsProject = {
        _id: 1,
        companyName: 1,
        designation: 1,
        salary: 1,
        currency: 1,
        benifits: 1,
        location: 1,
        jobDescription: 1,
        vacancy: 1,
        jobUniqueId: 1,
        createdAt: 1
      };

      const userGetAllJobsProject = {
        _id: 1,
        companyName: 1,
        designation: 1,
        salary: 1,
        currency: 1,
        benifits: 1,
        location: 1,
        jobDescription: 1,
        vacancy: 1,
        jobUniqueId: 1,
        createdAt: 1
      };
      const project = admin ? adminGetAllJobsProject : userGetAllJobsProject;
      const job = await JobModel.findById(jobId, project);
      return job ? this.mapToEntity(job) : null;
    } catch (error) {
      throw new Error("Job not found.");
    }
  }

  async userFindAllJobs({ page, limit }: ApiPaginationRequest, userId: Types.ObjectId): Promise<ApiResponse<UserFetchAllJobsResponse>> {
    try {
         const [jobs, totalCount] = await Promise.all([
        JobModel.aggregate([
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },

          {
            $lookup: {
              from: "applications",
              let: { jobId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$jobId", "$$jobId"] },
                        { $eq: ["$userId", userId] }
                      ]
                    }
                  }
                },
                {
                  $project: { status: 1, _id: 0 }
                }
              ],
              as: "userApplications"
            }
          },

          {
            $addFields: {
              applied: { $gt: [{ $size: "$userApplications" }, 0] },
              status: {
                $cond: {
                  if: { $gt: [{ $size: "$userApplications" }, 0] },
                  then: { $arrayElemAt: ["$userApplications.status", 0] },
                  else: null
                }
              }
            }
          },

          { $match: { applied: false } },

          {
            $project: {
              _id: 1,
              salary: 1,
              currency: 1,
              designation: 1,
              vacancy: 1,
              createdAt: 1,
              applied: 1,
              jobUniqueId: 1,
              status: 1
            }
          }
        ]),
        JobModel.countDocuments()
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: jobs.map(job => ({
          _id: job._id,
          salary: job.salary,
          currency: job.currency,
          designation: job.designation,
          vacancy: job.vacancy,
          createdAt: job.createdAt,
          applied: job.applied,
          jobUniqueId: job.jobUniqueId,
          status: job.status
        })),
        totalPages,
        currentPage: page,
        totalCount
      };
    } catch (error) {
      throw new Error("Failed to fetch jobs");
    }
  }


  async updateJob(jobId: Types.ObjectId, updatedData: Partial<AdminCreateNewJob>): Promise<Job | null> {
    try {
      const updatedJob = await JobModel.findByIdAndUpdate({ _id: jobId }, updatedData, { new: true });
      return updatedJob ? this.mapToEntity(updatedJob) : null;
    } catch (error) {
      throw new Error("Unable to update job.");
    }
  }

  async deleteJob(jobId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await JobModel.findByIdAndDelete(jobId);
      return !!result;
    } catch (error) {
      throw new Error("Unable to delete job.");
    }
  }

  async countJobs(): Promise<number> {
    try {
      return await JobModel.countDocuments({});
    } catch (error) {
      throw new Error("Failed to get total job count.");
    }
  }

  // async findJobsByCompanyName(companyName: string): Promise<Job[]> {
  //   try {
  //     const jobs = await JobModel.find({ companyName });
  //     return jobs.map(job => this.mapToEntity(job));
  //   } catch (error) {
  //     throw new Error("Unable to find jobs by company name.");
  //   }
  // }
}