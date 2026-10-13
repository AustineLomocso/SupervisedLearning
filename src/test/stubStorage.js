/**
 * Replaces navigator.storage for one test. Pass undefined to simulate a browser without it.
 * @param {Partial<StorageManager> | undefined} storage
 */
export function stubStorage(storage) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

export function restoreStorage() {
  Reflect.deleteProperty(navigator, 'storage')
}
