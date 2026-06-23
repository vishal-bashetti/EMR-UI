import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInbox, useMarkMessageRead } from '../hooks/useMessages'
import { useUsers } from '../hooks/useUsers'
import { Icons } from './Icons'

export function MessagesWidget({ isCollapsed }: { isCollapsed: boolean }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const { data: inbox } = useInbox({ enabled: isOpen })
  const { data: users } = useUsers({ enabled: isOpen })
  const markRead = useMarkMessageRead()
  const menuRef = useRef<HTMLDivElement>(null)

  const unreadCount = inbox?.filter(m => m.status === 'Unread').length || 0
  const recentMessages = inbox?.slice(0, 5) || []

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getUserName = (id: number) => {
    return users?.find(u => u.id === id)?.username || 'Unknown'
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center relative ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150`}
        title={isCollapsed ? t('nav.messages', 'Messages') : undefined}
      >
        <span className="shrink-0 relative">
          {Icons.messages}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        {!isCollapsed && <span className="truncate">{t('nav.messages', 'Messages')}</span>}
        {!isCollapsed && unreadCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-full bottom-0 ml-4 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Messages</h3>
            <Link 
              to="/messages" 
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              See all in Messenger
            </Link>
          </div>
          
          <div className="max-h-[320px] overflow-y-auto">
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No recent messages
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentMessages.map((msg) => (
                  <Link
                    key={msg.id}
                    to="/messages"
                    onClick={() => {
                      if (msg.status === 'Unread') markRead.mutate(msg.id)
                      setIsOpen(false)
                    }}
                    className={`block p-4 transition-colors ${msg.status === 'Unread' ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                        {getUserName(msg.sender_id)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`text-sm truncate ${msg.status === 'Unread' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {getUserName(msg.sender_id)}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${msg.status === 'Unread' ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                          {msg.body}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
            <Link 
              to="/messages" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Open Messenger Full Page
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
