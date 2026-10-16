export type UpgradeCategory = 'cat' | 'fishing' | 'market';

export interface UpgradeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: UpgradeCategory;
  maxLevel: number;
  baseCost: number;
  costMultiplier?: number;
  effectType:
    | 'clickPower'
    | 'autoFish'
    | 'clickMultiplier'
    | 'comboBonus'
    | 'royalBonus'
    | 'catCrit'
    | 'slowMetabolism'
    | 'quickBite'
    | 'reelTechnique'
    | 'trophyHunter'
    | 'rodCare'
    | 'basketExpand'
    | 'fishAppraiser'
    | 'shopDiscount';
  effectDescription: (level: number) => string;
  nextEffectDescription: (level: number) => string;
}

export const UPGRADE_CATEGORIES: { id: UpgradeCategory | 'all'; name: string; icon: string }[] = [
  { id: 'all', name: 'Tất Cả', icon: '🌟' },
  { id: 'cat', name: 'Mèo Cưng', icon: '🐱' },
  { id: 'fishing', name: 'Hồ Câu', icon: '🎣' },
  { id: 'market', name: 'Kinh Tế', icon: '🧺' },
];

export const UPGRADES: UpgradeItem[] = [
  // ==========================================
  // NHÁNH 1: MÈO CƯNG (CAT SANCTUARY)
  // ==========================================
  {
    id: 'claws',
    name: 'Móng Vuốt Vàng',
    icon: '🐾',
    description: 'Tăng nhẹ số Xu nhận được khi vuốt ve mèo',
    category: 'cat',
    maxLevel: 15,
    baseCost: 40,
    costMultiplier: 1.55,
    effectType: 'clickPower',
    effectDescription: (level) => `+${(level * 0.3).toFixed(1)} Xu/vuốt cơ bản`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 0.3).toFixed(1)} Xu/vuốt`,
  },
  {
    id: 'combo',
    name: 'Nhịp Vuốt Điêu Luyện',
    icon: '⚡',
    description: 'Tăng nhẹ điểm thưởng khi duy trì nhịp click chuẩn',
    category: 'cat',
    maxLevel: 8,
    baseCost: 200,
    costMultiplier: 1.6,
    effectType: 'comboBonus',
    effectDescription: (level) => `+${level * 3}% hiệu quả Combo`,
    nextEffectDescription: (level) => `Tăng lên +${(level + 1) * 3}% hiệu quả Combo`,
  },
  {
    id: 'cat_crit',
    name: 'Cái Chạm May Mắn',
    icon: '✨',
    description: 'Cơ hội kích hoạt vuốt ve bạo kích (x1.5 Xu thưởng)',
    category: 'cat',
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 1.7,
    effectType: 'catCrit',
    effectDescription: (level) => `+${(level * 1.5).toFixed(1)}% cơ hội bạo kích (x1.5 Xu)`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 1.5).toFixed(1)}% cơ hội`,
  },
  {
    id: 'slow_metabolism',
    name: 'Dạ Dày Bền Bỉ',
    icon: '🥣',
    description: 'Giúp mèo no lâu hơn một chút khi bạn đi câu hoặc AFK',
    category: 'cat',
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 1.65,
    effectType: 'slowMetabolism',
    effectDescription: (level) => `Giảm ${(level * 2.5).toFixed(1)}% tốc độ hao đói & nước`,
    nextEffectDescription: (level) => `Giảm ${((level + 1) * 2.5).toFixed(1)}% tốc độ hao hụt`,
  },
  {
    id: 'speedy',
    name: 'Ngủ Mơ Nhặt Xu',
    icon: '💤',
    description: 'Mèo tự động tích lũy vài đồng Xu lẻ mỗi giây khi no bụng',
    category: 'cat',
    maxLevel: 10,
    baseCost: 150,
    costMultiplier: 1.55,
    effectType: 'autoFish',
    effectDescription: (level) => `+${(level * 0.3).toFixed(1)} Xu/giây khi độ no > 40%`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 0.3).toFixed(1)} Xu/giây`,
  },
  {
    id: 'golden_fish',
    name: 'Cá Vàng May Mắn',
    icon: '🐟✨',
    description: 'Tăng nhẹ sản lượng Xu từ mỗi cú vuốt ve',
    category: 'cat',
    maxLevel: 5,
    baseCost: 500,
    costMultiplier: 1.75,
    effectType: 'clickMultiplier',
    effectDescription: (level) => `+${level * 4}% sản lượng Xu khi vuốt`,
    nextEffectDescription: (level) => `Tăng lên +${(level + 1) * 4}% sản lượng Xu`,
  },
  {
    id: 'royal',
    name: 'Phong Thái Hoàng Gia',
    icon: '👑',
    description: 'Mở khóa Skin Mèo Hoàng Gia & hỗ trợ một chút thu nhập',
    category: 'cat',
    maxLevel: 3,
    baseCost: 3000,
    costMultiplier: 2.2,
    effectType: 'royalBonus',
    effectDescription: (level) => `Mở skin quý tộc, +${level * 0.8} Xu/vuốt & +${level * 0.8} Xu/s`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 0.8).toFixed(1)} Xu/vuốt & s`,
  },

  // ==========================================
  // NHÁNH 2: HỒ CÂU CÁ (POND FISHING)
  // ==========================================
  {
    id: 'quick_bite',
    name: 'Thính Dụ Cá',
    icon: '🪱',
    description: 'Cá bơi lại gần và nhấp mồi nhanh hơn một chút',
    category: 'fishing',
    maxLevel: 5,
    baseCost: 280,
    costMultiplier: 1.65,
    effectType: 'quickBite',
    effectDescription: (level) => `Rút ngắn ${level * 3}% thời gian chờ cá cắn câu`,
    nextEffectDescription: (level) => `Rút ngắn ${(level + 1) * 3}% thời gian chờ`,
  },
  {
    id: 'reel_technique',
    name: 'Kỹ Thuật Dây Câu',
    icon: '🎣',
    description: 'Hỗ trợ ghìm cần khi giằng co cá vừa & cá khủng',
    category: 'fishing',
    maxLevel: 5,
    baseCost: 380,
    costMultiplier: 1.7,
    effectType: 'reelTechnique',
    effectDescription: (level) =>
      `Giảm ${level * 3}% tụt lực (Tier 2) & +${level * 2}px vùng xanh (Tier 3)`,
    nextEffectDescription: (level) =>
      `Giảm ${(level + 1) * 3}% tụt lực & +${(level + 1) * 2}px vùng xanh`,
  },
  {
    id: 'trophy_hunter',
    name: 'Mắt Nhìn Thủy Quái',
    icon: '👁️',
    description: 'Tăng nhẹ cơ hội phát hiện cá hiếm và cá có trọng lượng lớn',
    category: 'fishing',
    maxLevel: 5,
    baseCost: 550,
    costMultiplier: 1.75,
    effectType: 'trophyHunter',
    effectDescription: (level) =>
      `+${(level * 1.5).toFixed(1)}% gặp cá hiếm & +${level * 2}% khối lượng cá`,
    nextEffectDescription: (level) =>
      `Tăng lên +${((level + 1) * 1.5).toFixed(1)}% hiếm & +${(level + 1) * 2}% khối lượng`,
  },
  {
    id: 'rod_care',
    name: 'Giữ Gìn Cần Câu',
    icon: '🛡️',
    description: 'Có cơ hội nhỏ không bị hao mòn độ bền cần sau khi kéo cá',
    category: 'fishing',
    maxLevel: 5,
    baseCost: 420,
    costMultiplier: 1.65,
    effectType: 'rodCare',
    effectDescription: (level) => `+${level * 3}% cơ hội bảo toàn độ bền cần`,
    nextEffectDescription: (level) => `Tăng lên +${(level + 1) * 3}% cơ hội bảo toàn`,
  },

  // ==========================================
  // NHÁNH 3: KINH TẾ & GIỎ CÁ (MARKET & LOGISTICS)
  // ==========================================
  {
    id: 'basket_expand',
    name: 'Giỏ Cá Tiện Lợi',
    icon: '🧺',
    description: 'Tăng thêm vài ngăn chứa cá, giảm bớt số lần phải đi bán',
    category: 'market',
    maxLevel: 5,
    baseCost: 320,
    costMultiplier: 1.65,
    effectType: 'basketExpand',
    effectDescription: (level) => `+${level * 3} sức chứa giỏ (Tối đa ${50 + level * 3} con)`,
    nextEffectDescription: (level) => `Tăng lên +${(level + 1) * 3} sức chứa (${50 + (level + 1) * 3} con)`,
  },
  {
    id: 'fish_appraiser',
    name: 'Thương Lái Thân Quen',
    icon: '💰',
    description: 'Bán cá được giá hơn một chút nhờ mối lái thân quen',
    category: 'market',
    maxLevel: 6,
    baseCost: 450,
    costMultiplier: 1.65,
    effectType: 'fishAppraiser',
    effectDescription: (level) => `+${(level * 1.5).toFixed(1)}% giá trị Xu khi bán cá`,
    nextEffectDescription: (level) => `Tăng lên +${((level + 1) * 1.5).toFixed(1)}% giá bán cá`,
  },
  {
    id: 'shop_discount',
    name: 'Khách Quen Cửa Hàng',
    icon: '🏷️',
    description: 'Được giảm nhẹ giá mua đồ ăn và chi phí sửa cần câu',
    category: 'market',
    maxLevel: 4,
    baseCost: 500,
    costMultiplier: 1.75,
    effectType: 'shopDiscount',
    effectDescription: (level) => `Giảm ${(level * 1.5).toFixed(1)}% giá đồ ăn & sửa cần`,
    nextEffectDescription: (level) => `Giảm ${((level + 1) * 1.5).toFixed(1)}% giá đồ ăn & sửa cần`,
  },
];

