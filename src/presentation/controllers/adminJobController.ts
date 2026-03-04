import { Types } from "mongoose";
import { Request, Response } from "express";
import { HandleError } from "../../infrastructure/error/error";
import { createJobZodSchema } from "../../infrastructure/zod/job.zod";
import { JobRepositoryImpl } from "../../infrastructure/database/job/jobRepositoryImpl";
import { paginationReqQuery, ValidateObjectId } from "../../infrastructure/zod/common.zod";
import {CreateJobUseCase, DeleteJobUseCase, GetAllJobsUseCase, GetJobByIdUseCase, UpdateJobUseCase} from "../../application/adminUse-cases/adminJobUseCases";

const jobRepositoryImpl = new JobRepositoryImpl();
const createJobUseCase = new CreateJobUseCase(jobRepositoryImpl);
const getJobByIdUseCase = new GetJobByIdUseCase(jobRepositoryImpl);
const updateJobUseCase = new UpdateJobUseCase(jobRepositoryImpl);
const getAllJobsUseCase = new GetAllJobsUseCase(jobRepositoryImpl);
const deleteJobUseCase = new DeleteJobUseCase(jobRepositoryImpl);

export class AdminJobController {
  constructor(
    private createJobUseCase: CreateJobUseCase,
    private getAllJobsUseCase: GetAllJobsUseCase,
    private getJobByIdUseCase: GetJobByIdUseCase,
    private updateJobUseCase: UpdateJobUseCase,
    private deleteJobUseCase: DeleteJobUseCase,
  ) {
    this.createJob = this.createJob.bind(this);
    this.getAllJobs = this.getAllJobs.bind(this);
    this.getJobById = this.getJobById.bind(this);
    this.updateJob = this.updateJob.bind(this);
    this.deleteJob = this.deleteJob.bind(this);
  }

  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createJobZodSchema.parse(req.body);
      const result = await this.createJobUseCase.execute(validatedData as any);
      res.status(201).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getAllJobs(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = paginationReqQuery.parse(req.query);
      const result = await this.getAllJobsUseCase.execute(validatedData);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { id: jobId } = ValidateObjectId(id, "Job Id");
      const result = await this.getJobByIdUseCase.execute(new Types.ObjectId(jobId));
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
  
  async updateJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { id: jobId } = ValidateObjectId(id, "Job Id");
      const validatedData = createJobZodSchema.parse(req.body);
      const result = await this.updateJobUseCase.execute({jobId: new Types.ObjectId(jobId), updatedData: validatedData});
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
  
  
  async deleteJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { id: jobId } = ValidateObjectId(id, "Job Id");      
      const result = await this.deleteJobUseCase.execute(new Types.ObjectId(jobId));
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

}

export const adminJobController = new AdminJobController(
  createJobUseCase,
  getAllJobsUseCase,
  getJobByIdUseCase,
  updateJobUseCase,
  deleteJobUseCase,
);