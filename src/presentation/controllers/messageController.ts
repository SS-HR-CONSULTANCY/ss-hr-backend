import { Types } from "mongoose";
import { Request, Response } from "express";
import { DecodedUser } from "../../express";
import { HandleError } from "../../infrastructure/error/error";
import { ValidateObjectId } from "../../infrastructure/zod/common.zod";
import { SignedUrlService } from "../../infrastructure/service/generateSignedUrl";
import {  sendMessageRequestZodSchema } from "../../infrastructure/zod/message.zod";
import { SendMessageUseCase } from "../../application/messageUse-cases/sendMessageUseCase";
import { GetAllMessagesUseCase } from "../../application/messageUse-cases/getAllMessageUseCase";
import { MessageRepositoryImpl } from "../../infrastructure/database/message/messageRepositorylmpl";
import { SignedUrlRepositoryImpl } from "../../infrastructure/database/signedUrl/signedUrlRepositoryImpl";

const messageRepositoryIml = new MessageRepositoryImpl();
const signedUrlRepositoryImpl = new SignedUrlRepositoryImpl();
const signedUrlService = new SignedUrlService(signedUrlRepositoryImpl);

const sendMessageUseCase = new SendMessageUseCase(messageRepositoryIml, signedUrlService);
const getAllMessagesUseCase = new GetAllMessagesUseCase(messageRepositoryIml, signedUrlService);

export class MessageController {
    constructor(
        private getAllMessagesUseCase: GetAllMessagesUseCase,
        private sendMessageUseCase: SendMessageUseCase,
    ) {
        this.getMessages = this.getMessages.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
    }

    async getMessages(req: Request, res: Response) {
        try {
            const { id: toUserId } = ValidateObjectId(req.params.toUserId, "toUserId");
            const fromUserId = (req.user as DecodedUser).userId;
            const result = await this.getAllMessagesUseCase.execute({ fromUserId: new Types.ObjectId(fromUserId), toUserId: new Types.ObjectId(toUserId) });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async sendMessage(req: Request, res: Response) {
        try {
            const fromUserId = (req.user as DecodedUser).userId;
            const { id: toUserId } = ValidateObjectId(req.params.toUserId, "toUserId");
            const validateData = sendMessageRequestZodSchema.parse(req.body);
            const { text, image } = validateData;
            const result = await this.sendMessageUseCase.execute({
                senderId: new Types.ObjectId(fromUserId),
                receiverId: new Types.ObjectId(toUserId),
                image: image || "",
                text: text || ""
            });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }
}

export const messageController = new MessageController(getAllMessagesUseCase,sendMessageUseCase);
