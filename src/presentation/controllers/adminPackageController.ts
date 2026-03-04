import { Types } from 'mongoose';
import { Request, Response } from "express";
import {
  CreatePackageUseCase,
  UpdatePackageUseCase,
  DeletePackageUseCase,
  GetPackageByIdUseCase,
  GetAllPackagesUseCase,
  GetPackageStatsUseCase
} from '../../application/adminUse-cases/adminPackageUseCases';
import { HandleError } from "../../infrastructure/error/error";
import { PackageRepositoryImpl } from "../../infrastructure/database/package/packageRepositoryImpl";

const packageRepositoryImpl = new PackageRepositoryImpl();
const createPackageUseCase = new CreatePackageUseCase(packageRepositoryImpl);
const updatePackageUseCase = new UpdatePackageUseCase(packageRepositoryImpl);
const deletePackageUseCase = new DeletePackageUseCase(packageRepositoryImpl);
const getPackageByIdUseCase = new GetPackageByIdUseCase(packageRepositoryImpl);
const getAllPackagesUseCase = new GetAllPackagesUseCase(packageRepositoryImpl);
const getPackageStatsUseCase = new GetPackageStatsUseCase(packageRepositoryImpl);

export class AdminPackageController {
    constructor(
        private createPackageUseCase: CreatePackageUseCase,
        private updatePackageUseCase: UpdatePackageUseCase,
        private deletePackageUseCase: DeletePackageUseCase,
        private getPackageByIdUseCase: GetPackageByIdUseCase,
        private getAllPackagesUseCase: GetAllPackagesUseCase,
        private getPackageStatsUseCase: GetPackageStatsUseCase
    ) {
        this.createPackage = this.createPackage.bind(this);
        this.updatePackage = this.updatePackage.bind(this);
        this.deletePackage = this.deletePackage.bind(this);
        this.getPackageById = this.getPackageById.bind(this);
        this.getAllPackages = this.getAllPackages.bind(this);
        this.getPackageStats = this.getPackageStats.bind(this);
    }

    async createPackage(req: Request, res: Response) {
        try {
            const result = await this.createPackageUseCase.execute(req.body);
            return res.status(201).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updatePackage(req: Request, res: Response) {
        try {
            const packageId = new Types.ObjectId(req.params.id);
            const result = await this.updatePackageUseCase.execute({ _id: packageId, ...req.body });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async deletePackage(req: Request, res: Response) {
        try {
            const packageId = new Types.ObjectId(req.params.id);
            const result = await this.deletePackageUseCase.execute({ packageId });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPackageById(req: Request, res: Response) {
        try {
            const packageId = new Types.ObjectId(req.params.id);
            const result = await this.getPackageByIdUseCase.execute({ packageId });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getAllPackages(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const category = req.query.category as string | undefined;
            const result = await this.getAllPackagesUseCase.execute({ page, limit, category });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPackageStats(req: Request, res: Response) {
        try {
            const result = await this.getPackageStatsUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }
}

export const adminPackageController = new AdminPackageController(
    createPackageUseCase,
    updatePackageUseCase,
    deletePackageUseCase,
    getPackageByIdUseCase,
    getAllPackagesUseCase,
    getPackageStatsUseCase
);

