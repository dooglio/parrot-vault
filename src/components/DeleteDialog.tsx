import { useState } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { closeModal, showNotification } from '../store/uiSlice'
import { deleteWallet } from '../store/walletsSlice'

export default function DeleteDialog() {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector((s) => s.ui.selectedWalletId)
  const wallets = useAppSelector((s) => s.wallets.items)
  const [deleteFiles, setDeleteFiles] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const wallet = wallets.find((w) => w.id === selectedId)
  if (!wallet) return null

  async function handleConfirm() {
    if (selectedId === null) return
    setSubmitting(true)
    try {
      await dispatch(deleteWallet({ id: selectedId, deleteFiles })).unwrap()
      dispatch(showNotification({ message: `"${wallet!.name}" deleted.`, type: 'success' }))
      dispatch(closeModal())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      dispatch(showNotification({ message: msg, type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Wallet</h2>
          <button className="modal-close" onClick={() => dispatch(closeModal())}>✕</button>
        </div>

        <div className="modal-body">
          <p>
            Are you sure you want to delete <strong>"{wallet.name}"</strong>?
            This cannot be undone.
          </p>

          <div className="form-row form-row--checkbox">
            <label>
              <input
                type="checkbox"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
              />
              Also delete the wallet data directory from disk
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => dispatch(closeModal())}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
