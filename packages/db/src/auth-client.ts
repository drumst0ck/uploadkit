import mongoose from 'mongoose';
import { connectDB } from './connection';
import type { MongoClient } from 'mongodb';

export async function getAuthMongoClient(): Promise<MongoClient> {
  await connectDB();
  return mongoose.connection.getClient() as unknown as MongoClient;
}
