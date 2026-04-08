import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { FILE_STATUSES } from '@uploadkit/shared';
import type { FileStatus } from '@uploadkit/shared';

export interface IFile extends Document {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: FileStatus;
  uploadId?: string; // R2 multipart upload ID (set during multipart init, cleared on complete)
  metadata?: Record<string, unknown>;
  projectId: Types.ObjectId;
  uploadedBy?: string;
  deletedAt?: Date;
  webhookFailedAt?: Date; // Set by QStash DLQ callback when webhook delivery is exhausted (D-10)
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: FILE_STATUSES,
      default: 'UPLOADING',
    },
    uploadId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    uploadedBy: { type: String },
    deletedAt: { type: Date },
    webhookFailedAt: { type: Date },
  },
  { timestamps: true },
);

fileSchema.index({ projectId: 1, createdAt: -1 });
fileSchema.index({ status: 1 });

export const File =
  (mongoose.models['File'] as mongoose.Model<IFile>) ??
  mongoose.model<IFile>('File', fileSchema);
