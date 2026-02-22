import { Types } from "mongoose";
import { DecodedUser } from "../../express";
import { Request, Response } from "express";
import { HandleError } from "../../infrastructure/error/error";
import { LocalFileDeleteService } from "../../infrastructure/service/localFileDeleteService";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { LocalFileUploadService } from "../../infrastructure/service/localFileUploadService";
import { deleteFileZodSchema } from "../../infrastructure/zod/s3.zod";
import { DeleteLocalFileUseCase, UploadLocalFileUseCase } from "../../application/commonUse-cases/s3UseCases";

const userRepositoryImpl = new UserRepositoryImpl();
const localFileDeleteService = new LocalFileDeleteService();
const localFileUploadService = new LocalFileUploadService();

const uploadLocalFileUseCase = new UploadLocalFileUseCase(localFileUploadService);
const deleteLocalFileUseCase = new DeleteLocalFileUseCase(localFileDeleteService, userRepositoryImpl);

export class LocalFileController {
    constructor(
        private uploadLocalFileUseCase: UploadLocalFileUseCase,
        private deleteLocalFileUseCase: DeleteLocalFileUseCase,
    ) {
        this.uploadFile = this.uploadFile.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
    }

    async uploadFile(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: "No file uploaded" });
                return;
            }
            const result = await this.uploadLocalFileUseCase.execute(req.file);
            res.status(200).json(result);
        } catch (error: any) {
            HandleError.handle(error, res);
        }
    };

    async deleteFile(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = deleteFileZodSchema.parse(req.body);
            const result = await this.deleteLocalFileUseCase.execute(new Types.ObjectId(userId), validatedData.folder);
            return res.json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    };
}

export const localFileController = new LocalFileController(
    uploadLocalFileUseCase,
    deleteLocalFileUseCase
);