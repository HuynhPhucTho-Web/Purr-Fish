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
    description: '+1 cá mỗi lần chạm',
    baseCost: 25,
    effectType: 'clickPower',
    effectDescription: (level) => `+${level} cá/click cơ bản`,
    nextEffectDescription: (level) => `Tăng lên +${level + 1} cá/click`,
  },
  {
    id: 'speedy',
    name: 'Mèo siêu tốc',
    icon: '⚡',
    description: 'Tự động bắt cá mỗi giây',
    baseCost: 100,
    effectType: 'autoFish',
    effectDescription: (level) => `+${level} cá/giây`,
    nextEffectDescription: (level) => `Tăng lên +${level + 1} cá/giây`,
  },
  {
    id: 'golden_fish',
    name: 'Cá vàng',
    icon: '✨',
    description: 'Nhân đôi cá mỗi click',
    baseCost: 250,
    effectType: 'clickMultiplier',
    effectDescription: (level) => `Nhân x${Math.pow(2, level)} lượng cá`,
    nextEffectDescription: (level) => `Tăng lên x${Math.pow(2, level + 1)} sản lượng click`,
  },
  {
    id: 'combo',
    name: 'Combo xịn',
    icon: '💥',
    description: 'Thưởng khi click liên tục',
    baseCost: 500,
    effectType: 'comboBonus',
    effectDescription: (level) => `+${(level * 20)}% hiệu quả Combo`,
    nextEffectDescription: (level) => `+${((level + 1) * 20)}% hiệu quả Combo & kéo dài thời gian`,
  },
  {
    id: 'royal',
    name: 'Mèo hoàng gia',
    icon: '👑',
    description: 'Mở skin đặc biệt & Tăng cực đại sản lượng',
    baseCost: 2000,
    effectType: 'royalBonus',
    effectDescription: (level) => `+${level * 5} cá/click & +${level * 10} cá/s`,
    nextEffectDescription: (_level) => `Tăng thêm +5 cá/click và +10 cá/s`,
  },
];
