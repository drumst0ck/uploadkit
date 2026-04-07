import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IFileRouter extends Document {
  slug: string;
  projectId: Types.ObjectId;
  maxFileSize: number;
  maxFileCount: number;
  allowedTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const fileRouterSchema = new Schema<IFileRouter>(
  {
    slug: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    maxFileSize: { type: Number, default: 4194304 }, // 4 MB
    maxFileCount: { type: Number, default: 1 },
    allowedTypes: [{ type: String }],
  },
  { timestamps: true },
);

fileRouterSchema.index({ projectId: 1, slug: 1 }, { unique: true });

export const FileRouter =
  (mongoose.models['FileRouter'] as mongoose.Model<IFileRouter>) ??
  mongoose.model<IFileRouter>('FileRouter', fileRouterSchema);
