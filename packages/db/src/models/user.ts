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
  /** Last time the user signed in. Used by the inactive-cleanup cron. */
  lastLoginAt?: Date;
  /**
   * When we last sent the "your data will be cleaned soon" warning email.
   * Reset to null on every new sign-in so subsequent inactivity cycles warn
   * again. Compared against `lastLoginAt` to avoid duplicate sends.
   */
  inactiveWarningSentAt?: Date | null;
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
    lastLoginAt: { type: Date },
    inactiveWarningSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Index supports the inactive-cleanup cron scan
userSchema.index({ lastLoginAt: 1 });

export const User = (mongoose.models['User'] as mongoose.Model<IUser>) ?? mongoose.model<IUser>('User', userSchema);
