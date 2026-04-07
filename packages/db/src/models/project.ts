import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IProject extends Document {
  name: string;
  slug: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

export const Project =
  (mongoose.models['Project'] as mongoose.Model<IProject>) ??
  mongoose.model<IProject>('Project', projectSchema);
