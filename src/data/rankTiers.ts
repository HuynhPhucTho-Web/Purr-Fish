export type RankTierKey = 'novice' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend' | 'super_legend';

export interface RankTier {
  key: RankTierKey;
  name: string;
  badge: string;
  badgeImage: string;
  minLevel: number;
  maxLevel: number;
  minXp: number;
  maxXp: number;
  color: string;
  gradient: string;
  borderGlow: string;
  description: string;
}

export const RANK_TIERS: Record<RankTierKey, RankTier> = {
  novice: {
    key: 'novice',
    name: 'Tân Thủ',
    badge: '🐾',
    badgeImage: '/images/cat_badges_webp/badge_01.webp',
    minLevel: 1,
    maxLevel: 9,
    minXp: 0,
    maxXp: 27124,
    color: '#9CA3AF',
    gradient: 'linear-gradient(135deg, #9CA3AF, #6B7280)',
    borderGlow: 'rgba(156, 163, 175, 0.4)',
    description: 'Người mới nuôi mèo, vừa làm quen với chiếc cần cào móng.',
  },
  bronze: {
    key: 'bronze',
    name: 'Đồng',
    badge: '🥉',
    badgeImage: '/images/cat_badges_webp/badge_02.webp',
    minLevel: 10,
    maxLevel: 24,
    minXp: 27125,
    maxXp: 362927,
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #D97706, #92400E)',
    borderGlow: 'rgba(217, 119, 6, 0.45)',
    description: 'Thợ cào cừ khôi, mèo đã bắt đầu nhanh nhẹn và ham ăn hơn.',
  },
  silver: {
    key: 'silver',
    name: 'Bạc',
    badge: '🥈',
    badgeImage: '/images/cat_badges_webp/badge_03.webp',
    minLevel: 25,
    maxLevel: 49,
    minXp: 362928,
    maxXp: 2569118,
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #E2E8F0, #94A3B8)',
    borderGlow: 'rgba(148, 163, 184, 0.5)',
    description: 'Thợ săn thiện nghệ, mèo đã trưởng thành và sở hữu lực cào uy lực.',
  },
  gold: {
    key: 'gold',
    name: 'Vàng',
    badge: '🥇',
    badgeImage: '/images/cat_badges_webp/badge_04.webp',
    minLevel: 50,
    maxLevel: 74,
    minXp: 2569119,
    maxXp: 8060202,
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FBBF24, #D97706)',
    borderGlow: 'rgba(251, 191, 36, 0.55)',
    description: 'Bậc thầy câu cá, mèo quý tộc được tẩm bổ những món sơn hào hải vị.',
  },
  diamond: {
    key: 'diamond',
    name: 'Kim Cương',
    badge: '💎',
    badgeImage: '/images/cat_badges_webp/badge_05.webp',
    minLevel: 75,
    maxLevel: 99,
    minXp: 8060203,
    maxXp: 18156339,
    color: '#00E5FF',
    gradient: 'linear-gradient(135deg, #38BDF8, #0284C7)',
    borderGlow: 'rgba(56, 189, 248, 0.65)',
    description: 'Đẳng cấp đại gia, mèo tỏa ánh hào quang kim cương sáng chói.',
  },
  legend: {
    key: 'legend',
    name: 'Huyền Thoại',
    badge: '🔥',
    badgeImage: '/images/cat_badges_webp/badge_06.png',
    minLevel: 100,
    maxLevel: 149,
    minXp: 18156340,
    maxXp: 45000000,
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
    borderGlow: 'rgba(168, 85, 247, 0.75)',
    description: 'Vua Mèo Huyền Thoại thống trị mọi đại dương và bảng xếp hạng!',
  },
  super_legend: {
    key: 'super_legend',
    name: 'Siêu Huyền Thoại',
    badge: '👑',
    badgeImage: '/images/cat_badges_webp/badge_07.webp',
    minLevel: 150,
    maxLevel: 999,
    minXp: 45000001,
    maxXp: 999999999,
    color: '#FF1744',
    gradient: 'linear-gradient(135deg, #EF4444, #F59E0B)',
    borderGlow: 'rgba(239, 68, 68, 0.85)',
    description: 'Đỉnh cao tối thượng! Vua Mèo Siêu Huyền Thoại thống trị muôn loài!',
  },
};

/**
 * Returns the RankTier for a given level
 */
export function getRankTierByLevel(level: number): RankTier {
  if (level >= 150) return RANK_TIERS.super_legend;
  if (level >= 100) return RANK_TIERS.legend;
  if (level >= 75) return RANK_TIERS.diamond;
  if (level >= 50) return RANK_TIERS.gold;
  if (level >= 25) return RANK_TIERS.silver;
  if (level >= 10) return RANK_TIERS.bronze;
  return RANK_TIERS.novice;
}

/**
 * Tính điểm kinh nghiệm (XP) cần thiết để lên cấp tiếp theo (Hardcore Exponential Progression).
 * Cấp độ đầu tiên Lv1 yêu cầu 100 XP. Càng lên cao yêu cầu điểm kinh nghiệm tăng vọt.
 */
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 100;
  // Đường cong tăng trưởng kinh nghiệm luỹ thừa bậc cao chống lạm phát cấp độ
  const base = 100;
  const growth = Math.floor(180 * Math.pow(level - 1, 1.55) + 30 * Math.pow(level - 1, 2));
  return base + growth;
}

/**
 * Tính tổng điểm kinh nghiệm tích lũy cần để đạt tới một cấp độ nhất định
 */
export function getCumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += getXpRequiredForLevel(l);
  }
  return total;
}

/**
 * Given total accumulated XP, calculates current Level, current level progress, and XP needed for next level
 */
export function calculateLevelFromTotalXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXpRequired: number;
  progressPercent: number;
  rankTier: RankTier;
} {
  let remainingXp = Math.max(0, totalXp);
  let currentLevel = 1;

  while (currentLevel < 999) {
    const cost = getXpRequiredForLevel(currentLevel);
    if (remainingXp < cost) {
      break;
    }
    remainingXp -= cost;
    currentLevel += 1;
  }

  const nextLevelXpRequired = getXpRequiredForLevel(currentLevel);
  const progressPercent = Math.min(100, Math.round((remainingXp / nextLevelXpRequired) * 100));
  const rankTier = getRankTierByLevel(currentLevel);

  return {
    level: currentLevel,
    currentLevelXp: remainingXp,
    nextLevelXpRequired,
    progressPercent,
    rankTier,
  };
}

export type CatStageKey = 'kitten' | 'junior' | 'adult' | 'chonky_king';

export interface CatGrowthStage {
  stage: CatStageKey;
  label: string;
  scale: number;
  minLevel: number;
  maxLevel: number;
  meowSoundType: 'high' | 'cute' | 'normal' | 'deep';
  auraClass?: string;
}

export const CAT_GROWTH_STAGES: CatGrowthStage[] = [
  {
    stage: 'kitten',
    label: 'Bé Mèo Con (Kitten)',
    scale: 0.72,
    minLevel: 1,
    maxLevel: 4,
    meowSoundType: 'high',
  },
  {
    stage: 'junior',
    label: 'Mèo Thiếu Niên (Junior)',
    scale: 0.88,
    minLevel: 5,
    maxLevel: 9,
    meowSoundType: 'cute',
  },
  {
    stage: 'adult',
    label: 'Mèo Trưởng Thành (Adult)',
    scale: 1.02,
    minLevel: 10,
    maxLevel: 24,
    meowSoundType: 'normal',
  },
  {
    stage: 'chonky_king',
    label: 'Mèo Đại Gia Béo Múp (Chonky King)',
    scale: 1.22,
    minLevel: 25,
    maxLevel: 999,
    meowSoundType: 'deep',
    auraClass: 'cat-aura-king',
  },
];

export function getCatGrowthStage(level: number): CatGrowthStage {
  if (level >= 25) return CAT_GROWTH_STAGES[3];
  if (level >= 10) return CAT_GROWTH_STAGES[2];
  if (level >= 5) return CAT_GROWTH_STAGES[1];
  return CAT_GROWTH_STAGES[0];
}
