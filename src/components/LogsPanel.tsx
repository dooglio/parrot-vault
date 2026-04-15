import { useRef, useEffect } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { setActiveLogTab } from '../store/uiSlice'
import { clearLogs, removeProcess, stopWallet } from '../store/processesSlice'

export default function LogsPanel() {
  const dispatch = useAppDispatch()
  const entries = useAppSelector((s) => s.processes.entries)
  const activeTabId = useAppSelector((s) => s.ui.activeLogTabId)
  const wallets = useAppSelector((s) => s.wallets.items)
  const logEndRef = useRef<HTMLDivElement>(null)

  const tabIds = Object.keys(entries).map(Number)

  // If no active tab is set, pick the first one
  const currentTabId =
    activeTabId !== null && entries[activeTabId] ? activeTabId : tabIds[0] ?? null

  const currentEntry = currentTabId !== null ? entries[currentTabId] : null

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentEntry?.logs.length])

  function getWalletName(id: number): string {
    return wallets.find((w) => w.id === id)?.name ?? `Wallet #${id}`
  }

  function handleCloseTab(id: number) {
    const entry = entries[id]
    if (entry?.status === 'running') {
      if (confirm('This will stop the running wallet. Continue?')) {
        dispatch(stopWallet(id))
      } else {
        return
      }
    }
    dispatch(removeProcess(id))
    if (currentTabId === id) {
      const remaining = tabIds.filter((t) => t !== id)
      dispatch(setActiveLogTab(remaining[0] ?? null))
    }
  }

  if (tabIds.length === 0 || currentEntry === null) return null

  return (
    <div className="logs-panel">
      <div className="logs-tabs">
        {tabIds.map((id) => {
          const entry = entries[id]
          const isActive = id === currentTabId
          const isRunning = entry.status === 'running'
          const hasError =
            entry.status === 'failed-to-start' ||
            entry.status === 'crashed' ||
            entry.status === 'error'

          return (
            <div
              key={id}
              className={[
                'logs-tab',
                isActive ? 'logs-tab--active' : '',
                isRunning ? 'logs-tab--running' : '',
                hasError ? 'logs-tab--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => dispatch(setActiveLogTab(id))}
              role="tab"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && dispatch(setActiveLogTab(id))}
            >
              <span className="logs-tab-status">
                {isRunning ? '●' : hasError ? '⚠' : '■'}
              </span>
              <span className="logs-tab-name">
                {getWalletName(id)}
                {entry.status === 'stopped' && ' (finished)'}
              </span>
              <button
                className="logs-tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTab(id)
                }}
                title="Close tab"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <div className="logs-toolbar">
        <span className="logs-wallet-name">{getWalletName(currentTabId!)}</span>
        <div className="logs-toolbar-actions">
          {currentEntry.errorMessage && (
            <span className="logs-error-msg">{currentEntry.errorMessage}</span>
          )}
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => dispatch(clearLogs(currentTabId!))}
            title="Clear logs"
          >
            Clear
          </button>
          {currentEntry.status === 'running' && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => dispatch(stopWallet(currentTabId!))}
              title="Stop wallet"
            >
              ■ Stop
            </button>
          )}
        </div>
      </div>

      <div className="logs-output">
        {currentEntry.logs.length === 0 ? (
          <div className="logs-empty">
            {currentEntry.status === 'running'
              ? 'Waiting for output…'
              : 'No output.'}
          </div>
        ) : (
          currentEntry.logs.map((line, idx) => {
            const isStderr = line.startsWith('\x00STDERR\x00')
            const text = isStderr ? line.slice(8) : line
            return (
              <pre
                key={idx}
                className={`log-line ${isStderr ? 'log-line--stderr' : ''}`}
              >
                {text}
              </pre>
            )
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
