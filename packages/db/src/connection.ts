import mongoose, { type ConnectOptions } from 'mongoose';

// Cache structure stored on globalThis to survive serverless function warm restarts
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = globalThis._mongooseCache ?? { conn: null, promise: null };
if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts: ConnectOptions = {
      maxPoolSize: process.env['NODE_ENV'] === 'production' ? 10 : 1,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(process.env['MONGODB_URI']!, opts);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
