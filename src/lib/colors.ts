export type Priority = 'low' | 'medium' | 'high';
export type LabelColor = 'red' | 'emerald' | 'amber' | 'blue' | 'purple' | 'pink' | 'indigo';

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const PRIORITY_COLOR: Record<Priority, LabelColor> = {
  high: 'red',
  medium: 'amber',
  low: 'emerald',
};

interface ColorVariants {
  subtle: string;
  solid: string;
}

// subtle: badges/labels/chips at rest. solid: active/selected states (filter pills, sidebar tags).
export const COLOR_CLASSES: Record<LabelColor, ColorVariants> = {
  red: {
    subtle: 'bg-red-500/15 text-red-400 border border-red-500/30',
    solid: 'bg-red-500/20 text-red-300 border border-red-500/40',
  },
  emerald: {
    subtle: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    solid: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  },
  amber: {
    subtle: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    solid: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  },
  blue: {
    subtle: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    solid: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  },
  purple: {
    subtle: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    solid: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  },
  pink: {
    subtle: 'bg-pink-500/15 text-pink-400 border border-pink-500/30',
    solid: 'bg-pink-500/20 text-pink-300 border border-pink-500/40',
  },
  indigo: {
    subtle: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    solid: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
  },
};

export function getLabelClasses(color: string, variant: keyof ColorVariants = 'subtle'): string {
  const key = (color in COLOR_CLASSES ? color : 'indigo') as LabelColor;
  return COLOR_CLASSES[key][variant];
}

export function getPriorityClasses(priority: Priority, variant: keyof ColorVariants = 'subtle'): string {
  return COLOR_CLASSES[PRIORITY_COLOR[priority]][variant];
}

export function getPriorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}
