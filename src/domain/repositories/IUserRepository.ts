import { Types } from "mongoose";
import { User } from "../entities/user";
import {ApiPaginationRequest,ApiResponse, FetchUsersForChatSideBar} from "../../infrastructure/dtos/common.dts";

export type CreateLocalUser = Pick<User,"fullName" | "email" | "password" | "verificationToken" | "role">;
export type CreateLocalUserByAdmin = Pick<User,"fullName" | "email" | "password" | "role" | "phone" | "phoneTwo" | "isVerified">;
export type CreateGoogleUser = Pick<User,"fullName" | "email" | "isVerified" | "verificationToken" | "role" | "googleId">;
export type CreateAdmin = Pick<User,"fullName" | "email" | "password" | "isVerified" | "role" | "phone" | "profileImage">;
export type AdminFetchAllUsers = Array<Pick<User, "_id" | "fullName" | "email" | "isBlocked" | "isVerified" |"createdAt" | "profileImage">>;


export interface IUserRepository {
  createUser<T>(user: T): Promise<User>;

  verifyUser(verificationToken: string): Promise<User | null>;

  updateUser(user: User): Promise<User | null>;

  findUserByEmail(email: string): Promise<User | null>;

  findUserByEmailWithRole(email: string, role: User["role"]): Promise<User | null>;

  findAllUsers({page,limit,}: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllUsers>>;

  findUserById(userId: Types.ObjectId): Promise<User | null>;

  findUserByGoogleId(googleId: string): Promise<User | null>;

  findAllUsersForChatSidebar(isAdmin: boolean): Promise<FetchUsersForChatSideBar | null>

  getTotalCount():Promise<number>;

  deleteUserById(id: Types.ObjectId): Promise<boolean>;

  getNewUsersCount(startDate: Date): Promise<number>;

  getUserGraphData(startDate: Date): Promise<any>;

  getRegistrationStatsByPeriod(period: 'weekly' | 'monthly'): Promise<Array<{ _id: string; count: number }>>;
}
