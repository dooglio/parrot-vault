import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { setSearchTerm, openModal } from '../store/uiSlice'
import WalletList from './WalletList'
import ParrotMascot from './ParrotMascot'

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const searchTerm = useAppSelector((s) => s.ui.searchTerm)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <ParrotMascot />
        <div className="app-title">
          <h1>ParrotVault</h1>
          <p className="app-subtitle">Multi-Wallet Manager</p>
        </div>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search wallets…"
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className="search-input"
        />
        {searchTerm && (
          <button
            className="search-clear"
            onClick={() => dispatch(setSearchTerm(''))}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <WalletList />

      <div className="sidebar-footer">
        <button
          className="btn btn-primary sidebar-btn"
          onClick={() => dispatch(openModal('add-wallet'))}
          title="Add new wallet"
        >
          <span>＋</span> New Wallet
        </button>
        <div className="sidebar-footer-actions">
          <button
            className="btn btn-icon"
            onClick={() => dispatch(openModal('envvars'))}
            title="Environment variables"
          >
            ⚙
          </button>
          <button
            className="btn btn-icon"
            onClick={() => dispatch(openModal('settings'))}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
    </aside>
  )
}
