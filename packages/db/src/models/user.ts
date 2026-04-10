import mongoose, { Schema, type Document } from 'mongoose';

export interface IUserNotifications {
  emailUsageAlerts: boolean;
  emailProductUpdates: boolean;
}

export interface IUser extends Document {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  notifications?: IUserNotifications;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    notifications: {
      emailUsageAlerts: { type: Boolean, default: true },
      emailProductUpdates: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const User = (mongoose.models['User'] as mongoose.Model<IUser>) ?? mongoose.model<IUser>('User', userSchema);
