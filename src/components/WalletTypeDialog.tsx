import { useState, useEffect } from 'react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { showNotification } from '../store/uiSlice'
import { addWalletType, updateWalletType } from '../store/walletTypesSlice'
import type {
  WalletTypeDefinition,
  NewWalletTypeDefinition,
  WalletPreset,
} from '../../shared/types'

// ─── Preset definitions ───────────────────────────────────────────────────────

interface PresetInfo {
  label: string
  preset: WalletPreset
  icon: string
  dataDirFlag: string
  exePath: () => string
}

const PRESETS: PresetInfo[] = [
  {
    label: 'Exodus',
    preset: 'exodus',
    icon: 'exodus',
    dataDirFlag: '--datadir',
    exePath: () => {
      if (process.platform === 'darwin') return '/Applications/Exodus.app/Contents/MacOS/Exodus'
      if (process.platform === 'win32')
        return `${process.env.LOCALAPPDATA ?? 'C:\\Users\\User\\AppData\\Local'}\\exodus\\Exodus.exe`
      return `${process.env.HOME ?? '/home/user'}/.local/share/exodus/Exodus`
    },
  },
  {
    label: 'Custom',
    preset: 'custom',
    icon: 'custom',
    dataDirFlag: '',
    exePath: () => '',
  },
]

// ─── Built-in icon options ────────────────────────────────────────────────────

interface IconOption {
  key: string
  label: string
  emoji: string
}

const ICON_OPTIONS: IconOption[] = [
  { key: 'exodus', label: 'Exodus', emoji: '🦋' },
  { key: 'bitcoin', label: 'Bitcoin', emoji: '₿' },
  { key: 'ethereum', label: 'Ethereum', emoji: 'Ξ' },
  { key: 'wallet', label: 'Wallet', emoji: '👛' },
  { key: 'vault', label: 'Vault', emoji: '🏦' },
  { key: 'key', label: 'Key', emoji: '🔑' },
  { key: 'custom', label: 'Custom', emoji: '⚙️' },
]

export function getIconEmoji(iconKey: string): string {
  return ICON_OPTIONS.find((o) => o.key === iconKey)?.emoji ?? '👛'
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** Existing record to edit, or null for add */
  existing: WalletTypeDefinition | null
  onClose: () => void
}

export default function WalletTypeDialog({ existing, onClose }: Props) {
  const dispatch = useAppDispatch()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('wallet')
  const [exePath, setExePath] = useState('')
  const [dataDirFlag, setDataDirFlag] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string>('custom')
  const [submitting, setSubmitting] = useState(false)
  /** Base64 PNG extracted from the chosen executable, if any */
  const [detectedIcon, setDetectedIcon] = useState<string | null>(null)

  const isEditing = existing !== null

  // Populate fields when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setIcon(existing.icon)
      setExePath(existing.exePath)
      setDataDirFlag(existing.dataDirFlag)
      setSelectedPreset(existing.preset)
    }
  }, [existing])

  function applyPreset(presetLabel: string) {
    const preset = PRESETS.find((p) => p.label === presetLabel)
    if (!preset) return
    setSelectedPreset(preset.preset)
    setName(preset.label === 'Custom' ? '' : preset.label)
    setIcon(preset.icon)
    setExePath(preset.exePath())
    setDataDirFlag(preset.dataDirFlag)
    setDetectedIcon(null)
  }

  async function handleBrowseExe() {
    const path = await window.electronAPI.openFileDialog(
      'Select Wallet Executable',
      exePath || undefined
    )
    if (!path) return
    setExePath(path)

    // Attempt to extract the app icon from the selected binary
    try {
      const iconData = await window.electronAPI.getFileIcon(path)
      if (iconData) {
        setDetectedIcon(iconData)
        setIcon('detected')
      }
    } catch {
      // Icon extraction failed — no big deal
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      const data: NewWalletTypeDefinition = {
        name: name.trim(),
        icon: detectedIcon ? 'detected' : icon,
        exePath: exePath.trim(),
        dataDirFlag: dataDirFlag.trim(),
        preset: selectedPreset as WalletPreset,
      }

      if (isEditing && existing) {
        await dispatch(updateWalletType({ id: existing.id, data })).unwrap()
        dispatch(showNotification({ message: 'Wallet app updated.', type: 'success' }))
      } else {
        await dispatch(addWalletType(data)).unwrap()
        dispatch(showNotification({ message: 'Wallet app added.', type: 'success' }))
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed'
      dispatch(showNotification({ message: msg, type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? '✏️ Edit Wallet App' : '➕ Add Wallet App'}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Preset picker */}
          <div className="form-row">
            <label htmlFor="wt-preset">Preset</label>
            <select
              id="wt-preset"
              className="wt-select"
              value={PRESETS.find((p) => p.preset === selectedPreset)?.label ?? 'Custom'}
              onChange={(e) => applyPreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.preset} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="form-hint">
              Select a preset to auto-fill the fields, or choose Custom to configure manually.
            </p>
          </div>

          {/* Name */}
          <div className="form-row">
            <label htmlFor="wt-name">Name *</label>
            <input
              id="wt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exodus"
              required
              autoFocus
            />
          </div>

          {/* Icon picker */}
          <div className="form-row">
            <label>Icon</label>
            <div className="wt-icon-grid">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`wt-icon-btn${icon === opt.key && !detectedIcon ? ' wt-icon-btn--selected' : ''}`}
                  title={opt.label}
                  onClick={() => {
                    setIcon(opt.key)
                    setDetectedIcon(null)
                  }}
                >
                  {opt.emoji}
                </button>
              ))}
              {detectedIcon && (
                <button
                  type="button"
                  className={`wt-icon-btn wt-icon-btn--img${icon === 'detected' ? ' wt-icon-btn--selected' : ''}`}
                  title="Auto-detected from app"
                  onClick={() => setIcon('detected')}
                >
                  <img src={detectedIcon} alt="app icon" className="wt-detected-icon" />
                </button>
              )}
            </div>
          </div>

          {/* Executable path */}
          <div className="form-row">
            <label htmlFor="wt-exe">Executable Path</label>
            <div className="input-with-btn">
              <input
                id="wt-exe"
                type="text"
                value={exePath}
                onChange={(e) => setExePath(e.target.value)}
                placeholder="/Applications/Exodus.app/Contents/MacOS/Exodus"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleBrowseExe}>
                Browse…
              </button>
            </div>
            <p className="form-hint">Full path to the wallet executable.</p>
          </div>

          {/* Data dir flag */}
          <div className="form-row">
            <label htmlFor="wt-flag">Data Directory Flag</label>
            <input
              id="wt-flag"
              type="text"
              value={dataDirFlag}
              onChange={(e) => setDataDirFlag(e.target.value)}
              placeholder="--datadir  (leave empty if not supported)"
            />
            <p className="form-hint">
              The CLI argument used to pass a custom data directory, e.g. <code>--datadir</code>.
              Leave empty if the wallet does not support it.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Wallet App'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
