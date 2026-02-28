import { Request, Response } from "express";
import { Types } from "mongoose";
import { ApplicationRepositoryImpl } from "../../infrastructure/database/application/applicationRepositoryImpl";
import { AdminFetchAllApplicationsUseCase, AdminFetchApplicationDetailsUseCase, AdminUpdateApplicationStatusUseCase, GetApplicationStatsUseCase, GetApplicationGraphDataUseCase } from "../../application/adminUse-cases/adminApplicationUseCases";
import { SignedUrlRepositoryImpl } from "../../infrastructure/database/signedUrl/signedUrlRepositoryImpl";
import { SignedUrlService } from "../../infrastructure/service/generateSignedUrl";
import { paginationReqQuery } from "../../infrastructure/zod/common.zod";
import { HandleError } from "../../infrastructure/error/error";

const signedUrlRepositoryImpl = new SignedUrlRepositoryImpl();
const applicationRepositoryImpl = new ApplicationRepositoryImpl();
const signedUrlService = new SignedUrlService(signedUrlRepositoryImpl);

const adminFetchAllApplicationsUseCase = new AdminFetchAllApplicationsUseCase(applicationRepositoryImpl);
const adminFetchApplicationDetailsUseCase = new AdminFetchApplicationDetailsUseCase(applicationRepositoryImpl, signedUrlService);
const adminUpdateApplicationStatusUseCase = new AdminUpdateApplicationStatusUseCase(applicationRepositoryImpl);
const getApplicationStatsUseCase = new GetApplicationStatsUseCase(applicationRepositoryImpl);
const getApplicationGraphDataUseCase = new GetApplicationGraphDataUseCase(applicationRepositoryImpl);

export class AdminApplicationController {
    constructor(
        private adminFetchAllApplicationsUseCase: AdminFetchAllApplicationsUseCase,
        private adminFetchApplicationDetailsUseCase: AdminFetchApplicationDetailsUseCase,
        private adminUpdateApplicationStatusUseCase: AdminUpdateApplicationStatusUseCase,
        private getApplicationStatsUseCase: GetApplicationStatsUseCase,
        private getApplicationGraphDataUseCase: GetApplicationGraphDataUseCase
    ) {
        this.fetchAllApplications = this.fetchAllApplications.bind(this);
        this.fetchApplication = this.fetchApplication.bind(this);
        this.updateApplicationStatus = this.updateApplicationStatus.bind(this);
        this.getApplicationStats = this.getApplicationStats.bind(this);
        this.getApplicationGraphData = this.getApplicationGraphData.bind(this);
    }

    async fetchAllApplications(req: Request, res: Response) {
        try {
            const validatedData = paginationReqQuery.parse(req.query);
            const result = await this.adminFetchAllApplicationsUseCase.execute(validatedData);
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res)
        }
    }

    async fetchApplication(req: Request, res: Response) {
        try {
            const applicationId = new Types.ObjectId(req.params.id);
            const result = await this.adminFetchApplicationDetailsUseCase.execute(applicationId);
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updateApplicationStatus(req: Request, res: Response) {
        try {
            const applicationId = new Types.ObjectId(req.params.id);
            const applicationStatus = req.body.status;
            const result = await this.adminUpdateApplicationStatusUseCase.execute({
                _id: applicationId,
                status: applicationStatus
            });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getApplicationStats(req: Request, res: Response) {
        try {
            const result = await this.getApplicationStatsUseCase.execute();
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getApplicationGraphData(req: Request, res: Response) {
        try {
            const result = await this.getApplicationGraphDataUseCase.execute();
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }
}

export const adminApplicationController = new AdminApplicationController(
    adminFetchAllApplicationsUseCase,
    adminFetchApplicationDetailsUseCase,
    adminUpdateApplicationStatusUseCase,
    getApplicationStatsUseCase,
    getApplicationGraphDataUseCase
);