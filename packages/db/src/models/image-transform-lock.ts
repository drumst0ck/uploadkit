import mongoose, { Schema, type Document } from 'mongoose';

export interface IImageTransformLock extends Document {
  lockKey: string;
  owner: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const imageTransformLockSchema = new Schema<IImageTransformLock>(
  {
    lockKey: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

imageTransformLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ImageTransformLock =
  (mongoose.models['ImageTransformLock'] as mongoose.Model<IImageTransformLock>) ??
  mongoose.model<IImageTransformLock>('ImageTransformLock', imageTransformLockSchema);
