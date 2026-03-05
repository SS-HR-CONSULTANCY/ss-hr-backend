
import { Types } from "mongoose";
import { IPayment, PaymentModel } from "./paymentModel";
import { Payment } from "../../../domain/entities/payment";
import { ApiPaginationRequest, ApiResponse } from "../../dtos/common.dts";
import { AdminFetchAllPayments, CreatePayment, IPaymentRepository } from "../../../domain/repositories/IPaymentRepository";
import { GetPaymentGraphDataResponse } from "../../dtos/payment.dto";

export class PaymentRepositoryImpl implements IPaymentRepository {
  private mapToEntity(payment: IPayment): Payment {
    return new Payment(
      payment._id,
      payment.customerName,
      payment.packageName,
      payment.totalAmount,
      payment.paidAmount,
      payment.balanceAmount,
      payment.paymentMethod,
      payment.paymentDate,
      payment.adminNotes,
      payment.referenceId,
      payment.paymentProof,
      payment.invoiceUrl,
      payment.paymentStatus,
      payment.createdAt,
      payment.updatedAt,
    );
  }

  async createPayment(paymentData: CreatePayment): Promise<Payment> {
    try {
      const balanceAmount = paymentData.totalAmount - paymentData.paidAmount;
      let status = "pending";

      if (paymentData.paidAmount === 0) {
        status = "pending";
      } else if (paymentData.paidAmount >= paymentData.totalAmount) {
        status = "fullypaid";
      } else {
        status = "partiallypaid";
      }

      const createdPayment = await PaymentModel.create({
        ...paymentData,
        balanceAmount,
        status
      });
      return this.mapToEntity(createdPayment);
    } catch (error: any) {
      throw new Error("Unable to create payment, please try again after a few minutes.");
    }
  }

  async findAllPayments({ page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>> {
    try {
      const skip = (page - 1) * limit;
      const [payments, totalCount] = await Promise.all([
        PaymentModel.find({}, {
          _id: 1, customerName: 1, packageName: 1, totalAmount: 1, paidAmount: 1, balanceAmount: 1, paymentStatus: 1, paymentProof: 1, invoiceUrl: 1, referenceId: 1
        })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        PaymentModel.countDocuments(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: payments.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch payments from database.");
    }
  }

  async findPaymentById(paymentId: Types.ObjectId): Promise<Payment | null> {
    try {
      const paymentData = await PaymentModel.findById(paymentId);
      return paymentData ? this.mapToEntity(paymentData) : null;
    } catch (error) {
      throw new Error("Payment not found.");
    }
  }

  async updatePayment(paymentData: Payment): Promise<Payment | null> {
    try {
      const updatedPayment = await PaymentModel.findByIdAndUpdate(paymentData._id, paymentData, {
        new: true,
      });
      return updatedPayment ? this.mapToEntity(updatedPayment) : null;
    } catch (error) {
      throw new Error("Unable to update payment.");
    }
  }

  async deletePayment(paymentId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await PaymentModel.findByIdAndDelete(paymentId);
      return !!result;
    } catch (error) {
      throw new Error("Failed to delete payment");
    }
  }

  async getTotalCount(): Promise<number> {
    try {
      return await PaymentModel.countDocuments();
    } catch (error) {
      throw new Error("Failed to get total count");
    }
  }

  async findPaymentsByCustomerId(customerId: Types.ObjectId, { page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>> {
    try {
      const skip = (page - 1) * limit;
      const [payments, totalCount] = await Promise.all([
        PaymentModel.find(
          { customerId }
        )
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        PaymentModel.countDocuments({ customerId }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: payments.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch payments by customer from database.");
    }
  }

  async findPaymentsByPackageId(packageId: Types.ObjectId, { page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>> {
    try {
      const skip = (page - 1) * limit;
      const [payments, totalCount] = await Promise.all([
        PaymentModel.find(
          { packageId }
        )
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        PaymentModel.countDocuments({ packageId }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: payments.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch payments by package from database.");
    }
  }

  async findPaymentsByStatus(status: string, { page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>> {
    try {
      const skip = (page - 1) * limit;
      const [payments, totalCount] = await Promise.all([
        PaymentModel.find(
          { status }
        )
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        PaymentModel.countDocuments({ status }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: payments.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch payments by status from database.");
    }
  }

  async getPaymentGraphData(): Promise<GetPaymentGraphDataResponse> {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Radial Graph Data (Last 7 Days Count)
      const radialData = await PaymentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            count: { $sum: 1 }
          }
        }
      ]);

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const paymentsRadialGragphData = daysOfWeek.map((day, index) => {
        const found = radialData.find(d => d._id === index + 1);
        return {
          day,
          count: found ? found.count : 0
        };
      });

      // Revenue Line Graph Data (Last 7 Days Revenue Breakdown)
      const lineData = await PaymentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalAmount: 1,
            isPackage: { $cond: [{ $ifNull: ["$packageName", false] }, 1, 0] }
          }
        },
        {
          $group: {
            _id: "$date",
            totalRevenue: { $sum: "$totalAmount" },
            packageRevenue: {
              $sum: {
                $cond: [{ $eq: ["$isPackage", 1] }, "$totalAmount", 0]
              }
            },
            hiringRevenue: {
              $sum: {
                $cond: [{ $eq: ["$isPackage", 0] }, "$totalAmount", 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);


      const revenueLineGraphData = lineData.map(item => ({
        date: item._id,
        totalRevenue: item.totalRevenue,
        packageRevenue: item.packageRevenue,
        hiringRevenue: item.hiringRevenue
      }));

      return {
        paymentsRadialGragphData,
        revenueLineGraphData
      };

    } catch (error) {
      throw new Error("Failed to fetch payment graph data from database.");
    }
  }

  async getDetailedStats(): Promise<{
    totalPayments: number;
    totalRevenue: number;
    totalPending: number;
  }> {
    try {
      const [totalPayments, financeStats] = await Promise.all([
        PaymentModel.countDocuments(),
        PaymentModel.aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$paidAmount" },
              totalPending: { $sum: "$balanceAmount" }
            }
          }
        ])
      ]);

      return {
        totalPayments,
        totalRevenue: financeStats[0]?.totalRevenue || 0,
        totalPending: financeStats[0]?.totalPending || 0
      };
    } catch (error) {
      throw new Error("Failed to get detailed payment stats");
    }
  }
}