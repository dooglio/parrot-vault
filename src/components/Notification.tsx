import { useAppSelector } from '../hooks/useAppSelector'

export default function Notification() {
  const notification = useAppSelector((s) => s.ui.notification)
  if (!notification) return null

  return (
    <div className={`notification notification--${notification.type}`}>
      <span className="notification-icon">
        {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span className="notification-message">{notification.message}</span>
    </div>
  )
}
