
import { safeSetItem } from './localDb';

export type Intent = 'question' | 'coding' | 'emotional' | 'academic' | 'general';
export type Tone = 'friendly' | 'professional' | 'supportive' | 'neutral';
export type ResponseLength = 'short' | 'medium' | 'detailed';

export interface AIEnhancementConfig {
  intent: Intent;
  tone: Tone;
  confidence: 'High' | 'Medium' | 'Low';
  suggestions: string[];
}

export const aiEnhancements = {
  // Intent detection based on keywords
  detectIntent: (text: string): Intent => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('code') || lowerText.includes('function') || lowerText.includes('bug') || lowerText.includes('programming')) return 'coding';
    if (lowerText.includes('how') || lowerText.includes('what') || lowerText.includes('why') || lowerText.includes('?')) return 'question';
    if (lowerText.includes('feel') || lowerText.includes('sad') || lowerText.includes('happy') || lowerText.includes('love')) return 'emotional';
    if (lowerText.includes('study') || lowerText.includes('learn') || lowerText.includes('exam') || lowerText.includes('science')) return 'academic';
    return 'general';
  },

  // Tone detection based on sentiment keywords
  detectTone: (text: string): Tone => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('please') || lowerText.includes('thanks') || lowerText.includes('hello')) return 'friendly';
    if (lowerText.includes('urgent') || lowerText.includes('report') || lowerText.includes('business')) return 'professional';
    if (lowerText.includes('help') || lowerText.includes('support') || lowerText.includes('worried')) return 'supportive';
    return 'neutral';
  },

  // Prompt injection protection
  sanitizePrompt: (text: string): string => {
    const forbidden = [
      'ignore previous instructions',
      'ignore all previous',
      'system instruction',
      'forget everything'
    ];
    let sanitized = text;
    forbidden.forEach(phrase => {
      sanitized = sanitized.replace(new RegExp(phrase, 'gi'), '[PROTECTED]');
    });
    return sanitized;
  },

  // Offensive word detection
  isOffensive: (text: string): boolean => {
    const badWords = ['badword1', 'badword2']; // Placeholder for actual list
    return badWords.some(word => text.toLowerCase().includes(word));
  },

  // Get confidence level (mock logic for now)
  getConfidence: (text: string): 'High' | 'Medium' | 'Low' => {
    if (text.length > 100) return 'High';
    if (text.length > 50) return 'Medium';
    return 'Low';
  },

  // Generate follow-up suggestions
  generateSuggestions: (intent: Intent): string[] => {
    const suggestions: Record<Intent, string[]> = {
      coding: ['Can you explain this code?', 'How can I optimize this?', 'Show me an example.'],
      question: ['Tell me more.', 'What are the alternatives?', 'Give me a summary.'],
      emotional: ['I understand.', 'How can I help?', 'Tell me how you feel.'],
      academic: ['Explain like I am five.', 'Give me a quiz.', 'What are the key points?'],
      general: ['Interesting.', 'Tell me a joke.', 'What else can you do?']
    };
    return suggestions[intent] || suggestions.general;
  },

  // Long-term memory (localStorage)
  saveUserPreference: (key: string, value: string) => {
    const prefs = JSON.parse(localStorage.getItem('tahir_user_prefs') || '{}');
    prefs[key] = value;
    safeSetItem('tahir_user_prefs', JSON.stringify(prefs));
  },

  getUserPrefs: () => {
    return JSON.parse(localStorage.getItem('tahir_user_prefs') || '{}');
  }
};
