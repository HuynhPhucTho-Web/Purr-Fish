/**
 * Upgrade Cost Formula:
 * C_n = floor( C_0 * (multiplier ^ n) )
 * Chi phí tăng dần hợp lý, không lạm phát đột biến.
 */
export function calculateUpgradeCost(
  baseCost: number,
  level: number,
  multiplier: number = 1.65
): number {
  return Math.floor(baseCost * Math.pow(multiplier, level));
}

/**
 * Click Power Formula (Cân bằng & Tăng trưởng nhẹ nhàng):
 * Xu nhận được = Sức mạnh click × Hệ số nhân Cá Vàng × Combo Multiplier
 */
export function calculateClickPower(
  clawLevel: number,
  goldenFishLevel: number,
  royalLevel: number,
  skinBonusMultiplier: number = 1
): number {
  // Base click power: Mỗi cấp móng vuốt tăng nhẹ +0.3 Xu, Hoàng gia +0.8 Xu
  const basePower = 1 + clawLevel * 0.3 + royalLevel * 0.8;

  // Cá vàng: Tăng thêm +4% sản lượng click mỗi cấp
  const goldenMultiplier = 1 + goldenFishLevel * 0.04;

  return Math.max(1, Math.floor(basePower * goldenMultiplier * skinBonusMultiplier));
}

/**
 * Auto-fish Formula (Nhặt xu nhàn rỗi nhẹ nhàng khi mèo no bụng):
 * Xu tự động mỗi giây = Cấp Speedy × 0.3 + Royal Bonus
 */
export function calculateAutoFishRate(
  speedyLevel: number,
  royalLevel: number,
  skinBonusMultiplier: number = 1
): number {
  const baseRate = speedyLevel * 0.3 + royalLevel * 0.8;
  return Math.floor(baseRate * skinBonusMultiplier);
}

/**
 * Combo Multiplier based on combo streak count (Cân bằng & Tăng trưởng nhẹ):
 * Thưởng khi giữ nhịp vuốt chuẩn xác, mỗi cấp combo tăng +3% hiệu quả
 */
export function calculateComboMultiplier(comboCount: number, comboUpgradeLevel: number): number {
  if (comboCount < 5) return 1.0;

  const upgradeBonus = 1 + comboUpgradeLevel * 0.03;

  if (comboCount >= 100) return +(2.2 * upgradeBonus).toFixed(1);
  if (comboCount >= 50) return +(1.8 * upgradeBonus).toFixed(1);
  if (comboCount >= 25) return +(1.5 * upgradeBonus).toFixed(1);
  if (comboCount >= 15) return +(1.25 * upgradeBonus).toFixed(1);
  if (comboCount >= 5) return +(1.1 * upgradeBonus).toFixed(1);
  return 1.0;
}

/**
 * Helper tính toán các chỉ số bổ trợ nhẹ nhàng từ nâng cấp:
 */
export function getBasketCapacity(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['basket_expand'] || 0;
  return Math.min(65, 50 + level * 3);
}

export function getFishSellMultiplier(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['fish_appraiser'] || 0;
  return +(1 + level * 0.015).toFixed(3);
}

export function getRodDurabilitySaveChance(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['rod_care'] || 0;
  return Math.min(0.15, level * 0.03);
}

export function getFishingBiteTimeReduction(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['quick_bite'] || 0;
  return Math.min(0.15, level * 0.03);
}

export function getFishingReelAssist(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['reel_technique'] || 0;
  return Math.min(0.15, level * 0.03);
}

export function getFishingSafeZoneBonus(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['reel_technique'] || 0;
  return Math.min(10, level * 2);
}

export function getTrophyLuckBonus(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['trophy_hunter'] || 0;
  return Math.min(0.075, level * 0.015);
}

export function getCatMetabolismReduction(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['slow_metabolism'] || 0;
  return Math.min(0.125, level * 0.025);
}

export function getCatCritChance(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['cat_crit'] || 0;
  return Math.min(0.075, level * 0.015);
}

export function getShopDiscountMultiplier(upgrades: { [id: string]: number } = {}): number {
  const level = upgrades['shop_discount'] || 0;
  return Math.max(0.94, +(1 - level * 0.015).toFixed(3));
}


/**
 * Formats large numbers cleanly:
 * 1250 -> "1,250"
 * 1250000 -> "1.25M"
 * 1250000000 -> "1.25B"
 */
export function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num < 10000) {
    return Math.floor(num).toLocaleString('vi-VN');
  }
  if (num < 1000000) {
    const k = (num / 1000).toFixed(1);
    return `${k.endsWith('.0') ? k.slice(0, -2) : k}K`;
  }
  if (num < 1000000000) {
    const m = (num / 1000000).toFixed(2);
    return `${m.endsWith('.00') ? m.slice(0, -3) : m}M`;
  }
  const b = (num / 1000000000).toFixed(2);
  return `${b.endsWith('.00') ? b.slice(0, -3) : b}B`;
}

/**
 * Formats time in seconds to mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}g ${m}p`;
  }
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}
