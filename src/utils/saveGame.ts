import type { CaughtFishItem } from '../data/fishes';

export interface ActiveMealPlanInfo {
  planId: string;
  planName: string;
  autoFeedMealsRemaining: number;
  activatedAt: number;
}

export interface GameSaveData {
  version: number;
  fish: number; // Tiền xu / Vàng tích lũy
  coins: number; // Đồng bộ với fish
  xp: number; // Điểm kinh nghiệm tích lũy
  level: number; // Cấp độ hiện tại
  fishBasket: CaughtFishItem[]; // Giỏ cá đang giữ
  biggestFishKg: number; // Cá to nhất từng bắt
  totalFishCaught: number; // Tổng số cá đã bắt trong hồ
  totalCoinsEarned: number; // Tổng xu đã kiếm được
  totalFish: number;
  highestFish: number;
  totalClicks: number;
  upgrades: { [id: string]: number };
  unlockedSkins: string[];
  equippedSkin: string;
  food: number;
  water: number;
  foodInventory: { [foodId: string]: number }; // Số lượng thức ăn tích trữ trong kho
  activeMealPlan?: ActiveMealPlanInfo | null;
  equippedRodId?: string; // ID cần câu đang trang bị
  rodDurability?: number; // Số lượt câu còn lại của cần
  unlockedRods?: string[]; // Danh sách các cần câu đã mua / sở hữu
  ownedHats?: string[]; // Mũ mèo đã sở hữu
  equippedHat?: string; // Mũ đang đội
  ownedClothes?: string[]; // Áo mèo đã sở hữu
  equippedClothes?: string; // Áo đang mặc
  ownedRoomDecor?: string[]; // Đồ trang trí sảnh phòng đã sở hữu (máng ăn, banh, thảm)
  equippedDecor?: {
    bowl?: string; // Máng ăn đang trưng bày
    ball?: string; // Banh / đồ chơi đang trưng bày
    rug?: string; // Thảm trải phòng
  };
  lastWaterGiftClaimedAt?: number; // Thời điểm nhận quà nước miễn phí (8 tiếng hồi chiêu)
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    particlesEnabled: boolean;
    hapticsEnabled: boolean;
    visualTheme: 'cute_cartoon' | 'sticker_art';
    sfxVolume?: number; // 0 - 100
    musicVolume?: number; // 0 - 100
  };
  achievements: string[];
  lastSaved: number;
}

const SAVE_KEY = 'MEOW_FISH_GAME_SAVE_V1';

export const DEFAULT_SAVE_DATA: GameSaveData = {
  version: 2,
  fish: 0,
  coins: 0,
  xp: 0,
  level: 1,
  fishBasket: [],
  biggestFishKg: 0,
  totalFishCaught: 0,
  totalCoinsEarned: 0,
  totalFish: 0,
  highestFish: 0,
  totalClicks: 0,
  upgrades: {
    claws: 0,
    speedy: 0,
    golden_fish: 0,
    combo: 0,
    royal: 0,
  },
  unlockedSkins: ['orange_tabby'],
  equippedSkin: 'orange_tabby',
  food: 100,
  water: 100,
  foodInventory: {
    '01_thuc_an_kho': 3,
    '09_sua': 2,
  },
  activeMealPlan: null,
  equippedRodId: 'wood_rod',
  rodDurability: 10,
  unlockedRods: ['wood_rod'],
  ownedHats: [],
  equippedHat: '',
  ownedClothes: [],
  equippedClothes: '',
  ownedRoomDecor: ['bowl_clay', 'ball_yarn_red', 'rug_peach'],
  equippedDecor: {
    bowl: 'bowl_clay',
    ball: 'ball_yarn_red',
    rug: 'rug_peach',
  },
  lastWaterGiftClaimedAt: 0, // 0 = Sẵn sàng nhận ngay lần đầu
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    particlesEnabled: true,
    hapticsEnabled: true,
    visualTheme: 'cute_cartoon',
    sfxVolume: 80,
    musicVolume: 50,
  },
  achievements: [],
  lastSaved: Date.now(),
};

/**
 * Saves game state into localStorage
 */
export function saveGame(data: GameSaveData): boolean {
  try {
    const updatedData = {
      ...data,
      coins: data.fish, // đồng bộ
      lastSaved: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(updatedData));
    return true;
  } catch (err) {
    console.error('Failed to save game to localStorage:', err);
    return false;
  }
}

/**
 * Loads game state from localStorage with safe fallback
 */
export function loadGame(): GameSaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE_DATA, lastSaved: Date.now() };

    const parsed = JSON.parse(raw) as Partial<GameSaveData>;
    const coinAmount = Math.max(0, Number(parsed.fish ?? parsed.coins) || 0);

    return {
      version: parsed.version || 2,
      fish: coinAmount,
      coins: coinAmount,
      xp: Math.max(0, Number(parsed.xp) || 0),
      level: Math.max(1, Number(parsed.level) || 1),
      fishBasket: Array.isArray(parsed.fishBasket) ? parsed.fishBasket : [],
      biggestFishKg: Math.max(0, Number(parsed.biggestFishKg) || 0),
      totalFishCaught: Math.max(0, Number(parsed.totalFishCaught) || 0),
      totalCoinsEarned: Math.max(coinAmount, Number(parsed.totalCoinsEarned) || coinAmount),
      totalFish: Math.max(0, Number(parsed.totalFish) || coinAmount),
      highestFish: Math.max(0, Number(parsed.highestFish) || coinAmount),
      totalClicks: Math.max(0, Number(parsed.totalClicks) || 0),
      upgrades: { ...DEFAULT_SAVE_DATA.upgrades, ...(parsed.upgrades || {}) },
      unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0 
        ? parsed.unlockedSkins 
        : ['orange_tabby'],
      equippedSkin: parsed.equippedSkin || 'orange_tabby',
      food: typeof parsed.food === 'number' ? Math.min(100, Math.max(0, parsed.food)) : 100,
      water: typeof parsed.water === 'number' ? Math.min(100, Math.max(0, parsed.water)) : 100,
      foodInventory: typeof parsed.foodInventory === 'object' && parsed.foodInventory !== null
        ? parsed.foodInventory
        : { fresh_water: 3, dry_kibbles: 2 },
      activeMealPlan: parsed.activeMealPlan || null,
      equippedRodId: parsed.equippedRodId || 'wood_rod',
      rodDurability: typeof parsed.rodDurability === 'number' ? Math.max(0, parsed.rodDurability) : 10,
      settings: { ...DEFAULT_SAVE_DATA.settings, ...(parsed.settings || {}) },
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      lastSaved: parsed.lastSaved || Date.now(),
    };
  } catch (err) {
    console.error('Failed to load game from localStorage:', err);
    return { ...DEFAULT_SAVE_DATA, lastSaved: Date.now() };
  }
}

/**
 * Calculates offline earnings when returning to the game
 * Cap offline time at 8 hours (28,800 seconds)
 * 50% efficiency for idle offline time
 */
export function calculateOfflineProgress(
  lastSavedTimestamp: number,
  autoFishPerSecond: number
): { offlineSeconds: number; offlineFish: number } {
  if (!lastSavedTimestamp || autoFishPerSecond <= 0) {
    return { offlineSeconds: 0, offlineFish: 0 };
  }

  const now = Date.now();
  const elapsedMs = now - lastSavedTimestamp;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Cần ít nhất 60 giây rời game để nhận quà offline
  if (elapsedSeconds < 60) {
    return { offlineSeconds: 0, offlineFish: 0 };
  }

  // Giới hạn tối đa 3 giờ offline, hiệu suất 20% để chống lạm phát
  const cappedSeconds = Math.min(elapsedSeconds, 3 * 3600);
  const offlineFish = Math.floor(cappedSeconds * autoFishPerSecond * 0.2);

  return {
    offlineSeconds: cappedSeconds,
    offlineFish,
  };
}

/**
 * Clears save from localStorage
 */
export function resetSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.error('Failed to clear save data:', err);
  }
}

/**
 * Exports save state to a shareable string
 */
export function exportSaveCode(data: GameSaveData): string {
  try {
    const jsonStr = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonStr));
  } catch {
    return '';
  }
}

/**
 * Imports save state from encoded string
 */
export function importSaveCode(code: string): GameSaveData | null {
  try {
    const jsonStr = decodeURIComponent(atob(code.trim()));
    const parsed = JSON.parse(jsonStr) as GameSaveData;
    if (typeof parsed.fish === 'number' && parsed.upgrades) {
      return parsed;
    }
  } catch (err) {
    console.error('Invalid save code format:', err);
  }
  return null;
}
