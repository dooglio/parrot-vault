import { useEffect } from 'react'
import { useAppDispatch } from './hooks/useAppDispatch'
import { useAppSelector } from './hooks/useAppSelector'
import { useProcessEvents } from './hooks/useProcessEvents'
import { fetchWallets } from './store/walletsSlice'
import { fetchRunningWallets } from './store/processesSlice'
import { clearNotification } from './store/uiSlice'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import WalletModal from './components/WalletModal'
import DeleteDialog from './components/DeleteDialog'
import SettingsModal from './components/SettingsModal'
import EnvVarsModal from './components/EnvVarsModal'
import Notification from './components/Notification'

export default function App() {
  const dispatch = useAppDispatch()
  const activeModal = useAppSelector((s) => s.ui.activeModal)
  const notification = useAppSelector((s) => s.ui.notification)

  // Register IPC process event listeners
  useProcessEvents()

  useEffect(() => {
    dispatch(fetchWallets())
    dispatch(fetchRunningWallets())
  }, [dispatch])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => dispatch(clearNotification()), 3500)
      return () => clearTimeout(timer)
    }
  }, [notification, dispatch])

  return (
    <div className="app-shell">
      <Sidebar />
      <MainPanel />

      {(activeModal === 'add-wallet' || activeModal === 'edit-wallet') && <WalletModal />}
      {activeModal === 'delete-wallet' && <DeleteDialog />}
      {activeModal === 'settings' && <SettingsModal />}
      {activeModal === 'envvars' && <EnvVarsModal />}

      {notification && <Notification />}
    </div>
  )
}
