import { useAppSelector } from '../hooks/useAppSelector'
import LogsPanel from './LogsPanel'

export default function MainPanel() {
  const processes = useAppSelector((s) => s.processes.entries)
  const hasAnyLogs = Object.keys(processes).length > 0

  return (
    <main className="main-panel">
      {hasAnyLogs ? (
        <LogsPanel />
      ) : (
        <div className="main-panel-empty">
          <div className="empty-state">
            <div className="empty-state-icon">🦜</div>
            <h2>ParrotVault</h2>
            <p>
              Select a wallet and click <strong>▶ Run</strong> to launch it.
            </p>
            <p className="muted">Wallet output logs will appear here.</p>
          </div>
        </div>
      )}
    </main>
  )
}
