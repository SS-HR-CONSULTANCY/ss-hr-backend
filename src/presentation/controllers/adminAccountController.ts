import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { HandleError } from "../../infrastructure/error/error";
import { createAccountSchema, updateAccountSchema } from "../../infrastructure/zod/account.zod";
import {
  AdminCreateAccountUseCase,
  AdminGetAllAccountsUseCase,
  AdminUpdateAccountUseCase,
  AdminDeleteAccountUseCase,
} from "../../application/adminUse-cases/adminAccountUseCases";

export class AdminAccountController {
  constructor(
    private createAccountUseCase: AdminCreateAccountUseCase,
    private getAllAccountsUseCase: AdminGetAllAccountsUseCase,
    private updateAccountUseCase: AdminUpdateAccountUseCase,
    private deleteAccountUseCase: AdminDeleteAccountUseCase
  ) {}

  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = createAccountSchema.parse(req.body);
      const result = await this.createAccountUseCase.execute(name);
      res.status(201).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getAllAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getAllAccountsUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = updateAccountSchema.parse(req.body);
      const id = new Types.ObjectId(req.params.id);
      const result = await this.updateAccountUseCase.execute({ id, name });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = new Types.ObjectId(req.params.id);
      const result = await this.deleteAccountUseCase.execute(id);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}
