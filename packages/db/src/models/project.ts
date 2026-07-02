import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type StorageMode = 'managed' | 'byos';
export type CustomCdnStatus = 'none' | 'pending' | 'pending_validation' | 'active' | 'failed';

export interface ICdnValidationRecord {
  type: 'cname' | 'txt';
  name: string;
  value: string;
}

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
  customCdnHostnameId?: string;
  customCdnStatus: CustomCdnStatus;
  customCdnValidationRecords: ICdnValidationRecord[];
  customCdnLastError?: string;
  customCdnVerifiedAt?: Date;
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

const cdnValidationRecordSchema = new Schema<ICdnValidationRecord>(
  {
    type: { type: String, enum: ['cname', 'txt'], required: true },
    name: { type: String, required: true },
    value: { type: String, required: true },
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
    customCdnHostnameId: { type: String },
    customCdnStatus: {
      type: String,
      enum: ['none', 'pending', 'pending_validation', 'active', 'failed'],
      default: 'none',
    },
    customCdnValidationRecords: { type: [cdnValidationRecordSchema], default: [] },
    customCdnLastError: { type: String },
    customCdnVerifiedAt: { type: Date },
    lifecyclePolicy: {
      type: lifecyclePolicySchema,
      default: () => ({ enabled: false, retentionDays: 0 }),
    },
  },
  { timestamps: true },
);

projectSchema.index({ customCdnStatus: 1 });

export const Project =
  (mongoose.models['Project'] as mongoose.Model<IProject>) ??
  mongoose.model<IProject>('Project', projectSchema);
