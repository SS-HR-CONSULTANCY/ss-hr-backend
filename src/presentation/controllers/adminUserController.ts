import { Types } from 'mongoose';
import { Request, Response } from "express";
import { HandleError } from "../../infrastructure/error/error";
import { LimitedRole } from '../../infrastructure/zod/common.zod';
import { adminCreateUserZodSchema } from '../../infrastructure/zod/user.zod';
import { SignedUrlService } from "../../infrastructure/service/generateSignedUrl";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { AddressRepositoryImpl } from '../../infrastructure/database/address/addressRepositoryImpl';
import { SignedUrlRepositoryImpl } from "../../infrastructure/database/signedUrl/signedUrlRepositoryImpl";
import { CareerDataRepositoryImpl } from '../../infrastructure/database/careerData/careerDataRepositoryImpl';
import { GetAllUsersForChatSideBarUseCase } from "../../application/commonUse-cases/getAllUsersForChatSidebarUseCase";
import { CreateUserByAdminUseCase, UpdateUserUseCase, DeleteUserUseCase, GetUserByIdUseCase, GetAllUsersUseCase, GetUserStatsUseCase, AdminFetchUserDetailsUseCase, GetUserGraphDataUseCase, GetOverviewStatsUseCase, GetOverviewGraphDataUseCase } from '../../application/adminUse-cases/adminUserUseCases';
import { ApplicationRepositoryImpl } from '../../infrastructure/database/application/applicationRepositoryImpl';
import { PaymentRepositoryImpl } from '../../infrastructure/database/payment/paymentRepositoryImpl';
import { CompanyRepositoryImpl } from "../../infrastructure/database/company/companyRepositoryImpl";
import { JobRepositoryImpl } from "../../infrastructure/database/job/jobRepositoryImpl";

const userRepositoryImpl = new UserRepositoryImpl();
const signedUrlRepositoryImpl = new SignedUrlRepositoryImpl();
const signedUrlService = new SignedUrlService(signedUrlRepositoryImpl);
const addressRepositoryImpl = new AddressRepositoryImpl();
const careerDataRepositoryImpl = new CareerDataRepositoryImpl();
const applicationRepositoryImpl = new ApplicationRepositoryImpl();
const paymentRepositoryImpl = new PaymentRepositoryImpl();
const companyRepositoryImpl = new CompanyRepositoryImpl();
const jobRepositoryImpl = new JobRepositoryImpl();

const getAllUsersForChatSideBarUseCase = new GetAllUsersForChatSideBarUseCase(userRepositoryImpl, signedUrlService);
const createUserByAdminUseCase = new CreateUserByAdminUseCase(userRepositoryImpl);
const updateUserUseCase = new UpdateUserUseCase(userRepositoryImpl);
const deleteUserUseCase = new DeleteUserUseCase(userRepositoryImpl);
const getUserByIdUseCase = new GetUserByIdUseCase(userRepositoryImpl);
const getAllUsersUseCase = new GetAllUsersUseCase(userRepositoryImpl);
const getUserStatsUseCase = new GetUserStatsUseCase(userRepositoryImpl, applicationRepositoryImpl, paymentRepositoryImpl);
const getUserGraphDataUseCase = new GetUserGraphDataUseCase(userRepositoryImpl);
const adminFetchUserDetailsUseCase = new AdminFetchUserDetailsUseCase(userRepositoryImpl, addressRepositoryImpl, careerDataRepositoryImpl, signedUrlService)
const getOverviewStatsUseCase = new GetOverviewStatsUseCase(userRepositoryImpl, paymentRepositoryImpl, companyRepositoryImpl, jobRepositoryImpl, applicationRepositoryImpl);
const getOverviewGraphDataUseCase = new GetOverviewGraphDataUseCase(userRepositoryImpl, applicationRepositoryImpl);

export class AdminUserController {
    constructor(
        private getAllUsersForChatSideBarUseCase: GetAllUsersForChatSideBarUseCase,
        private createUserByAdminUseCase: CreateUserByAdminUseCase,
        private updateUserUseCase: UpdateUserUseCase,
        private deleteUserUseCase: DeleteUserUseCase,
        private getUserByIdUseCase: GetUserByIdUseCase,
        private getAllUsersUseCase: GetAllUsersUseCase,
        private getUserStatsUseCase: GetUserStatsUseCase,
        private getUserGraphDataUseCase: GetUserGraphDataUseCase,
        private adminFetchUserDetailsUseCase: AdminFetchUserDetailsUseCase,
        private getOverviewStatsUseCase: GetOverviewStatsUseCase,
        private getOverviewGraphDataUseCase: GetOverviewGraphDataUseCase
    ) {
        this.getUserForChatSidebar = this.getUserForChatSidebar.bind(this);
        this.createUser = this.createUser.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.getAllUsers = this.getAllUsers.bind(this);
        this.getUserStats = this.getUserStats.bind(this);
        this.getUserGraphData = this.getUserGraphData.bind(this);
        this.getUserFullDetails = this.getUserFullDetails.bind(this);
        this.getOverviewStats = this.getOverviewStats.bind(this);
        this.getOverviewGraphData = this.getOverviewGraphData.bind(this);
    }

    async getUserForChatSidebar(req: Request, res: Response) {
        try {
            const result = await this.getAllUsersForChatSideBarUseCase.execute(true);
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async createUser(req: Request, res: Response) {
        try {
            const validatedData = adminCreateUserZodSchema.parse(req.body);
            const result = await this.createUserByAdminUseCase.execute({ ...validatedData, role: LimitedRole.User });
            return res.status(201).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const userId = new Types.ObjectId(req.params.id);
            const result = await this.updateUserUseCase.execute({ _id: userId, ...req.body });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const userId = new Types.ObjectId(req.params.id);
            const result = await this.deleteUserUseCase.execute({ userId });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const userId = new Types.ObjectId(req.params.id);
            const result = await this.getUserByIdUseCase.execute({ userId });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getAllUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await this.getAllUsersUseCase.execute({ page, limit });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getUserStats(req: Request, res: Response) {
        try {
            const result = await this.getUserStatsUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getUserGraphData(req: Request, res: Response) {
        try {
            const result = await this.getUserGraphDataUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getUserFullDetails(req: Request, res: Response) {
        try {
            const userId = new Types.ObjectId(req.params.id);
            const result = await this.adminFetchUserDetailsUseCase.execute(userId);
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getOverviewStats(req: Request, res: Response) {
        try {
            const result = await this.getOverviewStatsUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getOverviewGraphData(req: Request, res: Response) {
        try {
            const result = await this.getOverviewGraphDataUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

}

export const adminUserController = new AdminUserController(
    getAllUsersForChatSideBarUseCase,
    createUserByAdminUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    getUserByIdUseCase,
    getAllUsersUseCase,
    getUserStatsUseCase,
    getUserGraphDataUseCase,
    adminFetchUserDetailsUseCase,
    getOverviewStatsUseCase,
    getOverviewGraphDataUseCase
);
