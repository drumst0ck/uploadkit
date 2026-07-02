import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type StorageMode = 'managed' | 'byos';

export interface IByosConfig {
  provider: 'r2' | 's3' | 'minio' | 'other';
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  /** AES-256-GCM encrypted secretAccessKey */
  secretAccessKeyEncrypted: string;
  publicUrl?: string;
}

export interface ILifecyclePolicy {
  enabled: boolean;
  /** Delete files older than N days (0 = disabled) */
  retentionDays: number;
}

export interface IProject extends Document {
  name: string;
  slug: string;
  userId: Types.ObjectId;
  storageMode: StorageMode;
  byosConfig?: IByosConfig;
  customCdnDomain?: string;
  customCdnVerified: boolean;
  lifecyclePolicy: ILifecyclePolicy;
  createdAt: Date;
  updatedAt: Date;
}

const byosConfigSchema = new Schema<IByosConfig>(
  {
    provider: { type: String, enum: ['r2', 's3', 'minio', 'other'], required: true },
    endpoint: { type: String },
    region: { type: String, required: true },
    bucket: { type: String, required: true },
    accessKeyId: { type: String, required: true },
    secretAccessKeyEncrypted: { type: String, required: true },
    publicUrl: { type: String },
  },
  { _id: false },
);

const lifecyclePolicySchema = new Schema<ILifecyclePolicy>(
  {
    enabled: { type: Boolean, default: false },
    retentionDays: { type: Number, default: 0, min: 0, max: 3650 },
  },
  { _id: false },
);

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storageMode: { type: String, enum: ['managed', 'byos'], default: 'managed' },
    byosConfig: { type: byosConfigSchema, default: undefined },
    customCdnDomain: { type: String },
    customCdnVerified: { type: Boolean, default: false },
    lifecyclePolicy: {
      type: lifecyclePolicySchema,
      default: () => ({ enabled: false, retentionDays: 0 }),
    },
  },
  { timestamps: true },
);

export const Project =
  (mongoose.models['Project'] as mongoose.Model<IProject>) ??
  mongoose.model<IProject>('Project', projectSchema);
