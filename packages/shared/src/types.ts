export type Tier = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
export type FileStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED' | 'DELETED';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';

export interface UploadFile {
  _id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: FileStatus;
  metadata?: Record<string, unknown>;
  projectId: string;
  uploadedBy?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  _id: string;
  name: string;
  slug: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyData {
  _id: string;
  key: string;
  name: string;
  projectId: string;
  isTest: boolean;
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileRouterConfig {
  _id: string;
  slug: string;
  projectId: string;
  maxFileSize: number;
  maxFileCount: number;
  allowedTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionData {
  _id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  tier: Tier;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecordData {
  _id: string;
  userId: string;
  period: string;
  storageUsed: number;
  bandwidth: number;
  uploads: number;
  createdAt: Date;
  updatedAt: Date;
}
