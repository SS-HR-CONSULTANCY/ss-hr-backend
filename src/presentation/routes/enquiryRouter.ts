import { Router } from "express";
import { EnquiryController } from "../controllers/enquiryController";
import { EnquiryRepositoryImpl } from "../../infrastructure/database/enquiry/enquiryRepositoryImpl";
import { CreateEnquiryUseCase } from "../../application/publicUse-cases/createEnquiryUseCase";

const router = Router();

const enquiryRepository = new EnquiryRepositoryImpl();
const createEnquiryUseCase = new CreateEnquiryUseCase(enquiryRepository);
const enquiryController = new EnquiryController(createEnquiryUseCase);

router.post("/", enquiryController.createEnquiry.bind(enquiryController));

export default router;
