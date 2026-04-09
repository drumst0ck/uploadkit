// Global test setup — mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/uploadkit-test';
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
process.env.QSTASH_TOKEN = '';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.STRIPE_PRO_PRICE_ID = 'price_pro_fake';
process.env.STRIPE_TEAM_PRICE_ID = 'price_team_fake';
process.env.STRIPE_ENTERPRISE_PRICE_ID = 'price_enterprise_fake';
process.env.R2_ACCOUNT_ID = 'test-account-id';
process.env.R2_ACCESS_KEY_ID = 'test-access-key-id';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.R2_BUCKET = 'test-bucket';
process.env.CDN_URL = 'https://cdn.uploadkit.dev';
