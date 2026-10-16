import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FISH_CATALOG, type FishSpecies, type CaughtFishItem } from '../data/fishes';
import type { CatSkin } from '../data/skins';
import { getRodById, FISHING_RODS_CATALOG, type FishingRod, getRodRepairCost } from '../data/fishingRods';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface ActiveSwimmingFish {
  instanceId: string;
  species: FishSpecies;
  x: number; // 6% to 94%
  y: number; // 14% to 75%
  targetY: number; // Organic cruising depth
  speed: number; // Individual cruising speed (0.16 to 0.38)
  vx: number; // Horizontal velocity
  vy: number; // Vertical velocity
  pitch: number; // Swimming tilt (-20° to +20°)
  facingRight: boolean;
  wiggleOffset: number;
  wiggleSpeed: number;
  turnCooldown: number; // Seconds until random turnaround
  isCaught: boolean;
  isEscaped?: boolean;
}

interface FishPondProps {
  currentSkin: CatSkin;
  fish: number; // Coins
  basketCount: number;
  maxBasketCapacity?: number;
  equippedRodId?: string;
  rodDurability?: number;
  unlockedRods?: string[];
  catFood?: number;
  satietyExpiresAt?: number;
  biteTimeReduction?: number;
  reelAssist?: number;
  safeZoneBonus?: number;
  trophyLuckBonus?: number;
  onCatchFish: (species: FishSpecies) => CaughtFishItem;
  onBuyRod?: (rodId: string) => { success: boolean; message: string };
  onUseRodDurability?: () => number;
  onOpenBasket?: () => void;
  onClose: () => void;
  onGoToFeed?: () => void;
}

type GamePhase = 'SWINGING' | 'CASTING' | 'REELING' | 'RETRACTING';
type FishStruggleState = 'RAGING' | 'TIRED';

// Monotonic unique ID counter to completely prevent React duplicate key warnings
let globalFishCounter = 0;
function generateFishId(prefix = 'fish'): string {
  globalFishCounter += 1;
  return `${prefix}_${Date.now()}_${globalFishCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Phân loại chính xác 3 Tier câu cá:
 * - Tier 1: Cá Nhỏ (diff <= 1 hoặc < 1.5kg): 5 nhát kéo theo nhịp
 * - Tier 2: Cá Vừa (diff 2-3 và < 7kg): Thanh lực giằng co 0-100%
 * - Tier 3: Cá Lớn / Khủng (diff >= 4 hoặc >= 7kg): Lái kim đỏ vào vùng xanh, cân bằng 100% Xanh/Đỏ
 */
export function getFishTier(species: FishSpecies): 1 | 2 | 3 {
  if (species.difficultyLevel <= 1 || species.baseWeightKg < 1.5) return 1;
  if (species.difficultyLevel <= 3 && species.baseWeightKg < 7.0) return 2;
  return 3;
}

/**
 * Chọn loài cá xuất hiện dựa trên độ may mắn của cần câu:
 * Cần cấp cao (Vàng, Thần Thoại) có tỷ lệ gặp cá to, cá khủng và cá hiếm cao hơn rất nhiều.
 * Hỗ trợ excludeIds để ưu tiên xuất hiện đa dạng nhiều loài cá khác nhau trong bể.
 */
function rollFishForRod(rod: FishingRod, excludeIds: string[] = [], extraLuck: number = 0): FishSpecies {
  const luck = Math.min(0.95, (rod.bigFishLuck ?? 0.2) + extraLuck);
  const rand = Math.random();

  let candidatePool: FishSpecies[];

  if (luck >= 0.85) {
    // Cần Thần Thoại / Hoàng Gia: 80% cá to khủng & cực hiếm, 20% cá vừa
    if (rand < 0.8) {
      candidatePool = FISH_CATALOG.slice(Math.floor(FISH_CATALOG.length * 0.55));
    } else {
      candidatePool = FISH_CATALOG.slice(Math.floor(FISH_CATALOG.length * 0.25));
    }
  } else if (luck >= 0.6) {
    // Cần Sắt: 60% cá vừa & to
    if (rand < 0.6) {
      candidatePool = FISH_CATALOG.slice(Math.floor(FISH_CATALOG.length * 0.4));
    } else {
      candidatePool = FISH_CATALOG;
    }
  } else if (luck >= 0.35) {
    // Cần Tre: 40% cá vừa
    if (rand < 0.4) {
      candidatePool = FISH_CATALOG.slice(Math.floor(FISH_CATALOG.length * 0.25));
    } else {
      candidatePool = FISH_CATALOG;
    }
  } else {
    // Cần Gỗ Cơ Bản: chủ yếu cá nhỏ & vừa
    if (rand < 0.7) {
      candidatePool = FISH_CATALOG.slice(0, Math.ceil(FISH_CATALOG.length * 0.5));
    } else {
      candidatePool = FISH_CATALOG;
    }
  }

  // Ưu tiên các loài chưa có trong bể để bể luôn phong phú, sinh động nhiều loại cá
  const nonExcluded = candidatePool.filter((f) => !excludeIds.includes(f.id));
  const poolToUse = nonExcluded.length > 0 ? nonExcluded : candidatePool;

  return poolToUse[Math.floor(Math.random() * poolToUse.length)] || FISH_CATALOG[0];
}

export const FishPond: React.FC<FishPondProps> = React.memo(({
  currentSkin,
  fish,
  basketCount = 0,
  maxBasketCapacity = 50,
  equippedRodId = 'wood_rod',
  rodDurability = 10,
  unlockedRods = ['wood_rod'],
  catFood = 100,
  satietyExpiresAt = 0,
  biteTimeReduction = 0,
  reelAssist = 0,
  safeZoneBonus = 0,
  trophyLuckBonus = 0,
  onCatchFish,
  onBuyRod,
  onUseRodDurability,
  onOpenBasket,
  onGoToFeed,
}) => {
  const pondRef = useRef<HTMLDivElement>(null);

  // Trạng thái đói bụng: nếu đói < 15% và không có buff no lâu -> Mèo đói không thể câu cá
  const isSatiated = (satietyExpiresAt || 0) > Date.now();
  const isCatHungry = !isSatiated && (catFood ?? 100) < 15;
  const [hungryAlert, setHungryAlert] = useState<string | null>(null);

  // Rod & Durability state
  const [activeRodId, setActiveRodId] = useState<string>(equippedRodId);
  const [durability, setDurability] = useState<number>(rodDurability);
  const [isRodShopOpen, setIsRodShopOpen] = useState<boolean>(false);
  const [rodModalTab, setRodModalTab] = useState<'owned' | 'shop'>('owned');
  const [brokenAlert, setBrokenAlert] = useState<string | null>(null);

  // Khi vào hồ câu: nếu mèo đang đói thì hiển thị thông báo ngay lập tức
  useEffect(() => {
    if (isCatHungry) {
      setHungryAlert('Mèo đang đói bụng! Boss không còn sức để câu cá. Hãy cho Boss ăn no nhé! 😿🍱');
    } else {
      setHungryAlert(null);
    }
  }, [isCatHungry]);

  const currentRod: FishingRod = getRodById(activeRodId);

  // Synchronize incoming prop updates
  useEffect(() => {
    setActiveRodId(equippedRodId);
  }, [equippedRodId]);

  useEffect(() => {
    setDurability(rodDurability);
  }, [rodDurability]);

  // Game loop & Aiming states
  const [gamePhase, setGamePhase] = useState<GamePhase>('SWINGING');
  const [rodAngle, setRodAngle] = useState<number>(0); // -70° to +70°
  const [hookPos, setHookPos] = useState<{ x: number; y: number }>({ x: 50, y: 88 }); // %
  const [hookVel, setHookVel] = useState<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  // Tùy chỉnh tốc độ xoay cần câu bằng thanh trượt (0.3x đến 1.8x, mặc định 1.0x)
  const [swingSpeed, setSwingSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('PURR_FISH_SWING_SPEED');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.3 && val <= 2.0) return val;
      }
    } catch {
      // fallback
    }
    return 1.0;
  });

  // Hooked Fish & Reeling Minigame State
  const [hookedFish, setHookedFish] = useState<ActiveSwimmingFish | null>(null);
  const [pullTapsLeft, setPullTapsLeft] = useState<number>(4); // Tier 1: Easy (4 taps)
  const [reelProgress, setReelProgress] = useState<number>(25); // Tier 2: Medium (0 - 100)
  const [tension, setTension] = useState<number>(50); // Tier 3: Hard (0 - 100)
  const [safeHoldProgress, setSafeHoldProgress] = useState<number>(50); // Tier 3: 50% Xanh (Thu phục) / 50% Đỏ (Phản kháng)
  const [reelingTimeRemaining, setReelingTimeRemaining] = useState<number>(5.0); // Seconds
  const [safeZoneBounds, setSafeZoneBounds] = useState<{ min: number; max: number }>({ min: 35, max: 70 });
  const [fishStruggle, setFishStruggle] = useState<FishStruggleState>('TIRED');
  const [lineTensionMistakes, setLineTensionMistakes] = useState<number>(0); // 0 = An toàn, 1 = Cước căng, 2 = Sắp đứt, 3 = Đứt cước

  // Toast feedback banner
  const [catchToast, setCatchToast] = useState<{ text: string; sub: string } | null>(null);

  // Swimming fish list (Rendered in React)
  const [swimmingFish, setSwimmingFish] = useState<ActiveSwimmingFish[]>([]);

  // Fixed Cat Anchor Position (Center bottom red circle marker)
  const CAT_ORIGIN = { x: 50, y: 88 };

  // REFS for 60 FPS uninterrupted physics simulation & journey memory
  const swimmingFishRef = useRef<ActiveSwimmingFish[]>([]);
  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  const hookPosRef = useRef<{ x: number; y: number }>(hookPos);
  const hookVelRef = useRef<{ vx: number; vy: number }>(hookVel);
  const hookedFishRef = useRef<ActiveSwimmingFish | null>(hookedFish);
  const currentRodRef = useRef<FishingRod>(currentRod);
  const durabilityRef = useRef<number>(durability);

  // Ghi nhớ góc xoay và hướng lắc lư của cần câu (không xoay lại từ đầu khi kéo hụt/trúng)
  const rodAngleRef = useRef<number>(0);
  const rodDirRef = useRef<number>(1); // 1: sang phải (+70°), -1: sang trái (-70°)
  const swingSpeedRef = useRef<number>(swingSpeed);

  // Trạng thái quẫy đạp của cá trong mini-game
  const fishStruggleRef = useRef<FishStruggleState>('TIRED');
  const struggleTimerRef = useRef<number>(1.5);
  const needleMoveDirRef = useRef<number>(0); // -1: sang trái, 0: đứng yên, 1: sang phải
  const lineTensionMistakesRef = useRef<number>(0);
  const lastMistakeTimeRef = useRef<number>(0); // Chống spam lỗi do key-repeat hoặc pointer drag
  const lastPullClickTimeRef = useRef<number>(0);
  const safeHoldProgressRef = useRef<number>(50);
  const reelingTimeRemainingRef = useRef<number>(15);
  const pullTapsLeftRef = useRef<number>(5);
  const reelProgressRef = useRef<number>(10);
  const tensionRef = useRef<number>(50);
  const isEndingMiniGameRef = useRef<boolean>(false);

  // Sync refs whenever state updates
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    hookPosRef.current = hookPos;
  }, [hookPos]);

  useEffect(() => {
    hookVelRef.current = hookVel;
  }, [hookVel]);

  useEffect(() => {
    hookedFishRef.current = hookedFish;
  }, [hookedFish]);

  useEffect(() => {
    currentRodRef.current = currentRod;
  }, [currentRod]);

  useEffect(() => {
    durabilityRef.current = durability;
  }, [durability]);

  useEffect(() => {
    swingSpeedRef.current = swingSpeed;
    try {
      localStorage.setItem('PURR_FISH_SWING_SPEED', swingSpeed.toString());
    } catch {
      // ignore
    }
  }, [swingSpeed]);

  // Quản lý âm thanh quay cước máy câu (audiopapkin-fishing.mp3) khi đang kéo cá
  useEffect(() => {
    if (gamePhase === 'REELING') {
      soundManager.startReelingSound();
    } else {
      soundManager.stopReelingSound();
    }
  }, [gamePhase]);

  // Kích hoạt nhạc nền hồ câu cá (fish-chill.mp3), và khôi phục nhạc nền phòng mèo (music-layout.mp3) khi rời hồ câu
  useEffect(() => {
    soundManager.setBgmTrack('pond');
    return () => {
      soundManager.stopReelingSound();
      soundManager.setBgmTrack('room');
    };
  }, []);

  // Helper to spawn a new natural swimming fish with distinct speeds & swimming characteristics
  const createSwimmingFish = useCallback(
    (index: number, totalCount: number, rod: FishingRod, excludeIds: string[] = []): ActiveSwimmingFish => {
      const species = rollFishForRod(rod, excludeIds, trophyLuckBonus);
      const facingRight = Math.random() > 0.5;

      // Tốc độ bơi khác biệt rõ rệt theo loài (từ 0.08x cho cá chậm đến 0.32x cho cá phóng nhanh)
      const speedVariation = 0.88 + Math.random() * 0.26;
      const speed = +(0.11 * species.speed * speedVariation).toFixed(3);
      const vx = speed * (facingRight ? 1 : -1);

      const laneSpread = 14 + ((index % totalCount) / Math.max(1, totalCount - 1)) * 56;
      const targetY = Math.max(15, Math.min(73, laneSpread + (Math.random() - 0.5) * 8));

      // Nhịp quẫy đuôi: Cá nhỏ / nhanh quẫy nhịp nhàng thoăn thoắt, cá to quẫy khoan thai
      const wiggleSpeed = +(0.0022 + (species.speed / 2.3) * 0.0032 + Math.random() * 0.001).toFixed(5);

      return {
        instanceId: generateFishId('school'),
        species,
        x: 8 + Math.random() * 84,
        y: targetY,
        targetY,
        speed,
        vx,
        vy: (Math.random() - 0.5) * 0.08,
        pitch: 0,
        facingRight,
        wiggleOffset: Math.random() * 100,
        wiggleSpeed,
        turnCooldown: 2.5 + Math.random() * 4.5,
        isCaught: false,
      };
    },
    []
  );

  // Initialize a school of 9 active fish with rich species diversity
  useEffect(() => {
    const schoolCount = 9;
    const initialSchool: ActiveSwimmingFish[] = [];
    const usedIds: string[] = [];

    for (let i = 0; i < schoolCount; i++) {
      const fish = createSwimmingFish(i, schoolCount, currentRod, usedIds);
      usedIds.push(fish.species.id);
      initialSchool.push(fish);
    }

    swimmingFishRef.current = initialSchool;
    setSwimmingFish(initialSchool);
  }, [createSwimmingFish, currentRod]);

  // Cần câu bị hỏng
  const handleRodBroken = useCallback(() => {
    soundManager.playPop(0.6);
    setBrokenAlert('Cần câu đã hỏng! Hãy sửa cần hoặc chọn cần khác');
    setGamePhase('SWINGING');
    setTimeout(() => {
      setIsRodShopOpen(true);
    }, 600);
  }, []);

  // Thu hoạch cá thành công
  const handleCatchSuccess = useCallback(() => {
    const caught = hookedFishRef.current;
    if (!caught || isEndingMiniGameRef.current) return;
    isEndingMiniGameRef.current = true;

    needleMoveDirRef.current = 0;
    soundManager.stopReelingSound();
    setHookedFish(null);
    hookedFishRef.current = null;

    // Call game state handler
    const caughtItem = onCatchFish(caught.species);

    // Deduct 1 durability
    const remaining = onUseRodDurability ? onUseRodDurability() : Math.max(0, durabilityRef.current - 1);
    setDurability(remaining);
    durabilityRef.current = remaining;

    // Sounds & Haptic
    soundManager.playUpgrade();
    soundManager.playWaterSplash();
    soundManager.triggerHaptic(60);

    const xpReward = Math.max(
      1,
      Math.round(Math.sqrt(caughtItem.weightKg) * 2.2 * (caught.species.difficultyLevel || 1))
    );

    setCatchToast({
      text: `🎣 TÓM ĐƯỢC ${caughtItem.name.toUpperCase()}!`,
      sub: `⚖️ Nặng ${caughtItem.weightKg} kg • +${formatNumber(xpReward)} XP • Bán được ${formatNumber(caughtItem.sellPrice)} xu trong giỏ cá`,
    });
    setTimeout(() => setCatchToast(null), 3000);

    // Mark caught animation
    swimmingFishRef.current = swimmingFishRef.current.map((f) =>
      f.instanceId === caught.instanceId ? { ...f, isCaught: true } : f
    );
    setSwimmingFish([...swimmingFishRef.current]);

    // Retract hook line
    setGamePhase('RETRACTING');
    gamePhaseRef.current = 'RETRACTING';

    // Respawn a new fish with unique ID after 1.5s (ưu tiên loài mới)
    setTimeout(() => {
      const filtered = swimmingFishRef.current.filter((item) => item.instanceId !== caught.instanceId);
      const activeIds = filtered.map((f) => f.species.id);
      const newSpecies = rollFishForRod(currentRodRef.current, activeIds, trophyLuckBonus);
      const facingRight = Math.random() > 0.5;
      const speedVariation = 0.88 + Math.random() * 0.26;
      const speed = +(0.11 * newSpecies.speed * speedVariation).toFixed(3);
      const targetY = 16 + Math.random() * 56;
      const wiggleSpeed = +(0.0022 + (newSpecies.speed / 2.3) * 0.0032 + Math.random() * 0.001).toFixed(5);

      filtered.push({
        instanceId: generateFishId('respawn'),
        species: newSpecies,
        x: facingRight ? 6 : 94,
        y: targetY,
        targetY,
        speed,
        vx: speed * (facingRight ? 1 : -1),
        vy: (Math.random() - 0.5) * 0.08,
        pitch: 0,
        facingRight,
        wiggleOffset: Math.random() * 100,
        wiggleSpeed,
        turnCooldown: 3 + Math.random() * 4,
        isCaught: false,
      });

      swimmingFishRef.current = filtered;
      setSwimmingFish([...filtered]);
    }, 1500);
  }, [onCatchFish, onUseRodDurability]);

  // Sảy cá (Thất bại)
  const handleFishEscape = useCallback(
    (reasonMsg?: string) => {
      const escaped = hookedFishRef.current;
      if (!escaped || isEndingMiniGameRef.current) return;
      isEndingMiniGameRef.current = true;

      needleMoveDirRef.current = 0;
      soundManager.stopReelingSound();
      setHookedFish(null);
      hookedFishRef.current = null;

      // Deduct 1 durability
      const remaining = onUseRodDurability ? onUseRodDurability() : Math.max(0, durabilityRef.current - 1);
      setDurability(remaining);
      durabilityRef.current = remaining;

      soundManager.playPop(0.7);

      setCatchToast({
        text: 'SẨY CÁ RỒI! 💨',
        sub: reasonMsg || 'Cá đã vùng vẫy thoát thân. Thu hồi dây câu...',
      });
      setTimeout(() => setCatchToast(null), 2400);

      // Fish accelerates away
      swimmingFishRef.current = swimmingFishRef.current.map((f) =>
        f.instanceId === escaped.instanceId
          ? { ...f, vx: f.vx * 2.5, isEscaped: true }
          : f
      );
      setSwimmingFish([...swimmingFishRef.current]);

      // Respawn a new fish after 1.5s
      setTimeout(() => {
        const filtered = swimmingFishRef.current.filter((item) => item.instanceId !== escaped.instanceId);
        const activeIds = filtered.map((f) => f.species.id);
        const newSpecies = rollFishForRod(currentRodRef.current, activeIds);
        const facingRight = Math.random() > 0.5;
        const speedVariation = 0.88 + Math.random() * 0.26;
        const speed = +(0.11 * newSpecies.speed * speedVariation).toFixed(3);
        const targetY = 16 + Math.random() * 56;
        const wiggleSpeed = +(0.0022 + (newSpecies.speed / 2.3) * 0.0032 + Math.random() * 0.001).toFixed(5);

        filtered.push({
          instanceId: generateFishId('respawn_esc'),
          species: newSpecies,
          x: facingRight ? 6 : 94,
          y: targetY,
          targetY,
          speed,
          vx: speed * (facingRight ? 1 : -1),
          vy: (Math.random() - 0.5) * 0.08,
          pitch: 0,
          facingRight,
          wiggleOffset: Math.random() * 100,
          wiggleSpeed,
          turnCooldown: 3 + Math.random() * 4,
          isCaught: false,
        });

        swimmingFishRef.current = filtered;
        setSwimmingFish([...filtered]);
      }, 1500);

      setGamePhase('RETRACTING');
      gamePhaseRef.current = 'RETRACTING';
    },
    [onUseRodDurability]
  );

  // Xử lý phạm lỗi khi thao tác trong lúc cá đang quẫy đỏ (RAGING)
  const registerMistake = useCallback(
    (reasonMsg?: string) => {
      const now = Date.now();
      // Debounce 350ms chống spam sự kiện liên tục (như kéo trượt thanh hoặc giữ phím)
      if (now - lastMistakeTimeRef.current < 350) return;
      lastMistakeTimeRef.current = now;

      soundManager.playLineTension();
      soundManager.playFishStruggleSplash();
      soundManager.triggerHaptic(80);

      const newMistakes = lineTensionMistakesRef.current + 1;
      lineTensionMistakesRef.current = newMistakes;
      setLineTensionMistakes(newMistakes);

      // Phạt giật lùi tiến trình bên Xanh (-8%)
      safeHoldProgressRef.current = Math.max(0, safeHoldProgressRef.current - 8);
      setSafeHoldProgress(safeHoldProgressRef.current);

      // Cho đúng 3 cơ hội nhấn sai khi cá đang quẫy: đến lần 3 mới đứt cước sẩy cá!
      if (newMistakes >= 3) {
        handleFishEscape(reasonMsg || 'Đứt cước! Bạn đã phạm lỗi 3 lần khi cá đang quẫy!');
      }
    },
    [handleFishEscape]
  );

  // UNINTERRUPTED 60 FPS PHYSICS SIMULATION LOOP
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastFishRenderTime = 0;

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);

      const deltaMs = Math.min(50, currentTime - lastTime);
      const dt = deltaMs / 16.67;
      lastTime = currentTime;

      const phase = gamePhaseRef.current;
      const rod = currentRodRef.current;

      // 1. Automatic Rod Fan Oscillation:
      // GHI NHỚ HÀNH TRÌNH XOAY (Không xoay lại từ đầu khi phóng trượt/trúng cá)
      // Tốc độ xoay chậm hơn & có thể điều chỉnh qua nút tốc độ
      if (phase === 'SWINGING') {
        const baseSpeed = 0.80; // Tăng tốc độ lắc cần câu để tăng độ khó căn thời điểm quăng
        const speedStep = baseSpeed * (swingSpeedRef.current || 1.0) * dt;

        rodAngleRef.current += rodDirRef.current * speedStep;

        if (rodAngleRef.current >= 70) {
          rodAngleRef.current = 70;
          rodDirRef.current = -1; // Đổi chiều sang trái
        } else if (rodAngleRef.current <= -70) {
          rodAngleRef.current = -70;
          rodDirRef.current = 1; // Đổi chiều sang phải
        }

        setRodAngle(rodAngleRef.current);
      }

      // 2. Active Swimming Fish Physics (Bơi ngẫu nhiên, tự nhiên, không đồng loạt)
      const list = swimmingFishRef.current;
      let hasFishChanges = false;

      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (f.isCaught) continue;

        // If hooked in reeling mini-game, pin it to hookPos
        if (hookedFishRef.current && f.instanceId === hookedFishRef.current.instanceId) {
          f.x = hookPosRef.current.x;
          f.y = hookPosRef.current.y;
          hasFishChanges = true;
          continue;
        }

        // Horizontal movement
        let nx = f.x + f.vx * dt;

        // Vertical movement with smooth sinusoidal cruising towards target depth
        f.vy += (f.targetY - f.y) * 0.0018 * dt;
        f.vy = Math.max(-0.16, Math.min(0.16, f.vy));
        let ny = f.y + (f.vy + Math.sin(currentTime * f.wiggleSpeed + f.wiggleOffset) * 0.06) * dt;

        let nvx = f.vx;
        let nFacing = f.facingRight;

        // Turn cooldown timer countdown
        f.turnCooldown -= deltaMs / 1000;

        // Random mid-tank depth and turn adjustments
        if (f.turnCooldown <= 0) {
          f.turnCooldown = 3 + Math.random() * 5;
          f.targetY = 16 + Math.random() * 56;

          if (Math.random() < 0.25) {
            nFacing = !nFacing;
            nvx = (nFacing ? 1 : -1) * f.speed;
          }
        }

        // Smooth bank bounce (Left / Right)
        if (nx < 6) {
          nx = 6;
          nvx = Math.abs(f.speed);
          nFacing = true;
        } else if (nx > 94) {
          nx = 94;
          nvx = -Math.abs(f.speed);
          nFacing = false;
        }

        // Water surface & Bottom bank containment
        if (ny < 14) {
          ny = 14;
          f.targetY = 24 + Math.random() * 20;
          f.vy = Math.abs(f.vy) + 0.04;
        } else if (ny > 74) {
          ny = 74;
          f.targetY = 48 + Math.random() * 20;
          f.vy = -Math.abs(f.vy) - 0.04;
        }

        // Swimming tilt pitch up/down along direction
        const rawPitch = (f.vy / (Math.abs(nvx) || 0.1)) * 14;
        const pitch = Math.max(-20, Math.min(20, rawPitch));

        f.x = nx;
        f.y = ny;
        f.vx = nvx;
        f.pitch = pitch;
        f.facingRight = nFacing;
        hasFishChanges = true;
      }

      if (hasFishChanges && currentTime - lastFishRenderTime >= 30) {
        lastFishRenderTime = currentTime;
        setSwimmingFish([...list]);
      }

      // 3. Casting Projectile Physics
      if (phase === 'CASTING') {
        const curPos = hookPosRef.current;
        const curVel = hookVelRef.current;

        const nextX = curPos.x + curVel.vx * dt;
        const nextY = curPos.y + curVel.vy * dt;

        hookPosRef.current = { x: nextX, y: nextY };
        setHookPos({ x: nextX, y: nextY });

        // Tìm tất cả các con cá nằm trong tầm va chạm của lưỡi câu (Hardcore Hitbox thu hẹp)
        const candidates: ActiveSwimmingFish[] = [];

        for (const f of list) {
          if (f.isCaught || f.isEscaped) continue;
          const dist = Math.hypot(f.x - nextX, (f.y - nextY) * 1.3);

          const rodHitBonus = (rod.bigFishLuck || 0) * 1.6 + trophyLuckBonus * 3.5;
          const biteBonus = biteTimeReduction * 2.5; // Thính dụ cá giúp cá đớp mồi nhạy hơn một chút
          const hitbox = f.species.size / 36 + 2.2 + biteBonus + (f.species.baseWeightKg > 5 ? rodHitBonus : 0);

          if (dist <= hitbox) {
            candidates.push(f);
          }
        }

        if (candidates.length > 0) {
          // Cần câu xịn tự động ưu tiên găm trúng con cá to nhất
          candidates.sort((a, b) => (b.species.baseWeightKg || 0) - (a.species.baseWeightKg || 0));
          const hitFish = candidates[0];

          soundManager.playCatchFish();
          soundManager.triggerHaptic(50);

          setHookedFish(hitFish);
          hookedFishRef.current = hitFish;

          setGamePhase('REELING');
          gamePhaseRef.current = 'REELING';
          soundManager.startReelingSound();
          soundManager.setReelingFishState(false);

          // Reset mistake counter, debounce timer, safe progress & ending flag
          isEndingMiniGameRef.current = false;
          lastMistakeTimeRef.current = 0;
          lineTensionMistakesRef.current = 0;
          setLineTensionMistakes(0);

          // Cân bằng thời gian đếm ngược & độ khó theo từng loài cá
          const tier = getFishTier(hitFish.species);
          const weight = hitFish.species.baseWeightKg || 1;

          // CÁ LỚN (Tier 3): Chỉ tập trung điều khiển kim - không quẫy đuôi làm gián đoạn hay sẩy cá
          if (tier === 3) {
            fishStruggleRef.current = 'TIRED';
            setFishStruggle('TIRED');
            soundManager.setReelingFishState(false);
          } else {
            // TỶ LỆ CÁ QUẪY CHO TIER 1 VÀ 2: 45% cá vừa cắn câu là giật mình quẫy dữ dội
            const startRaging = Math.random() < 0.45;
            if (startRaging) {
              fishStruggleRef.current = 'RAGING';
              setFishStruggle('RAGING');
              soundManager.setReelingFishState(true);
              struggleTimerRef.current = 1.8 + Math.random() * 0.5;
              soundManager.playLineTension();
              soundManager.playFishStruggleSplash();
            } else {
              fishStruggleRef.current = 'TIRED';
              setFishStruggle('TIRED');
              soundManager.setReelingFishState(false);
              struggleTimerRef.current = 0.9 + Math.random() * 0.3;
            }
          }

          if (tier === 1) {
            // Tier 1: Cá Nhỏ (Cá Hề, Sọc Vằn, Ba Đuôi, Cá Ngựa) - 5 nhát kéo có nhịp điệu khi Xanh
            pullTapsLeftRef.current = 5;
            setPullTapsLeft(5);
            const timerVal = Math.round((9.5 + weight * 1.5) * 10) / 10;
            reelingTimeRemainingRef.current = timerVal;
            setReelingTimeRemaining(timerVal);
          } else if (tier === 2) {
            // Tier 2: Cá Vừa (Cá Bướm, Rô Phi, Cá Nóc, Cá Chép Hồng) - Khởi đầu 10%
            reelProgressRef.current = 10;
            setReelProgress(10);
            const timerVal = Math.round((13.0 + weight * 0.6) * 10) / 10;
            reelingTimeRemainingRef.current = timerVal;
            setReelingTimeRemaining(timerVal);
          } else {
            // Tier 3: Cá Lớn & Khủng (Chép Vàng, Cá Trê, Cá Vây Xanh, Cá Mập)
            tensionRef.current = 50;
            setTension(50);
            needleMoveDirRef.current = 0;
            // Khởi đầu thanh giằng co tại mốc cân bằng 50% Xanh (Thu phục) / 50% Đỏ (Phản kháng)
            safeHoldProgressRef.current = 50;
            setSafeHoldProgress(50);
            const timerVal = hitFish.species.difficultyLevel >= 5 ? 26.0 : 20.0;
            reelingTimeRemainingRef.current = timerVal;
            setReelingTimeRemaining(timerVal);
          }

          hookPosRef.current = { x: hitFish.x, y: hitFish.y };
          setHookPos({ x: hitFish.x, y: hitFish.y });
        } else if (nextX <= 4 || nextX >= 96 || nextY <= 10) {
          // QUĂNG HỤT! Dây câu chạm bờ hồ
          soundManager.playPop(0.8);
          const remaining = onUseRodDurability ? onUseRodDurability() : Math.max(0, durabilityRef.current - 1);
          setDurability(remaining);
          durabilityRef.current = remaining;

          setCatchToast({
            text: 'QUĂNG HỤT RỒI! 🎣',
            sub: 'Lưỡi câu chạm thành bể. Dây câu đang tự động thu về...',
          });
          setTimeout(() => setCatchToast(null), 1800);

          setGamePhase('RETRACTING');
          gamePhaseRef.current = 'RETRACTING';
        }
      }

      // 4. Retracting Hook Line Back to Cat
      if (phase === 'RETRACTING') {
        const curPos = hookPosRef.current;
        const dx = CAT_ORIGIN.x - curPos.x;
        const dy = CAT_ORIGIN.y - curPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 4) {
          hookPosRef.current = { x: CAT_ORIGIN.x, y: CAT_ORIGIN.y };
          setHookPos({ x: CAT_ORIGIN.x, y: CAT_ORIGIN.y });

          if (durabilityRef.current <= 0) {
            handleRodBroken();
          } else {
            // TIẾP TỤC HÀNH TRÌNH XOAY (Không reset góc xoay về 0°)
            isEndingMiniGameRef.current = false;
            setGamePhase('SWINGING');
            gamePhaseRef.current = 'SWINGING';
          }
        } else {
          const retractSpeed = 2.4 * dt;
          const nextPos = {
            x: curPos.x + (dx / dist) * retractSpeed,
            y: curPos.y + (dy / dist) * retractSpeed,
          };
          hookPosRef.current = nextPos;
          setHookPos(nextPos);
        }
      }

      // 5. CƠ CHẾ KÉO CÁ TƯƠNG TÁC CAO & KỊCH TÍNH (INTERACTIVE REELING)
      if (phase === 'REELING' && hookedFishRef.current) {
        const hitFish = hookedFishRef.current;
        const tier = getFishTier(hitFish.species);
        const decayStep = deltaMs / 1000;

        // Đổi chu kỳ cá vùng vẫy / cá đuối sức linh hoạt theo kích cỡ cá (Chỉ áp dụng cho Cá Nhỏ và Cá Vừa)
        if (tier !== 3) {
          struggleTimerRef.current -= decayStep;
          if (struggleTimerRef.current <= 0) {
            if (fishStruggleRef.current === 'TIRED') {
              fishStruggleRef.current = 'RAGING';
              setFishStruggle('RAGING');
              soundManager.setReelingFishState(true);
              // TĂNG TỶ LỆ & THỜI LƯỢNG QUẪY: Cá nhỏ quẫy 1.8s - 2.4s, cá vừa quẫy 2.4s - 3.2s
              struggleTimerRef.current = tier === 1 ? 1.8 + Math.random() * 0.6 : 2.4 + Math.random() * 0.8;
              soundManager.playLineTension();
              soundManager.playFishStruggleSplash();
              soundManager.triggerHaptic(55);
            } else {
              fishStruggleRef.current = 'TIRED';
              setFishStruggle('TIRED');
              soundManager.setReelingFishState(false);
              // CỬA SỔ XANH (1.4s - 1.8s) buộc người chơi chớp thời cơ dứt khoát
              struggleTimerRef.current = tier === 1 ? 1.4 + Math.random() * 0.4 : 1.5 + Math.random() * 0.5;
            }
          }
        }

        const isRaging = tier !== 3 && fishStruggleRef.current === 'RAGING';

        // Đếm ngược thời gian kéo cá chung (đồng bộ qua ref, tránh lệch state)
        reelingTimeRemainingRef.current = Math.max(0, reelingTimeRemainingRef.current - decayStep);
        setReelingTimeRemaining(reelingTimeRemainingRef.current);

        // HẾT THỜI GIAN ĐẾM NGƯỢC
        if (reelingTimeRemainingRef.current <= 0) {
          if (!isEndingMiniGameRef.current && hookedFishRef.current) {
            if (tier === 1) {
              handleFishEscape('Hết giờ! Cá nhỏ đã nhả mồi bơi mất!');
            } else if (tier === 2) {
              handleFishEscape('Hết thời gian! Cá đã giật đứt mồi chạy mất!');
            } else {
              // Tier 3: Nếu bên XANH >= 50% (Xanh nhiều hơn Đỏ) -> BẮT ĐƯỢC!
              // Nếu bên ĐỎ > 50% (Xanh < 50%) -> SẨY CÁ!
              if (safeHoldProgressRef.current >= 50) {
                handleCatchSuccess();
              } else {
                handleFishEscape('Hết giờ! Cá ở ngoài vùng xanh nhiều hơn và đã thoát thân!');
              }
            }
          }
        }

        // Tier 2: Giằng co theo nhịp cá quẫy (quẫy tụt -20%/s, mệt tụt nhẹ -6%/s, hỗ trợ bởi reel_technique)
        if (tier === 2) {
          const baseDecay = isRaging ? 20 : 6;
          const decayRate = baseDecay * Math.max(0.8, 1 - reelAssist);
          reelProgressRef.current = Math.max(0, reelProgressRef.current - decayRate * decayStep);
          setReelProgress(reelProgressRef.current);
        }

        // Tier 3: Cá Lớn / Cực Khó (CHỈ ĐIỀU KHIỂN KIM VÀO VÙNG XANH - KHÔNG QUẪY ĐUÔI SẨY CÁ)
        if (tier === 3) {
          const fishWeight = hitFish.species.baseWeightKg || 10;
          const baseHalf = Math.max(3.2, 9.6 - fishWeight * 0.18);
          const rodBonus = ((rod.safeZoneBonus || 0) + safeZoneBonus) * 0.15;
          const halfWidth = +(baseHalf + rodBonus).toFixed(1);

          const driftSpeed = 0.0013 + (hitFish.species.difficultyLevel >= 5 ? 0.0006 : 0);
          const driftOffset = Math.sin(currentTime * driftSpeed) * 24;
          const greenCenter = 50 + driftOffset;
          const greenMin = Math.max(8, Math.round(greenCenter - halfWidth));
          const greenMax = Math.min(92, Math.round(greenCenter + halfWidth));
          setSafeZoneBounds({ min: greenMin, max: greenMax });

          // Di chuyển kim đỏ theo nút bấm qua lại (hoàn toàn mượt mà, không bị gián đoạn hay rung giật quẫy)
          let nextTen = tensionRef.current;
          if (needleMoveDirRef.current !== 0) {
            const moveSpeed = 55 + (rod.reelingPower || 1) * 8; // % / giây
            nextTen += needleMoveDirRef.current * moveSpeed * decayStep;
          }
          const clampedTen = Math.max(6, Math.min(94, nextTen));
          tensionRef.current = clampedTen;
          setTension(clampedTen);

          // Kiểm tra kim đỏ có nằm trong Vùng Xanh không
          const isInZone = clampedTen >= greenMin && clampedTen <= greenMax;
          let nextHold = safeHoldProgressRef.current;
          if (isInZone) {
            // Trong vùng xanh: Tăng bên Xanh, đẩy lùi bên Đỏ (+18%/s)
            const gainRate = 18 + (rod.reelingPower || 1) * 3.5;
            nextHold = Math.min(100, nextHold + gainRate * decayStep);
          } else {
            // Lệch khỏi vùng xanh: Bên Đỏ phản kháng lấn át (-13%/s)
            const lossRate = 13;
            nextHold = Math.max(0, nextHold - lossRate * decayStep);
          }

          safeHoldProgressRef.current = nextHold;
          setSafeHoldProgress(nextHold);

          // Nếu đạt trọn 100% Xanh -> Bắt được cá thành công ngay lập tức!
          if (nextHold >= 100) {
            handleCatchSuccess();
          } else if (nextHold <= 0) {
            // Nếu để bên Đỏ lấn át hoàn toàn về 0% -> Cá giật đứt cước bơi mất!
            handleFishEscape('Cá đã vùng vẫy hoàn toàn lấn át và bơi mất!');
          }
        }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [handleCatchSuccess, handleFishEscape, handleRodBroken, onUseRodDurability]);

  // Quăng Dây Câu
  const handleCastLine = () => {
    if (gamePhase !== 'SWINGING') return;

    if (isCatHungry) {
      soundManager.playPop(0.5);
      setHungryAlert('Mèo đang đói bụng! Boss không còn sức để câu cá. Hãy cho Boss ăn no nhé! 😿🍱');
      return;
    }

    if (durability <= 0) {
      handleRodBroken();
      return;
    }

    isEndingMiniGameRef.current = false;

    const rad = (rodAngleRef.current * Math.PI) / 180;

    // TỐC ĐỘ RA DÂY CÂU CHẬM LẠI & PHỤ THUỘC VÀO CẦN CÂU XỊN HAY KHÔNG
    // Cần Gỗ (0.65x) phóng chậm rãi; Cần Thần Thoại (1.9x) phóng thần tốc
    const baseCastSpeed = 0.82;
    const launchSpeed = baseCastSpeed * (currentRodRef.current.lineSpeed || 1.0);

    const vx = Math.sin(rad) * launchSpeed;
    const vy = -Math.cos(rad) * launchSpeed;

    soundManager.playCastWhoosh();
    soundManager.playPop(1.4);
    soundManager.triggerHaptic(25);

    setHookPos({ x: CAT_ORIGIN.x, y: CAT_ORIGIN.y });
    hookPosRef.current = { x: CAT_ORIGIN.x, y: CAT_ORIGIN.y };

    setHookVel({ vx, vy });
    hookVelRef.current = { vx, vy };

    setGamePhase('CASTING');
    gamePhaseRef.current = 'CASTING';
  };

  // Bấm nút "KÉO" (PULL) trong mini-game tương tác (Tier 1 & Tier 2)
  const handlePullClick = () => {
    if (gamePhase !== 'REELING' || !hookedFishRef.current || isEndingMiniGameRef.current) return;

    // Chống spam phím / click vô thức với cooldown 110ms
    const now = Date.now();
    if (now - lastPullClickTimeRef.current < 110) return;
    lastPullClickTimeRef.current = now;

    soundManager.startReelingSound();
    const hitFish = hookedFishRef.current;
    const tier = getFishTier(hitFish.species);
    const isRaging = fishStruggleRef.current === 'RAGING';

    // === QUY TẮC CỐT LÕI: KHI CÁ ĐANG QUẪY (ĐỎ) -> BUÔNG TAY, BẤM LÀ PHẠT NẶNG / ĐỨT CƯỚC ===
    if (isRaging) {
      registerMistake('Cá quẫy quá mạnh mà bạn cố giật cước làm đứt dây rồi!');
      return; // Tuyệt đối không tính điểm kéo khi cá đang quẫy đỏ!
    }

    // === KHI CÁ THẤM MỆT (XANH): NHẤP KÉO THU PHỤC CÁ ===
    soundManager.playReelClick(1.35);
    soundManager.triggerHaptic(30);

    // Tier 1: Small Fish (5 nhát kéo có nhịp điệu khi Xanh)
    if (tier === 1) {
      const remaining = pullTapsLeftRef.current - 1;
      pullTapsLeftRef.current = remaining;
      setPullTapsLeft(remaining);
      if (remaining <= 0) {
        handleCatchSuccess();
      }
      return;
    }

    // Tier 2: Medium (Đo lực nhịp nhàng - nhấp khi Xanh +11% * reelingPower)
    if (tier === 2) {
      const addedPower = 11 * currentRod.reelingPower;
      const nextP = Math.min(100, reelProgressRef.current + addedPower);
      reelProgressRef.current = nextP;
      setReelProgress(nextP);
      if (nextP >= 100) {
        handleCatchSuccess();
      }
      return;
    }
  };

  // Điều khiển kim đỏ qua lại (Nút bấm Trái / Phải cho Tier 3: thuần kỹ năng lái kim)
  const handleNeedleMoveStart = (e: React.PointerEvent<HTMLButtonElement>, dir: number) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    if (isEndingMiniGameRef.current || !hookedFishRef.current) return;

    needleMoveDirRef.current = dir;
    // Bước nhảy tức thì khi nhấp chạm (nhanh nhạy)
    const nextTen = Math.max(6, Math.min(94, tensionRef.current + dir * 4));
    tensionRef.current = nextTen;
    setTension(nextTen);
    soundManager.playPop(dir < 0 ? 1.15 : 1.35);
    soundManager.triggerHaptic(15);
  };

  const handleNeedleMoveEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    needleMoveDirRef.current = 0;
  };

  // Chạm hoặc kéo ngón tay trực tiếp trên thanh sức căng
  const handleBarPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEndingMiniGameRef.current || !hookedFishRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0) {
      const clickX = e.clientX - rect.left;
      const targetPercent = Math.max(6, Math.min(94, (clickX / rect.width) * 100));
      tensionRef.current = targetPercent;
      setTension(targetPercent);
      soundManager.playPop(1.2);
    }
  };

  // Hỗ trợ phím mũi tên và phím A/D trên bàn phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhaseRef.current !== 'REELING' || isEndingMiniGameRef.current || !hookedFishRef.current) return;
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        const dir = (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? -1 : 1;
        needleMoveDirRef.current = dir;
        const nextTen = Math.max(6, Math.min(94, tensionRef.current + dir * 3.5));
        tensionRef.current = nextTen;
        setTension(nextTen);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        needleMoveDirRef.current = 0;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mua hoặc trang bị cần câu từ Rod Shop
  const handleBuyRod = (rodId: string) => {
    if (onBuyRod) {
      const res = onBuyRod(rodId);
      if (res.success) {
        const targetRod = getRodById(rodId);
        setActiveRodId(rodId);
        setDurability(targetRod.maxDurability);
        durabilityRef.current = targetRod.maxDurability;
        setBrokenAlert(null);
        soundManager.playPurchaseSuccess();
        setIsRodShopOpen(false);
      } else {
        alert(res.message);
      }
    } else {
      const targetRod = getRodById(rodId);
      setActiveRodId(rodId);
      setDurability(targetRod.maxDurability);
      durabilityRef.current = targetRod.maxDurability;
      setIsRodShopOpen(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto min-h-[calc(100vh-140px)] flex flex-col justify-between font-body-md select-none bg-gradient-to-b from-[#FFF9F5] via-[#FFF2EB] to-[#FCEAE1] text-[#231918] rounded-2xl sm:rounded-[32px] shadow-sm sm:shadow-2xl border border-amber-100/60 overflow-hidden relative">
      {/* 1. COMPACT KAWAII MOBILE HEADER BAR */}
      <div className="flex flex-col gap-1.5 px-3 pt-2 pb-1.5 bg-white/80 backdrop-blur-md border-b border-amber-200/50 shadow-xs z-20 shrink-0">
        {/* ROW 1: Back | Title Badge | Coins & Basket Badges */}
        {/* <div className="flex items-center justify-between gap-1.5 w-full">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-full bg-white text-[#6E4D3E] font-bold text-xs border border-amber-200/80 shadow-[0_2px_0_rgba(110,77,62,0.1)] hover:bg-[#FFF0EF] active:translate-y-0.5 active:shadow-none flex items-center gap-1 shrink-0 transition-all cursor-pointer"
            onClick={onClose}
            title="Quay lại phòng mèo"
          >
            <span>←</span>
            <span>Về Phòng</span>
          </button>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 border border-amber-200/70 shadow-xs">
            <span className="text-sm">🐟</span>
            <span className="text-xs font-extrabold text-[#6E4D3E]">Bể Săn Mồi</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#FF7E67]/15 text-[#a53b29] rounded-full">
              {swimmingFish.length} Cá
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 font-bold text-xs shadow-xs">
              <img
                src="/images/icon/xu-vang.webp"
                alt="Xu"
                className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                draggable={false}
              />
              <span>{formatNumber(fish)}</span>
            </div>

            {onOpenBasket && (
              <button
                type="button"
                className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 active:scale-95 transition-transform shrink-0 flex items-center gap-1 cursor-pointer"
                onClick={onOpenBasket}
                title="Mở Balo Của Boss"
              >
                <span>🎒</span>
                <span>{basketCount}</span>
              </button>
            )}
          </div>
        </div> */}

        {/* ROW 2: Equipment Bar (Cần câu & Nút Đổi Cần) */}
        <div className="flex items-center justify-between gap-2 bg-white/90 px-2.5 py-1.5 rounded-2xl border border-amber-200/80 shadow-[0_2px_0_rgba(212,176,136,0.2)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100/90 border border-amber-300 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              {currentRod.image ? (
                <img
                  src={currentRod.image}
                  alt={currentRod.name}
                  className="w-full h-full object-contain drop-shadow-xs"
                />
              ) : (
                <span className="text-base">{currentRod.icon}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#6E4D3E] truncate">
                  {currentRod.name}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 shrink-0">
                  {currentRod.badge}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold ${
                  durability <= 3 ? 'text-red-500 font-extrabold animate-pulse' : 'text-emerald-700'
                }`}
              >
                Độ bền: {durability}/{currentRod.maxDurability} • Ra dây: {currentRod.lineSpeed}x
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setRodModalTab('owned');
                setIsRodShopOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-xs hover:bg-amber-200 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              title="Đổi cần câu đã sở hữu"
            >
              <span>🎣</span>
              <span>Đổi Cần</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRodModalTab('shop');
                setIsRodShopOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-xs hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              title="Cửa hàng cần câu"
            >
              <span>Shop ✨</span>
            </button>
          </div>
        </div>

        {/* ROW 3: Rotation Speed Slider */}
        <div
          className="flex items-center justify-between gap-1.5 bg-amber-50/90 px-2.5 py-1 rounded-xl border border-amber-200/70 shadow-xs select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 shrink-0 text-[11px] font-extrabold text-amber-900">
            <span>🧭</span>
            <span>Tốc độ xoay:</span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs sm:max-w-sm mx-1 sm:mx-2">
            <span className="text-[10px] font-bold text-amber-800 shrink-0" title="Chậm">🐢 0.3x</span>
            <input
              type="range"
              min="0.3"
              max="1.8"
              step="0.05"
              value={swingSpeed}
              onChange={(e) => {
                e.stopPropagation();
                setSwingSpeed(parseFloat(e.target.value));
              }}
              className="flex-1 accent-[#FF7E67] cursor-pointer h-1.5 rounded-lg bg-amber-200/80"
              title={`Kéo để chỉnh tốc độ xoay cần: ${swingSpeed.toFixed(1)}x`}
            />
            <span className="text-[10px] font-bold text-amber-800 shrink-0" title="Nhanh">⚡ 1.8x</span>
          </div>

          <span className="text-[11px] font-black text-amber-900 bg-white px-1.5 py-0.2 rounded-full border border-amber-300 shadow-2xs shrink-0 min-w-[36px] text-center">
            {swingSpeed.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* 2. MAIN POND WATER ARENA (CỐ ĐỊNH KHUNG HÌNH BỂ KÍNH, KHÔNG PHÓNG TO THU NHỎ BACKGROUND) */}
      <div
        ref={pondRef}
        className="relative mx-1.5 sm:mx-3 rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-white/95 shadow-md overflow-hidden bg-slate-900 cursor-crosshair select-none flex-1 min-h-[300px] sm:min-h-[380px] max-h-[480px] my-1"
        onClick={handleCastLine}
      >
        {/* FIXED HARDWARE-ACCELERATED AQUARIUM BACKGROUND: Cố định tuyệt đối, đúng 1 kích thước ban đầu */}
        <div className="pond-bg-fixed-layer absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
          <img
            src="/images/aquarium.jpg"
            alt="Aquarium Background"
            className="w-full h-full object-cover object-center pointer-events-none select-none block"
            draggable={false}
          />
        </div>

        {/* Soft Water Caustics & Bubbles */}
        <div className="water-caustics-layer pointer-events-none z-10" />
        <div className="water-bubble bubble-1">🫧</div>
        <div className="water-bubble bubble-2">🫧</div>
        <div className="water-bubble bubble-3">🫧</div>
        <div className="water-bubble bubble-4">🫧</div>
        <div className="water-bubble bubble-5">🫧</div>

        {/* SWIMMING FISH ACTORS: Bơi ngẫu nhiên tự nhiên */}
        {swimmingFish.map((fishItem) => {
          // Thu nhỏ kích thước cá phù hợp tỷ lệ màn hình mobile
          const displaySize = Math.max(26, Math.min(50, Math.round(fishItem.species.size * 0.42)));
          const isHookedInReel = gamePhase === 'REELING' && hookedFish?.instanceId === fishItem.instanceId;
          const struggleClass = isHookedInReel
            ? fishStruggle === 'RAGING'
              ? 'fish-thrashing-raging'
              : 'fish-struggling-tired'
            : '';

          // Hướng bơi: Nếu sang phải (facingRight hoặc vx > 0) thì scaleX(-1) vì hình gốc cá nhìn sang trái
          const isMovingRight = fishItem.vx !== 0 ? fishItem.vx > 0 : fishItem.facingRight;

          return (
            <div
              key={fishItem.instanceId}
              className={`swimming-fish-actor ${fishItem.isCaught ? 'fish-got-caught' : ''}`}
              style={{
                left: `${fishItem.x}%`,
                top: `${fishItem.y}%`,
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                transform: 'translate(-50%, -50%)',
                transition: isHookedInReel ? 'none' : 'opacity 0.3s ease',
              }}
            >
              {/* LỚP 1: ĐIỀU HƯỚNG XOAY ĐẦU CÁ (scaleX lật mặt + rotate góc ngẩng/chúc đầu) - Tách riêng khỏi CSS animation */}
              <div
                className="w-full h-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: fishItem.isCaught
                    ? undefined
                    : `scaleX(${isMovingRight ? -1 : 1}) rotate(${
                        isMovingRight ? -fishItem.pitch : fishItem.pitch
                      }deg)`,
                  transition: isHookedInReel ? 'none' : 'transform 0.25s ease-out',
                }}
              >
                {/* LỚP 2: RUNG LẮC QUẪY ĐUÔI KHI MẮC CÂU */}
                <div className={`w-full h-full flex items-center justify-center ${struggleClass}`}>
                  {/* LỚP 3: HÌNH ẢNH CÁ UỐN LƯỢN TỰ NHIÊN (ANIMATION WIGGLE KHÔNG GHI ĐÈ HƯỚNG XOAY ĐẦU) */}
                  <img
                    src={fishItem.species.image}
                    alt={fishItem.species.name}
                    className="fish-actor-img pointer-events-none w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* REELING WATER RIPPLES & SPLASH PARTICLES TẠI VỊ TRÍ LƯỠI CÂU & CÁ */}
        {gamePhase === 'REELING' && (
          <div
            className="absolute z-25 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${hookPos.x}%`, top: `${hookPos.y}%` }}
          >
            {/* Vòng sóng nước giằng co lan tỏa */}
            <div className={`reeling-water-ring ${fishStruggle === 'RAGING' ? 'reeling-ring-raging' : ''}`} />
            <div className={`reeling-water-ring reeling-ring-delay-1 ${fishStruggle === 'RAGING' ? 'reeling-ring-raging' : ''}`} />
            <div className={`reeling-water-ring reeling-ring-delay-2 ${fishStruggle === 'RAGING' ? 'reeling-ring-raging' : ''}`} />

            {/* Bọt nước và hạt nước bắn tung tóe */}
            <span className="reel-drop reel-drop-1">💦</span>
            <span className="reel-drop reel-drop-2">🫧</span>
            <span className="reel-drop reel-drop-3">💧</span>
            <span className="reel-drop reel-drop-4">{fishStruggle === 'RAGING' ? '⚡' : ''}</span>

            {/* Vòng phát sáng cảnh báo khi cá sung sức RAGING */}
            {fishStruggle === 'RAGING' && (
              <div className="absolute -top-7 -left-7 w-14 h-14 rounded-full border-2 border-red-400 animate-ping opacity-80" />
            )}
          </div>
        )}

        {/* FISHING LINE SVG */}
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            gamePhase === 'SWINGING' ? 'z-[35]' : 'z-20'
          }`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Aiming Beam Line during SWINGING */}
          {gamePhase === 'SWINGING' && (
            <>
              {/* Tia dẫn hướng nét đứt xoay từ đúng tâm mèo */}
              <line
                x1={`${CAT_ORIGIN.x}%`}
                y1={`${CAT_ORIGIN.y}%`}
                x2={`${CAT_ORIGIN.x + Math.sin((rodAngle * Math.PI) / 180) * 45}%`}
                y2={`${CAT_ORIGIN.y - Math.cos((rodAngle * Math.PI) / 180) * 45}%`}
                stroke="rgba(254, 240, 138, 0.85)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
              />

              {/* Tâm xoay điều hướng: Điểm chốt vàng nổi bật ngay chính giữa ảnh mèo */}
              <circle
                cx={`${CAT_ORIGIN.x}%`}
                cy={`${CAT_ORIGIN.y}%`}
                r="4.5"
                fill="#FACC15"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                className="drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
              />

              {/* Điểm ngắm đầu cần câu phát sáng */}
              <circle
                cx={`${CAT_ORIGIN.x + Math.sin((rodAngle * Math.PI) / 180) * 45}%`}
                cy={`${CAT_ORIGIN.y - Math.cos((rodAngle * Math.PI) / 180) * 45}%`}
                r="3.5"
                fill="#FEF08A"
                stroke="#EAB308"
                strokeWidth="1.2"
                className="drop-shadow-[0_0_8px_rgba(254,240,138,0.9)]"
              />
            </>
          )}

          {/* Active Fishing Line during CASTING, REELING, RETRACTING */}
          {(gamePhase === 'CASTING' || gamePhase === 'REELING' || gamePhase === 'RETRACTING') && (
            <line
              x1={`${CAT_ORIGIN.x}%`}
              y1={`${CAT_ORIGIN.y}%`}
              x2={`${hookPos.x}%`}
              y2={`${hookPos.y}%`}
              stroke="#FEF08A"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={
                gamePhase === 'REELING' && fishStruggle === 'RAGING'
                  ? 'line-tension-raging drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                  : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
              }
            />
          )}
        </svg>

        {/* LƯỠI CÂU KIM LOẠI NỐI CHUẨN XÁC VỚI DÂY CÂU (0PX LỆCH, CÙNG CHIỀU VỚI CƯỚC) */}
        {(gamePhase === 'CASTING' || gamePhase === 'REELING' || gamePhase === 'RETRACTING') && (() => {
          const deltaX = hookPos.x - CAT_ORIGIN.x;
          const deltaY = hookPos.y - CAT_ORIGIN.y;
          const lineAngleDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
          const hookRotationDeg = lineAngleDeg - 90;

          return (
            <div
              className="absolute z-30 pointer-events-none"
              style={{
                left: `${hookPos.x}%`,
                top: `${hookPos.y}%`,
                width: '24px',
                height: '32px',
                transform: `translate(-12px, -4px) rotate(${hookRotationDeg}deg)`,
                transformOrigin: '12px 4px',
              }}
            >
              <svg
                width="24"
                height="32"
                viewBox="0 0 24 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]"
              >
                <defs>
                  <linearGradient id="pondHookMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="35%" stopColor="#E2E8F0" />
                    <stop offset="70%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                </defs>

                {/* Thân lưỡi câu uốn cong kim loại sắc bén */}
                <path
                  d="M12 4 V20 C12 26 5 26 5 20 V15 L3 17"
                  stroke="url(#pondHookMetal)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Mũi ngạnh sắc bén (Sharp barb) */}
                <path
                  d="M5 20 V14.5 L3.5 16.5"
                  stroke="#F1F5F9"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Khuyên xỏ dây câu (Eyelet) tại (12, 4) - Nối thẳng tắp khít 100% với dây cước */}
                <circle cx="12" cy="4" r="3" fill="#334155" stroke="url(#pondHookMetal)" strokeWidth="1.8" />
                <circle cx="12" cy="4" r="1.3" fill="#FEF08A" />

                {/* Nút thắt dây câu mạ vàng (Line knot bead) */}
                <circle cx="12" cy="2.5" r="1.6" fill="#FACC15" />
              </svg>
            </div>
          );
        })()}

        {/* CAT ANCHOR AT BOTTOM CENTER: HÌNH TRÒN ĐỎ Ở GIỮA MÉP DƯỚI BỂ CÁ */}
        <div
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${CAT_ORIGIN.x}%`, top: `${CAT_ORIGIN.y}%` }}
        >

          {/* Prominent Red Circular Stage */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-red-500 to-red-700 border-4 border-yellow-300 shadow-[0_0_25px_rgba(239,68,68,0.8)] flex items-center justify-center overflow-hidden">
            {currentSkin.image ? (
              <img
                src={currentSkin.image}
                alt={currentSkin.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow-inner"
                draggable={false}
              />
            ) : (
              <span className="text-2xl">🐱</span>
            )}
            <span className="absolute bottom-0 right-1 text-xs">🎣</span>
          </div>
        </div>

        {/* 3. REELING MINI-GAME MODAL OVERLAY: ĐỘ KHÓ CAO & TƯƠNG TÁC KỊCH TÍNH */}
        {gamePhase === 'REELING' && hookedFish && (
          <div
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-4 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-bright/95 border-2 border-amber-400 rounded-3xl p-3 sm:p-4 max-w-sm w-full shadow-2xl flex flex-col items-center gap-2.5 animate-in zoom-in-95">
              {/* Compact Fish Info + Countdown Timer Header */}
              <div className="flex items-center justify-between w-full bg-amber-50/90 px-3 py-1.5 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={hookedFish.species.image}
                    alt={hookedFish.species.name}
                    className={`w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0 ${fishStruggle === 'RAGING' ? 'animate-bounce' : 'animate-pulse'}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-on-surface text-xs sm:text-sm truncate">
                        {hookedFish.species.name}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ backgroundColor: hookedFish.species.rarityColor }}
                      >
                        {hookedFish.species.difficultyLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      ~{hookedFish.species.baseWeightKg} kg
                    </span>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="text-[9px] text-amber-900 font-bold">Thời gian</span>
                  <span className="text-red-600 font-black font-mono text-sm sm:text-base leading-none">
                    ⏱️ {reelingTimeRemaining.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Header trạng thái: Hướng dẫn cho Cá Lớn (Tier 3) hoặc Báo Cước cho Tier 1 & 2 */}
              {getFishTier(hookedFish.species) === 3 ? (
                <div className="w-full flex items-center justify-between bg-purple-50/90 px-3 py-1 rounded-xl border border-purple-200 text-xs font-black text-purple-900">
                  <span className="flex items-center gap-1.5">
                    <span>🎮</span>
                    <span>Lái kim đỏ vào Vùng Xanh</span>
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    Cần Xanh ≥ 50%
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between gap-2 px-0.5">
                  {/* Fish State Pill */}
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
                      fishStruggle === 'RAGING'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white animate-pulse'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    }`}
                  >
                    <span>{fishStruggle === 'RAGING' ? '⚠️ Cá quẫy (Đừng bấm!)' : '🟢 Cá mệt'}</span>
                  </div>

                  {/* Tension Strikes (3 cơ hội) */}
                  <div className="flex items-center gap-1.5 bg-amber-100/80 px-2 py-1 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-900">Cước:</span>
                    {[1, 2, 3].map((lvl) => {
                      const isTriggered = lineTensionMistakes >= lvl;
                      return (
                        <span
                          key={lvl}
                          className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center transition-all ${
                            isTriggered
                              ? 'bg-red-600 text-white shadow-xs animate-bounce scale-110'
                              : 'bg-emerald-200 text-emerald-800'
                          }`}
                          title={lvl === 3 ? 'Đứt cước nếu phạm lỗi lần 3' : `Cảnh báo ${lvl}/3`}
                        >
                          {isTriggered ? (lvl === 3 ? '💥' : '✕') : lvl}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TIER 1: Cá Nhỏ */}
              {getFishTier(hookedFish.species) === 1 && (
                <div className="w-full flex flex-col items-center gap-1.5 text-center">
                  <div className="flex items-center justify-center gap-2 my-1">
                    {[1, 2, 3, 4, 5].map((step) => {
                      const done = 5 - pullTapsLeft >= step;
                      return (
                        <div
                          key={step}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all shadow-xs ${
                            done
                              ? 'bg-emerald-500 text-white scale-110 shadow-emerald-400/50'
                              : 'bg-surface-container-high border border-outline-variant/60 text-on-surface-variant'
                          }`}
                        >
                          {done ? '✓' : step}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-xs text-on-surface-variant font-bold">
                    {pullTapsLeft <= 0
                      ? '🎉 Đã thu phục thành công!'
                      : fishStruggle === 'TIRED'
                      ? `🟢 Còn ${pullTapsLeft} nhát kéo!`
                      : '🔴 Cá đang quẫy! Buông tay!'}
                  </span>
                </div>
              )}

              {/* TIER 2: Cá Vừa */}
              {getFishTier(hookedFish.species) === 2 && (
                <div className="w-full flex flex-col gap-1.5">
                  <div className="w-full h-5 bg-surface-container-high rounded-full overflow-hidden p-0.5 border border-outline-variant/40 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-green-500 rounded-full transition-all duration-75 shadow-xs"
                      style={{ width: `${reelProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-on-surface-variant">
                    <span>{Math.round(reelProgress)}% / 100%</span>
                    <span className={fishStruggle === 'TIRED' ? 'text-emerald-700 font-black' : 'text-red-600 font-black'}>
                      {fishStruggle === 'TIRED' ? '🟢 Nhấp liên tục lên 100%!' : '🔴 Thả ra kẻo đứt cước!'}
                    </span>
                  </div>
                </div>
              )}

              {/* TIER 3: Cá Lớn / Cực Khó (ĐIỀU KHIỂN TRÁI / PHẢI & CÂN BẰNG TIẾN TRÌNH) */}
              {getFishTier(hookedFish.species) === 3 && (() => {
                const isNeedleInZone = tension >= safeZoneBounds.min && tension <= safeZoneBounds.max;
                return (
                  <div className="w-full flex flex-col gap-2">
                    {/* Status header: In zone / Out zone */}
                    <div className="flex justify-between items-center text-xs font-bold px-0.5 text-purple-900">
                      <span>Lái kim đỏ vào Vùng Xanh:</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black text-white transition-all ${
                          isNeedleInZone ? 'bg-emerald-600 animate-pulse shadow-xs' : 'bg-rose-500'
                        }`}
                      >
                        {isNeedleInZone ? '🎯 TRONG VÙNG XANH' : '⚠️ LỆCH MỤC TIÊU'}
                      </span>
                    </div>

                    {/* Tension Bar with MOVING Safe Zone & Touchable Needle */}
                    <div
                      className="relative w-full h-8 bg-surface-container-high rounded-full overflow-hidden border-2 border-purple-300 shadow-inner cursor-pointer select-none touch-none"
                      onPointerDown={(e) => handleBarPointer(e)}
                      onPointerMove={(e) => {
                        if (e.buttons > 0 && fishStruggle !== 'RAGING') handleBarPointer(e);
                      }}
                      title="Chạm hoặc kéo trực tiếp trên thanh để di chuyển kim đỏ"
                    >
                      {/* Moving Green Safe Zone */}
                      <div
                        className={`absolute top-0 bottom-0 transition-all duration-100 ${
                          isNeedleInZone
                            ? 'bg-emerald-400/90 border-x-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                            : 'bg-emerald-400/50 border-x-2 border-emerald-600'
                        }`}
                        style={{
                          left: `${safeZoneBounds.min}%`,
                          width: `${safeZoneBounds.max - safeZoneBounds.min}%`,
                        }}
                      />
                      {/* Tension Needle (Kim Đỏ) */}
                      <div
                        className="absolute top-0 bottom-0 w-3 bg-red-600 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.95)] border border-white transition-all duration-75 -ml-1.5 z-10 flex items-center justify-center pointer-events-none"
                        style={{ left: `${tension}%` }}
                      >
                        <div className="w-1 h-4 bg-white rounded-full opacity-90" />
                      </div>
                    </div>

                    {/* DUAL PROGRESS BAR: 100% CÂN BẰNG XANH (THU PHỤC) & ĐỎ (PHẢN KHÁNG) */}
                    {(() => {
                      const greenPercent = Math.max(0, Math.min(100, Math.round(safeHoldProgress)));
                      const redPercent = 100 - greenPercent;
                      return (
                        <div className="flex flex-col gap-1 w-full bg-surface-container/60 p-2 rounded-2xl border border-amber-200/80">
                          <div className="flex justify-between items-center text-xs font-black px-0.5">
                            <span className="text-emerald-700 flex items-center gap-1">
                              <span>🟢 Xanh:</span>
                              <span className="font-mono text-sm">{greenPercent}%</span>
                            </span>
                            <span className="text-[10px] text-amber-800 font-bold">
                              {greenPercent >= 50 ? '🏆 Đang thắng (≥50%)' : '⚠️ Cần Xanh ≥ 50%'}
                            </span>
                            <span className="text-red-600 flex items-center gap-1">
                              <span className="font-mono text-sm">{redPercent}%</span>
                              <span>:Đỏ 🔴</span>
                            </span>
                          </div>

                          {/* Thanh tiến trình 100% đồng bộ tuyệt đối: Nền Đỏ + Lớp phủ Xanh */}
                          <div className="relative w-full h-4 bg-rose-500 rounded-full overflow-hidden border border-white shadow-inner">
                            {/* Bên XANH (Thu phục) phủ chính xác theo % hiển thị */}
                            <div
                              className="h-full bg-emerald-500 transition-all duration-75 relative rounded-full"
                              style={{ width: `${greenPercent}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                            </div>

                            {/* Vạch mốc ranh giới 50% ở giữa */}
                            <div
                              className="absolute top-0 bottom-0 left-1/2 -ml-0.5 w-1 bg-yellow-300 z-10 shadow-[0_0_6px_rgba(253,224,71,1)] pointer-events-none"
                              title="Mốc cân bằng 50%"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* CÁC NÚT ĐIỀU KHIỂN: Nút Trái / Phải cho Tier 3, Nút Kéo cho Tier 1 & 2 */}
              {getFishTier(hookedFish.species) === 3 ? (
                <div className="grid grid-cols-2 gap-2.5 w-full mt-0.5">
                  <button
                    type="button"
                    className="py-3 px-2 rounded-2xl font-black text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-1.5 border-2 cursor-pointer select-none touch-none active:scale-95 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:brightness-110 text-white border-white/60 shadow-blue-500/30"
                    onPointerDown={(e) => handleNeedleMoveStart(e, -1)}
                    onPointerUp={handleNeedleMoveEnd}
                    onPointerLeave={handleNeedleMoveEnd}
                    onPointerCancel={handleNeedleMoveEnd}
                  >
                    <span className="text-lg">◀</span>
                    <span>QUA TRÁI</span>
                  </button>

                  <button
                    type="button"
                    className="py-3 px-2 rounded-2xl font-black text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-1.5 border-2 cursor-pointer select-none touch-none active:scale-95 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:brightness-110 text-white border-white/60 shadow-indigo-500/30"
                    onPointerDown={(e) => handleNeedleMoveStart(e, 1)}
                    onPointerUp={handleNeedleMoveEnd}
                    onPointerLeave={handleNeedleMoveEnd}
                    onPointerCancel={handleNeedleMoveEnd}
                  >
                    <span>QUA PHẢI</span>
                    <span className="text-lg">▶</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePullClick}
                  className={`w-full py-3 mt-0.5 rounded-2xl font-black text-base sm:text-lg shadow-xl transition-all flex items-center justify-center gap-2 border-2 cursor-pointer select-none active:scale-95 ${
                    fishStruggle === 'TIRED'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-white border-emerald-200 animate-pulse shadow-emerald-500/40'
                      : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-700 text-white border-yellow-300 shadow-red-500/50'
                  }`}
                >
                  <span className="text-xl">{fishStruggle === 'TIRED' ? '🎣' : '⚠️'}</span>
                  <span>
                    {fishStruggle === 'TIRED'
                      ? 'NHẤP ĐỂ KÉO! (CÁ MỆT)'
                      : 'BUÔNG TAY RA! (CÁ QUẪY)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* CATCH CELEBRATION TOAST BANNER */}
        {catchToast && (
          <div className="pond-catch-banner">
            <span className="banner-star"></span>
            <div className="min-w-0">
              <h4 className="banner-head">{catchToast.text}</h4>
              <p className="banner-sub">{catchToast.sub}</p>
            </div>
            <span className="banner-star"></span>
          </div>
        )}

        {/* BROKEN ROD ALERT */}
        {brokenAlert && (
          <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full font-bold shadow-2xl border-2 border-white flex items-center justify-center gap-1.5 animate-bounce max-w-[88vw] text-xs sm:text-sm text-center">
            <span>💥</span>
            <span>{brokenAlert}</span>
          </div>
        )}

        {/* HUNGRY CAT ALERT */}
        {hungryAlert && (
          <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-bold shadow-2xl border-2 border-white flex flex-col items-center gap-1.5 animate-bounce max-w-[90vw] text-xs sm:text-sm text-center">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">😿</span>
              <span>{hungryAlert}</span>
            </div>
            {onGoToFeed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToFeed();
                }}
                className="mt-0.5 px-3.5 py-1 rounded-full bg-white text-red-600 font-black text-xs shadow-md hover:bg-amber-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🍱</span>
                <span>Về phòng cho Boss ăn ngay</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. RESPONSIVE BOTTOM ACTION BAR (CỐ ĐỊNH CHIỀU CAO KHUNG HÌNH KHÔNG CO GIÃN) */}
      <div className="flex flex-col gap-1.5 px-3 pt-1.5 pb-2 bg-white/80 backdrop-blur-md border-t border-amber-200/50 shrink-0">
        {/* Mẹo câu cá phong cách kawaii hổ phách */}
        <div className="px-2.5 py-1 rounded-xl bg-amber-50/90 border border-amber-200/70 text-[11px] text-[#6E4D3E] font-medium leading-tight flex items-center gap-1.5">
          <span className="text-sm shrink-0">💡</span>
          <p className="line-clamp-1">
            <strong>Mẹo:</strong> Cần xịn ra dây nhanh hơn ({currentRod.lineSpeed}x) và hút cá to! Cần lắc lư nhớ hành trình, tiếp tục xoay sau mỗi lượt câu.
          </p>
        </div>

        {/* Hàng 3 Nút Bấm Chính: [Đổi Cần 🎣] [Quăng Cần Ngay 🎯] [Kho Cá 🎒] */}
        <div className="flex items-center gap-2">
          {/* Nút 1: Đổi Cần (Tiện ích đổi cần nhanh) */}
          <button
            type="button"
            onClick={() => {
              setRodModalTab('owned');
              setIsRodShopOpen(true);
            }}
            className="w-16 sm:w-20 h-12 rounded-2xl bg-white border-2 border-amber-300 text-amber-900 shadow-[0_3px_0_#d4b088] active:translate-y-0.5 active:shadow-none flex flex-col items-center justify-center gap-0.5 hover:bg-amber-50 active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Đổi cần câu nhanh"
          >
            <span className="text-base leading-none">🎣</span>
            <span className="text-[10px] sm:text-xs font-black">Đổi Cần</span>
          </button>

          {/* Nút 2: Quăng Cần Ngay hoặc Nút Báo Mèo Đói */}
          {isCatHungry ? (
            <button
              type="button"
              onClick={onGoToFeed || handleCastLine}
              className="flex-1 h-12 rounded-2xl font-extrabold text-xs sm:text-sm shadow-[0_4px_0_#991B1B] bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white hover:opacity-95 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center gap-1.5 select-none animate-pulse"
            >
              <span>😿</span>
              <span>Mèo Đang Đói • Cho Boss Ăn Ngay 🍱</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={gamePhase === 'SWINGING' ? handleCastLine : undefined}
              disabled={gamePhase !== 'SWINGING'}
              className={`flex-1 h-12 rounded-2xl font-extrabold text-sm sm:text-base shadow-[0_4px_0_#E25D45] transition-all flex items-center justify-center gap-1.5 select-none ${
                gamePhase === 'SWINGING'
                  ? 'bg-gradient-to-r from-[#FF7E67] via-[#FF6B6B] to-[#E25D45] text-white hover:opacity-95 active:translate-y-0.5 active:shadow-none cursor-pointer'
                  : 'bg-[#F1DEDC] text-[#8B716D] shadow-none cursor-not-allowed opacity-90'
              }`}
            >
              {gamePhase === 'SWINGING' && (
                <>
                  <span>Quăng Cần Ngay</span>
                  <span>🎯</span>
                </>
              )}
              {gamePhase === 'CASTING' && (
                <>
                  <span>Đang Phóng Dây...</span>
                  <span>🪝</span>
                </>
              )}
              {gamePhase === 'REELING' && (
                <>
                  <span>Đang Kéo Cá!</span>
                  <span>⚡</span>
                </>
              )}
              {gamePhase === 'RETRACTING' && (
                <>
                  <span>Đang Thu Dây Về...</span>
                  <span>🔄</span>
                </>
              )}
            </button>
          )}


          {/* Nút 3: Balo Mèo Tách Nền (thay cho nút Kho Cá cũ) */}
          {onOpenBasket && (
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                onOpenBasket();
              }}
              className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer active:scale-90 hover:scale-110 transition-transform shrink-0 animate-backpack-wiggle bg-transparent border-none p-0 outline-none select-none"
              title="Mở Balo Của Boss (Kho cá, Cần câu, Thời trang)"
              aria-label="Mở Balo Của Boss"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src="/images/icon/ba-lo-hinh-meo.webp"
                  alt="Balo Boss Mèo"
                  className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.32)]"
                  draggable={false}
                />
                {basketCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-md border-2 border-white leading-tight z-10 animate-pulse">
                    {basketCount}/{maxBasketCapacity}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="w-28 h-1 bg-[#6E4D3E]/15 rounded-full mx-auto mt-0.5" />
      </div>

      {/* 5. CỬA SỔ ĐỔI CẦN & CỬA HÀNG CẦN CÂU (ROD SWITCHER & SHOP MODAL) */}
      {isRodShopOpen && (() => {
        const ownedList = FISHING_RODS_CATALOG.filter(
          (r) => (unlockedRods || ['wood_rod']).includes(r.id) || r.id === activeRodId || r.price === 0
        );

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
            onClick={() => setIsRodShopOpen(false)}
          >
            <div
              className="bg-surface-bright rounded-3xl border border-outline-variant/40 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎣</span>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Đổi Cần & Cửa Hàng Cần</h3>
                    <p className="text-xs opacity-90">Chuyển cần đã sở hữu hoặc sắm cần mới xịn xò</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRodShopOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white font-bold flex items-center justify-center hover:bg-white/30 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status Header: Current Rod & Coins */}
              <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {currentRod.image ? (
                      <img
                        src={currentRod.image}
                        alt={currentRod.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-lg">{currentRod.icon}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-900 block leading-tight">
                      Đang dùng: <strong>{currentRod.name}</strong>
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        durability <= 3 ? 'text-red-600 font-extrabold animate-pulse' : 'text-emerald-700'
                      }`}
                    >
                      Độ bền: {durability}/{currentRod.maxDurability} lượt • Ra dây: {currentRod.lineSpeed}x
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-bold text-amber-900 text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200">
                  <img
                    src="/images/icon/xu-vang.webp"
                    alt="Xu"
                    className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                    draggable={false}
                  />
                  <span>{formatNumber(fish)}</span>
                </div>
              </div>

              {/* 2 Navigation Capsule Tabs */}
              <div className="grid grid-cols-2 p-1.5 bg-amber-100/60 border-b border-amber-200/80 gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setRodModalTab('owned')}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rodModalTab === 'owned'
                      ? 'bg-white text-amber-900 shadow-sm border border-amber-300 font-black'
                      : 'text-amber-800/70 hover:bg-white/50'
                  }`}
                >
                  <span>🎣 Cần Đã Có</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[10px]">
                    {ownedList.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRodModalTab('shop')}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rodModalTab === 'shop'
                      ? 'bg-white text-amber-900 shadow-sm border border-amber-300 font-black'
                      : 'text-amber-800/70 hover:bg-white/50'
                  }`}
                >
                  <span>🏪 Shop Cần Mới</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[10px]">
                    {FISHING_RODS_CATALOG.length}
                  </span>
                </button>
              </div>

              {/* Tab 1: Cần Đã Có (Đổi Cần Nhanh & Sửa Cần) */}
              {rodModalTab === 'owned' && (
                <div className="p-3 overflow-y-auto flex flex-col gap-2.5">
                  {ownedList.map((rod) => {
                    const isEquipped = rod.id === activeRodId;
                    const rodDura = isEquipped ? durability : rod.maxDurability;
                    const duraPercent = Math.round((rodDura / rod.maxDurability) * 100);
                    const repairPrice = rod.repairPrice ?? rod.repairCost ?? getRodRepairCost(rod);

                    return (
                      <div
                        key={rod.id}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                          isEquipped
                            ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                            : 'border-outline-variant/40 bg-surface-container-lowest hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-amber-100/90 border border-amber-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              {rod.image ? (
                                <img
                                  src={rod.image}
                                  alt={rod.name}
                                  className="w-full h-full object-contain drop-shadow-xs"
                                />
                              ) : (
                                <span className="text-2xl">{rod.icon}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-on-surface truncate">{rod.name}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0">
                                  {rod.badge}
                                </span>
                              </div>
                              <span className="text-xs text-on-surface-variant font-medium block">
                                Ra dây: <strong>{rod.lineSpeed}x</strong> • Cá to: +
                                <strong>{Math.round((rod.bigFishLuck || 0) * 90)}%</strong>
                              </span>
                            </div>
                          </div>

                          {isEquipped && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                              ✓ Đang Dùng
                            </span>
                          )}
                        </div>

                        {/* Durability Progress Bar */}
                        <div className="flex flex-col gap-1 p-1.5 rounded-xl bg-white/80 border border-amber-200/60">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={rodDura <= 3 ? 'text-red-600' : 'text-amber-800'}>
                              Độ bền cần câu
                            </span>
                            <span className={rodDura <= 3 ? 'text-red-600' : 'text-emerald-700'}>
                              {rodDura}/{rod.maxDurability} lượt ({duraPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                rodDura <= 3 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${duraPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div>
                          {isEquipped && durability > 0 ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs cursor-default flex items-center justify-center gap-1"
                            >
                              <span>✓</span>
                              <span>Đang trang bị cần này</span>
                            </button>
                          ) : isEquipped && durability <= 0 ? (
                            <button
                              type="button"
                              onClick={() => handleBuyRod(rod.id)}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xs shadow-xs hover:opacity-95 active:scale-98 transition-transform cursor-pointer"
                            >
                              🔧 Sửa cần câu ({repairPrice > 0 ? `${formatNumber(repairPrice)} xu` : 'Miễn phí'})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBuyRod(rod.id)}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-xs hover:opacity-95 active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>✨</span>
                              <span>Trang Bị Cần Này Ngay (Miễn phí)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Shop Cần Mới */}
              {rodModalTab === 'shop' && (
                <div className="p-3 overflow-y-auto flex flex-col gap-2.5">
                  {FISHING_RODS_CATALOG.map((rod) => {
                    const isEquipped = rod.id === activeRodId;
                    const isUnlocked = (unlockedRods || ['wood_rod']).includes(rod.id);
                    const canAfford = fish >= rod.price;

                    return (
                      <div
                        key={rod.id}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                          isEquipped
                            ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                            : 'border-outline-variant/40 bg-surface-container-lowest hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant/50 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              {rod.image ? (
                                <img
                                  src={rod.image}
                                  alt={rod.name}
                                  className="w-full h-full object-contain drop-shadow-xs hover:scale-110 transition-transform"
                                />
                              ) : (
                                <span className="text-2xl">{rod.icon}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-on-surface truncate">{rod.name}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0">
                                  {rod.badge}
                                </span>
                              </div>
                              <span className="text-xs text-on-surface-variant font-medium block">
                                Độ bền: <strong>{rod.maxDurability} lượt</strong> • Ra dây: <strong>{rod.lineSpeed}x</strong> • Cá to: +
                                <strong>{Math.round((rod.bigFishLuck || 0) * 90)}%</strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <span className="text-xs font-extrabold text-amber-700 flex items-center justify-end gap-1">
                              <span>{rod.price === 0 ? 'Miễn phí' : formatNumber(rod.price)}</span>
                              {rod.price > 0 && (
                                <img
                                  src="/images/icon/xu-vang.webp"
                                  alt="Xu"
                                  className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                                  draggable={false}
                                />
                              )}
                            </span>
                            {isUnlocked && (
                              <span className="text-[10px] font-bold text-emerald-700 block">
                                Đã sở hữu
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {rod.description}
                        </p>

                        <div>
                          {isEquipped && durability > 0 ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs cursor-default flex items-center justify-center gap-1"
                            >
                              <span>✓</span>
                              <span>Đang sử dụng ({durability}/{rod.maxDurability} lượt)</span>
                            </button>
                          ) : isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleBuyRod(rod.id)}
                              className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 active:scale-98 transition-transform cursor-pointer"
                            >
                              Đổi Sang Cần Này Ngay (Đã sở hữu)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBuyRod(rod.id)}
                              disabled={!canAfford && rod.price > 0}
                              className={`w-full py-2 rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-98 cursor-pointer ${
                                rod.price === 0
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : canAfford
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95'
                                  : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {rod.price === 0
                                ? 'Trang bị miễn phí'
                                : canAfford
                                ? `Mua & Trang Bị (${formatNumber(rod.price)} xu)`
                                : `Chưa đủ xu (${formatNumber(rod.price)} xu)`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
});
