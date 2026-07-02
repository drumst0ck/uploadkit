import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type TeamMemberRole = 'admin' | 'member';
export type TeamMemberStatus = 'pending' | 'active';

export interface ITeamMember extends Document {
  ownerUserId: Types.ObjectId;
  email: string;
  memberUserId?: Types.ObjectId;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  inviteToken?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    memberUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    status: { type: String, enum: ['pending', 'active'], default: 'pending' },
    inviteToken: { type: String, sparse: true, unique: true },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

teamMemberSchema.index({ ownerUserId: 1, email: 1 }, { unique: true });

export const TeamMember =
  (mongoose.models['TeamMember'] as mongoose.Model<ITeamMember>) ??
  mongoose.model<ITeamMember>('TeamMember', teamMemberSchema);
