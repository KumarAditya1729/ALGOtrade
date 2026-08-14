import { apiClient } from './client';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export const fetchChatHistory = async (sessionId?: number): Promise<ChatMessage[]> => {
  const url = sessionId ? `/api/v1/ai/chat/history?session_id=${sessionId}` : '/api/v1/ai/chat/history';
  const response = await apiClient.get(url);
  return response.data?.data?.items || response.data || [];
};

export const sendChatMessage = async (message: string, sessionId?: number): Promise<ChatMessage> => {
  const payload = sessionId ? { message, session_id: sessionId } : { message };
  const response = await apiClient.post('/api/v1/ai/chat/message', payload);
  return { role: 'assistant', content: response.data?.data?.reply || 'Received no reply', id: response.data?.data?.message_id };
};
