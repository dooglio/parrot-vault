import { useState } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { closeModal, showNotification } from '../store/uiSlice'
import { deleteWalletType } from '../store/walletTypesSlice'
import type { WalletTypeDefinition } from '../../shared/types'
import WalletTypeDialog, { getIconEmoji } from './WalletTypeDialog'

export default function SettingsModal() {
  const dispatch = useAppDispatch()
  const walletTypes = useAppSelector((s) => s.walletTypes.items)

  /** Which wallet type is being edited (null = adding new) */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WalletTypeDefinition | null>(null)
  /** ID pending confirmation for deletion */
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function handleAdd() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function handleEdit(wt: WalletTypeDefinition) {
    setEditTarget(wt)
    setDialogOpen(true)
  }

  async function handleDelete(id: number) {
    try {
      await dispatch(deleteWalletType(id)).unwrap()
      dispatch(showNotification({ message: 'Wallet app removed.', type: 'success' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      dispatch(showNotification({ message: msg, type: 'error' }))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
        <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>⚙️ Settings</h2>
            <button className="modal-close" onClick={() => dispatch(closeModal())}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            {/* Section header */}
            <div className="settings-section-header">
              <div>
                <h3 className="settings-section-title">Wallet Apps</h3>
                <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  Define the wallet applications available on this machine. These provide the
                  executable path and command-line options used when launching wallets.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                + Add
              </button>
            </div>

            {/* Wallet type list */}
            {walletTypes.length === 0 ? (
              <div className="wt-empty">
                <span style={{ fontSize: 36 }}>🦋</span>
                <p>No wallet apps configured yet.</p>
                <p className="muted" style={{ fontSize: 12 }}>
                  Press <strong>+ Add</strong> to set up your first wallet application.
                </p>
              </div>
            ) : (
              <table className="wt-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Name</th>
                    <th>Executable</th>
                    <th>Datadir Flag</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {walletTypes.map((wt) => (
                    <tr key={wt.id} className="wt-row">
                      <td className="wt-icon-cell">
                        <span className="wt-icon" title={wt.icon}>
                          {getIconEmoji(wt.icon)}
                        </span>
                      </td>
                      <td className="wt-name">{wt.name}</td>
                      <td className="wt-exe" title={wt.exePath}>
                        {wt.exePath || <span className="muted">—</span>}
                      </td>
                      <td className="wt-flag">
                        {wt.dataDirFlag ? (
                          <code>{wt.dataDirFlag}</code>
                        ) : (
                          <span className="muted">none</span>
                        )}
                      </td>
                      <td className="wt-actions">
                        {deletingId === wt.id ? (
                          <span className="wt-confirm-delete">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(wt.id)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeletingId(null)}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleEdit(wt)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-danger-ghost"
                              onClick={() => setDeletingId(wt.id)}
                              title="Delete"
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => dispatch(closeModal())}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit dialog — layered on top of this modal */}
      {dialogOpen && (
        <WalletTypeDialog
          existing={editTarget}
          onClose={() => {
            setDialogOpen(false)
            setEditTarget(null)
          }}
        />
      )}
    </>
  )
}
