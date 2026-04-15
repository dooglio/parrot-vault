import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { selectWallet, openModal, setActiveLogTab } from '../store/uiSlice'
import { runWallet, stopWallet } from '../store/processesSlice'
import type { Wallet } from '../../shared/types'

interface Props {
  wallet: Wallet
}

export default function WalletCard({ wallet }: Props) {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector((s) => s.ui.selectedWalletId)
  const processEntry = useAppSelector((s) => s.processes.entries[wallet.id])

  const isRunning = processEntry?.status === 'running'
  const isSelected = selectedId === wallet.id
  const hasError =
    processEntry?.status === 'failed-to-start' ||
    processEntry?.status === 'crashed' ||
    processEntry?.status === 'error'

  function handleSelect() {
    dispatch(selectWallet(wallet.id))
  }

  function handleRun(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch(runWallet(wallet.id))
    dispatch(setActiveLogTab(wallet.id))
  }

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch(stopWallet(wallet.id))
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch(selectWallet(wallet.id))
    dispatch(openModal('edit-wallet'))
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch(selectWallet(wallet.id))
    dispatch(openModal('delete-wallet'))
  }

  return (
    <li
      className={[
        'wallet-card',
        isSelected ? 'wallet-card--selected' : '',
        isRunning ? 'wallet-card--running' : '',
        hasError ? 'wallet-card--error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleSelect()}
    >
      <div className="wallet-card-main">
        <div className="wallet-card-info">
          <span className="wallet-pin">{wallet.pinned ? '📌' : ''}</span>
          <div>
            <div className="wallet-name">{wallet.name}</div>
            <div className="wallet-type">{wallet.walletType || 'Wallet'}</div>
            {wallet.description && (
              <div className="wallet-description">{wallet.description}</div>
            )}
          </div>
        </div>

        <div className="wallet-status-badge">
          {isRunning && <span className="badge badge--running">● Running</span>}
          {hasError && <span className="badge badge--error">⚠ Error</span>}
          {processEntry?.status === 'stopped' && (
            <span className="badge badge--stopped">■ Stopped</span>
          )}
        </div>
      </div>

      <div className="wallet-card-actions">
        {isRunning ? (
          <button
            className="btn btn-sm btn-danger"
            onClick={handleStop}
            title="Stop wallet"
          >
            ■ Stop
          </button>
        ) : (
          <button
            className="btn btn-sm btn-success"
            onClick={handleRun}
            title="Launch wallet"
            disabled={isRunning}
          >
            ▶ Run
          </button>
        )}
        <button
          className="btn btn-sm btn-ghost"
          onClick={handleEdit}
          title="Edit wallet"
          disabled={isRunning}
        >
          ✎
        </button>
        <button
          className="btn btn-sm btn-ghost btn-danger-ghost"
          onClick={handleDelete}
          title="Delete wallet"
          disabled={isRunning}
        >
          🗑
        </button>
      </div>
    </li>
  )
}
