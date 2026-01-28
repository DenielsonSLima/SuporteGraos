import { Anchor, TrendingUp, Briefcase, Tags, LucideIcon } from 'lucide-react';

export const getCategoryIcon = (type: string): LucideIcon => {
  switch (type) {
    case 'fixed': return Anchor;
    case 'variable': return TrendingUp;
    case 'administrative': return Briefcase;
    default: return Tags;
  }
};

export const getCategoryOrder = (type: string): number => {
  switch (type) {
    case 'fixed': return 1;
    case 'variable': return 2;
    case 'administrative': return 3;
    default: return 4;
  }
};

export const sortCategoriesByType = (categories: any[]) => {
  return [...categories].sort((a, b) => getCategoryOrder(a.type) - getCategoryOrder(b.type));
};
