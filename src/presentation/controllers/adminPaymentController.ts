import { Types } from 'mongoose';
import { Request, Response } from "express";
import {
  CreatePaymentUseCase,
  UpdatePaymentUseCase,
  DeletePaymentUseCase,
  GetPaymentByIdUseCase,
  GetAllPaymentsUseCase,
  GetPaymentsByCustomerUseCase,
  GetPaymentsByPackageUseCase,
  GetPaymentsByStatusUseCase,
  GetPaymentStatsUseCase,
  GetPaymentGraphDataUseCase
} from '../../application/adminUse-cases/adminPaymentUseCases';
import { HandleError } from "../../infrastructure/error/error";
import { PaymentRepositoryImpl } from "../../infrastructure/database/payment/paymentRepositoryImpl";

const paymentRepositoryImpl = new PaymentRepositoryImpl();
const createPaymentUseCase = new CreatePaymentUseCase(paymentRepositoryImpl);
const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepositoryImpl);
const deletePaymentUseCase = new DeletePaymentUseCase(paymentRepositoryImpl);
const getPaymentByIdUseCase = new GetPaymentByIdUseCase(paymentRepositoryImpl);
const getAllPaymentsUseCase = new GetAllPaymentsUseCase(paymentRepositoryImpl);
const getPaymentsByCustomerUseCase = new GetPaymentsByCustomerUseCase(paymentRepositoryImpl);
const getPaymentsByPackageUseCase = new GetPaymentsByPackageUseCase(paymentRepositoryImpl);
const getPaymentsByStatusUseCase = new GetPaymentsByStatusUseCase(paymentRepositoryImpl);
const getPaymentStatsUseCase = new GetPaymentStatsUseCase(paymentRepositoryImpl);
const getPaymentGraphDataUseCase = new GetPaymentGraphDataUseCase(paymentRepositoryImpl);

export class AdminPaymentController {
    constructor(
        private createPaymentUseCase: CreatePaymentUseCase,
        private updatePaymentUseCase: UpdatePaymentUseCase,
        private deletePaymentUseCase: DeletePaymentUseCase,
        private getPaymentByIdUseCase: GetPaymentByIdUseCase,
        private getAllPaymentsUseCase: GetAllPaymentsUseCase,
        private getPaymentsByCustomerUseCase: GetPaymentsByCustomerUseCase,
        private getPaymentsByPackageUseCase: GetPaymentsByPackageUseCase,
        private getPaymentsByStatusUseCase: GetPaymentsByStatusUseCase,
        private getPaymentStatsUseCase: GetPaymentStatsUseCase,
        private getPaymentGraphDataUseCase: GetPaymentGraphDataUseCase
    ) {
        this.createPayment = this.createPayment.bind(this);
        this.updatePayment = this.updatePayment.bind(this);
        this.deletePayment = this.deletePayment.bind(this);
        this.getPaymentById = this.getPaymentById.bind(this);
        this.getAllPayments = this.getAllPayments.bind(this);
        this.getPaymentsByCustomer = this.getPaymentsByCustomer.bind(this);
        this.getPaymentsByPackage = this.getPaymentsByPackage.bind(this);
        this.getPaymentsByStatus = this.getPaymentsByStatus.bind(this);
        this.getPaymentStats = this.getPaymentStats.bind(this);
        this.getPaymentGraphData = this.getPaymentGraphData.bind(this);
    }

    async createPayment(req: Request, res: Response) {
        try {
            const result = await this.createPaymentUseCase.execute(req.body);
            return res.status(201).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updatePayment(req: Request, res: Response) {
        try {
            const paymentId = new Types.ObjectId(req.params.id);
            const result = await this.updatePaymentUseCase.execute({ _id: paymentId, ...req.body });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async deletePayment(req: Request, res: Response) {
        try {
            const paymentId = new Types.ObjectId(req.params.id);
            const result = await this.deletePaymentUseCase.execute({ paymentId });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPaymentById(req: Request, res: Response) {
        try {
            const paymentId = new Types.ObjectId(req.params.id);
            const result = await this.getPaymentByIdUseCase.execute({ paymentId });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getAllPayments(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const category = req.query.category as string | undefined;
            const result = await this.getAllPaymentsUseCase.execute({ page, limit, category });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPaymentsByCustomer(req: Request, res: Response) {
        try {
            const customerId = new Types.ObjectId(req.params.customerId);
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await this.getPaymentsByCustomerUseCase.execute({ customerId, page, limit });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPaymentsByPackage(req: Request, res: Response) {
        try {
            const packageId = new Types.ObjectId(req.params.packageId);
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await this.getPaymentsByPackageUseCase.execute({ packageId, page, limit });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPaymentsByStatus(req: Request, res: Response) {
        try {
            const status = req.params.status;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await this.getPaymentsByStatusUseCase.execute({ status, page, limit });
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPaymentStats(req: Request, res: Response) {
        try {
            const result = await this.getPaymentStatsUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async getPaymentGraphData(req: Request, res: Response) {
        try {
            const result = await this.getPaymentGraphDataUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }
}

export const adminPaymentController = new AdminPaymentController(
    createPaymentUseCase,
    updatePaymentUseCase,
    deletePaymentUseCase,
    getPaymentByIdUseCase,
    getAllPaymentsUseCase,
    getPaymentsByCustomerUseCase,
    getPaymentsByPackageUseCase,
    getPaymentsByStatusUseCase,
    getPaymentStatsUseCase,
    getPaymentGraphDataUseCase
);