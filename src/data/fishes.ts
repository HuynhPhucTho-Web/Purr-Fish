// Fish Catalog and Species System - Purr-Fish
export interface FishSpecies {
  id: string;
  orderIndex: number;
  name: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityLabel: string;
  rarityColor: string;
  difficultyLevel: number; // 1 to 5
  difficultyLabel: string; // Dễ, Trung Bình, Khá Nhanh, Rất Nhanh, Cực Khó
  size: number;            // Size in pixels (nhỏ 50px tới to 132px)
  speed: number;           // Swimming speed factor (0.85x tới 2.3x)
  baseWeightKg: number;    // Trọng lượng trung bình chuẩn theo loài (kg)
  pricePerKg: number;      // Đơn giá xu trên mỗi kg
  foodReward: number;      // % of hunger restored (+15% to +50%)
  multiplier: number;      // Score multiplier when caught
  dropWeight: number;      // Weighted spawn chance
}

export interface CaughtFishItem {
  instanceId: string;
  speciesId: string;
  orderIndex: number;
  name: string;
  image: string;
  weightKg: number;
  sellPrice: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityLabel: string;
  rarityColor: string;
  difficultyLabel: string;
  caughtAt: number;
}

/**
 * Sinh ra 1 con cá cụ thể với số ký và giá bán thực tế khi người chơi bắt được
 */
export function createCaughtFish(species: FishSpecies): CaughtFishItem {
  // Biến thiên ngẫu nhiên trọng lượng từ 0.85x đến 1.35x
  const randomFactor = 0.85 + Math.random() * 0.5;
  const weightKg = +(species.baseWeightKg * randomFactor).toFixed(1);
  const sellPrice = Math.max(10, Math.round(weightKg * species.pricePerKg));

  return {
    instanceId: `caught_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    speciesId: species.id,
    orderIndex: species.orderIndex,
    name: species.name,
    image: species.image,
    weightKg,
    sellPrice,
    rarity: species.rarity,
    rarityLabel: species.rarityLabel,
    rarityColor: species.rarityColor,
    difficultyLabel: species.difficultyLabel,
    caughtAt: Date.now(),
  };
}

/**
 * Danh mục chuẩn 12 loài cá trong public/images/fish_webp
 * Sắp xếp chuẩn theo kích thước, độ hiếm & độ khó từ Bé -> Lớn -> Khổng Lồ
 */
export const FISH_CATALOG: FishSpecies[] = [
  {
    id: 'ca_he_nemo',
    orderIndex: 1,
    name: 'Cá Hề Nemo',
    image: '/images/fish_webp/ca_he_nemo.webp',
    rarity: 'common',
    rarityLabel: 'Thường',
    rarityColor: '#38BDF8',
    difficultyLevel: 1,
    difficultyLabel: 'Dễ (Bé)',
    size: 48,
    speed: 1.1,
    baseWeightKg: 0.4,
    pricePerKg: 14,
    foodReward: 10,
    multiplier: 1.0,
    dropWeight: 60,
  },
  {
    id: 'ca_soc_van',
    orderIndex: 2,
    name: 'Cá Sọc Vằn',
    image: '/images/fish_webp/ca_soc_van.webp',
    rarity: 'common',
    rarityLabel: 'Thường',
    rarityColor: '#38BDF8',
    difficultyLevel: 1,
    difficultyLabel: 'Dễ (Bé)',
    size: 52,
    speed: 1.2,
    baseWeightKg: 0.6,
    pricePerKg: 16,
    foodReward: 12,
    multiplier: 1.1,
    dropWeight: 55,
  },
  {
    id: 'ca_ba_duoi',
    orderIndex: 3,
    name: 'Cá Ba Đuôi',
    image: '/images/fish_webp/ca_ba_duoi.webp',
    rarity: 'common',
    rarityLabel: 'Thường',
    rarityColor: '#38BDF8',
    difficultyLevel: 1,
    difficultyLabel: 'Dễ (Bé)',
    size: 56,
    speed: 1.15,
    baseWeightKg: 0.8,
    pricePerKg: 18,
    foodReward: 14,
    multiplier: 1.2,
    dropWeight: 50,
  },
  {
    id: 'ca_ngua',
    orderIndex: 4,
    name: 'Cá Ngựa',
    image: '/images/fish_webp/ca_ngua.webp',
    rarity: 'rare',
    rarityLabel: 'Hiếm',
    rarityColor: '#10B981',
    difficultyLevel: 1,
    difficultyLabel: 'Dễ',
    size: 60,
    speed: 1.05,
    baseWeightKg: 1.1,
    pricePerKg: 22,
    foodReward: 16,
    multiplier: 1.3,
    dropWeight: 45,
  },
  {
    id: 'ca_buom',
    orderIndex: 5,
    name: 'Cá Bướm',
    image: '/images/fish_webp/ca_buom.webp',
    rarity: 'rare',
    rarityLabel: 'Hiếm',
    rarityColor: '#10B981',
    difficultyLevel: 2,
    difficultyLabel: 'Trung Bình',
    size: 66,
    speed: 1.35,
    baseWeightKg: 1.8,
    pricePerKg: 26,
    foodReward: 18,
    multiplier: 1.4,
    dropWeight: 40,
  },
  {
    id: 'ro_phi',
    orderIndex: 6,
    name: 'Cá Rô Phi',
    image: '/images/fish_webp/ro_phi.webp',
    rarity: 'rare',
    rarityLabel: 'Hiếm',
    rarityColor: '#10B981',
    difficultyLevel: 2,
    difficultyLabel: 'Trung Bình',
    size: 72,
    speed: 1.45,
    baseWeightKg: 2.5,
    pricePerKg: 30,
    foodReward: 20,
    multiplier: 1.6,
    dropWeight: 35,
  },
  {
    id: 'ca_noc',
    orderIndex: 7,
    name: 'Cá Nóc',
    image: '/images/fish_webp/ca_noc.webp',
    rarity: 'rare',
    rarityLabel: 'Hiếm',
    rarityColor: '#059669',
    difficultyLevel: 3,
    difficultyLabel: 'Khá Nhanh',
    size: 78,
    speed: 1.55,
    baseWeightKg: 3.6,
    pricePerKg: 35,
    foodReward: 22,
    multiplier: 1.8,
    dropWeight: 30,
  },
  {
    id: 'ca_chep_hong',
    orderIndex: 8,
    name: 'Cá Chép Hồng',
    image: '/images/fish_webp/ca_chep_hong.webp',
    rarity: 'epic',
    rarityLabel: 'Cực Hiếm',
    rarityColor: '#8B5CF6',
    difficultyLevel: 3,
    difficultyLabel: 'Khá Nhanh (Cá Vừa)',
    size: 86,
    speed: 1.7,
    baseWeightKg: 5.2,
    pricePerKg: 42,
    foodReward: 25,
    multiplier: 2.0,
    dropWeight: 25,
  },
  {
    id: 'ca_chep_vang',
    orderIndex: 9,
    name: 'Cá Chép Vàng',
    image: '/images/fish_webp/ca_chep_vang.webp',
    rarity: 'epic',
    rarityLabel: 'Cực Hiếm',
    rarityColor: '#8B5CF6',
    difficultyLevel: 4,
    difficultyLabel: 'Rất Nhanh (Cá Lớn)',
    size: 94,
    speed: 1.85,
    baseWeightKg: 7.5,
    pricePerKg: 48,
    foodReward: 28,
    multiplier: 2.4,
    dropWeight: 20,
  },
  {
    id: 'ca_tre',
    orderIndex: 10,
    name: 'Cá Trê',
    image: '/images/fish_webp/ca_tre.webp',
    rarity: 'epic',
    rarityLabel: 'Cực Hiếm',
    rarityColor: '#8B5CF6',
    difficultyLevel: 4,
    difficultyLabel: 'Rất Nhanh (Cá Lớn)',
    size: 102,
    speed: 2.0,
    baseWeightKg: 10.2,
    pricePerKg: 55,
    foodReward: 30,
    multiplier: 2.8,
    dropWeight: 15,
  },
  {
    id: 'ca_vay_xanh',
    orderIndex: 11,
    name: 'Cá Vây Xanh',
    image: '/images/fish_webp/ca_vay_xanh.webp',
    rarity: 'legendary',
    rarityLabel: 'Huyền Thoại',
    rarityColor: '#F59E0B',
    difficultyLevel: 5,
    difficultyLabel: 'Cực Khó (Cá Khủng)',
    size: 114,
    speed: 2.25,
    baseWeightKg: 18.5,
    pricePerKg: 65,
    foodReward: 35,
    multiplier: 3.4,
    dropWeight: 10,
  },
  {
    id: 'ca_map',
    orderIndex: 12,
    name: 'Cá Mập',
    image: '/images/fish_webp/ca_map.webp',
    rarity: 'legendary',
    rarityLabel: 'Huyền Thoại',
    rarityColor: '#F59E0B',
    difficultyLevel: 5,
    difficultyLabel: 'Thần Thoại (Chúa Tể Bể)',
    size: 130,
    speed: 2.55,
    baseWeightKg: 35.0,
    pricePerKg: 75,
    foodReward: 40,
    multiplier: 4.2,
    dropWeight: 6,
  },
];

/**
 * Tra cứu thông tin loài cá theo id
 */
export function getFishSpeciesById(id: string): FishSpecies {
  const found = FISH_CATALOG.find((f) => f.id === id);
  return found || FISH_CATALOG[0];
}

/**
 * Roll a random fish based on weighted drop chances
 */
export function rollRandomFish(): FishSpecies {
  if (FISH_CATALOG.length === 0) {
    return {
      id: 'ca_he_nemo',
      orderIndex: 1,
      name: 'Cá Hề Nemo',
      image: '/images/fish_webp/ca_he_nemo.webp',
      rarity: 'common',
      rarityLabel: 'Thường',
      rarityColor: '#38BDF8',
      difficultyLevel: 1,
      difficultyLabel: 'Dễ',
      size: 50,
      speed: 1.0,
      baseWeightKg: 0.5,
      pricePerKg: 40,
      foodReward: 20,
      multiplier: 1.0,
      dropWeight: 100,
    };
  }

  const totalWeight = FISH_CATALOG.reduce((sum, f) => sum + f.dropWeight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const fish of FISH_CATALOG) {
    if (randomVal < fish.dropWeight) {
      return fish;
    }
    randomVal -= fish.dropWeight;
  }

  return FISH_CATALOG[0];
}

/**
 * Calculate randomized fish drop amount
 */
export function calculateRandomFishDrop(
  basePower: number,
  fish: FishSpecies,
  hungerPercent: number,
  thirstPercent: number,
  comboMultiplier: number = 1
): { amount: number; isCrit: boolean } {
  const variance = 0.85 + Math.random() * 0.4;

  let statusBonus = 1.0;
  if (hungerPercent >= 60 && thirstPercent >= 60) {
    statusBonus = 1.3;
  } else if (hungerPercent < 20 || thirstPercent < 20) {
    statusBonus = 0.7;
  }

  const isCrit = fish.rarity === 'epic' || fish.rarity === 'legendary' || Math.random() < 0.12;
  const critMultiplier = isCrit ? 1.5 + Math.random() * 0.5 : 1.0;

  const rawAmount = basePower * fish.multiplier * variance * statusBonus * comboMultiplier * critMultiplier;
  const finalAmount = Math.max(1, Math.round(rawAmount));

  return {
    amount: finalAmount,
    isCrit,
  };
}
