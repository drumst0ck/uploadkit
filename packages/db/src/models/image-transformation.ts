import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IImageTransformation extends Document {
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  fileId: Types.ObjectId;
  period: string;
  fingerprint: string;
  units: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const imageTransformationSchema = new Schema<IImageTransformation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true },
    period: { type: String, required: true },
    fingerprint: { type: String, required: true },
    units: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

imageTransformationSchema.index(
  { userId: 1, period: 1, fingerprint: 1 },
  { unique: true },
);
imageTransformationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ImageTransformation =
  (mongoose.models['ImageTransformation'] as mongoose.Model<IImageTransformation>) ??
  mongoose.model<IImageTransformation>('ImageTransformation', imageTransformationSchema);
