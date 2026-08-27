import { useEffect, useState } from 'react'
import { useDbStore } from '../../state/store'
import { hasSeenCoach, markCoachSeen } from '../../lib/onboarding/coachState'
import { CoachMark } from './CoachMark'
import { Panel } from './Panel'
import { TracePanel } from './trace/TracePanel'
import { ResultsPanel } from './results/ResultsPanel'
import { SchemaTree } from './schema/SchemaTree'
import { BuilderPanel } from './builder/BuilderPanel'
import { QueryPanel } from './query/QueryPanel'
import { HistoryList } from './history/HistoryList'
import { SoundToggle } from './SoundToggle'

export function WorkspaceLayout() {
  const status = useDbStore((s) => s.status)
  const initError = useDbStore((s) => s.initError)
  const init = useDbStore((s) => s.init)
  const table = useDbStore((s) => s.builder.table)
  // Read once on mount: someone who has already followed this hint on a
  // previous visit shouldn't be taught the same step again.
  const [coachDismissed, setCoachDismissed] = useState(hasSeenCoach)

  // Picking a table is the one action that unlocks the whole builder, so the
  // hint stands until that's done (or the user waves it off with Escape).
  const showCoach = status === 'ready' && !table && !coachDismissed

  useEffect(() => {
    void init()
  }, [init])

  // Retire the hint for good only once it has actually been followed —
  // Escape dismisses it for this session alone (see coachState).
  useEffect(() => {
    if (table) markCoachSeen()
  }, [table])

  if (status === 'loading') {
    return (
      <div
        data-testid="engine-loading"
        className="flex min-h-screen items-center justify-center bg-bg font-body text-sm text-muted"
      >
        mounting query engine ...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-8 text-center font-body text-sm text-accent">
        failed to start query engine: {initError}
      </div>
    )
  }

  return (
    <div
      data-testid="workspace"
      className="grid min-h-screen gap-0 bg-bg text-text lg:h-screen lg:grid-cols-[1.05fr_200px_1fr]"
    >
      <div className="grid min-h-0 lg:grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="root@datapulse:~$" tag="exec_log" right={<SoundToggle />}>
          <div className="flex h-full flex-col gap-4">
            <TracePanel />
            <div className="border-t border-border pt-3">
              <ResultsPanel />
            </div>
          </div>
        </Panel>
        <Panel title="$ tail" tag="history">
          <HistoryList />
        </Panel>
      </div>

      <Panel title="$ ls" tag="schema/">
        <SchemaTree />
      </Panel>

      <div className="grid min-h-0 lg:grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="$ ./build" tag="query">
          <BuilderPanel />
        </Panel>
        <Panel title="$ cat" tag="query.sql">
          <QueryPanel />
        </Panel>
      </div>

      {showCoach && (
        <CoachMark
          targetSelector="[data-coach-target='table-select']"
          label="pick a table to start — or click one in schema/"
          onDismiss={() => setCoachDismissed(true)}
        />
      )}
    </div>
  )
}
