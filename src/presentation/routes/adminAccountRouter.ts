import express from "express";
import { AdminAccountController } from "../controllers/adminAccountController";
import {
  AdminCreateAccountUseCase,
  AdminGetAllAccountsUseCase,
  AdminUpdateAccountUseCase,
  AdminDeleteAccountUseCase,
} from "../../application/adminUse-cases/adminAccountUseCases";
import { AccountRepositoryImpl } from "../../infrastructure/database/account/accountRepositoryImpl";

const adminAccountRouter = express.Router();

const repository = new AccountRepositoryImpl();

const createUseCase = new AdminCreateAccountUseCase(repository);
const getAllUseCase = new AdminGetAllAccountsUseCase(repository);
const updateUseCase = new AdminUpdateAccountUseCase(repository);
const deleteUseCase = new AdminDeleteAccountUseCase(repository);

const controller = new AdminAccountController(
  createUseCase,
  getAllUseCase,
  updateUseCase,
  deleteUseCase
);

adminAccountRouter.post("/", controller.createAccount.bind(controller));
adminAccountRouter.get("/", controller.getAllAccounts.bind(controller));
adminAccountRouter.put("/:id", controller.updateAccount.bind(controller));
adminAccountRouter.delete("/:id", controller.deleteAccount.bind(controller));

export default adminAccountRouter;
