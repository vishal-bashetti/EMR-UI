import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useInbox, useSentMessages, useSendMessage, useMarkMessageRead } from '../hooks/useMessages'
import { useUsers } from '../hooks/useUsers'
import { useMe } from '../hooks/useUsers'
import { Icons } from '../components/Icons'

export default function MessagesPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: inbox } = useInbox()
  const { data: sentMessages } = useSentMessages()
  const { data: users } = useUsers()
  
  const sendMessage = useSendMessage()
  const markRead = useMarkMessageRead()

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Group messages by user
  const conversations = useMemo(() => {
    if (!inbox || !sentMessages) return []
    const allMsgs = [...inbox, ...sentMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    const groups: Record<number, typeof allMsgs> = {}
    
    allMsgs.forEach(msg => {
      const otherUserId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id
      if (!groups[otherUserId]) groups[otherUserId] = []
      groups[otherUserId].push(msg)
    })
    
    return Object.entries(groups).map(([userId, msgs]) => ({
      userId: Number(userId),
      messages: msgs,
      lastMessage: msgs[msgs.length - 1],
      unreadCount: msgs.filter(m => m.sender_id !== me?.id && m.status === 'Unread').length
    })).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())
  }, [inbox, sentMessages, me?.id])

  const activeConversation = conversations.find(c => c.userId === selectedUserId)
  const activeUser = users?.find(u => u.id === selectedUserId)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages])

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeConversation) {
      activeConversation.messages.forEach(msg => {
        if (msg.sender_id !== me?.id && msg.status === 'Unread') {
          markRead.mutate(msg.id)
        }
      })
    }
  }, [activeConversation, markRead, me?.id])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !messageText.trim()) return
    
    sendMessage.mutate({
      receiver_id: selectedUserId,
      subject: 'Message',
      body: messageText.trim()
    }, {
      onSuccess: () => setMessageText('')
    })
  }

  // Find users for a new conversation that aren't already in the list
  const filteredNewUsers = users?.filter(u => 
    u.id !== me?.id && 
    !conversations.some(c => c.userId === u.id) &&
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="flex h-full bg-white animate-in fade-in duration-300">
      
      {/* Sidebar: Conversation List */}
      <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Chats</h2>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              {Icons.search}
            </span>
            <input 
              type="text" 
              placeholder="Search or start new chat..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Active Conversations */}
          {conversations.map(conv => {
            const u = users?.find(user => user.id === conv.userId)
            if (!u) return null
            if (searchQuery && !u.username.toLowerCase().includes(searchQuery.toLowerCase())) return null
            
            return (
              <button
                key={conv.userId}
                onClick={() => setSelectedUserId(conv.userId)}
                className={`w-full flex items-start gap-3 p-4 border-b border-slate-50 transition-colors ${selectedUserId === conv.userId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-sm border border-blue-200">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {u.username}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                      {new Date(conv.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                    {conv.lastMessage.sender_id === me?.id ? 'You: ' : ''}{conv.lastMessage.body}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-blue-500/30">
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            )
          })}

          {/* New Conversations */}
          {searchQuery && filteredNewUsers.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Start New Chat</p>
              {filteredNewUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUserId(u.id)
                    setSearchQuery('')
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors mb-1"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">{u.username}</p>
                    <p className="text-[10px] text-slate-500">{u.role?.name || 'Staff'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center gap-4 shrink-0 shadow-sm z-10">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {activeUser?.username[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 leading-none mb-1">{activeUser?.username}</h3>
                <p className="text-xs font-medium text-slate-500">{activeUser?.role?.name}</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeConversation?.messages.map((msg, i) => {
                const isMe = msg.sender_id === me?.id
                const isConsecutive = i > 0 && activeConversation.messages[i-1].sender_id === msg.sender_id
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-600/10' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}>
                      <p className="text-sm">{msg.body}</p>
                      <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!activeConversation || activeConversation.messages.length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    {Icons.messages}
                  </div>
                  <p>Send a message to start the conversation.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-slate-100 border-transparent rounded-full focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-1">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
              {Icons.messages}
            </div>
            <h3 className="text-xl font-bold text-slate-600 mb-2">Your Messages</h3>
            <p className="text-sm">Select a conversation from the sidebar to start chatting.</p>
          </div>
        )}
      </div>

    </div>
  )
}
