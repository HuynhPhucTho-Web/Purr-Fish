import type { CaughtFishItem } from '../data/fishes';
import { calculateLevelFromTotalXp } from '../data/rankTiers';

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
    ball?: string; // Banh / đồ chơi đang trưng bày (legacy single)
    balls?: string[]; // Danh sách tối đa 3 món đồ chơi gắn lên phòng mèo
    rug?: string; // Thảm trải phòng
    room?: string; // Căn phòng nền background sảnh chơi
  };
  decorPositions?: { [key: string]: { x: number; y: number } };
  hatTransforms?: { [hatId: string]: { offsetX: number; offsetY: number; rotation: number; scale: number; isAttached: boolean } };
  lastWaterGiftClaimedAt?: number; // Thời điểm nhận quà nước miễn phí (8 tiếng hồi chiêu)
  satietyExpiresAt?: number; // Thời điểm hết hạn hiệu ứng No Lâu (timestamp ms)
  satietyTotalDurationMs?: number; // Tổng thời lượng của bữa ăn (ms) dùng để chia đều mức tiêu hao theo thời gian
  zeroDecayUntil?: number; // Thời điểm hết hạn buff 0% hao hụt (ms)
  satietyDecayReduction?: number; // Hệ số tốc độ giảm đói khi No Lâu (0.1 = -90% tốc độ đói)
  satietyFoodName?: string; // Tên món ăn đang cấp hiệu ứng No Lâu
  satietyFoodTier?: 'low' | 'mid' | 'high'; // Phẩm cấp món ăn đang no lâu
  satietyFoodRate?: number; // % tiêu hao thức ăn mỗi giây
  satietyWaterRate?: number; // % tiêu hao nước mỗi giây
  catName?: string; // Tên chú mèo do người chơi đặt
  displayName?: string; // Tên hiển thị người chơi
  catAvatar?: string; // Ảnh đại diện của mèo
  username?: string; // Tên tài khoản người chơi
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
  ownedRoomDecor: ['bowl_clay', 'ball_yarn_red', 'rug_peach', 'room_go_co_dien'],
  equippedDecor: {
    bowl: 'bowl_clay',
    ball: 'ball_yarn_red',
    balls: ['ball_yarn_red'],
    rug: 'rug_peach',
    room: 'room_go_co_dien',
  },
  decorPositions: {},
  hatTransforms: {},
  lastWaterGiftClaimedAt: 0, // 0 = Sẵn sàng nhận ngay lần đầu
  satietyExpiresAt: 0,
  satietyTotalDurationMs: 0,
  zeroDecayUntil: 0,
  satietyDecayReduction: 1.0,
  satietyFoodName: '',
  satietyFoodTier: 'low',
  satietyFoodRate: 100 / 2700,
  satietyWaterRate: 100 / 2700,
  catName: 'Mèo Cưng',
  catAvatar: '/images/cat_avatars_webp/avatar_01.webp',
  username: '',
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

export function getUserSaveKey(usernameOrUid?: string): string {
  if (!usernameOrUid) return SAVE_KEY;
  const clean = usernameOrUid.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `MEOW_FISH_SAVE_${clean}`;
}

export function saveUserGame(usernameOrUid: string | undefined, data: GameSaveData): boolean {
  try {
    const updatedData = {
      ...data,
      coins: data.fish,
      lastSaved: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(updatedData));
    if (usernameOrUid) {
      localStorage.setItem(getUserSaveKey(usernameOrUid), JSON.stringify(updatedData));
    }
    return true;
  } catch (err) {
    console.error('Failed to save game to localStorage:', err);
    return false;
  }
}

export function loadUserGame(usernameOrUid?: string): GameSaveData | null {
  try {
    if (usernameOrUid) {
      const userRaw = localStorage.getItem(getUserSaveKey(usernameOrUid));
      if (userRaw) {
        const parsed = JSON.parse(userRaw) as Partial<GameSaveData>;
        return sanitizeSaveData(parsed);
      }
    }
    return null;
  } catch {
    return null;
  }
}

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
    if (data.username) {
      localStorage.setItem(getUserSaveKey(data.username), JSON.stringify(updatedData));
    }
    return true;
  } catch (err) {
    console.error('Failed to save game to localStorage:', err);
    return false;
  }
}

/**
 * Sanitizes and fills missing fields in any game save object
 */
export function sanitizeSaveData(parsed: Partial<GameSaveData>): GameSaveData {
  const coinAmount = Math.max(0, Number(parsed.fish ?? parsed.coins) || 0);
  const totalXp = Math.max(0, Number(parsed.xp) || 0);
  const calculatedLevel = calculateLevelFromTotalXp(totalXp).level;
  const level = Math.max(calculatedLevel, Number(parsed.level) || 1);

  const rawFood = typeof parsed.food === 'number' ? Math.min(100, Math.max(0, parsed.food)) : 100;
  const rawWater = typeof parsed.water === 'number' ? Math.min(100, Math.max(0, parsed.water)) : 100;
  const lastSavedTime = parsed.lastSaved || Date.now();
  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - lastSavedTime) / 1000));

  let offlineFood = rawFood;
  let offlineWater = rawWater;
  if (elapsedSec > 0) {
    const zeroDecayUntil = parsed.zeroDecayUntil || 0;
    const zeroSec = zeroDecayUntil > lastSavedTime 
      ? Math.max(0, Math.min(elapsedSec, Math.floor((zeroDecayUntil - lastSavedTime) / 1000)))
      : 0;
    const decaySec = Math.max(0, elapsedSec - zeroSec);

    if (decaySec > 0) {
      const naturalRate = 100 / 2700; // Tiêu hao tự nhiên nhẹ nhàng: 100% trong 45 phút (~0.037%/s)
      let foodRate = naturalRate;
      let waterRate = naturalRate;

      if (parsed.satietyExpiresAt && parsed.satietyExpiresAt > lastSavedTime) {
        if (typeof parsed.satietyFoodRate === 'number' && parsed.satietyFoodRate > 0) {
          foodRate = parsed.satietyFoodRate;
        } else if (parsed.satietyFoodTier === 'high') {
          foodRate = 0.005;
        } else if (parsed.satietyFoodTier === 'mid') {
          foodRate = 0.02;
        } else {
          foodRate = 0.045;
        }

        if (typeof parsed.satietyWaterRate === 'number' && parsed.satietyWaterRate > 0) {
          waterRate = parsed.satietyWaterRate;
        } else if (parsed.satietyFoodTier === 'high') {
          waterRate = 0.004;
        } else if (parsed.satietyFoodTier === 'mid') {
          waterRate = 0.015;
        } else {
          waterRate = 0.04;
        }

        if (parsed.satietyDecayReduction && parsed.satietyDecayReduction < 1) {
          foodRate *= parsed.satietyDecayReduction;
          waterRate *= parsed.satietyDecayReduction;
        }
      }

      const foodLoss = foodRate * decaySec;
      const waterLoss = waterRate * decaySec;
      offlineFood = Math.max(0, Math.round((rawFood - foodLoss) * 100) / 100);
      offlineWater = Math.max(0, Math.round((rawWater - waterLoss) * 100) / 100);
    }
  }

  return {
    version: parsed.version || 2,
    fish: coinAmount,
    coins: coinAmount,
    xp: totalXp,
    level,
    fishBasket: Array.isArray(parsed.fishBasket)
      ? parsed.fishBasket.map((f: any) => {
          if (f && (f.name === 'Cá Vàng May Mắn' || f.instanceId?.startsWith('golden_')) && f.weightKg > 1) {
            return { ...f, weightKg: +(0.3 + Math.random() * 0.5).toFixed(1) };
          }
          return f;
        })
      : [],
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
    food: offlineFood,
    water: offlineWater,
    foodInventory: typeof parsed.foodInventory === 'object' && parsed.foodInventory !== null
      ? parsed.foodInventory
      : DEFAULT_SAVE_DATA.foodInventory,
    activeMealPlan: parsed.activeMealPlan || null,
    equippedRodId: parsed.equippedRodId || 'wood_rod',
    rodDurability: typeof parsed.rodDurability === 'number' ? Math.max(0, parsed.rodDurability) : 10,
    unlockedRods: Array.isArray(parsed.unlockedRods) && parsed.unlockedRods.length > 0
      ? parsed.unlockedRods
      : ['wood_rod'],
    satietyExpiresAt: typeof parsed.satietyExpiresAt === 'number' ? parsed.satietyExpiresAt : 0,
    satietyTotalDurationMs: typeof parsed.satietyTotalDurationMs === 'number' ? parsed.satietyTotalDurationMs : 0,
    zeroDecayUntil: typeof parsed.zeroDecayUntil === 'number' ? parsed.zeroDecayUntil : 0,
    satietyDecayReduction: typeof parsed.satietyDecayReduction === 'number' ? parsed.satietyDecayReduction : 1.0,
    satietyFoodName: typeof parsed.satietyFoodName === 'string' ? parsed.satietyFoodName : '',
    satietyFoodTier: parsed.satietyFoodTier || 'low',
    satietyFoodRate: typeof parsed.satietyFoodRate === 'number' ? parsed.satietyFoodRate : 100 / 2700,
    satietyWaterRate: typeof parsed.satietyWaterRate === 'number' ? parsed.satietyWaterRate : 100 / 2700,
    ownedHats: Array.isArray(parsed.ownedHats) ? parsed.ownedHats : [],
    equippedHat: parsed.equippedHat || '',
    ownedClothes: Array.isArray(parsed.ownedClothes) ? parsed.ownedClothes : [],
    equippedClothes: parsed.equippedClothes || '',
    ownedRoomDecor: Array.isArray(parsed.ownedRoomDecor) ? parsed.ownedRoomDecor : DEFAULT_SAVE_DATA.ownedRoomDecor,
    equippedDecor: {
      bowl: parsed.equippedDecor?.bowl || 'bowl_clay',
      ball: parsed.equippedDecor?.ball || 'ball_yarn_red',
      balls: Array.isArray(parsed.equippedDecor?.balls) && parsed.equippedDecor.balls.length > 0
        ? parsed.equippedDecor.balls.slice(0, 3)
        : [parsed.equippedDecor?.ball || 'ball_yarn_red'],
      rug: parsed.equippedDecor?.rug || 'rug_peach',
      room: parsed.equippedDecor?.room || 'room_go_co_dien',
    },
    decorPositions: parsed.decorPositions || {},
    hatTransforms: parsed.hatTransforms || {},
    lastWaterGiftClaimedAt: typeof parsed.lastWaterGiftClaimedAt === 'number' ? parsed.lastWaterGiftClaimedAt : 0,
    catName: parsed.catName || (parsed as any).displayName || DEFAULT_SAVE_DATA.catName,
    catAvatar: parsed.catAvatar || (parsed as any).photoURL || DEFAULT_SAVE_DATA.catAvatar,
    username: parsed.username || DEFAULT_SAVE_DATA.username,
    settings: { ...DEFAULT_SAVE_DATA.settings, ...(parsed.settings || {}) },
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    lastSaved: Date.now(),
  };
}

/**
 * Loads game state from localStorage with safe fallback
 */
export function loadGame(): GameSaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE_DATA, lastSaved: Date.now() };

    const parsed = JSON.parse(raw) as Partial<GameSaveData>;
    return sanitizeSaveData(parsed);
  } catch (err) {
    console.error('Failed to load game from localStorage:', err);
    return { ...DEFAULT_SAVE_DATA, lastSaved: Date.now() };
  }
}

/**
 * Calculates offline earnings when returning to the game
 * Cap offline time at 8 hours (28,800 seconds) for night sleep / long AFK
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

  // Giới hạn tối đa 8 giờ offline (hỗ trợ cho ăn trước khi ngủ)
  const cappedSeconds = Math.min(elapsedSeconds, 8 * 3600);
  const offlineFish = Math.floor(cappedSeconds * autoFishPerSecond * 0.25);

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
