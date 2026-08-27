import { useState } from 'react'
import { Landing } from './components/landing/Landing'
import { TransitionOverlay } from './components/transition/TransitionOverlay'
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout'

type ContentPhase = 'landing' | 'workspace'

function App() {
  const [contentPhase, setContentPhase] = useState<ContentPhase>('landing')
  const [playToken, setPlayToken] = useState(0)

  const handleStart = () => setPlayToken((token) => token + 1)

  return (
    <>
      {contentPhase === 'landing' ? <Landing onStart={handleStart} /> : <WorkspaceLayout />}
      <TransitionOverlay
        playToken={playToken}
        onMidpoint={() => setContentPhase('workspace')}
        onComplete={() => {}}
      />
    </>
  )
}

export default App
