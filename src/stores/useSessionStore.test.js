import { beforeEach, describe, expect, it } from 'vitest'
import { initialSessionState, nextSelection, useSessionStore } from './useSessionStore.js'

beforeEach(() => {
  useSessionStore.setState(initialSessionState)
})

describe('nextSelection', () => {
  it('single-answer questions replace the selection', () => {
    expect(nextSelection(['a'], 'b', 1)).toEqual(['b'])
  })

  it('re-choosing the selected single answer keeps it selected', () => {
    expect(nextSelection(['a'], 'a', 1)).toEqual(['a'])
  })

  it('multiple-response selections toggle on and off', () => {
    expect(nextSelection(['a'], 'b', 2)).toEqual(['a', 'b'])
    expect(nextSelection(['a', 'b'], 'a', 2)).toEqual(['b'])
  })

  it('multiple-response selections are capped at maxCount', () => {
    expect(nextSelection(['a', 'b'], 'c', 2)).toEqual(['a', 'b'])
  })
})

describe('useSessionStore', () => {
  it('start sets the attempt and position and clears any selection', () => {
    useSessionStore.setState({ pendingSelection: ['a'] })
    useSessionStore.getState().start('attempt-1', 4)
    expect(useSessionStore.getState()).toMatchObject({
      attemptId: 'attempt-1',
      currentIndex: 4,
      pendingSelection: [],
    })
  })

  it('toggleOption applies the selection rules', () => {
    const { toggleOption } = useSessionStore.getState()
    toggleOption('a', 2)
    toggleOption('c', 2)
    toggleOption('d', 2)
    expect(useSessionStore.getState().pendingSelection).toEqual(['a', 'c'])
  })

  it('goTo moves and clears the pending selection', () => {
    useSessionStore.getState().toggleOption('a', 1)
    useSessionStore.getState().goTo(2)
    expect(useSessionStore.getState()).toMatchObject({ currentIndex: 2, pendingSelection: [] })
  })

  it('reset returns to the initial state', () => {
    useSessionStore.getState().start('attempt-1', 3)
    useSessionStore.getState().reset()
    expect(useSessionStore.getState()).toMatchObject(initialSessionState)
  })
})
