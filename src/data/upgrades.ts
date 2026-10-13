export interface UpgradeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseCost: number;
  effectType: 'clickPower' | 'autoFish' | 'clickMultiplier' | 'comboBonus' | 'royalBonus';
  effectDescription: (level: number) => string;
  nextEffectDescription: (level: number) => string;
}

export const UPGRADES: UpgradeItem[] = [
  {
    id: 'claws',
    name: 'Móng vuốt khỏe',
    icon: '🐾',
    description: '+0.5 cá mỗi lần chạm',
    baseCost: 35,
    effectType: 'clickPower',
    effectDescription: (level) => `+${(level * 0.5).toFixed(1)} cá/click cơ bản`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 0.5).toFixed(1)} cá/click`,
  },
  {
    id: 'speedy',
    name: 'Mèo siêu tốc',
    icon: '⚡',
    description: 'Tự động bắt cá mỗi giây',
    baseCost: 150,
    effectType: 'autoFish',
    effectDescription: (level) => `+${(level * 0.5).toFixed(1)} cá/giây`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 0.5).toFixed(1)} cá/giây`,
  },
  {
    id: 'golden_fish',
    name: 'Cá vàng',
    icon: '',
    description: '+25% sản lượng cá mỗi click',
    baseCost: 400,
    effectType: 'clickMultiplier',
    effectDescription: (level) => `+${level * 25}% sản lượng click`,
    nextEffectDescription: (level) => `Tăng lên +${(level + 1) * 25}% sản lượng click`,
  },
  {
    id: 'combo',
    name: 'Combo xịn',
    icon: '💥',
    description: 'Thưởng khi giữ nhịp click',
    baseCost: 650,
    effectType: 'comboBonus',
    effectDescription: (level) => `+${level * 8}% hiệu quả Combo`,
    nextEffectDescription: (level) => `+${(level + 1) * 8}% hiệu quả Combo`,
  },
  {
    id: 'royal',
    name: 'Mèo hoàng gia',
    icon: '👑',
    description: 'Mở skin đặc biệt & Tăng năng suất',
    baseCost: 3500,
    effectType: 'royalBonus',
    effectDescription: (level) => `+${level * 2} cá/click & +${(level * 2.5).toFixed(1)} cá/s`,
    nextEffectDescription: (_level) => `Tăng thêm +2 cá/click và +2.5 cá/s`,
  },
];
