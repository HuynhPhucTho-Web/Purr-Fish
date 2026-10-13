import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FISH_CATALOG, type FishSpecies, type CaughtFishItem } from '../data/fishes';
import type { CatSkin } from '../data/skins';
import { getRodById, FISHING_RODS_CATALOG, type FishingRod } from '../data/fishingRods';
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
  equippedRodId?: string;
  rodDurability?: number;
  unlockedRods?: string[];
  onCatchFish: (species: FishSpecies) => CaughtFishItem;
  onBuyRod?: (rodId: string) => { success: boolean; message: string };
  onUseRodDurability?: () => number;
  onOpenBasket?: () => void;
  onClose: () => void;
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
 * Chọn loài cá xuất hiện dựa trên độ may mắn của cần câu:
 * Cần cấp cao (Vàng, Thần Thoại) có tỷ lệ gặp cá to, cá khủng và cá hiếm cao hơn rất nhiều.
 * Hỗ trợ excludeIds để ưu tiên xuất hiện đa dạng nhiều loài cá khác nhau trong bể.
 */
function rollFishForRod(rod: FishingRod, excludeIds: string[] = []): FishSpecies {
  const luck = rod.bigFishLuck ?? 0.2;
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

export const FishPond: React.FC<FishPondProps> = ({
  currentSkin,
  fish,
  equippedRodId = 'wood_rod',
  rodDurability = 10,
  unlockedRods = ['wood_rod'],
  onCatchFish,
  onBuyRod,
  onUseRodDurability,
  onOpenBasket,
}) => {
  const pondRef = useRef<HTMLDivElement>(null);

  // Rod & Durability state
  const [activeRodId, setActiveRodId] = useState<string>(equippedRodId);
  const [durability, setDurability] = useState<number>(rodDurability);
  const [isRodShopOpen, setIsRodShopOpen] = useState<boolean>(false);
  const [rodModalTab, setRodModalTab] = useState<'owned' | 'shop'>('owned');
  const [brokenAlert, setBrokenAlert] = useState<string | null>(null);

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
  const [safeHoldProgress, setSafeHoldProgress] = useState<number>(0); // Tier 3: (0 - 100)
  const [reelingTimeRemaining, setReelingTimeRemaining] = useState<number>(5.0); // Seconds
  const [safeZoneBounds, setSafeZoneBounds] = useState<{ min: number; max: number }>({ min: 35, max: 70 });
  const [fishStruggle, setFishStruggle] = useState<FishStruggleState>('TIRED');

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

  // Dừng âm thanh kéo cá khi rời khỏi bể cá
  useEffect(() => {
    return () => {
      soundManager.stopReelingSound();
    };
  }, []);

  // Helper to spawn a new natural swimming fish with distinct speeds & swimming characteristics
  const createSwimmingFish = useCallback(
    (index: number, totalCount: number, rod: FishingRod, excludeIds: string[] = []): ActiveSwimmingFish => {
      const species = rollFishForRod(rod, excludeIds);
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
    setBrokenAlert('Cần câu đã hỏng! Hãy mua cần mới');
    setGamePhase('SWINGING');
    setTimeout(() => {
      setIsRodShopOpen(true);
    }, 600);
  }, []);

  // Thu hoạch cá thành công
  const handleCatchSuccess = useCallback(() => {
    const caught = hookedFishRef.current;
    if (!caught) return;

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
      const newSpecies = rollFishForRod(currentRodRef.current, activeIds);
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
      if (!escaped) return;

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

  // UNINTERRUPTED 60 FPS PHYSICS SIMULATION LOOP
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
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

      if (hasFishChanges) {
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

          const rodHitBonus = (rod.bigFishLuck || 0) * 1.6;
          const hitbox = f.species.size / 36 + 2.2 + (f.species.baseWeightKg > 5 ? rodHitBonus : 0);

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

          // Reset struggle cycle
          fishStruggleRef.current = 'TIRED';
          setFishStruggle('TIRED');
          struggleTimerRef.current = 1.6;

          // Setup difficulty tier (Hardcore Balance)
          const diff = hitFish.species.difficultyLevel;
          if (diff <= 1 || hitFish.species.baseWeightKg < 2.5) {
            setPullTapsLeft(6); // 6 nhát giật (trước là 4)
            setReelingTimeRemaining(2.8); // 2.8s giới hạn giật cá nhỏ!
          } else if (diff <= 3 || hitFish.species.baseWeightKg < 9) {
            setReelProgress(20);
            setReelingTimeRemaining(3.6); // 3.6s (trước là 5.0s)
          } else {
            setTension(50);
            setSafeHoldProgress(0);
            setReelingTimeRemaining(4.8); // 4.8s (trước là 6.5s)
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
        const diff = hookedFishRef.current.species.difficultyLevel;
        const decayStep = deltaMs / 1000;

        // Đổi chu kỳ cá vùng vẫy / cá đuối sức linh hoạt
        struggleTimerRef.current -= decayStep;
        if (struggleTimerRef.current <= 0) {
          if (fishStruggleRef.current === 'TIRED') {
            fishStruggleRef.current = 'RAGING';
            setFishStruggle('RAGING');
            soundManager.setReelingFishState(true);
            struggleTimerRef.current = 1.2 + Math.random() * 0.8;
            soundManager.playLineTension();
            soundManager.playFishStruggleSplash();
            soundManager.triggerHaptic(45);
          } else {
            fishStruggleRef.current = 'TIRED';
            setFishStruggle('TIRED');
            soundManager.setReelingFishState(false);
            struggleTimerRef.current = 1.5 + Math.random() * 0.8;
          }
        }

        const isRaging = fishStruggleRef.current === 'RAGING';

        // Tier 1 Small Fish: Giới hạn thời gian giật cá
        if (diff <= 1 || hookedFishRef.current.species.baseWeightKg < 2.5) {
          setReelingTimeRemaining((t) => {
            const nextT = t - decayStep;
            if (nextT <= 0) {
              handleFishEscape('Hết giờ! Cá nhỏ đã nhả mồi bơi mất!');
              return 0;
            }
            return nextT;
          });
        }

        // Medium Fish: Giằng co theo nhịp cá quẫy (Hardcore: quẫy -38%/s, mệt -14%/s)
        if (diff === 2 || diff === 3) {
          setReelingTimeRemaining((t) => {
            const nextT = t - decayStep;
            if (nextT <= 0) {
              handleFishEscape('Hết thời gian! Cá đã giật đứt mồi chạy mất!');
              return 0;
            }
            return nextT;
          });

          setReelProgress((p) => {
            const decayRate = isRaging ? 38 : 14;
            return Math.max(0, p - decayRate * decayStep);
          });
        }

        // Hard / Gigantic Fish: VÙNG AN TOÀN TRÔI DẠT (MOVING GREEN ZONE - HARDCORE)
        if (diff >= 4) {
          setReelingTimeRemaining((t) => {
            const nextT = t - decayStep;
            if (nextT <= 0) {
              handleFishEscape('Cá khổng lồ vùng vẫy quá lâu làm đứt dây!');
              return 0;
            }
            return nextT;
          });

          // Vùng an toàn trôi dạt nhanh và hẹp hơn
          const driftOffset = Math.sin(currentTime * 0.0038) * 22;
          const greenCenter = 50 + driftOffset;
          const halfWidth = 8 + (rod.safeZoneBonus || 0) * 0.28;
          const greenMin = Math.max(10, Math.round(greenCenter - halfWidth));
          const greenMax = Math.min(90, Math.round(greenCenter + halfWidth));
          setSafeZoneBounds({ min: greenMin, max: greenMax });

          // Sức căng tự tụt khi thả tay (tụt nhanh hơn khi cá quẫy)
          setTension((ten) => {
            const naturalDecay = isRaging ? 38 : 22;
            const nextTen = ten - naturalDecay * decayStep;

            if (nextTen >= 91) {
              handleFishEscape('💥 ĐỨT DÂY CÂU! Bạn đã giật cần quá mạnh làm đứt dây!');
              return 91;
            }
            if (nextTen <= 9) {
              handleFishEscape('💨 SẨY CÁ! Dây câu quá chùng, cá đã nhả lưỡi câu chạy mất!');
              return 0;
            }
            return nextTen;
          });

          setTension((curTen) => {
            const isInZone = curTen >= greenMin && curTen <= greenMax;
            setSafeHoldProgress((sp) => {
              // Nạp tiến trình chậm hơn, tụt nhanh hơn nếu trượt khỏi vùng xanh
              const gainRate = isRaging ? 18 : 28;
              const deltaHold = isInZone ? gainRate * decayStep : -25 * decayStep;
              const nextHold = Math.min(100, Math.max(0, sp + deltaHold));
              if (nextHold >= 100) {
                handleCatchSuccess();
              }
              return nextHold;
            });
            return curTen;
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [handleCatchSuccess, handleFishEscape, handleRodBroken, onUseRodDurability]);

  // Quăng Dây Câu
  const handleCastLine = () => {
    if (gamePhase !== 'SWINGING') return;

    if (durability <= 0) {
      handleRodBroken();
      return;
    }

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

  // Bấm nút "KÉO" (PULL) trong mini-game tương tác
  const handlePullClick = () => {
    if (gamePhase !== 'REELING' || !hookedFish) return;

    soundManager.startReelingSound();
    const diff = hookedFish.species.difficultyLevel;
    const isRaging = fishStruggleRef.current === 'RAGING';

    const reelPitch = isRaging ? 0.95 : 1.35;
    soundManager.playReelClick(reelPitch);
    if (isRaging) {
      soundManager.playFishStruggleSplash();
    }
    soundManager.triggerHaptic(isRaging ? 50 : 30);

    // Tier 1: Small Fish (6 taps - nếu bấm lúc cá quẫy có thể bị tuột 1 tap)
    if (diff <= 1 || hookedFish.species.baseWeightKg < 2.5) {
      if (isRaging && Math.random() < 0.45 && pullTapsLeft < 6) {
        soundManager.playFishStruggleSplash();
        setPullTapsLeft((prev) => Math.min(6, prev + 1));
      } else {
        const remaining = pullTapsLeft - 1;
        setPullTapsLeft(remaining);
        if (remaining <= 0) {
          handleCatchSuccess();
        }
      }
      return;
    }

    // Tier 2: Medium (Đo lực nhịp nhàng - nếu kéo lúc cá đang quẫy sẽ bị phạt giật lùi!)
    if (diff <= 3 || hookedFish.species.baseWeightKg < 9) {
      if (isRaging) {
        soundManager.playFishStruggleSplash();
        soundManager.triggerHaptic(50);
        // Kéo sai nhịp lúc cá quẫy bị phạt tụt lùi tiến trình
        setReelProgress((prev) => Math.max(0, prev - 6));
        return;
      }
      const addedPower = 16 * currentRod.reelingPower;
      setReelProgress((prev) => {
        const nextP = prev + addedPower;
        if (nextP >= 100) {
          handleCatchSuccess();
          return 100;
        }
        return nextP;
      });
      return;
    }

    // Tier 3: Hard (Kiểm soát sức căng trong Vùng An Toàn - nhạy cảm với đứt dây)
    if (diff >= 4) {
      setTension((prev) => {
        const added = (isRaging ? 22 : 12) * currentRod.reelingPower;
        const nextTen = prev + added;
        if (nextTen >= 91) {
          handleFishEscape('💥 ĐỨT DÂY CÂU! Bạn đã giật cần quá mạnh lúc cá quẫy!');
          return 91;
        }
        return nextTen;
      });
    }
  };

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
        soundManager.playUnlock();
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
      <div className="flex flex-col gap-1.5 px-3 pt-2 pb-1.5 bg-white/80 backdrop-blur-md border-b border-amber-200/50 shadow-xs z-50 shrink-0">
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
              <span>🪙</span>
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
        className="relative mx-2 sm:mx-3 rounded-2xl sm:rounded-3xl border-4 border-white/95 shadow-md overflow-hidden bg-slate-900 cursor-crosshair select-none flex-1 min-h-[420px] sm:min-h-[460px] max-h-[580px] my-1"
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
          const displaySize = Math.max(48, Math.min(84, Math.round(fishItem.species.size * 0.72)));
          const isHookedInReel = gamePhase === 'REELING' && hookedFish?.instanceId === fishItem.instanceId;
          const struggleClass = isHookedInReel
            ? fishStruggle === 'RAGING'
              ? 'fish-thrashing-raging'
              : 'fish-struggling-tired'
            : '';

          return (
            <div
              key={fishItem.instanceId}
              className={`swimming-fish-actor ${fishItem.isCaught ? 'fish-got-caught' : ''} ${struggleClass}`}
              style={{
                left: `${fishItem.x}%`,
                top: `${fishItem.y}%`,
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                transform: 'translate(-50%, -50%)',
                transition: isHookedInReel ? 'none' : 'opacity 0.3s ease',
              }}
            >
              {/* HÌNH ẢNH CÁ: Bơi đúng hướng đầu và góc lượn sóng */}
              <img
                src={fishItem.species.image}
                alt={fishItem.species.name}
                className="fish-actor-img pointer-events-none w-full h-full object-contain"
                style={{
                  transform: fishItem.isCaught
                    ? undefined
                    : `scaleX(${fishItem.facingRight ? -1 : 1}) rotate(${
                        fishItem.facingRight ? -fishItem.pitch : fishItem.pitch
                      }deg)`,
                }}
                draggable={false}
              />
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
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Aiming Beam Line during SWINGING */}
          {gamePhase === 'SWINGING' && (
            <line
              x1={`${CAT_ORIGIN.x}%`}
              y1={`${CAT_ORIGIN.y - 4}%`}
              x2={`${CAT_ORIGIN.x + Math.sin((rodAngle * Math.PI) / 180) * 45}%`}
              y2={`${CAT_ORIGIN.y - 4 - Math.cos((rodAngle * Math.PI) / 180) * 45}%`}
              stroke="rgba(254, 240, 138, 0.65)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
          )}

          {/* Active Fishing Line during CASTING, REELING, RETRACTING */}
          {(gamePhase === 'CASTING' || gamePhase === 'REELING' || gamePhase === 'RETRACTING') && (
            <line
              x1={`${CAT_ORIGIN.x}%`}
              y1={`${CAT_ORIGIN.y - 4}%`}
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
          const deltaY = hookPos.y - (CAT_ORIGIN.y - 4);
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
          className="absolute z-30 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${CAT_ORIGIN.x}%`, bottom: '6px' }}
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
            <div className="bg-surface-bright/95 border-2 border-amber-400 rounded-3xl p-3.5 sm:p-5 max-w-sm w-full max-h-[88vh] overflow-y-auto shadow-2xl flex flex-col items-center gap-2.5 sm:gap-3 animate-in zoom-in-95">
              {/* Fish Preview Badge */}
              <div className="flex items-center gap-3 w-full bg-amber-50/90 p-2 sm:p-2.5 rounded-2xl border border-amber-200">
                <img
                  src={hookedFish.species.image}
                  alt={hookedFish.species.name}
                  className={`w-12 h-12 sm:w-14 sm:h-14 object-contain ${fishStruggle === 'RAGING' ? 'animate-bounce' : 'animate-pulse'}`}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-on-surface text-sm truncate">
                      {hookedFish.species.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: hookedFish.species.rarityColor }}
                    >
                      {hookedFish.species.difficultyLabel}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-on-surface-variant font-medium mt-0.5 leading-tight">
                    ⚖️ Chuẩn loài: ~{hookedFish.species.baseWeightKg} kg • Giá: +
                    {hookedFish.species.pricePerKg} xu/kg
                  </p>
                </div>
              </div>

              {/* DYNAMIC FISH STRUGGLE STATUS ALERT BANNER */}
              <div
                className={`w-full py-1.5 px-2.5 rounded-xl text-center text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 leading-tight ${fishStruggle === 'RAGING'
                    ? 'bg-red-500 text-white animate-pulse shadow-sm'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
              >
                {fishStruggle === 'RAGING' ? (
                  <>
                    <span>⚠️</span>
                    <span>CÁ ĐANG QUẪY MẠNH! GIỮ NHẸ TAY!</span>
                  </>
                ) : (
                  <>
                    <span></span>
                    <span>CÁ THẤM MỆT! KÉO DỒN LỰC (+150%)</span>
                  </>
                )}
              </div>

              {/* TIER 1: Cá Nhỏ (4 taps với nguy cơ cá quẫy lùi) */}
              {(hookedFish.species.difficultyLevel <= 1 || hookedFish.species.baseWeightKg < 2.5) && (
                <div className="w-full flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center gap-2 my-1">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`w-4 h-4 rounded-full transition-all ${4 - pullTapsLeft >= step ? 'bg-emerald-500 scale-110' : 'bg-outline-variant/60'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-on-surface-variant font-bold">
                    Còn {pullTapsLeft} nhát giật (Đợi cá mệt để giật dứt khoát!)
                  </span>
                </div>
              )}

              {/* TIER 2: Cá Vừa (Giằng co theo nhịp cá quẫy) */}
              {(hookedFish.species.difficultyLevel === 2 || hookedFish.species.difficultyLevel === 3) && (
                <div className="w-full flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-amber-800">Thanh Lực Giằng Co:</span>
                    <span className="text-red-600">⏱️ {reelingTimeRemaining.toFixed(1)}s</span>
                  </div>
                  <div className="w-full h-5 bg-surface-container-high rounded-full overflow-hidden p-0.5 border border-outline-variant/40">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-75"
                      style={{ width: `${reelProgress}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-center font-bold text-on-surface-variant leading-tight">
                    {fishStruggle === 'RAGING'
                      ? 'Cá đang kéo tụt thanh lực! Nhấp nhả cầm chừng...'
                      : 'Cá đang đuối sức! BẤM LIÊN TỤC để đầy thanh lực!'}
                  </span>
                </div>
              )}

              {/* TIER 3: Cá Lớn / Cực Khó (VÙNG AN TOÀN TRÔI DẠT) */}
              {hookedFish.species.difficultyLevel >= 4 && (
                <div className="w-full flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-purple-800">⚡ Sức Căng Dây:</span>
                    <span className="text-emerald-700">Thu phục: {Math.round(safeHoldProgress)}%</span>
                  </div>

                  {/* Tension Bar with MOVING Safe Zone */}
                  <div className="relative w-full h-7 bg-surface-container-high rounded-full overflow-hidden border-2 border-purple-300">
                    {/* Moving Green Safe Zone */}
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-400/60 border-x-2 border-emerald-600 transition-all duration-100"
                      style={{
                        left: `${safeZoneBounds.min}%`,
                        width: `${safeZoneBounds.max - safeZoneBounds.min}%`,
                      }}
                    />
                    {/* Tension Needle */}
                    <div
                      className="absolute top-0 bottom-0 w-2.5 bg-red-600 rounded-full shadow-md transition-all duration-75 -ml-1.5"
                      style={{ left: `${tension}%` }}
                    />
                  </div>

                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${safeHoldProgress}%` }}
                    />
                  </div>

                  <span className="text-[11px] text-center font-bold text-purple-900 leading-tight">
                    Vùng Xanh đang trôi dạt! Điều tiết kim đỏ bám sát VÙNG XANH để thu phục cá khủng!
                  </span>
                </div>
              )}

              {/* NÚT "KÉO" (PULL) TO NỔI BẬT & ĐỔI MÀU THEO TRẠNG THÁI */}
              <button
                type="button"
                onClick={handlePullClick}
                className={`w-full py-3 sm:py-3.5 mt-1 rounded-2xl font-black text-lg sm:text-xl shadow-lg hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-2 border-2 ${fishStruggle === 'TIRED'
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-400 text-amber-950 border-white animate-pulse shadow-amber-300/60'
                    : 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white border-yellow-300 shadow-red-500/50'
                  }`}
              >
                <span>🎣</span>
                <span>
                  {fishStruggle === 'TIRED' ? 'KÉO DỒN LỰC !!!' : 'KÉO (PULL)'}
                </span>
              </button>
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

          {/* Nút 2: Quăng Cần Ngay (Nút chính flex-1) */}
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

          {/* Nút 3: Kho Cá (Mở Balo của Boss) */}
          {onOpenBasket && (
            <button
              type="button"
              onClick={onOpenBasket}
              className="w-16 sm:w-20 h-12 rounded-2xl bg-white border-2 border-emerald-300 text-emerald-800 shadow-[0_3px_0_#a0f0c7] active:translate-y-0.5 active:shadow-none flex flex-col items-center justify-center gap-0.5 hover:bg-emerald-50 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Mở Balo Của Boss"
            >
              <span className="text-base leading-none">🎒</span>
              <span className="text-[10px] sm:text-xs font-black">Kho Cá</span>
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
                  <span>🪙</span>
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
                    const repairPrice = Math.min(150, Math.floor(rod.price * 0.25));

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
                            <span className="text-xs font-extrabold text-amber-700 block">
                              {rod.price === 0 ? 'Miễn phí' : `${formatNumber(rod.price)} 🪙`}
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
};
