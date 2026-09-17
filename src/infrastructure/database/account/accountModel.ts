import mongoose, { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>({
  name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

export const AccountModel = mongoose.model<IAccount>('Account', accountSchema);
