import React from 'react';
import { Bot, Search, Sparkles, MessageSquare, ExternalLink, ChevronRight } from 'lucide-react';

const gpts = [
  {
    name: 'ChatGPT',
    description: 'OpenAI\'s powerful language model.',
    url: 'https://chatgpt.com',
    icon: MessageSquare,
    color: 'bg-[#10A37F]',
  },
  {
    name: 'Claude',
    description: 'Anthropic\'s helpful and harmless AI.',
    url: 'https://claude.ai',
    icon: Bot,
    color: 'bg-[#D97757]',
  },
  {
    name: 'Gemini',
    description: 'Google\'s multimodal AI assistant.',
    url: 'https://gemini.google.com',
    icon: Sparkles,
    color: 'bg-[#1A73E8]',
  },
  {
    name: 'Google Search',
    description: 'Search the web for information.',
    url: 'https://google.com',
    icon: Search,
    color: 'bg-[#EA4335]',
  },
];

export default function GPTs() {
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white mb-2 ml-2">
          GPTs & Tools
        </h1>
        <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-8 ml-2">
          Access your favorite AI assistants and tools.
        </p>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800/50">
          {gpts.map((gpt, index) => (
            <a
              key={gpt.name}
              href={gpt.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center p-4 transition-colors hover:bg-gray-50 dark:hover:bg-[#2C2C2E] active:bg-gray-100 dark:active:bg-[#3A3A3C] ${
                index !== gpts.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800/50' : ''
              }`}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-[14px] ${gpt.color} text-white shadow-sm shrink-0`}>
                <gpt.icon size={24} strokeWidth={1.5} />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-[17px] font-semibold text-black dark:text-white">
                  {gpt.name}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {gpt.description}
                </p>
              </div>
              <div className="text-gray-300 dark:text-zinc-600 group-hover:text-gray-400 transition-colors">
                <ChevronRight size={20} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
