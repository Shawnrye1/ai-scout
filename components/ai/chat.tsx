'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, ChatConfig } from '@/lib/ai/types';

interface ChatProps {
  config: ChatConfig;
  className?: string;
}

export function Chat({ config, className }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: config.systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMessage.content += parsed.text;
                  setMessages([...newMessages, { ...assistantMessage }]);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className={className}>
      {(config.title || config.description) && (
        <CardHeader className="pb-3">
          {config.title && (
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#0f2d52]" />
              {config.title}
            </CardTitle>
          )}
          {config.description && (
            <p className="text-sm text-gray-500">{config.description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && config.welcomeMessage && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f2d52] flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-700">{config.welcomeMessage}</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-gray-200' : 'bg-[#0f2d52]'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-gray-600" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div
                className={`flex-1 rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-[#0f2d52] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0f2d52] flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholderText || 'Type a message...'}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-[#0f2d52] hover:bg-[#1a4a7a]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
