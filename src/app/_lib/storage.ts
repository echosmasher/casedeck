// Lazy singleton so IndexedDbStorageAdapter (and the Dexie/indexedDB access inside it) is only
// ever constructed in the browser, from a useEffect or event handler — never at module
// evaluation time, which would run in Node during `next build`'s static prerender.
import { IndexedDbStorageAdapter } from "@/storage/indexedDbAdapter";
import type { StorageAdapter } from "@/storage/storageAdapter";

let instance: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  instance ??= new IndexedDbStorageAdapter();
  return instance;
}
