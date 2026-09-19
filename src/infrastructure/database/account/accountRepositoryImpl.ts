import { Types } from "mongoose";
import { Account } from "../../../domain/entities/account";
import { IAccountRepository } from "../../../domain/repositories/IAccountRepository";
import { AccountModel, IAccount } from "./accountModel";

import { EnquiryModel } from "../enquiry/enquiryModel";
import { WhatsappEnquiryModel } from "../whatsappEnquiry/whatsappEnquiryModel";

export class AccountRepositoryImpl implements IAccountRepository {
  private mapToEntity(doc: any): Account {
    return new Account(
      doc._id as Types.ObjectId,
      doc.name,
      doc.createdAt,
      doc.updatedAt,
      doc.leadsCount
    );
  }

  async create(name: string): Promise<Account> {
    const created = await AccountModel.create({ name });
    return this.mapToEntity(created);
  }

  async findAll(): Promise<Account[]> {
    const accounts = await AccountModel.find().sort({ name: 1 }).lean();
    
    const accountsWithCounts = await Promise.all(accounts.map(async (acc) => {
      let leadsCount = 0;
      leadsCount += await EnquiryModel.countDocuments({ account: acc.name });
      leadsCount += await WhatsappEnquiryModel.countDocuments({ account: acc.name });
      
      return {
        ...acc,
        leadsCount
      };
    }));

    return accountsWithCounts.map(this.mapToEntity.bind(this));
  }

  async findById(id: Types.ObjectId): Promise<Account | null> {
    const doc = await AccountModel.findById(id);
    if (!doc) return null;
    return this.mapToEntity(doc);
  }

  async update(id: Types.ObjectId, name: string): Promise<Account | null> {
    const currentAccount = await AccountModel.findById(id);
    if (!currentAccount) return null;
    
    const oldName = currentAccount.name;

    const updated = await AccountModel.findByIdAndUpdate(
      id,
      { $set: { name } },
      { new: true }
    );
    
    if (!updated) return null;

    if (oldName !== name) {
      await EnquiryModel.updateMany(
        { account: oldName },
        { $set: { account: name } }
      );
      await WhatsappEnquiryModel.updateMany(
        { account: oldName },
        { $set: { account: name } }
      );
    }

    return this.mapToEntity(updated);
  }

  async delete(id: Types.ObjectId): Promise<boolean> {
    const result = await AccountModel.findByIdAndDelete(id);
    return result !== null;
  }
}
