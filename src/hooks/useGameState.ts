import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { UPGRADES } from '../data/upgrades';
import { SKINS, type CatSkin } from '../data/skins';
import {
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
import { getRodById, getRodRepairCost } from '../data/fishingRods';
import { type FashionDecorItem, getFashionItemById, getToyRewardConfig } from '../data/fashionAndDecor';
import { authService, type UserProfileInfo } from '../services/authService';
import { cloudSaveService } from '../services/cloudSaveService';
import { leaderboardService } from '../services/leaderboardService';
import { auth } from '../services/firebase';
import {
  calculateUpgradeCost,
  calculateClickPower,
  calculateAutoFishRate,
  calculateComboMultiplier,
  formatNumber,
  getBasketCapacity,
  getFishSellMultiplier,
  getRodDurabilitySaveChance,
  getFishingBiteTimeReduction,
  getFishingReelAssist,
  getFishingSafeZoneBonus,
  getTrophyLuckBonus,
  getCatMetabolismReduction,
  getCatCritChance,
  getShopDiscountMultiplier,
} from '../utils/economy';
import {
  loadGame,
  saveGame,
  saveUserGame,
  loadUserGame,
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

  // Quản lý thể lực chơi đồ chơi chống auto-click spam (mèo mệt sau 8 lần chơi liên tiếp)
  const toyStaminaRef = useRef<number>(8);
  const toyTiredUntilRef = useRef<number>(0);
  const lastToyClickTimeRef = useRef<number>(0);
  const toyIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quản lý thể lực vuốt ve mèo chống auto-click spam (mèo mệt sau 10 lần vuốt ve liên tiếp)
  const petStaminaRef = useRef<number>(10);
  const petTiredUntilRef = useRef<number>(0);
  const lastPetClickTimeRef = useRef<number>(0);
  const petIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<UserProfileInfo | null>(() => authService.getCurrentUser());

  const dataRef = useRef(data);
  dataRef.current = data;

  // Tải dữ liệu người chơi từ Cloud Firestore
  // Tải dữ liệu người chơi từ Cloud Firestore hoặc sao lưu máy
  const loadUserDataFromCloud = useCallback(async (user: UserProfileInfo) => {
    if (!user || user.isAnonymous) return null;

    // 1. Kiểm tra sao lưu local riêng của tài khoản này
    const localUserBackup = loadUserGame(user.username);

    // 2. Thử tải từ Cloud nếu có Firebase Auth hợp lệ
    let cloudData: GameSaveData | null = null;
    if (auth.currentUser && auth.currentUser.uid === user.uid && !user.uid.startsWith('local_')) {
      cloudData = await cloudSaveService.loadFromCloud(user.uid);
    }

    const currentLocal = dataRef.current;
    const baseSource = cloudData || localUserBackup;

    const userCatName = (user.catName && user.catName !== 'Mèo Cưng')
      ? user.catName
      : (baseSource?.catName && baseSource.catName !== 'Mèo Cưng')
      ? baseSource.catName
      : (user.displayName || baseSource?.catName || 'Mèo Cưng');

    if (cloudData || localUserBackup) {
      // SO SÁNH TIẾN TRÌNH: Giữ lại mức cao nhất (chống reset về 0)
      const cloudCoins = Math.max(0, Number(cloudData?.fish ?? cloudData?.coins ?? localUserBackup?.fish ?? localUserBackup?.coins) || 0);
      const cloudXp = Math.max(0, Number(cloudData?.xp ?? localUserBackup?.xp) || 0);
      const localCoins = Math.max(0, Number(currentLocal.fish ?? currentLocal.coins) || 0);
      const localXp = Math.max(0, Number(currentLocal.xp) || 0);

      const finalCoins = Math.max(cloudCoins, localCoins);
      const finalXp = Math.max(cloudXp, localXp);
      const calcLvl = calculateLevelFromTotalXp(finalXp).level;

      const higherSource = (localCoins > cloudCoins || localXp > cloudXp) ? currentLocal : (cloudData || localUserBackup || currentLocal);

      const restored: GameSaveData = {
        ...DEFAULT_SAVE_DATA,
        ...baseSource,
        ...higherSource,
        fish: finalCoins,
        coins: finalCoins,
        xp: finalXp,
        level: Math.max(calcLvl, Number(baseSource?.level) || 1, Number(currentLocal.level) || 1),
        catName: userCatName,
        displayName: userCatName,
        catAvatar: baseSource?.catAvatar || user.photoURL || currentLocal.catAvatar || '/images/cat_avatars_webp/avatar_01.webp',
        username: baseSource?.username || user.username || currentLocal.username || '',
        fishBasket: (Array.isArray(currentLocal.fishBasket) && currentLocal.fishBasket.length > (baseSource?.fishBasket?.length || 0))
          ? currentLocal.fishBasket
          : (Array.isArray(baseSource?.fishBasket) ? baseSource.fishBasket : []),
        lastSaved: Date.now(),
      };
      setData(restored);
      saveGame(restored);
      saveUserGame(user.username, restored);

      // Nếu dữ liệu local cao hơn cloud và có kết nối Firestore, đồng bộ ngược lên cloud
      if (cloudData && (localCoins > cloudCoins || localXp > cloudXp)) {
        cloudSaveService.saveToCloud(user.uid, restored);
      }

      return restored;
    } else {
      // Khi vừa tạo tài khoản hoặc chưa có cloud data: cập nhật state hiện tại với thông tin user mới
      setData((prev) => {
        const next: GameSaveData = {
          ...prev,
          catName: userCatName,
          displayName: userCatName,
          username: user.username || prev.username,
          catAvatar: user.photoURL || prev.catAvatar,
          lastSaved: Date.now(),
        };
        saveGame(next);
        saveUserGame(user.username, next);
        return next;
      });
    }
    return null;
  }, []);

  useEffect(() => {
    const unsub = authService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user && !user.isAnonymous) {
        // Người dùng đã đăng nhập: Tải đúng dữ liệu của tài khoản này từ Firestore hoặc sao lưu
        const restored = await loadUserDataFromCloud(user);
        if (!restored && auth.currentUser && auth.currentUser.uid === user.uid && !user.uid.startsWith('local_')) {
          // Chưa có save trên cloud (mới tạo tài khoản), lưu save local hiện tại lên cloud!
          const currentLocal = dataRef.current;
          const userCatName = (user.catName && user.catName !== 'Mèo Cưng')
            ? user.catName
            : (currentLocal.catName && currentLocal.catName !== 'Mèo Cưng')
            ? currentLocal.catName
            : (user.displayName || currentLocal.catName || 'Mèo Cưng');
          const lvl = calculateLevelFromTotalXp(currentLocal.xp || 0);
          const enriched: GameSaveData = {
            ...currentLocal,
            level: lvl.level,
            catName: userCatName,
            displayName: userCatName,
            catAvatar: user.photoURL || currentLocal.catAvatar || '/images/cat_avatars_webp/avatar_01.webp',
            username: user.username || currentLocal.username || '',
            lastSaved: Date.now(),
          };
          setData(enriched);
          saveGame(enriched);
          saveUserGame(user.username, enriched);
          await cloudSaveService.saveToCloud(user.uid, enriched);
          await leaderboardService.updateMyEntry({
            uid: user.uid,
            displayName: userCatName,
            catName: userCatName,
            username: user.username || '',
            photoURL: user.photoURL || enriched.catAvatar || '/images/cat_avatars_webp/avatar_01.webp',
            level: lvl.level,
            xp: enriched.xp || 0,
            rankTierKey: lvl.rankTier.key,
            rankTierName: lvl.rankTier.name,
            rankBadge: lvl.rankTier.badge,
            coins: enriched.fish || 0,
            biggestFishKg: enriched.biggestFishKg || 0,
            equippedSkin: enriched.equippedSkin || 'orange_tabby',
            catStageLabel: getCatGrowthStage(lvl.level).label,
            updatedAt: Date.now(),
          });
        }
      }
      // TUYỆT ĐỐI KHÔNG RESET DỮ LIỆU Ở ĐÂY KHI CHƯA ĐĂNG NHẬP HOẶC KHÁCH!
      // Người chơi luôn được giữ dữ liệu offline / localStorage nguyên vẹn.
    });
    return () => unsub();
  }, [loadUserDataFromCloud]);

  // Level & Cat Growth Stage Calculations
  const levelInfo = useMemo(() => {
    return calculateLevelFromTotalXp(data.xp);
  }, [data.xp]);

  const catStage = useMemo(() => {
    return getCatGrowthStage(levelInfo.level);
  }, [levelInfo.level]);

  // Sync with Firestore & Leaderboard (Luôn lấy dataRef.current mới nhất)
  const syncToCloud = useCallback(async (overrideUser?: UserProfileInfo, overrideData?: GameSaveData) => {
    const targetUser = overrideUser || currentUser || authService.getCurrentUser();
    if (!targetUser || targetUser.isAnonymous || !auth.currentUser) return;
    const targetData = overrideData || dataRef.current;
    const lvl = calculateLevelFromTotalXp(targetData.xp || 0);
    const stg = getCatGrowthStage(lvl.level);
    const userCatName = (targetUser.catName && targetUser.catName !== 'Mèo Cưng')
      ? targetUser.catName
      : (targetData.catName && targetData.catName !== 'Mèo Cưng')
      ? targetData.catName
      : (targetUser.displayName || targetData.catName || 'Mèo Cưng');

    if (dataRef.current.catName !== userCatName) {
      dataRef.current.catName = userCatName;
      dataRef.current.displayName = userCatName;
      setData((prev) => ({
        ...prev,
        catName: userCatName,
        displayName: userCatName,
      }));
    }

    const fullData: GameSaveData = {
      ...targetData,
      level: lvl.level,
      catName: userCatName,
      displayName: userCatName,
      username: targetUser.username || targetData.username || '',
      lastSaved: Date.now(),
    };

    await cloudSaveService.saveToCloud(targetUser.uid, fullData);
    await leaderboardService.updateMyEntry({
      uid: targetUser.uid,
      displayName: userCatName,
      catName: userCatName,
      username: targetUser.username || '',
      photoURL: targetUser.photoURL || fullData.catAvatar || '/images/cat_avatars_webp/avatar_01.webp',
      level: lvl.level,
      xp: fullData.xp || 0,
      rankTierKey: lvl.rankTier.key,
      rankTierName: lvl.rankTier.name,
      rankBadge: lvl.rankTier.badge,
      coins: fullData.fish || 0,
      biggestFishKg: fullData.biggestFishKg || 0,
      equippedSkin: fullData.equippedSkin || 'orange_tabby',
      catStageLabel: stg.label,
      updatedAt: Date.now(),
    });
  }, [currentUser]);

  // Tự động lưu tiến trình định kỳ mỗi 4 giây khi đang chơi (chỉ khi đã đăng nhập)
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;
    const interval = setInterval(() => {
      if (currentUser && !currentUser.isAnonymous && auth.currentUser) {
        syncToCloud();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentUser, syncToCloud]);

  // Tự động lưu lên Cloud khi người chơi đóng tab hoặc ẩn ứng dụng
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;

    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        syncToCloud();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && auth.currentUser) {
        syncToCloud();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, syncToCloud]);

  // Sync sound & music settings with soundManager
  useEffect(() => {
    soundManager.enabled = data.settings.soundEnabled;
    soundManager.sfxVolume = (data.settings.sfxVolume ?? 80) / 100;
    soundManager.musicEnabled = data.settings.musicEnabled ?? true;
    soundManager.musicVolume = (data.settings.musicVolume ?? 50) / 100;
  }, [
    data.settings.soundEnabled,
    data.settings.sfxVolume,
    data.settings.musicEnabled,
    data.settings.musicVolume,
  ]);

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

  // Auto-fish rate per second (Hardcore: Ngừng hoạt động hoàn toàn nếu mèo đói hoặc khát!)
  const autoFishRate = useMemo(() => {
    const isSatiated = (data.satietyExpiresAt || 0) > Date.now();
    // Nếu đói < 15% hoặc khát < 15% (và không có buff no lâu), mèo kiệt sức hoàn toàn, auto-fish dừng hẳn
    if (!isSatiated && (data.food < 15 || data.water < 15)) {
      return 0;
    }
    const rawRate = calculateAutoFishRate(speedyLevel, royalLevel, currentSkin.autoBonusMultiplier);
    let statusMult = 1.0;
    if (isSatiated || (data.food >= 70 && data.water >= 70)) {
      statusMult = 1.15;
    } else if (data.food < 40 || data.water < 40) {
      statusMult = 0.5;
    }
    return Math.floor(rawRate * statusMult);
  }, [speedyLevel, royalLevel, currentSkin.autoBonusMultiplier, data.food, data.water, data.satietyExpiresAt]);

  // Gradual food & water decay timer + auto-feed from active meal plan (Hao hụt theo mức chia thời gian của món ăn)
  useEffect(() => {
    const petTimer = setInterval(() => {
      setData((prev) => {
        const now = Date.now();
        const isZeroDecay = (prev.zeroDecayUntil || 0) > now;
        const isSatiated = (prev.satietyExpiresAt || 0) > now;

        let foodDecay = 0;
        let waterDecay = 0;

        if (isZeroDecay) {
          // Giai đoạn buff giữ 0% hao hụt (món cấp trung / cao)
          foodDecay = 0;
          waterDecay = 0;
        } else if (isSatiated) {
          // Tiêu hao theo tốc độ thực tế của món ăn đã nạp
          const naturalRate = 100 / 2700; // ~0.037%/s (100% trong 45 phút)
          let foodRate = prev.satietyFoodRate || naturalRate;
          let waterRate = prev.satietyWaterRate || naturalRate;

          // Fallback an toàn nếu dữ liệu lưu chưa có rate cụ thể
          if (!prev.satietyFoodRate) {
            if (prev.satietyFoodTier === 'high') {
              foodRate = 0.005; // ~0.3%/phút
              waterRate = 0.004;
            } else if (prev.satietyFoodTier === 'mid') {
              foodRate = 0.02; // ~1.2%/phút
              waterRate = 0.015;
            } else {
              foodRate = 0.045; // ~2.7%/phút
              waterRate = 0.04;
            }
          }

          if (prev.satietyDecayReduction && prev.satietyDecayReduction < 1) {
            foodRate *= prev.satietyDecayReduction;
            waterRate *= prev.satietyDecayReduction;
          }

          // Chu kỳ tick 5 giây
          foodDecay = foodRate * 5;
          waterDecay = waterRate * 5;
        } else {
          // Tự nhiên khi không có thức ăn duy trì: tiêu hao 100% trong 45 phút (2700 giây)
          const naturalRatePerSec = 100 / 2700;
          foodDecay = naturalRatePerSec * 5;
          waterDecay = naturalRatePerSec * 5;
        }

        // Bổ trợ giảm hao hụt từ Kỹ năng Dạ Dày Bền Bỉ (slow_metabolism)
        const metabolismReduction = getCatMetabolismReduction(prev.upgrades);
        if (metabolismReduction > 0) {
          foodDecay *= (1 - metabolismReduction);
          waterDecay *= (1 - metabolismReduction);
        }

        let newFood = Math.max(0, Math.round((prev.food - foodDecay) * 100) / 100);
        let newWater = Math.max(0, Math.round((prev.water - waterDecay) * 100) / 100);
        let activePlan = prev.activeMealPlan ? { ...prev.activeMealPlan } : null;

        // Tự động cho ăn nếu có gói kế hoạch dinh dưỡng và mèo đang đói hoặc khát (< 25%)
        if (activePlan && activePlan.autoFeedMealsRemaining > 0 && (newFood < 25 || newWater < 25)) {
          newFood = Math.min(100, newFood + 30);
          newWater = Math.min(100, newWater + 30);
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
    }, 5000); // 5 giây mỗi chu kỳ để thanh trạng thái mượt mà, trực quan

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

  // Handle Cat Click / Tap (Hardcore Balance: Đói hoặc Khát < 15% sẽ không nhận được xu!)
  // Cơ chế chống auto-click: Mèo mệt sau 10 lần vuốt ve liên tiếp, cần 10s hồi sức
  const handleClick = useCallback(
    (clientX?: number, clientY?: number): {
      earned: number;
      isTired?: boolean;
      remainingCooldownSec?: number;
      currentStamina?: number;
      maxStamina?: number;
    } => {
      const now = Date.now();
      const MAX_STAMINA = 10;
      const RECOVERY_MS = 10000; // 10s hồi phục

      // 1. Chống auto-clicker spam siêu tốc (< 130ms giữa 2 lần click)
      if (now - lastPetClickTimeRef.current < 130) {
        return {
          earned: 0,
          isTired: now < petTiredUntilRef.current,
          remainingCooldownSec: Math.max(1, Math.ceil((petTiredUntilRef.current - now) / 1000)),
          currentStamina: petStaminaRef.current,
          maxStamina: MAX_STAMINA,
        };
      }
      lastPetClickTimeRef.current = now;

      // 2. Kiểm tra nếu Mèo đang trong thời gian nghỉ ngơi hồi sức vì bị vuốt ve liên tục
      if (now < petTiredUntilRef.current) {
        const remainingSec = Math.max(1, Math.ceil((petTiredUntilRef.current - now) / 1000));
        soundManager.playPop(0.65);
        if (data.settings.hapticsEnabled) {
          soundManager.triggerHaptic(15);
        }

        if (clientX !== undefined && clientY !== undefined) {
          const floatId = `float_pet_tired_${now}_${Math.random()}`;
          setFloatingItems((prev) => [
            ...prev.slice(-15),
            {
              id: floatId,
              x: clientX,
              y: clientY,
              text: `💤 Boss mệt rồi (${remainingSec}s)`,
              isCrit: false,
              fishImage: '',
              fishName: 'Mèo đang hồi sức...',
              rarityColor: '#9CA3AF',
            },
          ]);
        }

        return {
          earned: 0,
          isTired: true,
          remainingCooldownSec: remainingSec,
          currentStamina: 0,
          maxStamina: MAX_STAMINA,
        };
      }

      // Nếu đã qua thời gian hồi sức, phục hồi lại thể lực đầy đủ
      if (petTiredUntilRef.current > 0 && now >= petTiredUntilRef.current) {
        petTiredUntilRef.current = 0;
        petStaminaRef.current = MAX_STAMINA;
      }

      // Xoá bộ đếm nghỉ tay trước đó
      if (petIdleTimerRef.current) {
        clearTimeout(petIdleTimerRef.current);
      }

      // 3. Giảm thể lực sau mỗi lần vuốt ve liên tiếp
      petStaminaRef.current = Math.max(0, petStaminaRef.current - 1);

      // Nếu thể lực chạm 0: MÈO BỊ MỆT SAU 10 LẦN CLICK LIÊN TIẾP!
      if (petStaminaRef.current <= 0) {
        petTiredUntilRef.current = now + RECOVERY_MS;
        soundManager.playPop(0.6);
        if (data.settings.hapticsEnabled) {
          soundManager.triggerHaptic(30);
        }

        if (clientX !== undefined && clientY !== undefined) {
          const floatId = `float_pet_tired_${now}_${Math.random()}`;
          setFloatingItems((prev) => [
            ...prev.slice(-15),
            {
              id: floatId,
              x: clientX,
              y: clientY,
              text: `😿 Boss bị cù lét mệt rồi! Nghỉ 10s nhé...`,
              isCrit: false,
              fishImage: '',
              fishName: 'Nựng quá nhiều meow~',
              rarityColor: '#EF4444',
            },
          ]);
        }

        return {
          earned: 0,
          isTired: true,
          remainingCooldownSec: 10,
          currentStamina: 0,
          maxStamina: MAX_STAMINA,
        };
      }

      // Tự động phục hồi thể lực đầy cây nếu người chơi dừng vuốt ve trong 3 giây
      petIdleTimerRef.current = setTimeout(() => {
        petStaminaRef.current = MAX_STAMINA;
      }, 3000);

      // 4. Nếu mèo chưa mệt: tính toán nhận xu và hiệu ứng như bình thường
      const isSatiated = (data.satietyExpiresAt || 0) > Date.now();
      const isExhausted = !isSatiated && (data.food < 15 || data.water < 15);
      const hungerFactor = (isSatiated || (data.food >= 60 && data.water >= 60)) ? 1.0 : 0.6;
      const critBonus = getCatCritChance(data.upgrades);
      const isCrit = !isExhausted && Math.random() < (0.05 + critBonus + (isFrenzy ? 0.12 : 0));
      const critMultiplier = isCrit ? 1.5 : 1.0;

      // Nếu đói khát kiệt sức: 0 xu thưởng! Bắt buộc phải cho ăn uống
      const earned = isExhausted
        ? 0
        : Math.max(1, Math.round(baseClickPower * comboMultiplier * hungerFactor * critMultiplier));

      // 2. Play sound (pitch elevates with combo & crit)
      const pitch = isExhausted ? 0.7 : Math.min(1.8, 1.0 + comboCount * 0.012 + (isCrit ? 0.25 : 0));
      soundManager.playPop(pitch);
      if (isCrit) {
        soundManager.playUpgrade();
      }

      if (data.settings.hapticsEnabled) {
        soundManager.triggerHaptic(isCrit || isFrenzy ? 30 : 12);
      }

      // 3. Animate cat open mouth / happy expression (160ms duration)
      setIsCatActive(true);
      if (catActiveTimerRef.current) clearTimeout(catActiveTimerRef.current);
      catActiveTimerRef.current = setTimeout(() => {
        setIsCatActive(false);
      }, 160);

      // 4. Update combo streak (Cửa sổ combo ngắn hơn, đòi hỏi nhịp gõ chuẩn xác)
      if (!isExhausted) {
        setComboCount((prev) => prev + 1);
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        const comboDuration = 1400 + comboUpgradeLevel * 200; // 1.4s cơ bản (thay vì 2.2s)
        comboTimerRef.current = setTimeout(() => {
          setComboCount(0);
        }, comboDuration);
      } else {
        setComboCount(0);
      }

      // 5. Update coins & physical energy (Khi có hiệu ứng No Lâu: 0% hao hụt! Khi bình thường: chỉ 0.005% mỗi click)
      setData((prev) => {
        const newFish = prev.fish + earned;
        const newTotal = prev.totalFish + earned;
        const newHighest = Math.max(prev.highestFish, newFish);
        const isSatiated = (prev.satietyExpiresAt || 0) > Date.now();
        const clickDrain = isSatiated ? 0 : 0.005;
        return {
          ...prev,
          fish: newFish,
          coins: newFish,
          totalFish: newTotal,
          totalCoinsEarned: (prev.totalCoinsEarned || 0) + earned,
          highestFish: newHighest,
          totalClicks: prev.totalClicks + 1,
          food: Math.max(0, Math.round((prev.food - clickDrain) * 1000) / 1000),
          water: Math.max(0, Math.round((prev.water - clickDrain) * 1000) / 1000),
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
            text: isExhausted
              ? '0 Xu Kiệt sức!'
              : isCrit
              ? `+${earned} Xu CRIT! (${petStaminaRef.current}/${MAX_STAMINA}⚡)`
              : `+${earned} Xu (${petStaminaRef.current}/${MAX_STAMINA}⚡)`,
            isCrit: isCrit || isFrenzy,
            fishImage: '',
            fishName: isExhausted ? '😿 Mèo đói lả / Khát khô!' : isCrit ? '💖 Siêu cưng!' : '🐾 Vuốt ve',
            rarityColor: isExhausted ? '#EF4444' : '#FF69B4',
          },
        ]);

        if (data.settings.particlesEnabled && !isExhausted) {
          const sparkColors = ['#FFD700', '#FFA07A', '#FF69B4', '#87CEFA', '#FFF'];
          const newSparks: SparkleItem[] = Array.from({ length: 3 }).map(() => ({
            id: `spark_${Date.now()}_${Math.random()}`,
            x: clientX,
            y: clientY,
            color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            vx: (Math.random() - 0.5) * 50,
            vy: -25 - Math.random() * 35,
          }));
          setSparkles((prev) => [...prev.slice(-25), ...newSparks]);
        }
      }

      return {
        earned,
        isTired: false,
        remainingCooldownSec: 0,
        currentStamina: petStaminaRef.current,
        maxStamina: MAX_STAMINA,
      };
    },
    [baseClickPower, comboCount, comboUpgradeLevel, data.settings, data.food, data.water, data.satietyExpiresAt, isFrenzy, comboMultiplier]
  );

  // Chơi đùa với đồ chơi trong phòng: có tỉ lệ nhận xu (mỗi loại đồ chơi có tỉ lệ khác nhau)
  // Cơ chế chống auto click: Mèo chơi tối đa 8 lần liên tiếp, sau đó sẽ mệt mỏi và cần 12s hồi sức
  const playWithToy = useCallback(
    (
      toyId: string,
      clientX?: number,
      clientY?: number
    ): {
      gainedCoins: number;
      success: boolean;
      ratePercent: number;
      toyName: string;
      isTired?: boolean;
      remainingCooldownSec?: number;
      currentStamina?: number;
      maxStamina?: number;
    } => {
      const toy = getFashionItemById(toyId);
      const toyName = toy?.name || 'Đồ chơi';
      const config = getToyRewardConfig(toy);
      const now = Date.now();
      const MAX_STAMINA = 8;
      const RECOVERY_MS = 12000; // 12 giây nghỉ ngơi để mèo hồi sức

      // 1. Chống auto-clicker spam siêu tốc (< 250ms giữa 2 lần click)
      if (now - lastToyClickTimeRef.current < 250) {
        return {
          gainedCoins: 0,
          success: false,
          ratePercent: config.ratePercent,
          toyName,
          isTired: now < toyTiredUntilRef.current,
          remainingCooldownSec: Math.max(1, Math.ceil((toyTiredUntilRef.current - now) / 1000)),
          currentStamina: toyStaminaRef.current,
          maxStamina: MAX_STAMINA,
        };
      }
      lastToyClickTimeRef.current = now;

      // 2. Kiểm tra nếu Mèo đang trong thời gian nghỉ ngơi hồi sức
      if (now < toyTiredUntilRef.current) {
        const remainingSec = Math.max(1, Math.ceil((toyTiredUntilRef.current - now) / 1000));
        soundManager.playPop(0.65);
        if (data.settings.hapticsEnabled) {
          soundManager.triggerHaptic(15);
        }

        if (clientX !== undefined && clientY !== undefined) {
          const floatId = `float_toy_tired_${now}_${Math.random()}`;
          setFloatingItems((prev) => [
            ...prev.slice(-15),
            {
              id: floatId,
              x: clientX,
              y: clientY,
              text: `💤 Boss đang nghỉ (${remainingSec}s)`,
              isCrit: false,
              fishImage: '',
              fishName: 'Mèo đang hồi sức...',
              rarityColor: '#9CA3AF',
            },
          ]);
        }

        return {
          gainedCoins: 0,
          success: false,
          ratePercent: config.ratePercent,
          toyName,
          isTired: true,
          remainingCooldownSec: remainingSec,
          currentStamina: 0,
          maxStamina: MAX_STAMINA,
        };
      }

      // Nếu đã qua thời gian hồi sức, phục hồi lại thể lực đầy đủ
      if (toyTiredUntilRef.current > 0 && now >= toyTiredUntilRef.current) {
        toyTiredUntilRef.current = 0;
        toyStaminaRef.current = MAX_STAMINA;
      }

      // Xoá bộ đếm nghỉ tay trước đó
      if (toyIdleTimerRef.current) {
        clearTimeout(toyIdleTimerRef.current);
      }

      // 3. Giảm thể lực sau mỗi lần nhấp chơi đồ chơi
      toyStaminaRef.current = Math.max(0, toyStaminaRef.current - 1);

      // Nếu thể lực chạm 0: MÈO BỊ MỆT SAU 8 LẦN CLICK LIÊN TIẾP!
      if (toyStaminaRef.current <= 0) {
        toyTiredUntilRef.current = now + RECOVERY_MS;
        soundManager.playPop(0.6);
        if (data.settings.hapticsEnabled) {
          soundManager.triggerHaptic(30);
        }

        if (clientX !== undefined && clientY !== undefined) {
          const floatId = `float_toy_tired_${now}_${Math.random()}`;
          setFloatingItems((prev) => [
            ...prev.slice(-15),
            {
              id: floatId,
              x: clientX,
              y: clientY,
              text: `😿 Boss mệt rồi! Nghỉ 12s nhé...`,
              isCrit: false,
              fishImage: '',
              fishName: 'Chơi quá sức meow~',
              rarityColor: '#EF4444',
            },
          ]);
        }

        return {
          gainedCoins: 0,
          success: false,
          ratePercent: config.ratePercent,
          toyName,
          isTired: true,
          remainingCooldownSec: 12,
          currentStamina: 0,
          maxStamina: MAX_STAMINA,
        };
      }

      // Tự động phục hồi thể lực đầy cây nếu người chơi dừng chơi trong 3.5 giây
      toyIdleTimerRef.current = setTimeout(() => {
        toyStaminaRef.current = MAX_STAMINA;
      }, 3500);

      // 4. Nếu mèo chưa mệt: tính tỉ lệ nhận thưởng đồ chơi bình thường
      const roll = Math.random();
      const isSuccess = roll < config.rate;
      let gained = 0;

      if (isSuccess) {
        gained = config.maxCoins > 1 && Math.random() < 0.25 ? config.maxCoins : config.coinAmount;
        soundManager.playCatchFish();
        if (data.settings.hapticsEnabled) {
          soundManager.triggerHaptic(25);
        }
        setData((prev) => {
          const newCoins = prev.fish + gained;
          return {
            ...prev,
            fish: newCoins,
            coins: newCoins,
            totalFish: prev.totalFish + gained,
            totalCoinsEarned: (prev.totalCoinsEarned || 0) + gained,
          };
        });

        if (clientX !== undefined && clientY !== undefined) {
          const floatId = `float_toy_${now}_${Math.random()}`;
          setFloatingItems((prev) => [
            ...prev.slice(-15),
            {
              id: floatId,
              x: clientX,
              y: clientY,
              text: `+${gained} Xu`,
              isCrit: gained > 1,
              fishImage: toy?.image || '',
              fishName: `Chơi ${toyName} (${toyStaminaRef.current}/8⚡)`,
              rarityColor: '#F59E0B',
            },
          ]);
        }
      } else {
        soundManager.playPop(1.35);
        if (data.settings.hapticsEnabled) {
          soundManager.triggerHaptic(10);
        }
      }

      // Biểu cảm vui tươi của mèo khi vờn đồ chơi
      setIsCatActive(true);
      if (catActiveTimerRef.current) clearTimeout(catActiveTimerRef.current);
      catActiveTimerRef.current = setTimeout(() => {
        setIsCatActive(false);
      }, 180);

      return {
        gainedCoins: gained,
        success: isSuccess,
        ratePercent: config.ratePercent,
        toyName,
        isTired: false,
        currentStamina: toyStaminaRef.current,
        maxStamina: MAX_STAMINA,
      };
    },
    [data.settings.hapticsEnabled]
  );

  // Feed Cat directly
  const feedCat = useCallback((amount: number = 25) => {
    setData((prev) => {
      if (prev.food >= 100) return prev;
      soundManager.playEat();
      const currentSkinObj = SKINS.find((s) => s.id === prev.equippedSkin) || SKINS[0];
      setTimeout(() => {
        soundManager.playCatMeow(currentSkinObj.sound);
      }, 180);
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

      // Thưởng XP thăng cấp khi bắt cá (Hardcore: căn bậc 2 trọng lượng, tăng trưởng chậm & chống lạm phát)
      const gainedXp = Math.max(
        1,
        Math.round(Math.sqrt(caughtItem.weightKg) * 2.2 * (species.difficultyLevel || 1))
      );
      // Chống lạm phát: Không thưởng xu trùng lặp tức thì, toàn bộ tiền nhận khi bán tại Giỏ Cá!

      setData((prev) => {
        const safeBasket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
        const maxCapacity = getBasketCapacity(prev.upgrades);
        const newBasket = [caughtItem, ...safeBasket].slice(0, maxCapacity); // Giữ tối đa theo sức chứa giỏ
        const newBiggest = Math.max(prev.biggestFishKg || 0, caughtItem.weightKg);
        const newTotalCaught = (prev.totalFishCaught || 0) + 1;
        const newCoins = prev.fish;
        const newXp = (prev.xp || 0) + gainedXp;

        return {
          ...prev,
          fish: newCoins,
          coins: newCoins,
          xp: newXp,
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

  // Bán 1 con cá trong giỏ lấy tiền (áp dụng kỹ năng fish_appraiser)
  const sellFish = useCallback((instanceId: string): number => {
    let earned = 0;
    setData((prev) => {
      const basket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
      const idx = basket.findIndex((f) => f.instanceId === instanceId);
      if (idx === -1) return prev;
      const target = basket[idx];
      const sellMult = getFishSellMultiplier(prev.upgrades);
      earned = Math.round(target.sellPrice * sellMult);
      const newBasket = basket.filter((_, i) => i !== idx);
      const newCoins = (prev.fish || 0) + earned;

      soundManager.playSellFish();
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

  // Bán tất cả cá trong giỏ (áp dụng kỹ năng fish_appraiser)
  const sellAllFish = useCallback((): { count: number; totalEarned: number } => {
    let count = 0;
    let totalEarned = 0;
    setData((prev) => {
      const basket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
      if (basket.length === 0) return prev;
      count = basket.length;
      const sellMult = getFishSellMultiplier(prev.upgrades);
      totalEarned = Math.round(basket.reduce((sum, f) => sum + f.sellPrice, 0) * sellMult);
      const newCoins = (prev.fish || 0) + totalEarned;

      soundManager.playSellFish();
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

  // Mua thức ăn vào túi theo số lượng (x1, x5, x10,...) (áp dụng shop_discount)
  const buyFoodToInventory = useCallback(
    (foodItem: FoodItem, quantity: number = 1): boolean => {
      const qty = Math.max(1, Math.floor(quantity));
      let success = false;

      setData((prev) => {
        const discountMult = getShopDiscountMultiplier(prev.upgrades);
        const totalCost = Math.max(1, Math.round(foodItem.price * qty * discountMult));
        if (prev.fish < totalCost) {
          return prev;
        }
        success = true;
        soundManager.playPurchaseSuccess();
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
      satietyMinutesAdded?: number;
      satietyDecayReduction?: number;
    } => {
      let result = {
        success: false,
        restoredFood: 0,
        restoredWater: 0,
        gainedXp: 0,
        satietyMinutesAdded: 0,
        satietyDecayReduction: 1.0,
      };

      const qty = Math.max(1, Math.floor(quantity));

      setData((prev) => {
        const inventory = prev.foodInventory || {};
        const available = inventory[foodItem.id] || 0;
        if (available < qty) {
          return prev;
        }

        soundManager.playEat();
        const currentSkinObj = SKINS.find((s) => s.id === prev.equippedSkin) || SKINS[0];
        setTimeout(() => {
          soundManager.playCatMeow(currentSkinObj.sound);
        }, 180);
        if (data.settings.hapticsEnabled) soundManager.triggerHaptic(35);

        // Thưởng XP dinh dưỡng chuẩn từ món ăn (không nhân hệ số richness để chống lạm phát)
        const baseFoodRestore = foodItem.foodRestore * qty;
        const baseWaterRestore = foodItem.waterRestore * qty;
        const totalXp = Math.round(foodItem.xpReward * qty);

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

        // Tính toán hiệu ứng No Lâu (Satiety): cộng dồn thời gian (tối đa 24 giờ)
        const itemSatietyMins = foodItem.satietyMinutes || 8;
        const itemReduction = foodItem.satietyDecayReduction ?? 1.0;
        const addedDurationMs = itemSatietyMins * 60 * 1000 * qty;

        const now = Date.now();
        const currentExpiry = Math.max(now, prev.satietyExpiresAt || 0);
        const newExpiry = Math.min(now + 24 * 3600 * 1000, currentExpiry + addedDurationMs);
        const currentTotalMs = (prev.satietyExpiresAt && prev.satietyExpiresAt > now)
          ? (prev.satietyTotalDurationMs || (prev.satietyExpiresAt - now))
          : 0;
        const newTotalDurationMs = Math.min(24 * 3600 * 1000, currentTotalMs + addedDurationMs);

        // Tính buff 0% hao hụt (zeroDecayMinutes cho cấp trung và cấp cao)
        let newZeroDecayUntil = (prev.zeroDecayUntil && prev.zeroDecayUntil > now) ? prev.zeroDecayUntil : 0;
        if (foodItem.zeroDecayMinutes && foodItem.zeroDecayMinutes > 0) {
          const addedZeroMs = foodItem.zeroDecayMinutes * 60 * 1000 * qty;
          const currentZero = Math.max(now, prev.zeroDecayUntil || 0);
          newZeroDecayUntil = Math.min(now + 3 * 3600 * 1000, currentZero + addedZeroMs);
        }

        // Lấy tỷ lệ giảm tốt nhất (giá trị nhỏ hơn là giảm nhiều hơn)
        const prevReduction = (prev.satietyExpiresAt && prev.satietyExpiresAt > now)
          ? (prev.satietyDecayReduction ?? 1)
          : 1;
        const bestReduction = Math.min(prevReduction, itemReduction);

        // TÍNH TỐC ĐỘ TIÊU HAO CHUẨN XÁC THEO THÔNG SỐ CỦA MÓN ĂN:
        const itemZeroMins = foodItem.zeroDecayMinutes || 0;
        const activeMins = Math.max(1, itemSatietyMins - itemZeroMins);
        const activeSec = activeMins * 60;
        const naturalRate = 100 / 2700; // Tiêu hao tự nhiên nhẹ nhàng (~0.037%/s = 100% trong 45p)

        // Tốc độ tiêu hao thức ăn (%/giây):
        // Nếu món ăn nạp thức ăn (foodRestore > 0): chia đều cho thời gian của món ăn
        let newFoodRate = prev.satietyFoodRate || naturalRate;
        if (foodItem.foodRestore > 0) {
          const targetRate = (foodItem.foodRestore / activeSec) * bestReduction;
          newFoodRate = (prev.satietyExpiresAt && prev.satietyExpiresAt > now && prev.satietyFoodRate)
            ? Math.min(prev.satietyFoodRate, targetRate)
            : targetRate;
        }

        // Tốc độ tiêu hao nước (%/giây):
        // Nếu món ăn nạp nước (waterRestore > 0): chia đều cho thời gian của món ăn
        let newWaterRate = prev.satietyWaterRate || naturalRate;
        if (foodItem.waterRestore > 0) {
          const targetRate = (foodItem.waterRestore / activeSec) * bestReduction;
          newWaterRate = (prev.satietyExpiresAt && prev.satietyExpiresAt > now && prev.satietyWaterRate)
            ? Math.min(prev.satietyWaterRate, targetRate)
            : targetRate;
        }

        result = {
          success: true,
          restoredFood: newFood - prev.food,
          restoredWater: newWater - prev.water,
          gainedXp: totalXp,
          satietyMinutesAdded: itemSatietyMins * qty,
          satietyDecayReduction: bestReduction,
        };

        return {
          ...prev,
          food: newFood,
          water: newWater,
          xp: newXp,
          level: nextLevel,
          foodInventory: newInventory,
          satietyExpiresAt: newExpiry,
          satietyTotalDurationMs: newTotalDurationMs,
          zeroDecayUntil: newZeroDecayUntil,
          satietyDecayReduction: bestReduction,
          satietyFoodRate: newFoodRate,
          satietyWaterRate: newWaterRate,
          satietyFoodName: foodItem.name,
          satietyFoodTier: foodItem.tier,
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
      const currentSkinObj = SKINS.find((s) => s.id === prev.equippedSkin) || SKINS[0];
      setTimeout(() => {
        soundManager.playCatMeow(currentSkinObj.sound);
      }, 180);
      soundManager.playPurchaseSuccess();
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

      const planHours = plan.id === 'plan_royal_7d' ? 168 : plan.id === 'plan_growth_3d' ? 72 : 24;
      const planSatietyMs = planHours * 3600 * 1000;

      return {
        ...prev,
        fish: newCoins,
        coins: newCoins,
        food: newFood,
        water: newWater,
        xp: newXp,
        level: nextLevel,
        activeMealPlan: activePlanInfo,
        satietyExpiresAt: Math.max(prev.satietyExpiresAt || 0, Date.now() + planSatietyMs),
        satietyTotalDurationMs: Math.max(prev.satietyTotalDurationMs || 0, planSatietyMs),
        satietyDecayReduction: 0.35,
        satietyFoodRate: 0.008,
        satietyWaterRate: 0.008,
        satietyFoodName: plan.name,
        satietyFoodTier: 'high',
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

        // Nếu đã sở hữu cần này: đổi cần miễn phí hoặc sửa cần khi hỏng
        if (currentUnlocked.includes(rod.id)) {
          const isBroken = prev.equippedRodId === rod.id && (prev.rodDurability ?? 10) <= 0;
          if (isBroken) {
            const rawRepairCost = rod.repairPrice ?? rod.repairCost ?? getRodRepairCost(rod);
            const discountMult = getShopDiscountMultiplier(prev.upgrades);
            const repairCost = Math.round(rawRepairCost * discountMult);
            if (repairCost > 0 && prev.fish < repairCost) {
              res = { success: false, message: `Không đủ xu để sửa cần (${formatNumber(repairCost)} xu)!` };
              return prev;
            }
            soundManager.playPurchaseSuccess();
            const newCoins = prev.fish - repairCost;
            res = { success: true, message: `Đã sửa ${rod.name} (${rod.maxDurability}/${rod.maxDurability} lượt) với giá ${formatNumber(repairCost)} xu!` };
            return {
              ...prev,
              fish: newCoins,
              coins: newCoins,
              equippedRodId: rod.id,
              rodDurability: rod.maxDurability,
            };
          }

          soundManager.playUpgrade();
          res = { success: true, message: `Đã đổi sang ${rod.name}!` };
          return {
            ...prev,
            equippedRodId: rod.id,
            rodDurability: prev.equippedRodId === rod.id ? (prev.rodDurability ?? rod.maxDurability) : rod.maxDurability,
            unlockedRods: updatedUnlocked,
          };
        }

        if (prev.fish < rod.price) {
          res = { success: false, message: `Không đủ xu để mua ${rod.name}!` };
          return prev;
        }

        soundManager.playPurchaseSuccess();
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

  // Giảm độ bền của cần sau mỗi lần quăng (áp dụng cơ hội bảo toàn từ rod_care)
  const useRodDurability = useCallback((): number => {
    let remaining = 0;
    setData((prev) => {
      const current = typeof prev.rodDurability === 'number' ? prev.rodDurability : 10;
      const saveChance = getRodDurabilitySaveChance(prev.upgrades);
      if (saveChance > 0 && Math.random() < saveChance) {
        // May mắn bảo toàn độ bền cần câu!
        remaining = current;
        return prev;
      }
      remaining = Math.max(0, current - 1);
      return {
        ...prev,
        rodDurability: remaining,
      };
    });
    return remaining;
  }, []);

  // Nhận Quà Nước Miễn Phí (12 tiếng hồi chiêu một lần, nhận 2 nước)
  const FREE_WATER_COOLDOWN_MS = 12 * 60 * 60 * 1000;
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

      // Claim success: Tặng 2 Nước miễn phí (hồi nước lên 70% + cộng 2 bình vào túi đồ ăn!)
      soundManager.playUnlock();
      soundManager.playDrink();
      if (data.settings.hapticsEnabled) soundManager.triggerHaptic(40);

      const currentWaterBottles = (prev.foodInventory && prev.foodInventory['09_sua']) || 0;
      const newInventory = {
        ...(prev.foodInventory || {}),
        '09_sua': currentWaterBottles + 2,
      };

      result = {
        success: true,
        message: '🎉 Nhận thành công 2 Nước Miễn Phí! Nước hồi 70% và nhận thêm 2 bình vào kho!',
        remainingMs: FREE_WATER_COOLDOWN_MS,
        gainedWater: 2,
      };

      return {
        ...prev,
        water: Math.max(prev.water, 70),
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

        soundManager.playPurchaseSuccess();
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
          res = { success: true, message: `Đã mua và đội ${item.name}! ` };
        } else if (item.category === 'clothes') {
          const owned = prev.ownedClothes || [];
          const newOwned = owned.includes(item.id) ? owned : [...owned, item.id];
          updatedPrev = {
            ...updatedPrev,
            ownedClothes: newOwned,
            equippedClothes: item.id,
          };
          res = { success: true, message: `Đã mua và mặc ${item.name}! ` };
        } else {
          // bowls, balls, rugs, rooms
          const owned = prev.ownedRoomDecor || ['bowl_clay', 'ball_yarn_red', 'rug_peach', 'room_go_co_dien'];
          const newOwned = owned.includes(item.id) ? owned : [...owned, item.id];
          const prevDecor = prev.equippedDecor || { bowl: 'bowl_clay', ball: 'ball_yarn_red', balls: ['ball_yarn_red'], rug: 'rug_peach', room: 'room_go_co_dien' };
          
          let newEquippedDecor = { ...prevDecor };
          if (item.category === 'balls') {
            let currentBalls = Array.isArray(prevDecor.balls) && prevDecor.balls.length > 0
              ? [...prevDecor.balls]
              : [prevDecor.ball || 'ball_yarn_red'];
            if (!currentBalls.includes(item.id)) {
              if (currentBalls.length < 3) {
                currentBalls.push(item.id);
              } else {
                currentBalls = [...currentBalls.slice(1), item.id];
              }
            }
            newEquippedDecor.ball = currentBalls[0] || item.id;
            newEquippedDecor.balls = currentBalls;
          } else {
            const slotKey = item.category === 'bowls' ? 'bowl' : item.category === 'rooms' ? 'room' : 'rug';
            newEquippedDecor[slotKey] = item.id;
          }

          updatedPrev = {
            ...updatedPrev,
            ownedRoomDecor: newOwned,
            equippedDecor: newEquippedDecor,
          };
          res = {
            success: true,
            message: item.category === 'rooms'
              ? `Đã mở khóa và chuyển sang ${item.name}! 🏡`
              : item.category === 'balls'
              ? `Đã mua và gắn đồ chơi ${item.name} lên phòng mèo (tối đa 3 món)! 🧸`
              : `Đã mua và đặt ${item.name} tại sảnh phòng! 🛋️`,
          };
        }

        return updatedPrev;
      });

      return res;
    },
    [data.settings.hapticsEnabled]
  );

  // Trang bị / Đổi Mũ, Áo hoặc Đồ Trang Trí Phòng (Máng ăn, 3 Đồ chơi, Thảm, Phòng Nền)
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
      } else if (item.category === 'balls') {
        const prevDecor = prev.equippedDecor || { bowl: 'bowl_clay', ball: 'ball_yarn_red', balls: ['ball_yarn_red'], rug: 'rug_peach', room: 'room_go_co_dien' };
        let currentBalls = Array.isArray(prevDecor.balls) && prevDecor.balls.length > 0
          ? [...prevDecor.balls]
          : [prevDecor.ball || 'ball_yarn_red'];
        
        if (currentBalls.includes(item.id)) {
          // Tháo đồ chơi ra nếu đã có từ 2 món trở lên
          if (currentBalls.length > 1) {
            currentBalls = currentBalls.filter((id) => id !== item.id);
          }
        } else {
          // Thêm đồ chơi vào phòng mèo (tối đa 3 món)
          if (currentBalls.length < 3) {
            currentBalls.push(item.id);
          } else {
            currentBalls = [...currentBalls.slice(1), item.id];
          }
        }
        updatedPrev = {
          ...updatedPrev,
          equippedDecor: {
            ...prevDecor,
            ball: currentBalls[0] || 'ball_yarn_red',
            balls: currentBalls,
          },
        };
      } else {
        const slotKey = item.category === 'bowls' ? 'bowl' : item.category === 'rooms' ? 'room' : 'rug';
        const prevDecor = prev.equippedDecor || { bowl: 'bowl_clay', ball: 'ball_yarn_red', balls: ['ball_yarn_red'], rug: 'rug_peach', room: 'room_go_co_dien' };
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

  // Buy Upgrade (với giới hạn maxLevel & hệ số giá riêng)
  const buyUpgrade = useCallback((upgradeId: string) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return false;

    let success = false;
    setData((prev) => {
      const currentLevel = prev.upgrades[upgradeId] || 0;
      if (currentLevel >= upgrade.maxLevel) return prev; // Đã đạt cấp tối đa!

      const cost = calculateUpgradeCost(upgrade.baseCost, currentLevel, upgrade.costMultiplier || 1.65);
      if (prev.fish < cost) return prev; // Not enough fish

      success = true;
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

      soundManager.playPurchaseSuccess();
      return {
        ...prev,
        fish: newFish,
        upgrades: newUpgrades,
        unlockedSkins: newUnlockedSkins,
      };
    });
    return success;
  }, []);

  // Unlock Skin
  const unlockSkin = useCallback((skinId: string) => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return false;

    setData((prev) => {
      if (prev.unlockedSkins.includes(skinId)) return prev;
      if (prev.fish < skin.unlockCost) return prev;

      soundManager.playPurchaseSuccess();
      setTimeout(() => {
        soundManager.playCatMeow(skin.sound);
      }, 250);
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
      const targetSkin = SKINS.find((s) => s.id === skinId);
      soundManager.playCatMeow(targetSkin?.sound);
      return {
        ...prev,
        equippedSkin: skinId,
      };
    });
  }, []);

  // Catch Golden Fish Event: Nhận xu + 2 Cá Vàng vào Túi/Balo
  const catchGoldenFish = useCallback((bonusFish: number) => {
    soundManager.playGoldenFish();
    const goldenSpecies = FISH_CATALOG.find((f) => f.id === 'ca_chep_vang') || FISH_CATALOG[8];
    // Random kích thước từ 0.2kg đến 0.9kg (luôn <= 1kg theo yêu cầu)
    const weight1 = +(0.2 + Math.random() * 0.7).toFixed(1);
    const weight2 = +(0.2 + Math.random() * 0.7).toFixed(1);

    const fish1: CaughtFishItem = {
      ...createCaughtFish(goldenSpecies),
      instanceId: `golden_${Date.now()}_1`,
      name: 'Cá Vàng May Mắn',
      weightKg: weight1,
      difficultyLabel: 'May Mắn (Nhỏ)',
      rarity: 'legendary',
      rarityLabel: 'May Mắn ✨',
      rarityColor: '#F59E0B',
      sellPrice: Math.max(120, Math.round(weight1 * 250 + 100)),
    };
    const fish2: CaughtFishItem = {
      ...createCaughtFish(goldenSpecies),
      instanceId: `golden_${Date.now()}_2`,
      name: 'Cá Vàng May Mắn',
      weightKg: weight2,
      difficultyLabel: 'May Mắn (Nhỏ)',
      rarity: 'legendary',
      rarityLabel: 'May Mắn ✨',
      rarityColor: '#F59E0B',
      sellPrice: Math.max(120, Math.round(weight2 * 250 + 100)),
    };

    setData((prev) => {
      const currentBasket = Array.isArray(prev.fishBasket) ? prev.fishBasket : [];
      const newFish = prev.fish + bonusFish;
      const newTotal = prev.totalFish + bonusFish;
      const newHighest = Math.max(prev.highestFish, newFish);
      return {
        ...prev,
        fish: newFish,
        totalFish: newTotal,
        highestFish: newHighest,
        fishBasket: [fish1, fish2, ...currentBasket],
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

  // Update User Profile Cat Avatar
  const updateUserAvatar = useCallback(async (photoURL: string) => {
    await authService.updateUserAvatar(photoURL);
    setData((prev) => ({
      ...prev,
      catAvatar: photoURL,
      lastSaved: Date.now(),
    }));
    setCurrentUser((prev) => (prev ? { ...prev, photoURL } : {
      uid: 'guest_local',
      email: null,
      displayName: 'Mèo Cưng',
      catName: 'Mèo Cưng',
      username: '',
      isAnonymous: true,
      photoURL,
    }));
  }, []);

  // Update Cat Name (Đổi tên Mèo Cưng)
  const updateCatName = useCallback(async (newName: string) => {
    const updated = await authService.updateCatName(newName);
    setData((prev) => {
      const next = {
        ...prev,
        catName: updated,
        lastSaved: Date.now(),
      };
      saveGame(next);
      return next;
    });
    setCurrentUser((prev) => (prev ? { ...prev, displayName: updated, catName: updated } : null));
    soundManager.playUnlock();
    return updated;
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

  // Đăng xuất và lưu an toàn toàn bộ dữ liệu game
  const logoutGame = useCallback(async () => {
    const activeUser = currentUser || authService.getCurrentUser();
    const latestData = dataRef.current;

    // 1. Sao lưu cục bộ tài khoản trước khi đăng xuất
    if (activeUser?.username) {
      saveUserGame(activeUser.username, latestData);
    }

    // 2. Tự động lưu toàn bộ dữ liệu hiện tại lên Cloud TRƯỚC KHI đăng xuất (nếu có tài khoản Firebase)
    if (activeUser && !activeUser.isAnonymous && auth.currentUser && auth.currentUser.uid === activeUser.uid && !activeUser.uid.startsWith('local_')) {
      try {
        const lvl = calculateLevelFromTotalXp(latestData.xp || 0);
        const stg = getCatGrowthStage(lvl.level);
        const userCatName = (latestData.catName && latestData.catName !== 'Mèo Cưng')
          ? latestData.catName
          : (activeUser.displayName || latestData.catName || 'Mèo Cưng');

        const fullData: GameSaveData = {
          ...latestData,
          level: lvl.level,
          catName: userCatName,
          displayName: userCatName,
          username: activeUser.username || latestData.username || '',
          lastSaved: Date.now(),
        };

        await cloudSaveService.saveToCloud(activeUser.uid, fullData);
        await leaderboardService.updateMyEntry({
          uid: activeUser.uid,
          displayName: userCatName,
          catName: userCatName,
          username: activeUser.username || '',
          photoURL: activeUser.photoURL || fullData.catAvatar || '/images/cat_avatars_webp/avatar_01.webp',
          level: lvl.level,
          xp: fullData.xp || 0,
          rankTierKey: lvl.rankTier.key,
          rankTierName: lvl.rankTier.name,
          rankBadge: lvl.rankTier.badge,
          coins: fullData.fish || 0,
          biggestFishKg: fullData.biggestFishKg || 0,
          equippedSkin: fullData.equippedSkin || 'orange_tabby',
          catStageLabel: stg.label,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.warn('Lỗi lưu cloud trước khi đăng xuất:', err);
      }
    }

    // 3. Sau khi lưu thành công, mới gọi đăng xuất Firebase Auth & xoá phiên đăng nhập
    await authService.logout();

    // 4. Đưa phiên chơi về trạng thái khách mới
    setData({
      ...DEFAULT_SAVE_DATA,
      lastSaved: Date.now(),
    });
    saveGame({
      ...DEFAULT_SAVE_DATA,
      lastSaved: Date.now(),
    });
    setComboCount(0);
    setFloatingItems([]);
    setSparkles([]);
    setCurrentUser(null);
    soundManager.playPop();
  }, [currentUser]);

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
    ownedRoomDecor: data.ownedRoomDecor || [],
    lastWaterGiftClaimedAt: data.lastWaterGiftClaimedAt || 0,
    equippedDecor: {
      bowl: 'bowl_clay',
      ball: 'ball_yarn_red',
      rug: 'rug_peach',
      room: 'room_go_co_dien',
      ...(data.equippedDecor || {}),
      balls: Array.isArray(data.equippedDecor?.balls) && data.equippedDecor.balls.length > 0
        ? data.equippedDecor.balls.slice(0, 3)
        : [data.equippedDecor?.ball || 'ball_yarn_red'],
    },
    satietyExpiresAt: data.satietyExpiresAt || 0,
    satietyTotalDurationMs: data.satietyTotalDurationMs || 0,
    zeroDecayUntil: data.zeroDecayUntil || 0,
    satietyDecayReduction: data.satietyDecayReduction ?? 1.0,
    satietyFoodName: data.satietyFoodName || '',
    satietyFoodTier: data.satietyFoodTier || 'low',
    satietyFoodRate: data.satietyFoodRate || (100 / 2700),
    satietyWaterRate: data.satietyWaterRate || (100 / 2700),
    basketCapacity: getBasketCapacity(data.upgrades),
    fishSellMultiplier: getFishSellMultiplier(data.upgrades),
    fishingBiteTimeReduction: getFishingBiteTimeReduction(data.upgrades),
    fishingReelAssist: getFishingReelAssist(data.upgrades),
    fishingSafeZoneBonus: getFishingSafeZoneBonus(data.upgrades),
    trophyLuckBonus: getTrophyLuckBonus(data.upgrades),
    shopDiscountMultiplier: getShopDiscountMultiplier(data.upgrades),
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
    playWithToy,
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
    logoutGame,
    importSave,
    exportSave,
    syncToCloud,
    updateUserAvatar,
    updateCatName,
    loadUserDataFromCloud,
  };
};

export type GameStateHook = ReturnType<typeof useGameState>;
