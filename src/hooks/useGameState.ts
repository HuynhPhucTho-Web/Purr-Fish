import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { UPGRADES } from '../data/upgrades';
import { SKINS, type CatSkin } from '../data/skins';
import {
  rollRandomFish,
  calculateRandomFishDrop,
  FISH_CATALOG,
  type FishSpecies,
  createCaughtFish,
  type CaughtFishItem,
} from '../data/fishes';
import {
  calculateLevelFromTotalXp,
  getCatGrowthStage,
} from '../data/rankTiers';
import type { FoodItem, MealPlan } from '../data/foodShop';
import { FISHING_RODS_CATALOG, getRodById, type FishingRod } from '../data/fishingRods';
import { type FashionDecorItem } from '../data/fashionAndDecor';
import { authService, type UserProfileInfo } from '../services/authService';
import { cloudSaveService } from '../services/cloudSaveService';
import { leaderboardService } from '../services/leaderboardService';
import {
  calculateUpgradeCost,
  calculateClickPower,
  calculateAutoFishRate,
  calculateComboMultiplier,
} from '../utils/economy';
import {
  loadGame,
  saveGame,
  calculateOfflineProgress,
  resetSavedGame,
  exportSaveCode,
  importSaveCode,
  DEFAULT_SAVE_DATA,
  type GameSaveData,
  type ActiveMealPlanInfo,
} from '../utils/saveGame';
import { soundManager } from '../utils/sound';

export interface FloatingItem {
  id: string;
  x: number;
  y: number;
  text: string;
  isCrit?: boolean;
  fishImage?: string;
  fishName?: string;
  rarityColor?: string;
}

export interface SparkleItem {
  id: string;
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
}

export interface OfflineReward {
  offlineSeconds: number;
  offlineFish: number;
}

export function useGameState() {
  const [data, setData] = useState<GameSaveData>(() => {
    const loaded = loadGame();
    return {
      ...DEFAULT_SAVE_DATA,
      ...loaded,
      fishBasket: Array.isArray(loaded.fishBasket) ? loaded.fishBasket : [],
    };
  });
  const [comboCount, setComboCount] = useState<number>(0);
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
  const [sparkles, setSparkles] = useState<SparkleItem[]>([]);
  const [isCatActive, setIsCatActive] = useState<boolean>(false);
  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(null);
  const [lastCaughtFish, setLastCaughtFish] = useState<FishSpecies>(() => FISH_CATALOG[0]);

  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catActiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<UserProfileInfo | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const unsub = authService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const cloudData = await cloudSaveService.loadFromCloud(user.uid);
        if (cloudData) {
          setData((local) => {
            const cloudProgress = (cloudData.totalFish || 0) + (cloudData.xp || 0);
            const localProgress = (local.totalFish || 0) + (local.xp || 0);
            const chosen = cloudProgress > localProgress ? { ...cloudData, lastSaved: Date.now() } : local;
            return {
              ...DEFAULT_SAVE_DATA,
              ...chosen,
              fishBasket: Array.isArray(chosen.fishBasket) ? chosen.fishBasket : [],
            };
          });
        }
      }
    });
    return () => unsub();
  }, []);

  // Level & Cat Growth Stage Calculations
  const levelInfo = useMemo(() => {
    return calculateLevelFromTotalXp(data.xp);
  }, [data.xp]);

  const catStage = useMemo(() => {
    return getCatGrowthStage(levelInfo.level);
  }, [levelInfo.level]);

  // Sync with Firestore & Leaderboard
  const syncToCloud = useCallback(async () => {
    if (!currentUser) return;
    await cloudSaveService.saveToCloud(currentUser.uid, data);
    await leaderboardService.updateMyEntry({
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      level: levelInfo.level,
      xp: data.xp,
      rankTierKey: levelInfo.rankTier.key,
      rankTierName: levelInfo.rankTier.name,
      rankBadge: levelInfo.rankTier.badge,
      coins: data.fish,
      biggestFishKg: data.biggestFishKg,
      equippedSkin: data.equippedSkin,
      catStageLabel: catStage.label,
      updatedAt: Date.now(),
    });
  }, [currentUser, data, levelInfo, catStage]);

  // Debounced auto-sync to cloud
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      syncToCloud();
    }, 4000);
    return () => clearTimeout(timer);
  }, [data, currentUser, syncToCloud]);

  // Sync sound settings with soundManager
  useEffect(() => {
    soundManager.enabled = data.settings.soundEnabled;
  }, [data.settings.soundEnabled]);

  // Find currently equipped skin object
  const currentSkin: CatSkin = useMemo(() => {
    const found = SKINS.find((s) => s.id === data.equippedSkin);
    return found || SKINS[0];
  }, [data.equippedSkin]);

  // Current upgrades
  const clawLevel = data.upgrades['claws'] || 0;
  const speedyLevel = data.upgrades['speedy'] || 0;
  const goldenFishLevel = data.upgrades['golden_fish'] || 0;
  const comboUpgradeLevel = data.upgrades['combo'] || 0;
  const royalLevel = data.upgrades['royal'] || 0;

  // Combo multiplier
  const comboMultiplier = useMemo(() => {
    return calculateComboMultiplier(comboCount, comboUpgradeLevel) * currentSkin.comboBonusMultiplier;
  }, [comboCount, comboUpgradeLevel, currentSkin.comboBonusMultiplier]);

  const isFrenzy = comboCount >= 25;

  // Click power calculation (without combo, and with combo)
  const baseClickPower = useMemo(() => {
    return calculateClickPower(clawLevel, goldenFishLevel, royalLevel, currentSkin.clickBonusMultiplier);
  }, [clawLevel, goldenFishLevel, royalLevel, currentSkin.clickBonusMultiplier]);

  const actualClickPower = useMemo(() => {
    return Math.floor(baseClickPower * comboMultiplier);
  }, [baseClickPower, comboMultiplier]);

  // Auto-fish rate per second (boosted when well-fed and hydrated!)
  const autoFishRate = useMemo(() => {
    const rawRate = calculateAutoFishRate(speedyLevel, royalLevel, currentSkin.autoBonusMultiplier);
    let statusMult = 1.0;
    if (data.food >= 60 && data.water >= 60) {
      statusMult = 1.25;
    } else if (data.food < 20 || data.water < 20) {
      statusMult = 0.75;
    }
    return Math.floor(rawRate * statusMult);
  }, [speedyLevel, royalLevel, currentSkin.autoBonusMultiplier, data.food, data.water]);

  // Gradual food & water decay timer + auto-feed from active meal plan
  useEffect(() => {
    const petTimer = setInterval(() => {
      setData((prev) => {
        let newFood = Math.max(0, Math.round((prev.food - 0.4) * 10) / 10);
        let newWater = Math.max(0, Math.round((prev.water - 0.5) * 10) / 10);
        let activePlan = prev.activeMealPlan ? { ...prev.activeMealPlan } : null;

        // Tự động cho ăn nếu có gói kế hoạch dinh dưỡng và mèo đang đói hoặc khát (< 30%)
        if (activePlan && activePlan.autoFeedMealsRemaining > 0 && (newFood < 30 || newWater < 30)) {
          newFood = Math.min(100, newFood + 40);
          newWater = Math.min(100, newWater + 40);
          activePlan.autoFeedMealsRemaining -= 1;
          soundManager.playEat();
        }

        return {
          ...prev,
          food: newFood,
          water: newWater,
          activeMealPlan: activePlan,
        };
      });
    }, 4500);

    return () => clearInterval(petTimer);
  }, []);

  // Check offline earnings and ensure starting cat is unlocked on mount
  useEffect(() => {
    if (data.lastSaved && autoFishRate > 0) {
      const offline = calculateOfflineProgress(data.lastSaved, autoFishRate);
      if (offline.offlineFish > 0) {
        setOfflineReward(offline);
      }
    }

    if (SKINS.length > 0) {
      setData((prev) => {
        const hasFirst = prev.unlockedSkins.includes(SKINS[0].id);
        const hasEquipped = prev.unlockedSkins.includes(prev.equippedSkin) || prev.equippedSkin === SKINS[0].id;
        if (!hasFirst || !hasEquipped) {
          return {
            ...prev,
            unlockedSkins: hasFirst ? prev.unlockedSkins : [SKINS[0].id, ...prev.unlockedSkins],
            equippedSkin: hasEquipped ? prev.equippedSkin : SKINS[0].id,
          };
        }
        return prev;
      });
    }
  }, []); // Run once on mount

  // Claim offline reward
  const claimOfflineReward = useCallback(() => {
    if (!offlineReward) return;
    const earned = offlineReward.offlineFish;
    setData((prev) => {
      const newFish = prev.fish + earned;
      const newTotal = prev.totalFish + earned;
      const newHighest = Math.max(prev.highestFish, newFish);
      return {
        ...prev,
        fish: newFish,
        totalFish: newTotal,
        highestFish: newHighest,
      };
    });
    soundManager.playUnlock();
    setOfflineReward(null);
  }, [offlineReward]);

  // Handle Cat Click / Tap
  const handleClick = useCallback(
    (clientX?: number, clientY?: number) => {
      // 1. Cat petting & cuddle: Mèo nhận tình cảm, nhả xu thưởng (không bắt cá ở đây)
      const hungerFactor = data.food >= 20 && data.water >= 20 ? 1.0 : 0.6;
      const isCrit = Math.random() < (0.12 + (isFrenzy ? 0.35 : 0));
      const critMultiplier = isCrit ? 2.5 : 1.0;
      const earned = Math.max(
        1,
        Math.round(baseClickPower * comboMultiplier * hungerFactor * critMultiplier)
      );

      // 2. Play sound (pitch elevates with combo & crit)
      const pitch = Math.min(1.9, 1.0 + comboCount * 0.015 + (isCrit ? 0.3 : 0));
      soundManager.playPop(pitch);
      if (isCrit) {
        soundManager.playUpgrade();
      }

      if (data.settings.hapticsEnabled) {
        soundManager.triggerHaptic(isCrit || isFrenzy ? 35 : 15);
      }

      // 3. Animate cat open mouth / happy expression (160ms duration)
      setIsCatActive(true);
      if (catActiveTimerRef.current) clearTimeout(catActiveTimerRef.current);
      catActiveTimerRef.current = setTimeout(() => {
        setIsCatActive(false);
      }, 160);

      // 4. Update combo streak
      setComboCount((prev) => prev + 1);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      const comboDuration = 2200 + comboUpgradeLevel * 400; // time window to keep combo alive
      comboTimerRef.current = setTimeout(() => {
        setComboCount(0);
      }, comboDuration);

      // 5. Update coins & physical energy (slightly consume hunger/thirst)
      setData((prev) => {
        const newFish = prev.fish + earned;
        const newTotal = prev.totalFish + earned;
        const newHighest = Math.max(prev.highestFish, newFish);
        return {
          ...prev,
          fish: newFish,
          coins: newFish,
          totalFish: newTotal,
          totalCoinsEarned: (prev.totalCoinsEarned || 0) + earned,
          highestFish: newHighest,
          totalClicks: prev.totalClicks + 1,
          food: Math.max(0, Math.round((prev.food - 0.08) * 10) / 10),
          water: Math.max(0, Math.round((prev.water - 0.06) * 10) / 10),
        };
      });

      // 6. Spawn floating text (Coins + Hearts) and sparkles
      if (clientX !== undefined && clientY !== undefined) {
        const floatId = `float_${Date.now()}_${Math.random()}`;
        setFloatingItems((prev) => [
          ...prev.slice(-15),
          {
            id: floatId,
            x: clientX,
            y: clientY,
            text: isCrit ? `+${earned} 🪙 CRIT!` : `+${earned} 🪙`,
            isCrit: isCrit || isFrenzy,
            fishImage: '',
            fishName: isCrit ? '💖 Siêu cưng!' : '🐾 Vuốt ve',
            rarityColor: '#FF69B4',
          },
        ]);

        if (data.settings.particlesEnabled) {
          const sparkColors = ['#FFD700', '#FFA07A', '#FF69B4', '#87CEFA', '#FFF'];
          const newSparks: SparkleItem[] = Array.from({ length: 4 }).map(() => ({
            id: `spark_${Date.now()}_${Math.random()}`,
            x: clientX,
            y: clientY,
            color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            vx: (Math.random() - 0.5) * 60,
            vy: -30 - Math.random() * 40,
          }));
          setSparkles((prev) => [...prev.slice(-25), ...newSparks]);
        }
      }
    },
    [baseClickPower, comboCount, comboUpgradeLevel, data.settings, data.food, data.water, isFrenzy, comboMultiplier]
  );

  // Feed Cat directly
  const feedCat = useCallback((amount: number = 25) => {
    setData((prev) => {
      if (prev.food >= 100) return prev;
      soundManager.playEat();
      if (data.settings.hapticsEnabled) soundManager.triggerHaptic(20);
      return {
        ...prev,
        food: Math.min(100, Math.round(prev.food + amount)),
      };
    });
  }, [data.settings.hapticsEnabled]);

  // Catch Fish from Pond: Bắt con nào tính con đó, cân ký và cho vào giỏ cá
  const catchPondFish = useCallback(
    (species: FishSpecies): CaughtFishItem => {
      soundManager.playCatchFish();
      if (data.settings.hapticsEnabled) {
        soundManager.triggerHaptic(40);
      }

      const caughtItem = createCaughtFish(species);
      setLastCaughtFish(species);

      // Thưởng XP thăng cấp dựa trên cân nặng và độ khó của loài cá
      const gainedXp = Math.round(caughtItem.weightKg * 14 * (species.difficultyLevel || 1));
      // Thưởng xu câu cá trực tiếp (25% giá trị cá, 75% còn lại nhận khi bán ở giỏ cá)
      const instantCoins = Math.max(5, Math.round(caughtItem.sellPrice * 0.25));

      setData((prev) => {
        const safeBasket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
        const newBasket = [caughtItem, ...safeBasket].slice(0, 50); // Giữ tối đa 50 con trong giỏ
        const newBiggest = Math.max(prev.biggestFishKg || 0, caughtItem.weightKg);
        const newTotalCaught = (prev.totalFishCaught || 0) + 1;
        const newCoins = (prev.fish || 0) + instantCoins;
        const newXp = (prev.xp || 0) + gainedXp;

        return {
          ...prev,
          fish: newCoins,
          coins: newCoins,
          xp: newXp,
          totalCoinsEarned: (prev.totalCoinsEarned || 0) + instantCoins,
          totalFish: (prev.totalFish || 0) + instantCoins,
          highestFish: Math.max(prev.highestFish || 0, newCoins),
          fishBasket: newBasket,
          biggestFishKg: newBiggest,
          totalFishCaught: newTotalCaught,
        };
      });

      return caughtItem;
    },
    [data.settings.hapticsEnabled]
  );

  // Bán 1 con cá trong giỏ lấy tiền
  const sellFish = useCallback((instanceId: string): number => {
    let earned = 0;
    setData((prev) => {
      const basket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
      const idx = basket.findIndex((f) => f.instanceId === instanceId);
      if (idx === -1) return prev;
      const target = basket[idx];
      earned = target.sellPrice;
      const newBasket = basket.filter((_, i) => i !== idx);
      const newCoins = (prev.fish || 0) + earned;

      soundManager.playUpgrade();
      return {
        ...prev,
        fish: newCoins,
        coins: newCoins,
        totalFish: (prev.totalFish || 0) + earned,
        totalCoinsEarned: (prev.totalCoinsEarned || 0) + earned,
        highestFish: Math.max(prev.highestFish || 0, newCoins),
        fishBasket: newBasket,
      };
    });
    return earned;
  }, []);

  // Bán tất cả cá trong giỏ
  const sellAllFish = useCallback((): { count: number; totalEarned: number } => {
    let count = 0;
    let totalEarned = 0;
    setData((prev) => {
      const basket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
      if (basket.length === 0) return prev;
      count = basket.length;
      totalEarned = basket.reduce((sum, f) => sum + f.sellPrice, 0);
      const newCoins = (prev.fish || 0) + totalEarned;

      soundManager.playUpgrade();
      return {
        ...prev,
        fish: newCoins,
        coins: newCoins,
        totalFish: (prev.totalFish || 0) + totalEarned,
        totalCoinsEarned: (prev.totalCoinsEarned || 0) + totalEarned,
        highestFish: Math.max(prev.highestFish || 0, newCoins),
        fishBasket: [],
      };
    });
    return { count, totalEarned };
  }, []);

  // Mua thức ăn vào túi theo số lượng (x1, x5, x10,...)
  const buyFoodToInventory = useCallback(
    (foodItem: FoodItem, quantity: number = 1): boolean => {
      const qty = Math.max(1, Math.floor(quantity));
      const totalCost = foodItem.price * qty;
      let success = false;

      setData((prev) => {
        if (prev.fish < totalCost) {
          return prev;
        }
        success = true;
        soundManager.playUpgrade();
        if (data.settings.hapticsEnabled) soundManager.triggerHaptic(25);

        const currentQty = prev.foodInventory?.[foodItem.id] || 0;
        const newInventory = {
          ...(prev.foodInventory || {}),
          [foodItem.id]: currentQty + qty,
        };
        const newCoins = prev.fish - totalCost;

        return {
          ...prev,
          fish: newCoins,
          coins: newCoins,
          foodInventory: newInventory,
        };
      });

      return success;
    },
    [data.settings.hapticsEnabled]
  );

  // Cho mèo ăn từ túi: tính toán % hồi phục đói, nước và điểm XP dựa trên số lượng & độ đắt của món ăn
  const feedCatFromInventory = useCallback(
    (
      foodItem: FoodItem,
      quantity: number = 1
    ): {
      success: boolean;
      restoredFood: number;
      restoredWater: number;
      gainedXp: number;
    } => {
      let result = {
        success: false,
        restoredFood: 0,
        restoredWater: 0,
        gainedXp: 0,
      };

      const qty = Math.max(1, Math.floor(quantity));

      setData((prev) => {
        const inventory = prev.foodInventory || {};
        const available = inventory[foodItem.id] || 0;
        if (available < qty) {
          return prev;
        }

        soundManager.playEat();
        if (data.settings.hapticsEnabled) soundManager.triggerHaptic(35);

        // Hệ số độ đắt / phẩm cấp của thức ăn (độ đắt càng cao thì thưởng XP & dinh dưỡng càng đậm)
        // Giá từ 25 -> 9000, hệ số luxury bonus từ 1.0 đến 2.5
        const richnessBonus = 1 + Math.min(1.5, Math.round((foodItem.price / 3000) * 100) / 100);

        const baseFoodRestore = foodItem.foodRestore * qty;
        const baseWaterRestore = foodItem.waterRestore * qty;
        const totalXp = Math.round(foodItem.xpReward * qty * richnessBonus);

        const newFood = Math.min(100, Math.round(prev.food + baseFoodRestore));
        const newWater = Math.min(100, Math.round(prev.water + baseWaterRestore));
        const newXp = prev.xp + totalXp;

        const currentLevel = calculateLevelFromTotalXp(prev.xp).level;
        const nextLevel = calculateLevelFromTotalXp(newXp).level;

        if (nextLevel > currentLevel) {
          soundManager.playUnlock();
        }

        const newInventory = {
          ...inventory,
          [foodItem.id]: available - qty,
        };
        if (newInventory[foodItem.id] <= 0) {
          delete newInventory[foodItem.id];
        }

        result = {
          success: true,
          restoredFood: newFood - prev.food,
          restoredWater: newWater - prev.water,
          gainedXp: totalXp,
        };

        return {
          ...prev,
          food: newFood,
          water: newWater,
          xp: newXp,
          level: nextLevel,
          foodInventory: newInventory,
        };
      });

      return result;
    },
    [data.settings.hapticsEnabled]
  );

  // Mua thức ăn từ shop và cho mèo ăn ngay lập tức
  const buyAndFeed = useCallback(
    (foodItem: FoodItem): boolean => {
      const bought = buyFoodToInventory(foodItem, 1);
      if (bought) {
        feedCatFromInventory(foodItem, 1);
        return true;
      }
      return false;
    },
    [buyFoodToInventory, feedCatFromInventory]
  );

  // Mua thức ăn số lượng nhiều vào túi
  const buyMultipleFood = useCallback(
    (foodItem: FoodItem, quantity: number = 1): boolean => {
      return buyFoodToInventory(foodItem, quantity);
    },
    [buyFoodToInventory]
  );

  // Mua thức ăn theo kế hoạch dinh dưỡng (Meal Plans)
  const buyMealPlan = useCallback((plan: MealPlan): boolean => {
    let success = false;
    setData((prev) => {
      if (prev.fish < plan.price) {
        return prev;
      }
      success = true;
      soundManager.playEat();
      soundManager.playUpgrade();
      if (data.settings.hapticsEnabled) soundManager.triggerHaptic(40);

      const newCoins = prev.fish - plan.price;
      const newFood = Math.min(100, Math.round(prev.food + plan.foodRestoreTotal));
      const newWater = Math.min(100, Math.round(prev.water + plan.waterRestoreTotal));
      const newXp = prev.xp + plan.xpRewardTotal;
      const currentLevel = calculateLevelFromTotalXp(prev.xp).level;
      const nextLevel = calculateLevelFromTotalXp(newXp).level;

      if (nextLevel > currentLevel) {
        soundManager.playUnlock();
      }

      const activePlanInfo: ActiveMealPlanInfo = {
        planId: plan.id,
        planName: plan.name,
        autoFeedMealsRemaining: plan.autoFeedMealsCount,
        activatedAt: Date.now(),
      };

      return {
        ...prev,
        fish: newCoins,
        coins: newCoins,
        food: newFood,
        water: newWater,
        xp: newXp,
        level: nextLevel,
        activeMealPlan: activePlanInfo,
      };
    });
    return success;
  }, [data.settings.hapticsEnabled]);

  // Mua hoặc trang bị Cần Câu mới từ Shop Cần Câu
  const buyOrEquipRod = useCallback(
    (rodId: string): { success: boolean; message: string } => {
      const rod = getRodById(rodId);
      let res = { success: false, message: '' };

      setData((prev) => {
        const currentUnlocked = prev.unlockedRods || ['wood_rod'];
        const updatedUnlocked = currentUnlocked.includes(rod.id)
          ? currentUnlocked
          : [...currentUnlocked, rod.id];

        // Cần gỗ cơ bản (giá 0 hoặc cấp lại khi hỏng)
        if (rod.price === 0) {
          soundManager.playUpgrade();
          res = { success: true, message: `Đã trang bị ${rod.name}!` };
          return {
            ...prev,
            equippedRodId: rod.id,
            rodDurability: rod.maxDurability,
            unlockedRods: updatedUnlocked,
          };
        }

        if (prev.fish < rod.price) {
          res = { success: false, message: `Không đủ xu để mua ${rod.name}!` };
          return prev;
        }

        soundManager.playUnlock();
        if (data.settings.hapticsEnabled) soundManager.triggerHaptic(50);
        const newCoins = prev.fish - rod.price;
        res = {
          success: true,
          message: `Đã mua ${rod.name}! (${rod.maxDurability}/${rod.maxDurability} lượt câu)`,
        };

        return {
          ...prev,
          fish: newCoins,
          coins: newCoins,
          equippedRodId: rod.id,
          rodDurability: rod.maxDurability,
          unlockedRods: updatedUnlocked,
        };
      });

      return res;
    },
    [data.settings.hapticsEnabled]
  );

  // Giảm 1 điểm độ bền của cần sau mỗi lần quăng (dù trúng hay hụt)
  const useRodDurability = useCallback((): number => {
    let remaining = 0;
    setData((prev) => {
      const current = typeof prev.rodDurability === 'number' ? prev.rodDurability : 10;
      remaining = Math.max(0, current - 1);
      return {
        ...prev,
        rodDurability: remaining,
      };
    });
    return remaining;
  }, []);

  // Nhận Quà Nước Miễn Phí (8 tiếng hồi chiêu một lần, nhận 5 nước miễn phí)
  const FREE_WATER_COOLDOWN_MS = 8 * 60 * 60 * 1000;
  const claimFreeWaterGift = useCallback((): {
    success: boolean;
    message: string;
    remainingMs?: number;
    gainedWater?: number;
  } => {
    let result = {
      success: false,
      message: '',
      remainingMs: 0,
      gainedWater: 0,
    };

    const now = Date.now();
    setData((prev) => {
      const lastClaim = prev.lastWaterGiftClaimedAt || 0;
      const elapsed = now - lastClaim;

      if (lastClaim > 0 && elapsed < FREE_WATER_COOLDOWN_MS) {
        const remaining = FREE_WATER_COOLDOWN_MS - elapsed;
        result = {
          success: false,
          message: 'Quà nước đang chuẩn bị! Vui lòng quay lại sau.',
          remainingMs: remaining,
          gainedWater: 0,
        };
        return prev;
      }

      // Claim success: Tặng 5 Nước miễn phí (hồi đầy nước 100% + cộng 5 bình vào túi đồ ăn!)
      soundManager.playUnlock();
      soundManager.playDrink();
      if (data.settings.hapticsEnabled) soundManager.triggerHaptic(40);

      const currentWaterBottles = (prev.foodInventory && prev.foodInventory['09_sua']) || 0;
      const newInventory = {
        ...(prev.foodInventory || {}),
        '09_sua': currentWaterBottles + 5,
      };

      result = {
        success: true,
        message: '🎉 Nhận thành công 5 Nước Miễn Phí! Nước đã đầy 100% và nhận thêm 5 bình vào kho!',
        remainingMs: FREE_WATER_COOLDOWN_MS,
        gainedWater: 5,
      };

      return {
        ...prev,
        water: 100, // Làm đầy bình nước ngay lập tức
        foodInventory: newInventory,
        lastWaterGiftClaimedAt: now,
      };
    });

    return result;
  }, [data.settings.hapticsEnabled]);

  // Mua Mũ, Áo hoặc Đồ Trang Trí Phòng (Máng ăn, Quả banh, Thảm) bằng Xu
  const buyFashionDecorItem = useCallback(
    (item: FashionDecorItem): { success: boolean; message: string } => {
      let res = { success: false, message: '' };

      setData((prev) => {
        if (prev.fish < item.price && item.price > 0) {
          soundManager.playPop();
          res = { success: false, message: `Không đủ xu! Cần ${item.price} xu để mua.` };
          return prev;
        }

        soundManager.playUnlock();
        if (data.settings.hapticsEnabled) soundManager.triggerHaptic(50);

        const newCoins = Math.max(0, prev.fish - item.price);
        let updatedPrev = { ...prev, fish: newCoins, coins: newCoins };

        if (item.category === 'hats') {
          const owned = prev.ownedHats || [];
          const newOwned = owned.includes(item.id) ? owned : [...owned, item.id];
          updatedPrev = {
            ...updatedPrev,
            ownedHats: newOwned,
            equippedHat: item.id,
          };
          res = { success: true, message: `Đã mua và đội ${item.name}! ✨` };
        } else if (item.category === 'clothes') {
          const owned = prev.ownedClothes || [];
          const newOwned = owned.includes(item.id) ? owned : [...owned, item.id];
          updatedPrev = {
            ...updatedPrev,
            ownedClothes: newOwned,
            equippedClothes: item.id,
          };
          res = { success: true, message: `Đã mua và mặc ${item.name}! ✨` };
        } else {
          // bowls, balls, rugs
          const owned = prev.ownedRoomDecor || ['bowl_clay', 'ball_yarn_red', 'rug_peach'];
          const newOwned = owned.includes(item.id) ? owned : [...owned, item.id];
          const prevDecor = prev.equippedDecor || { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach' };
          const slotKey = item.category === 'bowls' ? 'bowl' : item.category === 'balls' ? 'ball' : 'rug';
          updatedPrev = {
            ...updatedPrev,
            ownedRoomDecor: newOwned,
            equippedDecor: {
              ...prevDecor,
              [slotKey]: item.id,
            },
          };
          res = { success: true, message: `Đã mua và đặt ${item.name} tại sảnh phòng! 🛋️✨` };
        }

        return updatedPrev;
      });

      return res;
    },
    [data.settings.hapticsEnabled]
  );

  // Trang bị / Đổi Mũ, Áo hoặc Đồ Trang Trí Phòng (Máng ăn, Quả banh, Thảm)
  const equipFashionDecorItem = useCallback((item: FashionDecorItem): boolean => {
    setData((prev) => {
      soundManager.playUpgrade();
      let updatedPrev = { ...prev };
      if (item.category === 'hats') {
        const nextEquipped = prev.equippedHat === item.id ? '' : item.id;
        updatedPrev = { ...updatedPrev, equippedHat: nextEquipped };
      } else if (item.category === 'clothes') {
        const nextEquipped = prev.equippedClothes === item.id ? '' : item.id;
        updatedPrev = { ...updatedPrev, equippedClothes: nextEquipped };
      } else {
        const slotKey = item.category === 'bowls' ? 'bowl' : item.category === 'balls' ? 'ball' : 'rug';
        const prevDecor = prev.equippedDecor || { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach' };
        updatedPrev = {
          ...updatedPrev,
          equippedDecor: {
            ...prevDecor,
            [slotKey]: item.id,
          },
        };
      }
      return updatedPrev;
    });
    return true;
  }, []);

  // Give Cat Water (Restore 30% water)
  const giveWater = useCallback(() => {
    setData((prev) => {
      if (prev.water >= 100) return prev;
      const cost = Math.min(prev.fish, 2);
      soundManager.playDrink();
      if (data.settings.hapticsEnabled) soundManager.triggerHaptic(20);
      return {
        ...prev,
        fish: Math.max(0, prev.fish - cost),
        water: Math.min(100, Math.round(prev.water + 30)),
      };
    });
  }, [data.settings.hapticsEnabled]);

  // Buy Upgrade
  const buyUpgrade = useCallback((upgradeId: string) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return false;

    setData((prev) => {
      const currentLevel = prev.upgrades[upgradeId] || 0;
      const cost = calculateUpgradeCost(upgrade.baseCost, currentLevel);

      if (prev.fish < cost) return prev; // Not enough fish

      const newFish = prev.fish - cost;
      const newUpgrades = {
        ...prev.upgrades,
        [upgradeId]: currentLevel + 1,
      };

      // Check if buying royal unlocks royal skin
      let newUnlockedSkins = [...prev.unlockedSkins];
      if (upgradeId === 'royal' && !newUnlockedSkins.includes('royal_golden')) {
        newUnlockedSkins.push('royal_golden');
      }

      soundManager.playUpgrade();
      return {
        ...prev,
        fish: newFish,
        upgrades: newUpgrades,
        unlockedSkins: newUnlockedSkins,
      };
    });
    return true;
  }, []);

  // Unlock Skin
  const unlockSkin = useCallback((skinId: string) => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return false;

    setData((prev) => {
      if (prev.unlockedSkins.includes(skinId)) return prev;
      if (prev.fish < skin.unlockCost) return prev;

      soundManager.playUnlock();
      return {
        ...prev,
        fish: prev.fish - skin.unlockCost,
        unlockedSkins: [...prev.unlockedSkins, skinId],
        equippedSkin: skinId, // Auto-equip newly bought skin
      };
    });
    return true;
  }, []);

  // Equip Skin
  const equipSkin = useCallback((skinId: string) => {
    setData((prev) => {
      if (!prev.unlockedSkins.includes(skinId)) return prev;
      soundManager.playMeow();
      return {
        ...prev,
        equippedSkin: skinId,
      };
    });
  }, []);

  // Catch Golden Fish Event
  const catchGoldenFish = useCallback((bonusFish: number) => {
    soundManager.playGoldenFish();
    setData((prev) => {
      const newFish = prev.fish + bonusFish;
      const newTotal = prev.totalFish + bonusFish;
      const newHighest = Math.max(prev.highestFish, newFish);
      return {
        ...prev,
        fish: newFish,
        totalFish: newTotal,
        highestFish: newHighest,
      };
    });
    // Boost combo to frenzy immediately!
    setComboCount((prev) => Math.max(prev, 30));
  }, []);

  // Add auto-fish batch
  const addAutoFishAmount = useCallback((amount: number) => {
    if (amount <= 0) return;
    setData((prev) => {
      const newFish = prev.fish + amount;
      const newTotal = prev.totalFish + amount;
      const newHighest = Math.max(prev.highestFish, newFish);
      return {
        ...prev,
        fish: newFish,
        totalFish: newTotal,
        highestFish: newHighest,
      };
    });
  }, []);

  // Update Settings
  const updateSettings = useCallback((newSettings: Partial<GameSaveData['settings']>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  }, []);

  // Clean up floating numbers after animation completes
  const removeFloatingItem = useCallback((id: string) => {
    setFloatingItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const removeSparkle = useCallback((id: string) => {
    setSparkles((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Reset Game Progress
  const resetGame = useCallback(() => {
    resetSavedGame();
    setData({
      ...DEFAULT_SAVE_DATA,
      lastSaved: Date.now(),
    });
    setComboCount(0);
    soundManager.playPop();
  }, []);

  // Import Save
  const importSave = useCallback((code: string): boolean => {
    const imported = importSaveCode(code);
    if (imported) {
      const sanitized: GameSaveData = {
        ...DEFAULT_SAVE_DATA,
        ...imported,
        fishBasket: Array.isArray(imported.fishBasket) ? imported.fishBasket : [],
      };
      setData(sanitized);
      saveGame(sanitized);
      soundManager.playUnlock();
      return true;
    }
    return false;
  }, []);

  // Export Save
  const exportSave = useCallback((): string => {
    return exportSaveCode(data);
  }, [data]);

  return {
    state: data,
    currentSkin,
    currentUser,
    levelInfo,
    catStage,
    baseClickPower,
    actualClickPower,
    autoFishRate,
    comboCount,
    comboMultiplier,
    isFrenzy,
    isCatActive,
    floatingItems,
    sparkles,
    offlineReward,
    lastCaughtFish,
    foodInventory: data.foodInventory || {},
    equippedRodId: data.equippedRodId || 'wood_rod',
    rodDurability: typeof data.rodDurability === 'number' ? data.rodDurability : 10,
    unlockedRods: data.unlockedRods || ['wood_rod'],
    ownedHats: data.ownedHats || [],
    equippedHat: data.equippedHat || '',
    ownedClothes: data.ownedClothes || [],
    equippedClothes: data.equippedClothes || '',
    ownedRoomDecor: data.ownedRoomDecor || ['bowl_clay', 'ball_yarn_red', 'rug_peach'],
    equippedDecor: data.equippedDecor || { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach' },
    lastWaterGiftClaimedAt: data.lastWaterGiftClaimedAt || 0,
    claimFreeWaterGift,
    buyFashionDecorItem,
    equipFashionDecorItem,
    buyOrEquipRod,
    useRodDurability,
    feedCat,
    catchPondFish,
    sellFish,
    sellAllFish,
    buyFoodToInventory,
    feedCatFromInventory,
    buyAndFeed,
    buyMultipleFood,
    buyMealPlan,
    giveWater,
    handleClick,
    buyUpgrade,
    unlockSkin,
    equipSkin,
    catchGoldenFish,
    addAutoFishAmount,
    claimOfflineReward,
    updateSettings,
    removeFloatingItem,
    removeSparkle,
    resetGame,
    importSave,
    exportSave,
    syncToCloud,
  };
};

export type GameStateHook = ReturnType<typeof useGameState>;
