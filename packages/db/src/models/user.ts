import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
  },
  { timestamps: true },
);

export const User = (mongoose.models['User'] as mongoose.Model<IUser>) ?? mongoose.model<IUser>('User', userSchema);
