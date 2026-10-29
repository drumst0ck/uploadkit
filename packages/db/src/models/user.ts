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
  /**
   * One-shot sign-up conversion flag. Set in the auth `createUser` event and
   * atomically cleared by the first dashboard render that emits `sign_up`.
   * Absent for users created before this field existed.
   */
  signUpTrackingPending?: boolean;
  /** Provider used at sign-up: github | google | email (set by `linkAccount`). */
  signUpMethod?: string;
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
    signUpTrackingPending: { type: Boolean },
    signUpMethod: { type: String },
  },
  { timestamps: true },
);

// Index supports the inactive-cleanup cron scan
userSchema.index({ lastLoginAt: 1 });

export const User = (mongoose.models['User'] as mongoose.Model<IUser>) ?? mongoose.model<IUser>('User', userSchema);
