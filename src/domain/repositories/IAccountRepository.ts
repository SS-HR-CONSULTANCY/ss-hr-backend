import { Types } from "mongoose";
import { Account } from "../entities/account";

export interface IAccountRepository {
  create(name: string): Promise<Account>;
  findAll(): Promise<Account[]>;
  findById(id: Types.ObjectId): Promise<Account | null>;
  update(id: Types.ObjectId, name: string): Promise<Account | null>;
  delete(id: Types.ObjectId): Promise<boolean>;
}
