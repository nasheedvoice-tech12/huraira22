export interface ColorPaletteOption {
  id: string;
  name: string;
  hex: string;
  hoverHex: string;
  lightBg: string;
  ringHex: string;
  tag: string;
  description: string;
}

export const VELCORA_COLOR_PALETTES: ColorPaletteOption[] = [
  {
    id: 'indigo',
    name: 'Velcora Deep Indigo',
    hex: '#5B5CE2',
    hoverHex: '#4647C7',
    lightBg: '#EEF2FF',
    ringHex: 'rgba(91, 92, 226, 0.35)',
    tag: 'Velcora Signature',
    description: 'Modern, intelligent, and authoritative flagship Velcora aesthetic',
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    hex: '#4F8CFF',
    hoverHex: '#3A74E6',
    lightBg: '#EFF6FF',
    ringHex: 'rgba(79, 140, 255, 0.35)',
    tag: 'Intelligence & AI',
    description: 'Crisp and dynamic neural intelligence accent',
  },
  {
    id: 'blue',
    name: 'Royal Blue',
    hex: '#2563EB',
    hoverHex: '#1D4ED8',
    lightBg: '#DBEAFE',
    ringHex: 'rgba(37, 99, 235, 0.35)',
    tag: 'Corporate & Wholesale',
    description: 'Reliable, clean, and trusted corporate finish',
  },
  {
    id: 'teal',
    name: 'Cyan Teal',
    hex: '#0D9488',
    hoverHex: '#0F766E',
    lightBg: '#CCFBF1',
    ringHex: 'rgba(13, 148, 136, 0.35)',
    tag: 'Health & Pharmacy',
    description: 'Calm, refreshing, and clean aesthetic',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    hex: '#059669',
    hoverHex: '#047857',
    lightBg: '#D1FAE5',
    ringHex: 'rgba(5, 150, 105, 0.35)',
    tag: 'Grocery & Organic',
    description: 'Fresh and thriving retail commerce vibe',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    hex: '#D97706',
    hoverHex: '#B45309',
    lightBg: '#FEF3C7',
    ringHex: 'rgba(217, 119, 6, 0.35)',
    tag: 'Bakery & Cafe',
    description: 'Warm, welcoming, and energetic ambiance',
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    hex: '#EA580C',
    hoverHex: '#C2410C',
    lightBg: '#FFEDD5',
    ringHex: 'rgba(234, 88, 12, 0.35)',
    tag: 'Food & Bistro',
    description: 'Bold, appetizing, and lively character',
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    hex: '#E11D48',
    hoverHex: '#BE123C',
    lightBg: '#FFE4E6',
    ringHex: 'rgba(225, 29, 72, 0.35)',
    tag: 'Boutique & Salon',
    description: 'Elegant, premium, and passionate accent',
  },
  {
    id: 'slate',
    name: 'Obsidian Slate',
    hex: '#334155',
    hoverHex: '#1E293B',
    lightBg: '#F1F5F9',
    ringHex: 'rgba(51, 65, 85, 0.35)',
    tag: 'Minimalist & Hardware',
    description: 'Industrial, neutral, and executive precision',
  },
];
