import { useEffect, useRef, useState } from 'react'
import { formatRemaining, warningFor } from './timer.js'

/**
 * Countdown to an absolute deadline (so a refresh resumes it). The ticking display is not
 * announced; only the 10-minute and 1-minute warnings and time-up are, once each. Calls
 * onExpire exactly once at zero, immediately if the deadline has already passed.
 * @param {{ deadlineAt: number, onExpire: () => void }} props
 */
export default function Timer({ deadlineAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineAt - Date.now()))
  const [announcement, setAnnouncement] = useState('')
  const lastWarning = useRef(Infinity)
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    function tick() {
      const ms = Math.max(0, deadlineAt - Date.now())
      setRemaining(ms)
      const warning = warningFor(ms)
      if (ms > 0 && warning && warning.atMs < lastWarning.current) {
        lastWarning.current = warning.atMs
        setAnnouncement(warning.message)
      }
      if (ms === 0 && !expired.current) {
        expired.current = true
        setAnnouncement('Time is up. Submitting your exam.')
        onExpireRef.current()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineAt])

  return (
    <div className="text-right">
      <p role="timer" className="font-mono text-2xl font-bold tabular-nums">
        <span className="mr-2 font-sans text-sm font-semibold">Time left</span>
        {formatRemaining(remaining)}
      </p>
      <output data-testid="timer-announcement" className="sr-only">
        {announcement}
      </output>
    </div>
  )
}
