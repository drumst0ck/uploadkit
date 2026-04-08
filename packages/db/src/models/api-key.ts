import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IApiKey extends Document {
  keyPrefix: string; // "uk_live_abc1" — first 12 chars for display
  keyHash: string;   // SHA256 hex of the full key
  name: string;
  projectId: Types.ObjectId;
  isTest: boolean;
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    name: { type: String, default: 'Default' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    isTest: { type: Boolean, default: false },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

export const ApiKey =
  (mongoose.models['ApiKey'] as mongoose.Model<IApiKey>) ??
  mongoose.model<IApiKey>('ApiKey', apiKeySchema);
