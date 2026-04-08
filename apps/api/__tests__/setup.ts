// Global test setup — mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/uploadkit-test';
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
process.env.QSTASH_TOKEN = '';
process.env.CRON_SECRET = 'test-cron-secret';
