import { Types } from "mongoose";
import { IAccountRepository } from "../../domain/repositories/IAccountRepository";
import { Account } from "../../domain/entities/account";

export class AdminCreateAccountUseCase {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(name: string): Promise<{ success: boolean; message: string; data: Account }> {
    const created = await this.accountRepository.create(name);
    return { success: true, message: "Account created successfully", data: created };
  }
}

export class AdminGetAllAccountsUseCase {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(): Promise<{ success: boolean; message: string; data: Account[] }> {
    const accounts = await this.accountRepository.findAll();
    return { success: true, message: "Accounts fetched successfully", data: accounts };
  }
}

export class AdminUpdateAccountUseCase {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(params: { id: Types.ObjectId; name: string }): Promise<{ success: boolean; message: string; data: Account }> {
    const updated = await this.accountRepository.update(params.id, params.name);
    if (!updated) throw new Error("Account not found");
    return { success: true, message: "Account updated successfully", data: updated };
  }
}

export class AdminDeleteAccountUseCase {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(id: Types.ObjectId): Promise<{ success: boolean; message: string }> {
    const deleted = await this.accountRepository.delete(id);
    if (!deleted) throw new Error("Account not found");
    return { success: true, message: "Account deleted successfully" };
  }
}
