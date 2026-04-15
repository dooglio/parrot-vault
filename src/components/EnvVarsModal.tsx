import { useState, useEffect } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { closeModal, showNotification } from '../store/uiSlice'
import type { EnvVar } from '../../shared/types'

export default function EnvVarsModal() {
  const dispatch = useAppDispatch()
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.getEnvVars().then((vars) => {
      setEnvVars(vars)
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    await window.electronAPI.setEnvVar(newName.trim(), newValue.trim())
    const updated = await window.electronAPI.getEnvVars()
    setEnvVars(updated)
    setNewName('')
    setNewValue('')
    dispatch(showNotification({ message: `Env var "${newName}" added.`, type: 'success' }))
  }

  async function handleSaveEdit(name: string) {
    await window.electronAPI.setEnvVar(name, editValue)
    const updated = await window.electronAPI.getEnvVars()
    setEnvVars(updated)
    setEditingId(null)
  }

  async function handleDelete(name: string) {
    await window.electronAPI.deleteEnvVar(name)
    setEnvVars((prev) => prev.filter((v) => v.name !== name))
    dispatch(showNotification({ message: `Env var "${name}" deleted.`, type: 'success' }))
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeModal())}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙ Environment Variables</h2>
          <button className="modal-close" onClick={() => dispatch(closeModal())}>✕</button>
        </div>

        <div className="modal-body">
          <p className="muted">
            These environment variables are injected into every spawned wallet process.
          </p>

          {loading ? (
            <p>Loading…</p>
          ) : (
            <table className="env-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {envVars.length === 0 && (
                  <tr>
                    <td colSpan={3} className="env-empty">No environment variables set.</td>
                  </tr>
                )}
                {envVars.map((v) => (
                  <tr key={v.id}>
                    <td className="env-name">{v.name}</td>
                    <td>
                      {editingId === v.id ? (
                        <input
                          className="env-edit-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(v.name)}
                          autoFocus
                        />
                      ) : (
                        <span className="env-value">{v.value}</span>
                      )}
                    </td>
                    <td className="env-actions">
                      {editingId === v.id ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleSaveEdit(v.name)}>Save</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => { setEditingId(v.id); setEditValue(v.value) }}
                          >
                            ✎
                          </button>
                          <button
                            className="btn btn-sm btn-ghost btn-danger-ghost"
                            onClick={() => handleDelete(v.name)}
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

          <div className="env-add-row">
            <input
              type="text"
              placeholder="NAME"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="env-add-name"
            />
            <input
              type="text"
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="env-add-value"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newName.trim()}>
              Add
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={() => dispatch(closeModal())}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
