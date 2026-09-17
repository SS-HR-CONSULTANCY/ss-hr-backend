import { Types } from "mongoose";
import { IUser, UserModel } from "./userModel";
import { User } from "../../../domain/entities/user";
import { AdminFetchAllUsers, IUserRepository } from "../../../domain/repositories/IUserRepository";
import { ApiPaginationRequest, ApiResponse, FetchUsersForChatSideBar } from "../../dtos/common.dts";

export class UserRepositoryImpl implements IUserRepository {
  private mapToEntity(user: IUser): User {
    return new User(
      user._id,
      user.serialNumber,
      user.fullName,
      user.email,
      user.password,
      user.role,
      user.phone,
      user.phoneTwo,
      user.profileImage,
      user.isBlocked,
      user.isVerified,
      user.verificationToken,
      user.googleId,
      user.gender,
      user.nationality,
      user.dob,
      user.linkedInUsername,
      user.portfolioUrl,
      user.resume,
      user.professionalStatus,
      user.createdAt,
      user.updatedAt,
    );
  }

  async createUser<T>(user: T): Promise<User> {
    try {
      const createdUser = await UserModel.create({ ...user });
      return this.mapToEntity(createdUser);
    } catch (error) {
      throw new Error("Unable to register, please try again after a few minutes.");
    }
  }

  async verifyUser(verificationToken: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ verificationToken });
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error("Unable to retrieve verification data.");
    }
  }

  async updateUser(user: User): Promise<User | null> {
    try {
      const updatedUser = await UserModel.findByIdAndUpdate(user._id, user, {
        new: true,
      });
      return updatedUser ? this.mapToEntity(updatedUser) : null;
    } catch (error) {
      throw new Error("Unable to update user.");
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ email });
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error("Unable to find user by email.");
    }
  }

  async findAllUsers({
    page,
    limit,
  }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllUsers>> {
    try {
      const skip = (page - 1) * limit;
      const [users, totalCount] = await Promise.all([
        UserModel.find(
          { role: "user" },
          {
            _id: 1,
            serialNumber: 1,
            fullName: 1,
            email: 1,
            profileImage: 1,
            isBlocked: 1,
            isVerified: 1,
            createdAt: 1,
          }
        )
          .skip(skip)
          .limit(limit)
          .lean(),
        UserModel.countDocuments(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: users.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch users from database.");
    }
  }

  async findUserById(userId: Types.ObjectId): Promise<User | null> {
    try {
      const user = await UserModel.findById(userId);
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error("User not found.");
    }
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ googleId });
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error("User finding using googleId failed");
    }
  }

  async findAllUsersForChatSidebar(
    isAdmin: boolean
  ): Promise<FetchUsersForChatSideBar | null> {
    try {
      const filter = isAdmin
        ? { role: "user" }
        : { role: { $in: ["admin", "superAdmin"] } };

      const users = await UserModel.find(filter, {
        _id: 1,
        fullName: 1,
        profileImage: 1,
      });

      return users.length > 0
        ? users.map((user) => this.mapToEntity(user))
        : null;
    } catch (error) {
      throw new Error(`${isAdmin ? "Users" : "Chat Support"} fetching failed`);
    }
  }

  async findUserByEmailWithRole(
    email: string,
    role: User["role"],
  ): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ email, role });
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error("User not found.");
    }
  }

  async deleteUser(userId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndDelete(userId);
      return !!result;
    } catch (error) {
      throw new Error("Failed to delete user");
    }
  }
  async getTotalCount(): Promise<number> {
    try {
      return await UserModel.countDocuments();
    } catch (error) {
      throw new Error("Failed to get total count");
    }
  }

  async deleteUserById(id: Types.ObjectId): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndDelete(id);
      return result ? true : false;
    } catch (error) {
      throw new Error("Failed to delete user.");
    }
  }
  


  async getNewUsersCount(startDate: Date): Promise<number> {
    try {
      return await UserModel.countDocuments({ createdAt: { $gte: startDate } });
    } catch (error) {
      throw new Error("Failed to get new users count");
    }
  }

  async getUserGraphData(startDate: Date): Promise<any> {
    try {
      const result = await UserModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      return result;
    } catch (error) {
      throw new Error("Failed to get user graph data");
    }
  }

  async getRegistrationStatsByPeriod(period: 'weekly' | 'monthly'): Promise<Array<{ _id: string; count: number }>> {
    try {
      const format = period === 'weekly' ? "%Y-%U" : "%Y-%m"; // %U for week of year, %m for month
      
      const result = await UserModel.aggregate([
        {
          $group: {
            _id: { $dateToString: { format, date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      return result;
    } catch (error) {
      throw new Error("Failed to get registration stats by period");
    }
  }
}


