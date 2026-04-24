import { openDB } from 'idb';

/* ─── Constants ─── */
const DB_NAME = 'cashbash-offline';
const DB_VERSION = 1;

export interface PendingTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  category_id: string;
  account_id: string;
  transaction_date: string;
  created_at: string;
  synced: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let dbPromise: Promise<any> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending-transactions')) {
          const txStore = db.createObjectStore('pending-transactions', { keyPath: 'id' });
          txStore.createIndex('by-synced', 'synced');
        }
        if (!db.objectStoreNames.contains('cached-data')) {
          db.createObjectStore('cached-data', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/* ─── Pending Transactions ─── */
export async function savePendingTransaction(tx: PendingTransaction) {
  const db = await getDB();
  if (!db) return;
  await db.put('pending-transactions', { ...tx, synced: false });
}

export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('pending-transactions', 'by-synced', false);
}

export async function markTransactionSynced(id: string) {
  const db = await getDB();
  if (!db) return;
  const tx = await db.get('pending-transactions', id);
  if (tx) {
    tx.synced = true;
    await db.put('pending-transactions', tx);
  }
}

export async function clearSyncedTransactions() {
  const db = await getDB();
  if (!db) return;
  const synced = await db.getAllFromIndex('pending-transactions', 'by-synced', true);
  const tx = db.transaction('pending-transactions', 'readwrite');
  await Promise.all(synced.map((item: PendingTransaction) => tx.store.delete(item.id)));
  await tx.done;
}

/* ─── Cached Data (accounts, categories, etc.) ─── */
export async function setCachedData(key: string, data: unknown) {
  const db = await getDB();
  if (!db) return;
  await db.put('cached-data', { key, data, cached_at: Date.now() });
}

export async function getCachedData<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB();
  if (!db) return null;
  const cached = await db.get('cached-data', key);
  if (!cached) return null;
  // Cache for 24 hours
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (Date.now() - cached.cached_at > ONE_DAY) return null;
  return cached.data as T;
}

/* ─── Sync Engine ─── */
export async function syncPendingTransactions(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingTransactions();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const tx of pending) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          category_id: tx.category_id,
          account_id: tx.account_id,
          transaction_date: tx.transaction_date,
        }),
      });
      if (res.ok) {
        await markTransactionSynced(tx.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // Clean up successfully synced
  if (synced > 0) {
    await clearSyncedTransactions();
  }

  return { synced, failed };
}

/* ─── Auto-sync on reconnect ─── */
export function setupAutoSync(onSync?: (result: { synced: number; failed: number }) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    const result = await syncPendingTransactions();
    if (result.synced > 0) {
      onSync?.(result);
    }
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}
