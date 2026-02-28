import { Types } from "mongoose";
import { Request, Response } from "express";
import { DecodedUser } from "../../express";
import { HandleError } from "../../infrastructure/error/error";
import { updateApplicationZodSchmea } from "../../infrastructure/zod/user.zod";
import { SignedUrlService } from "../../infrastructure/service/generateSignedUrl";
import { UserGetAllJobsUseCase, UserGetJobByIdUseCase } from "../../application/userUse-Case.ts/useJobUseCases";
import { JobRepositoryImpl } from "../../infrastructure/database/job/jobRepositoryImpl";
import { paginationReqQuery, ValidateObjectId } from "../../infrastructure/zod/common.zod";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { AddressRepositoryImpl } from "../../infrastructure/database/address/addressRepositoryImpl";
import { UseGetTestimonialsUseCase } from "../../application/userUse-Case.ts/userTestimonialUseCases";
import { SignedUrlRepositoryImpl } from "../../infrastructure/database/signedUrl/signedUrlRepositoryImpl";
import { TestimonialRepositoryImpl } from "../../infrastructure/database/testimonial/testimonialRepositoryImpl";
import { ApplicationRepositoryImpl } from "../../infrastructure/database/application/applicationRepositoryImpl";
import { GetAllUsersForChatSideBarUseCase } from "../../application/commonUse-cases/getAllUsersForChatSidebarUseCase";
import { UserCreateApplicationUseCase, UserFetchAllApplicationsUseCase, UserUpdateApplicationUseCase } from "../../application/userUse-Case.ts/userApplicationUseCases";

const jobRepositoryImpl = new JobRepositoryImpl();
const userRepositoryImpl = new UserRepositoryImpl();
const addressRepositoryImpl = new AddressRepositoryImpl();
const signedUrlRepositoryImpl = new SignedUrlRepositoryImpl();
const testimonialRepositoryImpl = new TestimonialRepositoryImpl();
const applicationRepositoryImpl = new ApplicationRepositoryImpl();
const signedUrlService = new SignedUrlService(signedUrlRepositoryImpl);

const userGetAllJobsUseCase = new UserGetAllJobsUseCase(jobRepositoryImpl);
const userFetchAllApplicationsUseCase = new UserFetchAllApplicationsUseCase(applicationRepositoryImpl);
const useGetTestimonialsUseCase = new UseGetTestimonialsUseCase(testimonialRepositoryImpl, signedUrlService);
const getAllUsersForChatSideBarUseCase = new GetAllUsersForChatSideBarUseCase(userRepositoryImpl, signedUrlService);
const userCreateApplicationUseCase = new UserCreateApplicationUseCase(userRepositoryImpl, addressRepositoryImpl, applicationRepositoryImpl);
const userUpdateApplicationUseCase = new UserUpdateApplicationUseCase(userRepositoryImpl, addressRepositoryImpl, applicationRepositoryImpl);
const userGetJobByIdUseCase = new UserGetJobByIdUseCase(jobRepositoryImpl);

class UserController {
    constructor(
        private getAllUsersForChatSideBarUseCase: GetAllUsersForChatSideBarUseCase,
        private useGetTestimonialsUseCase: UseGetTestimonialsUseCase,
        private userGetAllJobsUseCase: UserGetAllJobsUseCase,
        private userCreateApplicationUseCase: UserCreateApplicationUseCase,
        private userUpdateApplicationUseCase: UserUpdateApplicationUseCase,
        private userFetchAllApplicationsUseCase: UserFetchAllApplicationsUseCase,
        private userGetJobByIdUseCase: UserGetJobByIdUseCase
    ) {
        this.getAdminsForChatSidebar = this.getAdminsForChatSidebar.bind(this);
        this.getTestimonilas = this.getTestimonilas.bind(this);
        this.getAllJobs = this.getAllJobs.bind(this);
        this.applyJob = this.applyJob.bind(this);
        this.cancelJobApplication = this.cancelJobApplication.bind(this);
        this.getApplications = this.getApplications.bind(this);
        this.userGetJobById = this.userGetJobById.bind(this);
    }

    async getAdminsForChatSidebar(req: Request, res: Response) {
        try {
            const result = await this.getAllUsersForChatSideBarUseCase.execute(false);
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getTestimonilas(req: Request, res: Response) {
        try {
            const result = await this.useGetTestimonialsUseCase.execute();
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getAllJobs(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = paginationReqQuery.parse(req.query);
            const result = await this.userGetAllJobsUseCase.execute(validatedData, new Types.ObjectId(userId));
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async applyJob(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedParams = ValidateObjectId(req.params.id, "job id");
            const result = await this.userCreateApplicationUseCase.execute({
                jobId: new Types.ObjectId(validatedParams.id),
                userId: new Types.ObjectId(userId)
            });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async cancelJobApplication(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedParams = ValidateObjectId(req.params.id, "job id");
            const validatedData = updateApplicationZodSchmea.parse(req.body);
            const result = await this.userUpdateApplicationUseCase.execute({
                _id: new Types.ObjectId(validatedParams.id),
                status: validatedData.status,
                userId: new Types.ObjectId(userId)
            })
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getApplications(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = paginationReqQuery.parse(req.query);
            const result = await this.userFetchAllApplicationsUseCase.execute(validatedData, new Types.ObjectId(userId));
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async userGetJobById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { id: jobId } = ValidateObjectId(id, "Job Id");
            const result = await this.userGetJobByIdUseCase.execute(new Types.ObjectId(jobId));
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

}

export const userController = new UserController(
    getAllUsersForChatSideBarUseCase,
    useGetTestimonialsUseCase,
    userGetAllJobsUseCase,
    userCreateApplicationUseCase,
    userUpdateApplicationUseCase,
    userFetchAllApplicationsUseCase,
    userGetJobByIdUseCase
);

