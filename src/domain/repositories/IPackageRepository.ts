import {Types} from "mongoose"
import { Package } from "../entities/package"
import {ApiPaginationRequest,ApiResponse} from "../../infrastructure/dtos/common.dts"


export type CreatePackage = Pick<Package, "packageName" | "price" | "currency" | "packageIncludes" | "packageCategory">
export type AdminFetchAllPackages = Array<Pick<Package, "_id" | "packageName" | "price" | "currency" | "packageIncludes" | "packageCategory" | "createdAt" | "updatedAt">>

export interface IPackageRepository {

    createPackage(packageData:CreatePackage):Promise<Package>;
    findAllPackages({page,limit}:ApiPaginationRequest, category?: string):Promise<ApiResponse<AdminFetchAllPackages>>;
    findPackageById(packageId:Types.ObjectId):Promise<Package|null>;
    updatePackage(packageData:Package):Promise<Package | null>;
    deletePackage(packageId:Types.ObjectId):Promise<boolean>;
    getTotalCount():Promise<number>;

}