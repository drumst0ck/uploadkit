import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IAccount extends Document {
  userId: Types.ObjectId;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    refresh_token: { type: String },
    access_token: { type: String },
    expires_at: { type: Number },
    token_type: { type: String },
    scope: { type: String },
    id_token: { type: String },
    session_state: { type: String },
  },
  { timestamps: true },
);

accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const Account =
  (mongoose.models['Account'] as mongoose.Model<IAccount>) ??
  mongoose.model<IAccount>('Account', accountSchema);
