
const MEMORY_KEY = 'sg_ai_learned_memory';

export interface LearnedRule {
  id: string;
  rule: string;
  timestamp: string;
}

export const aiMemoryService = {
  getMemories: (): LearnedRule[] => {
    try {
      const stored = localStorage.getItem(MEMORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addMemory: (rule: string) => {
    const memories = aiMemoryService.getMemories();
    // Evita duplicatas exatas
    if (memories.some(m => m.rule.toLowerCase() === rule.toLowerCase())) return;

    const newMemory: LearnedRule = {
      id: Math.random().toString(36).substr(2, 9),
      rule,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(MEMORY_KEY, JSON.stringify([...memories, newMemory]));
  },

  clearMemories: () => {
    localStorage.removeItem(MEMORY_KEY);
  }
};
