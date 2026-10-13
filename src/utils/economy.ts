/**
 * Upgrade Cost Formula from prompt:
 * C_n = floor( C_0 * (1.6 ^ n) )
 * Where C_0 is base cost and n is the current level.
 */
export function calculateUpgradeCost(baseCost: number, level: number): number {
  return Math.floor(baseCost * Math.pow(1.75, level));
}

/**
 * Click Power Formula (Hardcore Balance):
 * Cá nhận được = Sức mạnh click × Hệ số nhân Cá Vàng × Combo Multiplier
 */
export function calculateClickPower(
  clawLevel: number,
  goldenFishLevel: number,
  royalLevel: number,
  skinBonusMultiplier: number = 1
): number {
  // Base click power: Tăng trưởng vững chắc, không lạm phát
  const basePower = 1 + clawLevel * 0.5 + royalLevel * 2;

  // Cá vàng: Tăng thêm +25% sản lượng click mỗi cấp (thay vì nhân đôi 2^n gây lạm phát)
  const goldenMultiplier = 1 + goldenFishLevel * 0.25;

  return Math.max(1, Math.floor(basePower * goldenMultiplier * skinBonusMultiplier));
}

/**
 * Auto-fish Formula (Hardcore Balance):
 * Cá tự động mỗi giây = Cấp Auto-fish × Tốc độ cơ bản + Royal Bonus
 */
export function calculateAutoFishRate(
  speedyLevel: number,
  royalLevel: number,
  skinBonusMultiplier: number = 1
): number {
  const baseRate = speedyLevel * 0.5 + royalLevel * 2.5;
  return Math.floor(baseRate * skinBonusMultiplier);
}

/**
 * Combo Multiplier based on combo streak count (Hardcore Balance)
 * Thưởng khi giữ nhịp click chuẩn xác, giới hạn trần chống lạm phát
 */
export function calculateComboMultiplier(comboCount: number, comboUpgradeLevel: number): number {
  if (comboCount < 5) return 1.0;
  
  // Combo upgrade tăng nhẹ hiệu quả combo
  const upgradeBonus = 1 + comboUpgradeLevel * 0.08;
  
  if (comboCount >= 100) return +(2.4 * upgradeBonus).toFixed(1);
  if (comboCount >= 50) return +(2.0 * upgradeBonus).toFixed(1);
  if (comboCount >= 25) return +(1.6 * upgradeBonus).toFixed(1);
  if (comboCount >= 15) return +(1.3 * upgradeBonus).toFixed(1);
  if (comboCount >= 5) return +(1.15 * upgradeBonus).toFixed(1);
  return 1.0;
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
