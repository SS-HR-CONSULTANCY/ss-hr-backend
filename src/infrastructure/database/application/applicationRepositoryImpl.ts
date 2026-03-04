import { Types } from "mongoose";
import { Application } from "../../../domain/entities/application";
import { ApplicationModel, IApplication } from "./applicationModel";
import { ApiPaginationRequest, ApiResponse } from "../../dtos/common.dts";
import { IApplicationRepository } from "../../../domain/repositories/IApplicationRepository";
import { UserCreateApplicationRequest, UserFetchAllApplicationsResponse, UserFetchApplicationsJobFields, UserUpdateApplicationRequest } from "../../dtos/user.dto";
import { AdminFetchAllApplicationsResponse, AdminFetchApplicationDetailsRequest, AdminFetchApplicationDetailsResponse, adminfetchApplicationJobDetailFields, adminFetchApplicationsJobFields, adminFetchApplicationUserDetails, AdminUpdateApplicationStatusRequest } from "../../dtos/admin.dtos";

export class ApplicationRepositoryImpl implements IApplicationRepository {

    private mapToEntity(application: IApplication): Application {
        return new Application(
            application._id,
            application.jobId,
            application.userId,
            application.status,
            application.applicationUniqueId,
            application.createdAt,
            application.updatedAt,
        );
    }

    async createApplication(data: UserCreateApplicationRequest): Promise<Application | null> {
        try {
            const application = await ApplicationModel.create({ userId: data.userId, jobId: data.jobId });
            return application ? this.mapToEntity(application) : null;
        } catch (error) {
            throw new Error("Failed to create application");
        }
    }

    async updateApplication(data: UserUpdateApplicationRequest): Promise<Application | null> {
        try {
            const updatedApplication = await ApplicationModel.findOneAndUpdate(
                { _id: data._id },
                { $set: { status: data.status } },
                { new: true }
            );
            return updatedApplication ? this.mapToEntity(updatedApplication) : null;
        } catch (error) {
            throw new Error("Failed to update application");
        }
    }

    async userFindAllApplications(data: ApiPaginationRequest, userId: Types.ObjectId): Promise<ApiResponse<UserFetchAllApplicationsResponse>> {
        try {
            const { page, limit } = data;
            const [applications, totalCount] = await Promise.all([
                ApplicationModel.find({ userId })
                    .populate<{ jobId: UserFetchApplicationsJobFields }>("jobId")
                    .skip((page - 1) * limit)
                    .limit(limit),
                ApplicationModel.countDocuments({ userId })
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            return {
                data: applications.map(application => ({
                    _id: application._id,
                    updatedAt: application.updatedAt,
                    status: application.status,
                    applicationUniqueId: application.applicationUniqueId,
                    jobId: application.jobId._id,
                    jobUniqueId: application.jobId.jobUniqueId,
                    designation: application.jobId.designation,
                })),
                totalPages,
                currentPage: page,
                totalCount
            };
        } catch (error) {
            throw new Error("Failed to fetch applications")
        }
    }

    async adminFindAllApplications(data: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllApplicationsResponse>> {
        try {
            const { page, limit } = data;
            const [applications, totalCount] = await Promise.all([
                ApplicationModel.find({})
                    .populate<{ jobId: adminFetchApplicationsJobFields }>("jobId")
                    .populate<{ userId: { fullName: string } }>("userId", "fullName")
                    .skip((page - 1) * limit)
                    .limit(limit),
                ApplicationModel.countDocuments()
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            return {
                data: applications.map(application => ({
                    _id: application._id,
                    updatedAt: application.updatedAt,
                    status: application.status,
                    applicationUniqueId: application.applicationUniqueId,
                    jobId: application.jobId._id,
                    jobUniqueId: application.jobId.jobUniqueId,
                    designation: application.jobId.designation,
                    companyName: application.jobId.companyName,
                    userName: (application.userId as unknown as { fullName: string })?.fullName || "Unknown User"
                })),
                totalPages,
                currentPage: page,
                totalCount
            }
        } catch (error) {
            throw new Error("Failed to fetch applications");
        }
    }

    async adminFetchApplicationDetails(data: AdminFetchApplicationDetailsRequest): Promise<AdminFetchApplicationDetailsResponse> {
        try {
            const application = await ApplicationModel.findById(data._id)
                .select("createdAt updatedAt status")
                .populate<{ jobId: adminfetchApplicationJobDetailFields }>({
                    path: "jobId",
                    select:
                        "designation companyName vacancy createdAt benifits industry jobDescription nationality salary skills jobUniqueId",
                })
                .populate<{ userId: adminFetchApplicationUserDetails }>({
                    path: "userId",
                    select:
                        "fullName email dob gender linkedInUsername nationality phone serialNumber portfolioUrl profileImage phoneTwo professionalStatus resume",
                });

            if (!application) throw new Error("Application not found");

            const result: AdminFetchApplicationDetailsResponse = {
                createdAt: application.createdAt,
                updatedAt: application.updatedAt,
                status: application.status,
                applicationUniqueId: application.applicationUniqueId,
                jobId: {
                    designation: application.jobId?.designation,
                    companyName: application.jobId?.companyName,
                    vacancy: application.jobId?.vacancy,
                    currency: application.jobId?.currency,
                    benifits: application.jobId?.benifits,
                    location: application.jobId?.location,
                    jobDescription: application.jobId?.jobDescription,
                    salary: application.jobId?.salary,
                    createdAt: application.jobId?.createdAt,
                    jobUniqueId: application.jobId?.jobUniqueId,
                },
                userId: {
                    fullName: application.userId?.fullName,
                    email: application.userId?.email,
                    dob: application.userId?.dob,
                    gender: application.userId?.gender,
                    linkedInUsername: application.userId?.linkedInUsername,
                    phone: application.userId?.phone,
                    serialNumber: application.userId?.serialNumber,
                    portfolioUrl: application.userId?.portfolioUrl,
                    profileImage: application.userId?.profileImage,
                    phoneTwo: application.userId?.phoneTwo,
                    professionalStatus: application.userId?.professionalStatus,
                    nationality: application.userId?.nationality,
                    resume: application.userId?.resume,
                }
            };
            return result
        } catch (error) {
            throw new Error("Failed to fetch application details");
        }
    }

    async findApplicationByUserIdWithApplicationId(data: UserCreateApplicationRequest): Promise<Application | null> {
        try {
            const application = await ApplicationModel.findOne({
                jobId: data.jobId,
                userId:  data.userId
            });
            return application ? this.mapToEntity(application) : null;
        } catch (error) {
            throw new Error("Failed to fetch application");
        }
    }

    async adminUpdateApplicationStatus(data: AdminUpdateApplicationStatusRequest): Promise<Application | null> {
        try {
            const updatedApplication = await ApplicationModel.findByIdAndUpdate(
                { _id: data._id },
                { $set: { status: data.status } },
                { new : true }
            );
            return updatedApplication ? this.mapToEntity(updatedApplication) : null;
        } catch (error) {
            throw new Error("Application status updating failed.");
        }
    }

    async getTotalCount(): Promise<number> {
        try {
            return await ApplicationModel.countDocuments();
        } catch (error) {
            throw new Error("Failed to get total count");
        }
    }

    async getSuccessfulPlacementsCount(startDate: Date): Promise<number> {
        try {
            return await ApplicationModel.countDocuments({ status: "placed", createdAt: { $gte: startDate } });
        } catch (error) {
            throw new Error("Failed to get successful placements count");
        }
    }

    async getApplicationGraphData(startDate: Date): Promise<any> {
        try {
            const result = await ApplicationModel.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                        placedCount: {
                            $sum: { $cond: [{ $eq: ["$status", "placed"] }, 1, 0] }
                        }
                    },
                },
                { $sort: { _id: 1 } },
            ]);
            return result;
        } catch (error) {
            throw new Error("Failed to get application graph data");
        }
    }
}