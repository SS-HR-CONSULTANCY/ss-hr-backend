import { User } from "../../domain/entities/user";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { LocalFileDeleteService } from "../../infrastructure/service/localFileDeleteService";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { LocalFileUploadService } from "../../infrastructure/service/localFileUploadService";
import { ApiResponse, CommonResponse, FolderNames } from "../../infrastructure/dtos/common.dts";

export class UploadLocalFileUseCase {
    constructor(
        private localFileUploadService: LocalFileUploadService,
    ) { }

    async execute(file: Express.Multer.File): Promise<ApiResponse<{ uploadUrl: string; key: string }>> {
        try {
            if (!file) throw new Error("No file provided");

            const { uploadUrl, key } = await this.localFileUploadService.uploadFile(file);
            
            return { success: true, message: "File uploaded successfully", data: {
                key,
                uploadUrl
            }};

        } catch (error) {
            throw handleUseCaseError(error || "Failed to upload file.");
        }
    }
}

export class DeleteLocalFileUseCase {
    constructor(
        private localFileDeleteService: LocalFileDeleteService,
        private userRepositoryImpl: UserRepositoryImpl,
    ) { }

    async execute(_id: User["_id"], folderName: FolderNames): Promise<CommonResponse> {
        try {
            if (!_id) throw new Error("No user found");

            const user = await this.userRepositoryImpl.findUserById(_id);
            if(!user) throw new Error("No user found");

            const fileToDelete : string = folderName === FolderNames.resumes ? user.resume : user.profileImage;

            return await this.localFileDeleteService.deleteFile(fileToDelete);

        } catch (error) {
            throw handleUseCaseError(error || "Failed to delete file.");
        }
    }
}