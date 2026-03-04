import { Types } from "mongoose";
import { Package } from "../../domain/entities/package";
import { ApiResponse } from "../../infrastructure/dtos/common.dts";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { PackageRepositoryImpl } from "../../infrastructure/database/package/packageRepositoryImpl";
import {
  CreatePackageRequest,
  CreatePackageResponse,
  UpdatePackageRequest,
  UpdatePackageResponse,
  DeletePackageRequest,
  GetPackageByIdRequest,
  GetPackageByIdResponse,
  GetAllPackagesResponse,
} from "../../infrastructure/dtos/package.dto";

export class CreatePackageUseCase {
  constructor(private packageRepository: PackageRepositoryImpl) {}

  async execute(data: CreatePackageRequest): Promise<CreatePackageResponse> {
    try {
      const { packageName, price, currency, packageIncludes, packageCategory } = data;

      const createdPackage = await this.packageRepository.createPackage({
        packageName,
        price,
        currency,
        packageIncludes,
        packageCategory,
      });

      return {
        success: true,
        message: "Package created successfully",
        package: {
          _id: createdPackage._id,
          packageName: createdPackage.packageName,
          price: createdPackage.price,
          currency: createdPackage.currency,
          packageIncludes: createdPackage.packageIncludes,
          packageCategory: createdPackage.packageCategory,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to create package");
    }
  }
}

export class UpdatePackageUseCase {
  constructor(private packageRepository: PackageRepositoryImpl) {}

  async execute(data: UpdatePackageRequest): Promise<UpdatePackageResponse> {
    try {
      const { _id, ...updateData } = data;

      const existingPackage = await this.packageRepository.findPackageById(_id);
      if (!existingPackage) throw new Error("Package not found");

      const updatedPackage = new Package(
        existingPackage._id,
        updateData.packageName ?? existingPackage.packageName,
        updateData.price ?? existingPackage.price,
        updateData.currency ?? existingPackage.currency,
        updateData.packageIncludes ?? existingPackage.packageIncludes,
        updateData.packageCategory ?? existingPackage.packageCategory,
        existingPackage.createdAt,
        existingPackage.updatedAt
      );

      const result = await this.packageRepository.updatePackage(updatedPackage);
      if (!result) throw new Error("Failed to update package");

      return {
        success: true,
        message: "Package updated successfully",
        package: {
          _id: result._id,
          packageName: result.packageName,
          price: result.price,
          currency: result.currency,
          packageIncludes: result.packageIncludes,
          packageCategory: result.packageCategory,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update package");
    }
  }
}

export class DeletePackageUseCase {
  constructor(private packageRepository: PackageRepositoryImpl) {}

  async execute(data: DeletePackageRequest): Promise<ApiResponse> {
    try {
      const { packageId } = data;

      const existingPackage = await this.packageRepository.findPackageById(packageId);
      if (!existingPackage) throw new Error("Package not found");

      const deleted = await this.packageRepository.deletePackage(packageId);
      if (!deleted) throw new Error("Failed to delete package");

      return { success: true, message: "Package deleted successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to delete package");
    }
  }
}

export class GetPackageByIdUseCase {
  constructor(private packageRepository: PackageRepositoryImpl) {}

  async execute(data: GetPackageByIdRequest): Promise<GetPackageByIdResponse> {
    try {
      const { packageId } = data;

      const packageData = await this.packageRepository.findPackageById(packageId);
      if (!packageData) throw new Error("Package not found");

      return {
        success: true,
        message: "Package retrieved successfully",
        package: {
          _id: packageData._id,
          packageName: packageData.packageName,
          price: packageData.price,
          currency: packageData.currency,
          packageIncludes: packageData.packageIncludes,
          packageCategory: packageData.packageCategory,
          createdAt: new Date(packageData.createdAt),
          updatedAt: new Date(packageData.updatedAt),
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get package");
    }
  }
}

export class GetAllPackagesUseCase {
  constructor(private packageRepository: PackageRepositoryImpl) {}

  async execute(data: { page: number; limit: number; category?: string }) {
    try {
      const result = await this.packageRepository.findAllPackages(data, data.category);
      return {
        success: true,
        message: "Packages retrieved successfully",
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get packages");
    }
  }
}

export class GetPackageStatsUseCase {
  constructor(private packageRepository: PackageRepositoryImpl) {}

  async execute() {
    try {
      const totalPackages = await this.packageRepository.getTotalCount();
      return {
        success: true,
        message: "Package stats retrieved successfully",
        stats: { totalPackages },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get package stats");
    }
  }
}