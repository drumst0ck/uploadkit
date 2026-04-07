import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IUsageRecord extends Document {
  userId: Types.ObjectId;
  period: string;
  storageUsed: number;
  bandwidth: number;
  uploads: number;
  createdAt: Date;
  updatedAt: Date;
}

const usageRecordSchema = new Schema<IUsageRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true },
    storageUsed: { type: Number, default: 0 },
    bandwidth: { type: Number, default: 0 },
    uploads: { type: Number, default: 0 },
  },
  { timestamps: true },
);

usageRecordSchema.index({ userId: 1, period: 1 }, { unique: true });

export const UsageRecord =
  (mongoose.models['UsageRecord'] as mongoose.Model<IUsageRecord>) ??
  mongoose.model<IUsageRecord>('UsageRecord', usageRecordSchema);
