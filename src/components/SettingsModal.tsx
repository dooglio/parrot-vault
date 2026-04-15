import { useState } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { closeModal, showNotification } from '../store/uiSlice'

export default function SettingsModal() {
  const dispatch = useAppDispatch()
  const [exodusPath, setExodusPath] = useState('')
  const [edenPath, setEdenPath] = useState('')

  async function handleBrowseExodus() {
    const path = await window.electronAPI.openFileDialog('Select Exodus Executable', exodusPath || undefined)
    if (path) setExodusPath(path)
  }

  async function handleBrowseEden() {
    const path = await window.electronAPI.openFileDialog('Select Exodus Eden Executable', edenPath || undefined)
    if (path) setEdenPath(path)
  }

  function handleSave() {
    dispatch(showNotification({ message: 'Settings saved.', type: 'success' }))
    dispatch(closeModal())
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="modal-close" onClick={() => dispatch(closeModal())}>✕</button>
        </div>

        <div className="modal-body">
          <p className="muted">
            Set default paths for common wallets. These can be overridden per wallet.
          </p>

          <div className="form-row">
            <label htmlFor="exodus-path">Exodus Path</label>
            <div className="input-with-btn">
              <input
                id="exodus-path"
                type="text"
                value={exodusPath}
                onChange={(e) => setExodusPath(e.target.value)}
                placeholder="/Applications/Exodus.app/Contents/MacOS/Exodus"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleBrowseExodus}>
                Browse…
              </button>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="eden-path">Exodus Eden Path</label>
            <div className="input-with-btn">
              <input
                id="eden-path"
                type="text"
                value={edenPath}
                onChange={(e) => setEdenPath(e.target.value)}
                placeholder="/Applications/ExodusEden.app/Contents/MacOS/ExodusEden"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleBrowseEden}>
                Browse…
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => dispatch(closeModal())}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
