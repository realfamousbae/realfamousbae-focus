import type { Timer } from './timer-contract';

export function eventKey(timer: Timer) {
  return JSON.stringify([timer.id, Date.parse(timer.targetAt)]);
}

// Only events observed before their deadline are eligible in this page session.
export class EventTracker {
  private pending = new Set<string>();
  private seen = new Set<string>();

  update(timers: Timer[], now: number): Timer[] {
    const current = new Set(timers.map(eventKey));
    for (const key of this.pending) if (!current.has(key)) this.pending.delete(key);
    const due: Timer[] = [];
    for (const timer of timers) {
      const key = eventKey(timer);
      if (!this.seen.has(key)) {
        this.seen.add(key);
        if (Date.parse(timer.targetAt) > now) this.pending.add(key);
      }
      if (this.pending.has(key) && Date.parse(timer.targetAt) <= now) {
        this.pending.delete(key);
        due.push(timer);
      }
    }
    return due;
  }
}

// Read and write share a single serialized transaction across all same-origin tabs.
// Claim before showing: delivery is best effort, but a display failure cannot spam.
export function claimNotification(userKey: string, timer: Timer): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('focus-notifications', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('delivered');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('notification_storage_blocked'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('delivered', 'readwrite');
      const store = transaction.objectStore('delivered');
      const key = JSON.stringify([userKey, eventKey(timer)]);
      let claimed = false;
      const read = store.get(key);
      read.onsuccess = () => {
        if (read.result === undefined) {
          store.add(Date.now(), key);
          claimed = true;
        }
      };
      transaction.oncomplete = () => { db.close(); resolve(claimed); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
      db.onversionchange = () => db.close();
    };
  });
}
