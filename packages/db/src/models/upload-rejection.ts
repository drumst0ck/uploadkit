import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type UploadRejectionCode = 'FILE_TOO_LARGE' | 'TYPE_NOT_ALLOWED' | 'QUOTA_EXCEEDED';

/** Rejections are kept for 30 days, then removed by a MongoDB TTL index. */
export const UPLOAD_REJECTION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface IUploadRejection extends Document {
  projectId: Types.ObjectId;
  userId?: Types.ObjectId;
  routerSlug: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  code: UploadRejectionCode;
  reason: string;
  dismissedAt?: Date | null;
  createdAt: Date;
}

const uploadRejectionSchema = new Schema<IUploadRejection>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    routerSlug: { type: String, required: true, maxlength: 255 },
    fileName: { type: String, required: true, maxlength: 255 },
    fileSize: { type: Number, required: true },
    fileType: { type: String, default: '', maxlength: 255 },
    code: { type: String, enum: ['FILE_TOO_LARGE', 'TYPE_NOT_ALLOWED', 'QUOTA_EXCEEDED'], required: true },
    reason: { type: String, required: true, maxlength: 500 },
    dismissedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

uploadRejectionSchema.index({ projectId: 1, createdAt: -1 });
uploadRejectionSchema.index({ createdAt: 1 }, { expireAfterSeconds: UPLOAD_REJECTION_TTL_SECONDS });

export const UploadRejection =
  (mongoose.models['UploadRejection'] as mongoose.Model<IUploadRejection>) ??
  mongoose.model<IUploadRejection>('UploadRejection', uploadRejectionSchema);
