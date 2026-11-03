import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Consumed OAuth `state` nonces. The unique `nonce` index makes consumption atomic
 * (a replayed callback fails with E11000); rows expire when the state itself would.
 */
export interface IOAuthStateNonce extends Document {
  nonce: string;
  expiresAt: Date;
}

const oauthStateNonceSchema = new Schema<IOAuthStateNonce>({
  nonce: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

oauthStateNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthStateNonce =
  (mongoose.models['OAuthStateNonce'] as mongoose.Model<IOAuthStateNonce>) ??
  mongoose.model<IOAuthStateNonce>('OAuthStateNonce', oauthStateNonceSchema);
