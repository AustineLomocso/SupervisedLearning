import { create } from 'zustand'

/**
 * Runtime state for the test currently on screen. The durable copy of every answer
 * lives in IndexedDB (db/attempts.js); this store only holds what the runner UI needs.
 * @typedef {object} SessionState
 * @property {string | null} attemptId
 * @property {number} currentIndex
 * @property {string[]} pendingSelection option ids chosen for the current question, not yet submitted
 * @property {(attemptId: string, currentIndex: number) => void} start
 * @property {(index: number) => void} goTo
 * @property {(optionId: string, maxCount: number) => void} toggleOption
 * @property {() => void} reset
 */

/** @type {Pick<SessionState, 'attemptId' | 'currentIndex' | 'pendingSelection'>} */
export const initialSessionState = { attemptId: null, currentIndex: 0, pendingSelection: [] }

/**
 * Selection rules mirroring the AWS exam UI: one choice replaces another for multiple
 * choice; multiple response toggles choices and never exceeds the stated count.
 * @param {string[]} current
 * @param {string} optionId
 * @param {number} maxCount the item's selectCount
 * @returns {string[]}
 */
export function nextSelection(current, optionId, maxCount) {
  if (maxCount <= 1) return [optionId]
  if (current.includes(optionId)) return current.filter((id) => id !== optionId)
  if (current.length >= maxCount) return current
  return [...current, optionId]
}

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<SessionState>>} */
export const useSessionStore = create((set) => ({
  ...initialSessionState,
  start: (attemptId, currentIndex) => set({ attemptId, currentIndex, pendingSelection: [] }),
  goTo: (index) => set({ currentIndex: index, pendingSelection: [] }),
  toggleOption: (optionId, maxCount) =>
    set((state) => ({
      pendingSelection: nextSelection(state.pendingSelection, optionId, maxCount),
    })),
  reset: () => set(initialSessionState),
}))
