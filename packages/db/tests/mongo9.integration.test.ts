import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { User, Project, FileRouter, File, Subscription } from '../src/index';

const uri = process.env['MONGODB_TEST_URI'];
const databaseName = `uploadkit_mongo9_integration_${randomUUID().replaceAll('-', '')}`;
const localRequire = createRequire(import.meta.url);
const mongooseRequire = createRequire(localRequire.resolve('mongoose'));
const dashboardRequire = createRequire(new URL('../../../apps/dashboard/package.json', import.meta.url));

// No default connection or URI database is used: all writes and cleanup are scoped
// to this run's newly generated database, even when the URI names an existing DB.
describe.skipIf(!uri)('MongoDB 9 isolated integration', () => {
  const connection = mongoose.createConnection();
  const Users = connection.model('User', User.schema);
  const Projects = connection.model('Project', Project.schema);
  const Routers = connection.model('FileRouter', FileRouter.schema);
  const Files = connection.model('File', File.schema);
  const Subscriptions = connection.model('Subscription', Subscription.schema);

  beforeAll(async () => {
    // Resolve from Mongoose, not the independently declared db dev dependency.
    const driverPackage = mongooseRequire('mongodb/package.json') as { version: string };
    expect(driverPackage.version).toMatch(/^7\.7\./);
    expect(mongooseRequire('mongodb').MongoClient).toBe(mongoose.mongo.MongoClient);
    await connection.openUri(uri!, { dbName: databaseName, serverSelectionTimeoutMS: 10_000 });
    expect(connection.name).toBe(databaseName);
    expect(connection.getClient()).toBeInstanceOf(mongoose.mongo.MongoClient);
    const buildInfo = await connection.db!.command({ buildInfo: 1 });
    expect(buildInfo['version']).toBe('9.0.4');
    await Promise.all([Users.init(), Projects.init(), Routers.init(), Files.init(), Subscriptions.init()]);
  }, 30_000);

  afterAll(async () => {
    try {
      if (connection.readyState === 1) {
        expect(connection.name).toBe(databaseName);
        expect(databaseName).toMatch(/^uploadkit_mongo9_integration_[a-f0-9]{32}$/);
        // Deliberately never drop a URI-supplied or production database.
        await connection.dropDatabase();
      }
    } finally {
      await connection.close();
    }
  });

  it('persists representative models, enforces indexes, aggregates and deletes', async () => {
    const user = await Users.create({ name: 'Integration User', email: 'models@example.com' });
    expect((await Users.findById(user._id).lean())?.email).toBe('models@example.com');
    const updatedUser = await Users.findByIdAndUpdate(user._id, { name: 'Updated User' }, { returnDocument: 'after' });
    expect(updatedUser?.name).toBe('Updated User');
    const project = await Projects.create({ name: 'Integration', slug: 'integration', userId: user._id });
    expect((await Projects.findById(project._id).lean())?.storageMode).toBe('managed');
    const router = await Routers.create({ slug: 'images', projectId: project._id, allowedTypes: ['image/png'] });
    expect(router.maxFileSize).toBe(4194304);
    await expect(Routers.create({ slug: 'images', projectId: project._id })).rejects.toMatchObject({ code: 11000 });
    const file = await Files.create({
      key: 'integration-file', name: 'fixture.png', size: 128, type: 'image/png',
      url: 'https://example.com/fixture.png', projectId: project._id,
    });
    expect(file.status).toBe('UPLOADING');
    expect((await Files.findByIdAndUpdate(file._id, { status: 'UPLOADED' }, { returnDocument: 'after' }))?.status).toBe('UPLOADED');
    expect(await Files.aggregate([
      { $match: { projectId: project._id } },
      { $group: { _id: '$projectId', count: { $sum: 1 }, bytes: { $sum: '$size' } } },
    ])).toEqual([{ _id: project._id, count: 1, bytes: 128 }]);
    const subscription = await Subscriptions.create({ userId: user._id });
    expect(subscription.tier).toBe('FREE');
    expect(subscription.status).toBe('ACTIVE');
    expect((await Subscriptions.findByIdAndUpdate(subscription._id, { cancelAtPeriodEnd: true }, { returnDocument: 'after' }))?.cancelAtPeriodEnd).toBe(true);
    await expect(Files.create({ key: 'invalid', projectId: project._id })).rejects.toThrow();
    for (const [model, id] of [
      [Files, file._id], [Routers, router._id], [Subscriptions, subscription._id],
      [Projects, project._id], [Users, user._id],
    ] as const) {
      // Collection-level deletion keeps this heterogeneous model loop type-safe.
      expect((await model.collection.deleteOne({ _id: id })).deletedCount).toBe(1);
      expect(await model.collection.countDocuments({ _id: id })).toBe(0);
    }
  });

  it('matches every exempt subscription status but excludes canceled subscriptions', async () => {
    const EXEMPT_STATUSES = ['ACTIVE', 'PAST_DUE', 'TRIALING'] as const;
    await Subscriptions.create(
      [...EXEMPT_STATUSES, 'CANCELED' as const].map((status) => ({
        userId: new mongoose.Types.ObjectId(), status,
      })),
    );
    const paying = await Subscriptions.find({ status: { $in: [...EXEMPT_STATUSES] } }).lean();
    expect(paying.map((subscription) => subscription.status).sort()).toEqual([...EXEMPT_STATUSES].sort());
  });

  it('roundtrips Auth.js users, linked accounts, sessions and one-time tokens on the actual client', async () => {
    // Adapter is owned by dashboard; do not add a test-only db dependency or
    // substitute a separately constructed MongoClient for Mongoose's client.
    const adapterUrl = pathToFileURL(dashboardRequire.resolve('./node_modules/@auth/mongodb-adapter/index.js')).href;
    const { MongoDBAdapter } = await import(/* @vite-ignore */ adapterUrl);
    const client = connection.getClient();
    expect(client).toBeInstanceOf(mongoose.mongo.MongoClient);
    const adapter = MongoDBAdapter(client, { databaseName });
    const user = await adapter.createUser({ name: 'Auth Fixture', email: 'auth@example.com', emailVerified: null, image: null });
    expect(user).toMatchObject({ id: expect.any(String), name: 'Auth Fixture', email: 'auth@example.com', emailVerified: null });
    expect(await adapter.getUser(user.id)).toEqual(user);
    expect(await adapter.getUserByEmail(user.email)).toEqual(user);
    const updatedUser = await adapter.updateUser({ id: user.id, name: 'Updated Auth Fixture' });
    expect(updatedUser).toEqual({ ...user, name: 'Updated Auth Fixture' });
    // Verify the adapter and schemas really see the same database and users.
    expect((await Users.findById(user.id).lean())?.name).toBe('Updated Auth Fixture');
    const account = { userId: user.id, type: 'oauth', provider: 'integration', providerAccountId: 'fixture-account' };
    await adapter.linkAccount(account);
    expect(await adapter.getUserByAccount({ provider: account.provider, providerAccountId: account.providerAccountId })).toEqual(updatedUser);
    expect(await adapter.getUserByAccount({ provider: account.provider, providerAccountId: 'missing' })).toBeNull();
    const session = { sessionToken: 'integration-session', userId: user.id, expires: new Date(Date.now() + 3_600_000) };
    const storedSession = await adapter.createSession(session);
    expect(storedSession).toEqual({ ...session, id: expect.any(String) });
    expect(await adapter.getSessionAndUser(session.sessionToken)).toEqual({ session: storedSession, user: updatedUser });
    const expires = new Date(session.expires.getTime() + 3_600_000);
    expect(await adapter.updateSession({ sessionToken: session.sessionToken, expires })).toEqual({ ...storedSession, expires });
    expect(await adapter.getSessionAndUser(session.sessionToken)).toEqual({ session: { ...storedSession, expires }, user: updatedUser });
    await adapter.deleteSession(session.sessionToken);
    expect(await adapter.getSessionAndUser(session.sessionToken)).toBeNull();
    const token = { identifier: 'auth@example.com', token: 'integration-verification', expires };
    expect(await adapter.createVerificationToken(token)).toEqual(token);
    expect(await adapter.useVerificationToken({ ...token, token: 'wrong-token' })).toBeNull();
    expect(await adapter.useVerificationToken({ identifier: token.identifier, token: token.token })).toEqual(token);
    expect(await adapter.useVerificationToken({ identifier: token.identifier, token: token.token })).toBeNull();
    await adapter.unlinkAccount({ provider: account.provider, providerAccountId: account.providerAccountId });
    expect(await adapter.getUserByAccount({ provider: account.provider, providerAccountId: account.providerAccountId })).toBeNull();
    await adapter.deleteUser(user.id);
    expect(await adapter.getUser(user.id)).toBeNull();
  });
});
