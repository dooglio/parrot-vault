import { useAppSelector } from '../hooks/useAppSelector'
import WalletCard from './WalletCard'

export default function WalletList() {
  const wallets = useAppSelector((s) => s.wallets.items)
  const loading = useAppSelector((s) => s.wallets.loading)
  const searchTerm = useAppSelector((s) => s.ui.searchTerm)

  const filtered = searchTerm
    ? wallets.filter(
        (w) =>
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.walletType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : wallets

  if (loading) {
    return (
      <div className="wallet-list-empty">
        <span className="spinner" />
        <p>Loading wallets…</p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="wallet-list-empty">
        {searchTerm ? (
          <p>
            No wallets match &ldquo;<strong>{searchTerm}</strong>&rdquo;
          </p>
        ) : (
          <>
            <p className="empty-parrot">🦜</p>
            <p>No wallets yet.</p>
            <p className="muted">
              Click <strong>New Wallet</strong> to get started.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <ul className="wallet-list">
      {filtered.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} />
      ))}
    </ul>
  )
}
