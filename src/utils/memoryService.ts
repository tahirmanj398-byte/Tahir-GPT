import { localDb, safeSetItem } from './localDb';

export const memoryService = {
  // Extract key facts from conversation and save them
  saveMemories: (chatId: string, content: string) => {
    const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
    if (!userId) return;

    // Simple keyword-based extraction for now
    // In a real app, we could use another AI call to summarize "About the User"
    const memories = JSON.parse(localStorage.getItem(`memories_${userId}`) || '[]');
    
    // Logic to identify personal statements (e.g., "My name is", "I like", "I live in")
    // This is a simplified version. The AI will actually be told to output memories in a specific format.
    const memoryRegex = /\[MEMORY:\s*(.*?)\]/g;
    let match;
    while ((match = memoryRegex.exec(content)) !== null) {
      const newMemory = match[1].trim();
      if (!memories.includes(newMemory)) {
        memories.push(newMemory);
      }
    }

    if (memories.length > 100) memories.shift(); // Keep last 100 memories
    safeSetItem(`memories_${userId}`, JSON.stringify(memories));
  },

  getMemories: () => {
    const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
    if (!userId) return [];
    return JSON.parse(localStorage.getItem(`memories_${userId}`) || '[]');
  }
};
