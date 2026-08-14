import React, { useState, useEffect, useRef } from 'react';
import { fetchChatHistory, sendChatMessage } from '../api/aiChat';
import type { ChatMessage } from '../api/aiChat';
import { Send, Bot, User, Zap, BookOpen, AlertTriangle } from 'lucide-react';

export const AIChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const presets = [
    "Write a MACD crossover strategy",
    "When is the next FOMC meeting?",
    "What was the latest CPI print?",
    "Analyze TSLA's current trend"
  ];

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory = async () => {
    setIsInitializing(true);
    try {
      const history = await fetchChatHistory();
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
      } else {
        // Welcome message if no history
        setMessages([{
          role: 'assistant',
          content: 'Hello! I am your AI Trading Assistant. I can help you write algorithmic trading strategies, scan the markets, check macroeconomic calendars, and analyze stock trends. How can I help you today?'
        }]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessages([{ role: 'system', content: 'Could not load chat history. Your connection to the AI backend might be down.' }]);
    } finally {
      setIsInitializing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    if (messageText === input) setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage.content);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { role: 'system', content: 'Network Error: Failed to connect to Unified API. Ensure the backend is running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-lg overflow-hidden relative">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            AI Trading Assistant
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">Beta</span>
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isInitializing ? (
          <div className="flex justify-center items-center h-full text-gray-500 gap-2">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
            Connecting to AI Service...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : msg.role === 'system'
                  ? 'bg-red-900/40 text-red-200 border border-red-800/50 rounded-tl-none'
                  : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-none'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {msg.role === 'user' ? <User size={14} className="opacity-80" /> : msg.role === 'system' ? <AlertTriangle size={14} className="text-red-400" /> : <Bot size={14} className="text-blue-400" />}
                  <span className="text-xs opacity-75 font-semibold uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Copilot'}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 rounded-tl-none text-gray-400 flex space-x-2 items-center shadow-sm">
              <Bot size={16} className="text-blue-400 opacity-50" />
              <div className="flex space-x-1 ml-2">
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isInitializing && messages.length <= 1 && !isLoading && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleSend(preset)}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
              >
                <Zap size={12} className="text-yellow-500" />
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
        className="p-4 bg-gray-800 border-t border-gray-700"
      >
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about markets, macroeconomic events, or request a strategy..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 shadow-inner"
            disabled={isLoading || isInitializing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isInitializing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1 justify-center">
          <BookOpen size={12} />
          AI can make mistakes. Verify important financial data.
        </div>
      </form>
    </div>
  );
};
