'use client';

import { Chat } from '@/components/ai';
import { ChatConfig } from '@/lib/ai/types';

const chatConfig: ChatConfig = {
  title: 'AI Assistant',
  description: 'Ask questions about your contacts, deals, or get help with tasks.',
  welcomeMessage:
    "Hi! I'm your CRM assistant. I can help you with:\n\n• Finding contact information\n• Summarizing deal status\n• Drafting follow-up emails\n• Prioritizing your tasks\n\nHow can I help you today?",
  placeholderText: 'Ask about contacts, deals, or tasks...',
  systemPrompt: `You are a helpful CRM assistant for a sales team. You help users with:
- Finding and managing contact information
- Understanding deal pipelines and status
- Drafting professional emails and follow-ups
- Prioritizing tasks and activities
- Providing sales insights and recommendations

Be concise, professional, and actionable in your responses. When suggesting actions, be specific about next steps.

If asked about specific contacts or deals you don't have data for, acknowledge that you'd need access to the CRM database, but offer to help draft communications or provide general advice.`,
};

export default function CRMChatPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
        <p className="text-gray-500">
          Get AI-powered assistance with your CRM tasks
        </p>
      </div>

      <Chat config={chatConfig} className="shadow-sm" />

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SuggestionCard
          title="Draft follow-up"
          description="Help me write a follow-up email"
        />
        <SuggestionCard
          title="Prioritize tasks"
          description="What should I focus on today?"
        />
        <SuggestionCard
          title="Deal advice"
          description="How do I move a stalled deal forward?"
        />
      </div>
    </div>
  );
}

function SuggestionCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#0f2d52] hover:bg-gray-100 transition-colors cursor-pointer">
      <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
