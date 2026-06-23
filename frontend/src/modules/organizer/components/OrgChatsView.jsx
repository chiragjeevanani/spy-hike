/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';

export default function OrgChatsView({ chats, onSendMessage, darkMode }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedChat) return;
    const newMsg = {
      id: `oc-msg-${Date.now()}`,
      sender: 'organizer',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    };
    onSendMessage(selectedChat.tripId, newMsg);
    setInputText('');
    // Simulate user reply after 2s
    setTimeout(() => {
      const replies = [
        'Thank you for the quick response!',
        'Got it, I\'ll be prepared.',
        'Great, see you at the base!',
        'Thanks! Can you clarify the pickup point?',
      ];
      const replyMsg = {
        id: `oc-reply-${Date.now()}`,
        sender: 'user',
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date().toISOString(),
      };
      onSendMessage(selectedChat.tripId, replyMsg);
    }, 2000 + Math.random() * 1000);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (selectedChat) {
    const chat = chats.find(c => c.tripId === selectedChat.tripId) || selectedChat;
    return (
      <div className={`h-full flex flex-col font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
        {/* Chat header */}
        <div className={`shrink-0 px-4 pt-5 pb-3 flex items-center gap-3 ${darkMode ? 'bg-zinc-900/80 border-b border-white/5' : 'bg-white border-b border-zinc-100 shadow-sm'}`}>
          <button type="button" onClick={() => setSelectedChat(null)} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <ArrowLeft size={17} />
          </button>
          <img src={chat.userAvatar} alt={chat.userName} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-bold text-sm">{chat.userName}</p>
            <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{chat.tripName}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {chat.messages.map((msg) => {
            const isOrg = msg.sender === 'organizer';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOrg ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                  isOrg
                    ? 'bg-spy-orange text-white rounded-tr-sm'
                    : darkMode ? 'bg-zinc-800 text-white rounded-tl-sm' : 'bg-zinc-100 text-zinc-800 rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[9px] mt-1 ${isOrg ? 'text-white/60 text-right' : darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatTime(msg.timestamp)}</p>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className={`shrink-0 px-4 py-3 flex items-center gap-2 ${darkMode ? 'bg-zinc-900 border-t border-white/5' : 'bg-white border-t border-zinc-100'}`}>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className={`flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none border transition ${
              darkMode ? 'bg-zinc-800 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/40' : 'bg-zinc-50 border-zinc-200 focus:border-spy-orange/40'
            }`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-10 h-10 bg-spy-orange disabled:opacity-40 text-white rounded-2xl flex items-center justify-center shadow-md shadow-spy-orange/20 active:scale-90 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className={`px-5 pt-5 pb-4 shrink-0 ${darkMode ? 'bg-gradient-to-b from-zinc-900/80 to-transparent' : 'bg-gradient-to-b from-orange-50 to-transparent'}`}>
        <h1 className="text-xl font-display font-black tracking-tight mb-0.5">Messages</h1>
        <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{chats.length} active conversation{chats.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <MessageCircle size={40} className="text-zinc-300 mb-3" />
            <p className="font-bold text-sm">No messages yet</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Hikers will reach out after booking your trips</p>
          </div>
        ) : (
          chats.map((chat, i) => {
            const lastMsg = chat.messages[chat.messages.length - 1];
            const unread = chat.messages.filter(m => m.sender === 'user' && !m.read).length;
            return (
              <motion.div
                key={chat.tripId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer active:scale-[0.98] transition-all ${
                  darkMode ? 'bg-zinc-900 border border-white/5 hover:border-white/10' : 'bg-white border border-zinc-100 shadow-sm hover:shadow'
                }`}
              >
                <div className="relative">
                  <img src={chat.userAvatar} alt={chat.userName} className="w-12 h-12 rounded-full object-cover" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-950">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-bold truncate ${unread > 0 ? '' : darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{chat.userName}</p>
                    <p className={`text-[10px] shrink-0 ml-2 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{lastMsg ? formatTime(lastMsg.timestamp) : ''}</p>
                  </div>
                  <p className={`text-xs truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{lastMsg?.text || 'No messages yet'}</p>
                  <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`}>{chat.tripName}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );

}
