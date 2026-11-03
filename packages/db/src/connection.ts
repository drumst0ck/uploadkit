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

const cached: MongooseCache = globalThis._mongooseCache ?? { conn: null, promise: null };
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
    const uri = process.env['MONGODB_URI'];
    if (!uri) throw new Error('MONGODB_URI is required to connect to MongoDB');
    cached.promise = mongoose.connect(uri, opts);
  }
  const pending = cached.promise;
  try {
    cached.conn = await pending;
    return cached.conn;
  } catch (error) {
    // Do not let a late rejection clear a newer retry's in-flight promise.
    if (cached.promise === pending) cached.promise = null;
    throw error;
  }
}
