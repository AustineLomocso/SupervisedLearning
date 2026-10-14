import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// findBy*/waitFor wait 1s by default. The first visit to a lazy route (its chunk, and the
// lesson or question data behind it) can take longer than that on a busy machine.
configure({ asyncUtilTimeout: 10_000 })

afterEach(() => {
  cleanup()
})
