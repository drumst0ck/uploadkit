import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type WebhookDeliveryStatus = 'success' | 'failed' | 'pending';

export interface IWebhookDelivery extends Document {
  projectId: Types.ObjectId;
  fileId: Types.ObjectId;
  routeSlug: string;
  webhookUrl: string;
  status: WebhookDeliveryStatus;
  httpStatus?: number;
  errorMessage?: string;
  payload: Record<string, unknown>;
  attemptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    routeSlug: { type: String, required: true },
    webhookUrl: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
    httpStatus: { type: Number },
    errorMessage: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

webhookDeliverySchema.index({ projectId: 1, attemptedAt: -1 });

export const WebhookDelivery =
  (mongoose.models['WebhookDelivery'] as mongoose.Model<IWebhookDelivery>) ??
  mongoose.model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema);
