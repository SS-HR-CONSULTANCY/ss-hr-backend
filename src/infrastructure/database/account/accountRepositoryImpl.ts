import { Types } from "mongoose";
import { Account } from "../../../domain/entities/account";
import { IAccountRepository } from "../../../domain/repositories/IAccountRepository";
import { AccountModel, IAccount } from "./accountModel";

export class AccountRepositoryImpl implements IAccountRepository {
  private mapToEntity(doc: IAccount): Account {
    return new Account(
      doc._id as Types.ObjectId,
      doc.name,
      doc.createdAt,
      doc.updatedAt
    );
  }

  async create(name: string): Promise<Account> {
    const created = await AccountModel.create({ name });
    return this.mapToEntity(created);
  }

  async findAll(): Promise<Account[]> {
    const accounts = await AccountModel.find().sort({ name: 1 });
    return accounts.map(this.mapToEntity.bind(this));
  }

  async findById(id: Types.ObjectId): Promise<Account | null> {
    const doc = await AccountModel.findById(id);
    if (!doc) return null;
    return this.mapToEntity(doc);
  }

  async update(id: Types.ObjectId, name: string): Promise<Account | null> {
    const updated = await AccountModel.findByIdAndUpdate(
      id,
      { $set: { name } },
      { new: true }
    );
    if (!updated) return null;
    return this.mapToEntity(updated);
  }

  async delete(id: Types.ObjectId): Promise<boolean> {
    const result = await AccountModel.findByIdAndDelete(id);
    return result !== null;
  }
}
