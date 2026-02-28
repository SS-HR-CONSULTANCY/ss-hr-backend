import { Types } from "mongoose";
import { Request, Response } from "express";
import { DecodedUser } from "../../express";
import { HandleError } from "../../infrastructure/error/error";
import { S3FileKeyZodSchmema } from "../../infrastructure/zod/s3.zod";
import { ValidateObjectId } from "../../infrastructure/zod/common.zod";
import { UserRepositoryImpl } from "../../infrastructure/database/user/userRepositoryImpl";
import { AddressRepositoryImpl } from "../../infrastructure/database/address/addressRepositoryImpl";
import { CareerDataRepositoryImpl } from "../../infrastructure/database/careerData/careerDataRepositoryImpl";
import { createAddressZodSchema, createCareerDataSchema, updateUserInfoSchema } from "../../infrastructure/zod/user.zod";
import { UserCreateAddressUseCase, UserUpdateAddressUseCase } from "../../application/userUse-Case.ts/userAddressUseCases";
import { UserCreateCareerDataUseCase, UserUpdateCareerDataUseCase } from "../../application/userUse-Case.ts/userCareerDataUseCases";
import { UserUpdatePorifleDataUseCase, UserUpdateResumeKeyUseCase, UserUpdateUserProfileImageUseCase } from "../../application/userUse-Case.ts/userProfileUseCases";

const userRepositoryImpl = new UserRepositoryImpl();
const addressRepositoryImpl = new AddressRepositoryImpl();
const careerDataRepositoryImpl = new CareerDataRepositoryImpl();

const userUpdateAddressUseCase = new UserUpdateAddressUseCase(addressRepositoryImpl);
const userCreateAddressUseCase = new UserCreateAddressUseCase(addressRepositoryImpl);
const userUpdateResumeKeyUseCase = new UserUpdateResumeKeyUseCase(userRepositoryImpl);
const userUpdatePorifleDataUseCase = new UserUpdatePorifleDataUseCase(userRepositoryImpl);
const userUpdateCareerDataUseCase = new UserUpdateCareerDataUseCase(careerDataRepositoryImpl);
const userCreateCareerDataUseCase = new UserCreateCareerDataUseCase(careerDataRepositoryImpl);
const userUpdateUserProfileImageUseCase = new UserUpdateUserProfileImageUseCase(userRepositoryImpl);

class UserProfileController {
    constructor(
        private userUpdateUserProfileImageUseCase: UserUpdateUserProfileImageUseCase,
        private userUpdatePorifleDataUseCase: UserUpdatePorifleDataUseCase,
        private userCreateAddressUseCase: UserCreateAddressUseCase,
        private userUpdateAddressUseCase: UserUpdateAddressUseCase,
        private userCreateCareerDataUseCase: UserCreateCareerDataUseCase,
        private userUpdateCareerDataUseCase: UserUpdateCareerDataUseCase,
        private userUpdateResumeKeyUseCase: UserUpdateResumeKeyUseCase,
    ) {
        this.updateUserProfileImage = this.updateUserProfileImage.bind(this);
        this.updateProfileDetails = this.updateProfileDetails.bind(this);
        this.createAddress = this.createAddress.bind(this);
        this.updateAddress = this.updateAddress.bind(this);
        this.createCareerData = this.createCareerData.bind(this);
        this.updateCareerData = this.updateCareerData.bind(this);
        this.updateResumeKey = this.updateResumeKey.bind(this);
    }

    async updateUserProfileImage(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = S3FileKeyZodSchmema.parse({s3FileKey: req.body.profileImage});
            const result = await this.userUpdateUserProfileImageUseCase.execute({ _id: new Types.ObjectId(userId), profileImage: validatedData.s3FileKey });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updateProfileDetails(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = updateUserInfoSchema.parse(req.body);
            const result = await this.userUpdatePorifleDataUseCase.execute({
                _id: new Types.ObjectId(userId),
                ...validatedData,
                dob: new Date(validatedData.dob),
            });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async createAddress(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = createAddressZodSchema.parse(req.body);
            const result = await this.userCreateAddressUseCase.execute({
                ...validatedData,
                userId: new Types.ObjectId(userId),
            });
            res.status(201).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updateAddress(req: Request, res: Response) {
        try {
            const { id: addressId } = req.params;
            const validatedData = createAddressZodSchema.parse(req.body);
            const result = await this.userUpdateAddressUseCase.execute(new Types.ObjectId(addressId), validatedData);
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async createCareerData(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = createCareerDataSchema.parse(req.body);
            const result = await this.userCreateCareerDataUseCase.execute({
                userId: new Types.ObjectId(userId),
                ...validatedData
            });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updateCareerData(req: Request, res: Response) {
        try {
            const validatedParams = ValidateObjectId(req.params.id, "careerData id");
            const validatedData = createCareerDataSchema.parse(req.body);
            const result = await this.userUpdateCareerDataUseCase.execute({
                _id: new Types.ObjectId(validatedParams.id),
                ...validatedData
            });
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

    async updateResumeKey(req: Request, res: Response) {
        try {
            const userId = (req.user as DecodedUser).userId;
            const validatedData = S3FileKeyZodSchmema.parse({s3FileKey: req.body.resume});
            const result = await this.userUpdateResumeKeyUseCase.execute({ _id: new Types.ObjectId(userId), resume: validatedData.s3FileKey});
            res.status(200).json(result);
        } catch (error) {
            HandleError.handle(error, res);
        }
    }

}

export const userProfileController = new UserProfileController(
    userUpdateUserProfileImageUseCase,
    userUpdatePorifleDataUseCase,
    userCreateAddressUseCase,
    userUpdateAddressUseCase,
    userCreateCareerDataUseCase,
    userUpdateCareerDataUseCase,
    userUpdateResumeKeyUseCase,
);

