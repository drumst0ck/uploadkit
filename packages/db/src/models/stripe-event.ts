import mongoose, { Schema, type Document } from 'mongoose';

export type StripeEventStatus = 'processing' | 'done';

/**
 * Idempotency ledger for Stripe webhook deliveries. The unique `eventId`
 * index is the atomic claim; documents expire after 30 days (Stripe retries
 * for at most 3 days).
 */
export interface IStripeEvent extends Document {
  eventId: string;
  type: string;
  status: StripeEventStatus;
  lockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stripeEventSchema = new Schema<IStripeEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['processing', 'done'], default: 'processing' },
    lockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

stripeEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const StripeEvent =
  (mongoose.models['StripeEvent'] as mongoose.Model<IStripeEvent>) ??
  mongoose.model<IStripeEvent>('StripeEvent', stripeEventSchema);
