import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { TIERS } from '@uploadkitdev/shared';
import type { Tier, SubscriptionStatus } from '@uploadkitdev/shared';

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  tier: Tier;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    stripeCustomerId: { type: String, sparse: true, unique: true },
    stripeSubscriptionId: { type: String, sparse: true, unique: true },
    stripePriceId: { type: String },
    tier: {
      type: String,
      enum: [...TIERS],
      default: 'FREE',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'],
      default: 'ACTIVE',
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Subscription =
  (mongoose.models['Subscription'] as mongoose.Model<ISubscription>) ??
  mongoose.model<ISubscription>('Subscription', subscriptionSchema);
