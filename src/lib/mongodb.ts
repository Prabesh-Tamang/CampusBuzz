import mongoose from 'mongoose';
import { reconcileAllEvents } from './reconcile';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Drop stale non-sparse unique indexes on the payments collection.
 * Old code stored transactionId: "" or null which breaks sparse unique indexes.
 */
async function fixPaymentIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collection = db.collection('payments');
    const indexes = await collection.indexes();

    for (const idx of indexes) {
      const isTransactionId = idx.key && idx.key.transactionId !== undefined;
      const isPurchaseOrderId = idx.key && idx.key.purchaseOrderId !== undefined;

      if ((isTransactionId || isPurchaseOrderId) && idx.unique && !idx.sparse) {
        console.log(`[DB] Dropping non-sparse unique index: ${idx.name}`);
        await collection.dropIndex(idx.name as string);
      }
    }

    // Recreate as sparse unique (no-op if already correct)
    await collection.createIndex({ transactionId: 1 }, { unique: true, sparse: true, background: true }).catch(() => {});
    await collection.createIndex({ purchaseOrderId: 1 }, { unique: true, sparse: true, background: true }).catch(() => {});

    // Clean up any documents with empty string transactionId
    await collection.updateMany({ transactionId: '' }, { $unset: { transactionId: 1 } });
    await collection.updateMany({ purchaseOrderId: '' }, { $unset: { purchaseOrderId: 1 } });

    console.log('[DB] Payment indexes verified');
  } catch (err) {
    console.error('[DB] fixPaymentIndexes error (non-fatal):', err);
  }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(async (mongooseInstance) => {
      console.log('✅ Connected to DB:', mongooseInstance.connection.name);

      fixPaymentIndexes().catch(err =>
        console.error('[DB] Index fix failed:', err)
      );

      reconcileAllEvents().catch(err =>
        console.error('[Reconcile] Startup reconciliation failed:', err)
      );

      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
