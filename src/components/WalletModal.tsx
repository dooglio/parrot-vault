import { useState, useEffect } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { closeModal, showNotification, openModal } from '../store/uiSlice'
import { addWallet, updateWallet } from '../store/walletsSlice'
import { runWallet } from '../store/processesSlice'
import type { NewWallet } from '../../shared/types'
import { getIconEmoji } from './WalletTypeDialog'

export default function WalletModal() {
  const dispatch = useAppDispatch()
  const activeModal = useAppSelector((s) => s.ui.activeModal)
  const selectedId = useAppSelector((s) => s.ui.selectedWalletId)
  const wallets = useAppSelector((s) => s.wallets.items)
  const walletTypes = useAppSelector((s) => s.walletTypes.items)

  const isEditing = activeModal === 'edit-wallet'
  const existing = isEditing ? wallets.find((w) => w.id === selectedId) : null

  const [name, setName] = useState('')
  const [walletTypeId, setWalletTypeId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [pinned, setPinned] = useState(false)
  const [dataDir, setDataDir] = useState('')
  const [launchAfter, setLaunchAfter] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isEditing && existing) {
      setName(existing.name)
      // Match the existing walletType name back to an id
      const match = walletTypes.find((wt) => wt.name === existing.walletType)
      setWalletTypeId(match ? match.id : '')
      setDescription(existing.description)
      setNotes(existing.notes)
      setPinned(existing.pinned)
      // dataDir is not in renderer Wallet type — user re-enters if needed
    }
  }, [isEditing, existing, walletTypes])

  const selectedType = walletTypes.find((wt) => wt.id === walletTypeId) ?? null

  async function handleBrowseDir() {
    const path = await window.electronAPI.openDirectoryDialog(
      'Select Data Directory',
      dataDir || undefined
    )
    if (path) setDataDir(path)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      if (isEditing && selectedId !== null) {
        await dispatch(
          updateWallet({
            id: selectedId,
            data: {
              name: name.trim(),
              walletType: selectedType?.name ?? '',
              exePath: selectedType?.exePath ?? '',
              description: description.trim(),
              notes: notes.trim(),
              pinned,
              ...(dataDir ? { dataDir } : {}),
            },
          })
        ).unwrap()
        dispatch(showNotification({ message: 'Wallet updated.', type: 'success' }))
      } else {
        const data: NewWallet = {
          name: name.trim(),
          walletType: selectedType?.name ?? '',
          exePath: selectedType?.exePath ?? '',
          description: description.trim(),
          notes: notes.trim(),
          pinned,
          dataDir,
        }
        const wallet = await dispatch(addWallet(data)).unwrap()
        dispatch(showNotification({ message: 'Wallet added.', type: 'success' }))

        if (launchAfter) {
          dispatch(runWallet(wallet.id))
        }
      }
      dispatch(closeModal())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed'
      dispatch(showNotification({ message: msg, type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Wallet' : 'Add New Wallet'}</h2>
          <button className="modal-close" onClick={() => dispatch(closeModal())}>
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="wallet-name">Name *</label>
            <input
              id="wallet-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Exodus Wallet"
              required
              autoFocus
            />
          </div>

          {/* Wallet App Type — dropdown populated from Settings */}
          <div className="form-row">
            <label htmlFor="wallet-type">Wallet App</label>
            {walletTypes.length === 0 ? (
              <div className="wallet-type-empty-hint">
                <span className="muted" style={{ fontSize: 13 }}>
                  No wallet apps configured.{' '}
                </span>
                <button
                  type="button"
                  className="btn-inline-link"
                  onClick={() => {
                    dispatch(closeModal())
                    dispatch(openModal('settings'))
                  }}
                >
                  Open Settings to add one.
                </button>
              </div>
            ) : (
              <>
                <select
                  id="wallet-type"
                  className="wt-select"
                  value={walletTypeId}
                  onChange={(e) =>
                    setWalletTypeId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                >
                  <option value="">— Select a wallet app —</option>
                  {walletTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {getIconEmoji(wt.icon)} {wt.name}
                    </option>
                  ))}
                </select>
                {selectedType && (
                  <p className="form-hint">
                    <code>{selectedType.exePath || '(no path set)'}</code>
                    {selectedType.dataDirFlag && (
                      <>
                        {' '}
                        · datadir flag: <code>{selectedType.dataDirFlag}</code>
                      </>
                    )}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Data directory — only shown if the selected type supports a datadir flag */}
          {(selectedType?.dataDirFlag || !selectedType) && (
            <div className="form-row">
              <label htmlFor="wallet-dir">Data Directory</label>
              <div className="input-with-btn">
                <input
                  id="wallet-dir"
                  type="text"
                  value={dataDir}
                  onChange={(e) => setDataDir(e.target.value)}
                  placeholder="Leave blank to use default"
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleBrowseDir}>
                  Browse…
                </button>
              </div>
              {selectedType?.dataDirFlag && (
                <p className="form-hint">
                  Passed as <code>{selectedType.dataDirFlag} &lt;path&gt;</code> when launching.
                </p>
              )}
            </div>
          )}

          <div className="form-row">
            <label htmlFor="wallet-desc">Description</label>
            <input
              id="wallet-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>

          <div className="form-row">
            <label htmlFor="wallet-notes">Notes</label>
            <textarea
              id="wallet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes (optional)"
              rows={3}
            />
          </div>

          <div className="form-row form-row--checkbox">
            <label>
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin to top of list
            </label>
          </div>

          {!isEditing && (
            <div className="form-row form-row--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={launchAfter}
                  onChange={(e) => setLaunchAfter(e.target.checked)}
                />
                Launch wallet after saving
              </label>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => dispatch(closeModal())}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
