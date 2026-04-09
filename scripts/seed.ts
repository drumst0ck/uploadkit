import 'dotenv/config';
import { connectDB } from '@uploadkitdev/db';
import { User, Project, ApiKey, File, FileRouter, Subscription, UsageRecord } from '@uploadkitdev/db';

async function seed() {
  console.log('Connecting to database...');
  await connectDB();

  // Clear existing seed data
  await Promise.all([
    User.deleteMany({ email: 'test@uploadkit.dev' }),
    Project.deleteMany({ slug: 'test-project' }),
  ]);

  console.log('Creating test user...');
  const user = await User.create({
    name: 'Test User',
    email: 'test@uploadkit.dev',
  });

  console.log('Creating test project...');
  const project = await Project.create({
    name: 'Test Project',
    slug: 'test-project',
    userId: user._id,
  });

  console.log('Creating test API key...');
  const { createHash } = await import('crypto');
  const plainKey = 'uk_test_seed_key_abc123def456';
  const keyHash = createHash('sha256').update(plainKey).digest('hex');
  await ApiKey.create({
    keyPrefix: plainKey.slice(0, 12),
    keyHash,
    name: 'Seed Test Key',
    projectId: project._id,
    isTest: true,
  });
  console.log(`  API key: ${plainKey.slice(0, 12)}...${plainKey.slice(-4)}`);

  console.log('Creating test file router...');
  await FileRouter.create({
    slug: 'imageUploader',
    projectId: project._id,
    maxFileSize: 4 * 1024 * 1024,
    maxFileCount: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  console.log('Creating sample files...');
  await File.create([
    {
      key: `${project._id}/imageUploader/seed-uuid-1/photo.jpg`,
      name: 'photo.jpg',
      size: 1024 * 50,
      type: 'image/jpeg',
      url: 'https://cdn.uploadkit.dev/sample/photo.jpg',
      status: 'UPLOADED',
      projectId: project._id,
    },
    {
      key: `${project._id}/imageUploader/seed-uuid-2/avatar.png`,
      name: 'avatar.png',
      size: 1024 * 30,
      type: 'image/png',
      url: 'https://cdn.uploadkit.dev/sample/avatar.png',
      status: 'UPLOADED',
      projectId: project._id,
    },
  ]);

  console.log('Creating test subscription...');
  await Subscription.create({
    userId: user._id,
    stripeCustomerId: 'cus_test_seed_123',
    tier: 'FREE',
    status: 'ACTIVE',
  });

  console.log('Creating test usage record...');
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await UsageRecord.create({
    userId: user._id,
    period,
    storageUsed: 1024 * 80,
    bandwidth: 1024 * 200,
    uploads: 2,
  });

  console.log('\nSeed complete!');
  console.log(`  User:    ${user.email} (${user._id})`);
  console.log(`  Project: ${project.slug} (${project._id})`);
  console.log(`  API Key: ${plainKey.slice(0, 12)}...${plainKey.slice(-4)}`);
  console.log(`  Files:   2 sample files created`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
