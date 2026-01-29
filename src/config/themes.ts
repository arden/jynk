import type { ThemeId } from '../types';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    background: string;
    card: string;
    cardHover: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    avatarFrom: string;
    avatarTo: string;
  };
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      background: 'bg-slate-950',
      card: 'bg-slate-900/50',
      cardHover: 'hover:bg-slate-800/50',
      border: 'border-slate-800',
      text: 'text-white',
      textMuted: 'text-slate-400',
      accent: 'text-violet-400',
      accentHover: 'hover:text-violet-300',
      avatarFrom: 'from-violet-500',
      avatarTo: 'to-fuchsia-500',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      background: 'bg-slate-900',
      card: 'bg-cyan-950/30',
      cardHover: 'hover:bg-cyan-900/30',
      border: 'border-cyan-800/50',
      text: 'text-white',
      textMuted: 'text-cyan-300/70',
      accent: 'text-cyan-400',
      accentHover: 'hover:text-cyan-300',
      avatarFrom: 'from-cyan-400',
      avatarTo: 'to-blue-500',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      background: 'bg-zinc-950',
      card: 'bg-orange-950/20',
      cardHover: 'hover:bg-orange-900/20',
      border: 'border-orange-800/30',
      text: 'text-white',
      textMuted: 'text-orange-200/60',
      accent: 'text-orange-400',
      accentHover: 'hover:text-orange-300',
      avatarFrom: 'from-orange-400',
      avatarTo: 'to-rose-500',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    colors: {
      background: 'bg-zinc-950',
      card: 'bg-emerald-950/30',
      cardHover: 'hover:bg-emerald-900/30',
      border: 'border-emerald-800/40',
      text: 'text-white',
      textMuted: 'text-emerald-300/70',
      accent: 'text-emerald-400',
      accentHover: 'hover:text-emerald-300',
      avatarFrom: 'from-emerald-400',
      avatarTo: 'to-teal-500',
    },
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    colors: {
      background: 'bg-slate-950',
      card: 'bg-purple-950/30',
      cardHover: 'hover:bg-purple-900/30',
      border: 'border-purple-800/40',
      text: 'text-white',
      textMuted: 'text-purple-300/70',
      accent: 'text-purple-400',
      accentHover: 'hover:text-purple-300',
      avatarFrom: 'from-purple-400',
      avatarTo: 'to-pink-500',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      background: 'bg-neutral-950',
      card: 'bg-neutral-900/50',
      cardHover: 'hover:bg-neutral-800/50',
      border: 'border-neutral-800',
      text: 'text-white',
      textMuted: 'text-neutral-400',
      accent: 'text-white',
      accentHover: 'hover:text-neutral-300',
      avatarFrom: 'from-neutral-600',
      avatarTo: 'to-neutral-800',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'midnight';
