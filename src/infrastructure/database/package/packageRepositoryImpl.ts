import { Types } from "mongoose";
import { IPackage, PackageModel } from "./packageModel";
import { Package } from "../../../domain/entities/package";
import { ApiPaginationRequest, ApiResponse } from "../../dtos/common.dts";
import { AdminFetchAllPackages, CreatePackage, IPackageRepository } from "../../../domain/repositories/IPackageRepository";

export class PackageRepositoryImpl implements IPackageRepository {
  private mapToEntity(packageData: IPackage): Package {
    return new Package(
      packageData._id,
      packageData.packageName,
      packageData.price,
      packageData.currency,
      packageData.packageIncludes,
      packageData.packageCategory,
      packageData.createdAt.toISOString(),
      packageData.updatedAt.toISOString()
    );
  }

  async createPackage(packageData: CreatePackage): Promise<Package> {
    try {
      const createdPackage = await PackageModel.create(packageData);
      return this.mapToEntity(createdPackage);
    } catch (error: any) {
      throw new Error("Unable to create package, please try again after a few minutes.");
    }
  }

  async findAllPackages({ page, limit }: ApiPaginationRequest, category?: string): Promise<ApiResponse<AdminFetchAllPackages>> {
    try {
      const skip = (page - 1) * limit;
      const filter = category ? { packageCategory: category } : {};
      const projection = { _id: 1, packageName: 1, price: 1, currency: 1, packageIncludes: 1, packageCategory: 1, createdAt: 1, updatedAt: 1 };

      const [packages, totalCount] = await Promise.all([
        PackageModel.find(filter, projection)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        PackageModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: packages.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch packages from database.");
    }
  }

  async findPackageById(packageId: Types.ObjectId): Promise<Package | null> {
    try {
      const packageData = await PackageModel.findById(packageId);
      return packageData ? this.mapToEntity(packageData) : null;
    } catch (error) {
      throw new Error("Package not found.");
    }
  }

  async updatePackage(packageData: Package): Promise<Package | null> {
    try {
      const updatedPackage = await PackageModel.findByIdAndUpdate(packageData._id, packageData, {
        new: true,
      });
      return updatedPackage ? this.mapToEntity(updatedPackage) : null;
    } catch (error) {
      throw new Error("Unable to update package.");
    }
  }

  async deletePackage(packageId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await PackageModel.findByIdAndDelete(packageId);
      return !!result;
    } catch (error) {
      throw new Error("Failed to delete package");
    }
  }

  async getTotalCount(): Promise<number> {
    try {
      return await PackageModel.countDocuments();
    } catch (error) {
      throw new Error("Failed to get total count");
    }
  }
}
