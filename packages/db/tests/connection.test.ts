import { describe, it, expect } from 'vitest';
import { connectDB, User, Account, Project, ApiKey, File, FileRouter, Subscription, UsageRecord } from '../src/index';
import { FILE_STATUSES, TIERS } from '@uploadkit/shared';

describe('connectDB export', () => {
  it('is a function', () => {
    expect(typeof connectDB).toBe('function');
  });
});

describe('Model exports', () => {
  it('exports User model', () => {
    expect(User).toBeDefined();
    expect(User.modelName).toBe('User');
  });

  it('exports Account model', () => {
    expect(Account).toBeDefined();
    expect(Account.modelName).toBe('Account');
  });

  it('exports Project model', () => {
    expect(Project).toBeDefined();
    expect(Project.modelName).toBe('Project');
  });

  it('exports ApiKey model', () => {
    expect(ApiKey).toBeDefined();
    expect(ApiKey.modelName).toBe('ApiKey');
  });

  it('exports File model', () => {
    expect(File).toBeDefined();
    expect(File.modelName).toBe('File');
  });

  it('exports FileRouter model', () => {
    expect(FileRouter).toBeDefined();
    expect(FileRouter.modelName).toBe('FileRouter');
  });

  it('exports Subscription model', () => {
    expect(Subscription).toBeDefined();
    expect(Subscription.modelName).toBe('Subscription');
  });

  it('exports UsageRecord model', () => {
    expect(UsageRecord).toBeDefined();
    expect(UsageRecord.modelName).toBe('UsageRecord');
  });
});

describe('File model schema', () => {
  it('has compound index on projectId and createdAt', () => {
    const indexes = File.schema.indexes();
    const hasCompoundIndex = indexes.some(
      ([fields]: [Record<string, unknown>]) =>
        'projectId' in fields && 'createdAt' in fields,
    );
    expect(hasCompoundIndex).toBe(true);
  });

  it('has index on status', () => {
    const indexes = File.schema.indexes();
    const hasStatusIndex = indexes.some(
      ([fields]: [Record<string, unknown>]) =>
        Object.keys(fields).length === 1 && 'status' in fields,
    );
    expect(hasStatusIndex).toBe(true);
  });

  it('has status field with correct enum values', () => {
    const statusPath = File.schema.path('status') as { enumValues?: string[] };
    expect(statusPath.enumValues).toEqual(expect.arrayContaining([...FILE_STATUSES]));
  });
});

describe('Subscription model schema', () => {
  it('has tier field with correct enum values', () => {
    const tierPath = Subscription.schema.path('tier') as { enumValues?: string[] };
    expect(tierPath.enumValues).toEqual(expect.arrayContaining([...TIERS]));
  });
});

describe('FileRouter model schema', () => {
  it('has compound unique index on projectId and slug', () => {
    const indexes = FileRouter.schema.indexes();
    const hasCompoundUniqueIndex = indexes.some(
      ([fields, options]: [Record<string, unknown>, Record<string, unknown>]) =>
        'projectId' in fields && 'slug' in fields && options['unique'] === true,
    );
    expect(hasCompoundUniqueIndex).toBe(true);
  });
});

describe('UsageRecord model schema', () => {
  it('has compound unique index on userId and period', () => {
    const indexes = UsageRecord.schema.indexes();
    const hasCompoundUniqueIndex = indexes.some(
      ([fields, options]: [Record<string, unknown>, Record<string, unknown>]) =>
        'userId' in fields && 'period' in fields && options['unique'] === true,
    );
    expect(hasCompoundUniqueIndex).toBe(true);
  });
});
