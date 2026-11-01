import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { CatSkin } from '../data/skins';
import type { FishSpecies } from '../data/fishes';
import type { RankTier, CatGrowthStage } from '../data/rankTiers';
import { FOOD_SHOP_CATALOG, type FoodItem } from '../data/foodShop';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';
import { FreeWaterGiftButton } from './FreeWaterGiftButton';
import {
  type FashionDecorItem,
  getFashionItemById,
  type HatFittingState,
  getSavedHatTransform,
  saveHatTransform,
  FASHION_DECOR_CATALOG,
  getToyRewardConfig,
  type DecorPosition,
  DEFAULT_TOY_POSITIONS,
  DEFAULT_BOWL_POS,
  DECOR_POS_CHANGED_EVENT,
  loadSavedDecorPos,
  saveDecorPos,
} from '../data/fashionAndDecor';

interface CatCharacterProps {
  currentSkin: CatSkin;
  catName?: string;
  username?: string;
  catAvatar?: string | null;
  onOpenAvatarPicker?: () => void;
  isCatActive: boolean;
  actualClickPower: number;
  autoFishRate: number;
  comboMultiplier: number;
  comboCount: number;
  isFrenzy: boolean;
  visualTheme?: 'cute_cartoon' | 'sticker_art';
  lastCaughtFish?: FishSpecies;
  food: number;
  water: number;
  basketCount: number;
  coins?: number;
  foodInventory?: { [foodId: string]: number };
  ownedHats?: string[];
  equippedHat?: string;
  ownedClothes?: string[];
  equippedClothes?: string;
  ownedRoomDecor?: string[];
  equippedDecor?: {
    bowl?: string;
    ball?: string;
    balls?: string[];
    rug?: string;
    room?: string;
  };
  lastWaterGiftClaimedAt?: number;
  satietyExpiresAt?: number;
  satietyTotalDurationMs?: number;
  zeroDecayUntil?: number;
  satietyDecayReduction?: number;
  satietyFoodName?: string;
  satietyFoodTier?: 'low' | 'mid' | 'high';
  levelInfo: {
    level: number;
    currentLevelXp: number;
    nextLevelXpRequired: number;
    progressPercent: number;
    rankTier: RankTier;
  };
  catStage: CatGrowthStage;
  onOpenPond: () => void;
  onOpenFoodShop: () => void;
  onOpenFashionShop: () => void;
  onOpenBasket: () => void;
  onOpenRodShop?: () => void;
  onOpenGrowth?: (subTab?: 'upgrades' | 'skins' | 'meal_plans') => void;
  onFeedFromInventory?: (
    foodItem: FoodItem,
    quantity: number
  ) => {
    success: boolean;
    restoredFood: number;
    restoredWater: number;
    gainedXp: number;
    satietyMinutesAdded?: number;
    satietyDecayReduction?: number;
  };
  onGiveWater?: () => void;
  onClaimFreeWater?: () => { success: boolean; message: string; remainingMs?: number; gainedWater?: number };
  onBuyFashionItem?: (item: FashionDecorItem) => { success: boolean; message: string };
  onEquipFashionItem?: (item: FashionDecorItem) => boolean;
  onCatClick: (
    clientX: number,
    clientY: number
  ) => {
    earned: number;
    isTired?: boolean;
    remainingCooldownSec?: number;
    currentStamina?: number;
    maxStamina?: number;
  } | void;
  onPlayWithToy?: (
    toyId: string,
    clientX?: number,
    clientY?: number
  ) => {
    gainedCoins: number;
    success: boolean;
    ratePercent: number;
    toyName: string;
    isTired?: boolean;
    remainingCooldownSec?: number;
    currentStamina?: number;
    maxStamina?: number;
  };
  autoOpenFeedModal?: boolean;
  onResetAutoOpenFeed?: () => void;
}

interface LocalPopupItem {
  id: string;
  xPercent: number;
  yPercent: number;
  text: string;
  isCrit: boolean;
}


export const CatCharacter: React.FC<CatCharacterProps> = React.memo(({
  currentSkin,
  catName,
  username,
  catAvatar,
  onOpenAvatarPicker,
  isCatActive,
  actualClickPower,
  autoFishRate,
  comboMultiplier: _comboMultiplier,
  comboCount: _comboCount,
  isFrenzy,
  food,
  water,
  basketCount = 0,
  foodInventory = {},
  ownedHats = [],
  equippedHat = '',
  equippedClothes = '',
  ownedRoomDecor = ['bowl_clay', 'ball_yarn_red', 'rug_peach', 'room_go_co_dien'],
  equippedDecor = { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach', room: 'room_go_co_dien' },
  lastWaterGiftClaimedAt = 0,
  satietyExpiresAt: _satietyExpiresAt = 0,
  satietyTotalDurationMs: _satietyTotalDurationMs = 0,
  zeroDecayUntil: _zeroDecayUntil = 0,
  satietyDecayReduction: _satietyDecayReduction = 1.0,
  satietyFoodName: _satietyFoodName = '',
  satietyFoodTier: _satietyFoodTier = 'low',
  levelInfo,
  catStage,
  onOpenFoodShop,
  onOpenFashionShop,
  onOpenBasket,
  onOpenGrowth,
  onFeedFromInventory,
  onClaimFreeWater,
  onEquipFashionItem,
  onCatClick,
  onPlayWithToy,
  autoOpenFeedModal,
  onResetAutoOpenFeed,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [catSquishAnim, setCatSquishAnim] = useState(false);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [bowlClickAnim, setBowlClickAnim] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string>(FOOD_SHOP_CATALOG[0]?.id || '01_thuc_an_kho');
  const [feedQuantity, setFeedQuantity] = useState<number>(1);
  const [feedToast, setFeedToast] = useState<string | null>(null);
  const [localPopups, setLocalPopups] = useState<LocalPopupItem[]>([]);

  // Đếm ngược thời gian hồi phục thể lực khi mèo mệt do chơi đồ chơi
  const [toyTiredSeconds, setToyTiredSeconds] = useState<number>(0);

  useEffect(() => {
    if (toyTiredSeconds <= 0) return;
    const timer = setInterval(() => {
      setToyTiredSeconds((prev) => {
        if (prev <= 1) {
          soundManager.playPop(1.3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [toyTiredSeconds]);

  // Đếm ngược thời gian hồi phục thể lực khi mèo mệt do bị vuốt ve liên tục
  const [petTiredSeconds, setPetTiredSeconds] = useState<number>(0);

  useEffect(() => {
    if (petTiredSeconds <= 0) return;
    const timer = setInterval(() => {
      setPetTiredSeconds((prev) => {
        if (prev <= 1) {
          soundManager.playPop(1.3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [petTiredSeconds]);

  // Chế độ chọn phòng nền background
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);

  // Chế độ di chuyển, xoay & gắn mũ
  const [isFittingHatOpen, setIsFittingHatOpen] = useState(false);
  const [hatTransform, setHatTransform] = useState<HatFittingState>(() =>
    getSavedHatTransform(equippedHat)
  );
  const [isDraggingHat, setIsDraggingHat] = useState(false);
  const [hatToast, setHatToast] = useState<string | null>(null);
  const hatDragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  const showHatToast = (msg: string) => {
    setHatToast(msg);
    setTimeout(() => setHatToast(null), 2500);
  };

  useEffect(() => {
    if (equippedHat) {
      setHatTransform(getSavedHatTransform(equippedHat));
    }
  }, [equippedHat]);

  // Đồng bộ vị trí vật trang trí (bát ăn, đồ chơi, mũ) khi được kéo chỉnh ở Shop Thời Trang hoặc Sảnh
  useEffect(() => {
    const handleSync = () => {
      setBowlPos(loadSavedDecorPos('purr_bowl_pos', DEFAULT_BOWL_POS));
      setToyPositions({
        0: loadSavedDecorPos('purr_toy_pos_0', loadSavedDecorPos('purr_ball_pos', DEFAULT_TOY_POSITIONS[0])),
        1: loadSavedDecorPos('purr_toy_pos_1', DEFAULT_TOY_POSITIONS[1]),
        2: loadSavedDecorPos('purr_toy_pos_2', DEFAULT_TOY_POSITIONS[2]),
      });
      if (equippedHat) {
        setHatTransform(getSavedHatTransform(equippedHat));
      }
    };
    window.addEventListener(DECOR_POS_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(DECOR_POS_CHANGED_EVENT, handleSync);
  }, [equippedHat]);

  // Tọa độ vị trí kéo thả của Bát Ăn & 3 Đồ Chơi trong phòng
  const playStageRef = useRef<HTMLDivElement | null>(null);
  const [toyPositions, setToyPositions] = useState<{ [index: number]: DecorPosition }>(() => ({
    0: loadSavedDecorPos('purr_toy_pos_0', loadSavedDecorPos('purr_ball_pos', DEFAULT_TOY_POSITIONS[0])),
    1: loadSavedDecorPos('purr_toy_pos_1', DEFAULT_TOY_POSITIONS[1]),
    2: loadSavedDecorPos('purr_toy_pos_2', DEFAULT_TOY_POSITIONS[2]),
  }));
  const [bowlPos, setBowlPos] = useState<DecorPosition>(() =>
    loadSavedDecorPos('purr_bowl_pos', DEFAULT_BOWL_POS)
  );
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [bouncingToyIndex, setBouncingToyIndex] = useState<number | null>(null);

  const dragStartRef = useRef<{
    item: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
  } | null>(null);

  const catContainerRef = useRef<HTMLDivElement | null>(null);
  const lastPetMeowRef = useRef<number>(0);
  const [petSpeech, setPetSpeech] = useState<string | null>(null);
  const petSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoOpenFeedModal) {
      setIsFeedModalOpen(true);
      if (onResetAutoOpenFeed) onResetAutoOpenFeed();
    }
  }, [autoOpenFeedModal, onResetAutoOpenFeed]);

  const curHat = getFashionItemById(equippedHat);
  const curClothes = getFashionItemById(equippedClothes);
  const curBowl = getFashionItemById(equippedDecor?.bowl || 'bowl_clay');
  const curRug = getFashionItemById(equippedDecor?.rug || 'rug_peach');
  const curRoom = getFashionItemById(equippedDecor?.room || 'room_go_co_dien');

  // Danh sách tối đa 3 đồ chơi đang gắn trên sảnh phòng
  const equippedBallsList: string[] = useMemo(() => {
    if (Array.isArray(equippedDecor?.balls) && equippedDecor.balls.length > 0) {
      return equippedDecor.balls.slice(0, 3);
    }
    return [equippedDecor?.ball || 'ball_yarn_red'];
  }, [equippedDecor?.balls, equippedDecor?.ball]);

  // Danh sách phòng nền đã sở hữu
  const ownedRoomsList = FASHION_DECOR_CATALOG.filter(
    (item) => item.category === 'rooms' && (ownedRoomDecor.includes(item.id) || item.price === 0)
  );

  // Danh sách mũ đã sở hữu
  const ownedHatsList = FASHION_DECOR_CATALOG.filter(
    (item) =>
      item.category === 'hats' &&
      (ownedHats.includes(item.id) ||
        (item.id === 'hat_hai_tac' && ownedHats.includes('hat_pirate')) ||
        (item.id === 'hat_phu_thuy' && ownedHats.includes('hat_wizard')) ||
        (item.id === 'hat_len_xam' && ownedHats.includes('hat_warm_beanie')) ||
        (item.id === 'hat_rong_vanh' && ownedHats.includes('hat_straw')) ||
        (item.id === 'hat_vuong_mien_hoang_gia' && ownedHats.includes('hat_crown')) ||
        item.price === 0)
  );

  // Kéo di chuyển trực tiếp mũ trên đầu mèo
  const handleHatPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    hatDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: hatTransform.offsetX,
      initialY: hatTransform.offsetY,
      hasMoved: false,
    };
    setIsDraggingHat(true);
  };

  const handleHatPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hatDragStartRef.current) return;
    const dx = e.clientX - hatDragStartRef.current.startX;
    const dy = e.clientY - hatDragStartRef.current.startY;
    if (!hatDragStartRef.current.hasMoved && Math.hypot(dx, dy) > 2) {
      hatDragStartRef.current.hasMoved = true;
    }
    if (hatDragStartRef.current.hasMoved) {
      const nextX = Math.max(-80, Math.min(80, Math.round(hatDragStartRef.current.initialX + dx)));
      const nextY = Math.max(-100, Math.min(60, Math.round(hatDragStartRef.current.initialY + dy)));
      setHatTransform((prev) => ({
        ...prev,
        offsetX: nextX,
        offsetY: nextY,
      }));
    }
  };

  const handleHatPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (!hatDragStartRef.current) return;
    const wasDragging = hatDragStartRef.current.hasMoved;
    hatDragStartRef.current = null;
    setIsDraggingHat(false);
    if (wasDragging) {
      soundManager.playPop(1.1);
      setHatTransform((prev) => {
        let finalX = prev.offsetX;
        let finalY = prev.offsetY;
        // Hút nam châm nhẹ về tâm nếu kéo gần tâm đầu (< 10px)
        if (Math.hypot(finalX, finalY) < 10) {
          finalX = 0;
          finalY = 0;
          showHatToast('🎯 Mũ đã tự động gắn vào tâm đầu!');
        }
        const updated = { ...prev, offsetX: finalX, offsetY: finalY };
        if (curHat) {
          saveHatTransform(curHat.id, updated);
        }
        return updated;
      });
    }
  };

  // Điều chỉnh xoay góc
  const handleRotateHat = (angle: number) => {
    setHatTransform((prev) => {
      const clamped = Math.max(-60, Math.min(60, angle));
      const updated = { ...prev, rotation: clamped };
      if (curHat) saveHatTransform(curHat.id, updated);
      return updated;
    });
  };

  const handleNudgeRotate = (delta: number) => {
    soundManager.playPop(1.05);
    setHatTransform((prev) => {
      const next = Math.max(-60, Math.min(60, prev.rotation + delta));
      const updated = { ...prev, rotation: next };
      if (curHat) saveHatTransform(curHat.id, updated);
      return updated;
    });
  };

  // Điều chỉnh vị trí qua D-pad
  const handleNudgePosition = (dx: number, dy: number) => {
    soundManager.playPop(1.05);
    setHatTransform((prev) => {
      const nextX = Math.max(-80, Math.min(80, prev.offsetX + dx));
      const nextY = Math.max(-100, Math.min(60, prev.offsetY + dy));
      const updated = { ...prev, offsetX: nextX, offsetY: nextY };
      if (curHat) saveHatTransform(curHat.id, updated);
      return updated;
    });
  };

  // Điều chỉnh tỉ lệ phóng to/thu nhỏ
  const handleScaleHat = (newScale: number) => {
    setHatTransform((prev) => {
      const clamped = Math.max(0.7, Math.min(1.4, Math.round(newScale * 100) / 100));
      const updated = { ...prev, scale: clamped };
      if (curHat) saveHatTransform(curHat.id, updated);
      return updated;
    });
  };

  // GẮN MŨ CHẮC CHẮN (Khóa vị trí & hoàn tất)
  const handleAttachAndLockHat = () => {
    soundManager.playUpgrade();
    const updated: HatFittingState = {
      ...hatTransform,
      isAttached: true,
    };
    setHatTransform(updated);
    if (curHat) {
      saveHatTransform(curHat.id, updated);
    }
    setIsFittingHatOpen(false);
    showHatToast(`📌 Đã gắn ${curHat?.name || 'mũ'} chắc chắn lên đầu Boss! 🐾`);
  };

  // GẮN CHUẨN VÀO ĐẦU (Snap về vị trí cân xứng)
  const handleSnapHatToHead = () => {
    soundManager.playPop(1.2);
    const updated: HatFittingState = {
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1.0,
      isAttached: true,
    };
    setHatTransform(updated);
    if (curHat) {
      saveHatTransform(curHat.id, updated);
    }
    showHatToast('🎯 Đã gắn mũ ngay ngắn vào đỉnh đầu Boss!');
  };

  // Tháo mũ
  const handleUnequipHat = () => {
    if (curHat && onEquipFashionItem) {
      onEquipFashionItem(curHat);
      soundManager.playPop();
      setIsFittingHatOpen(false);
      showHatToast(`Đã tháo ${curHat.name}!`);
    }
  };

  const handleToyClick = (e?: React.MouseEvent | React.PointerEvent, idx: number = 0) => {
    if (e) e.stopPropagation();
    const ballId = equippedBallsList[idx] || 'ball_yarn_red';

    // Animation nảy tưng của đồ chơi
    setBouncingToyIndex(idx);
    setTimeout(() => setBouncingToyIndex(null), 400);

    // Mèo phản ứng squish thích thú khi vờn đồ chơi
    setCatSquishAnim(true);
    setTimeout(() => setCatSquishAnim(false), 180);

    const cx = e ? e.clientX : window.innerWidth / 2;
    const cy = e ? e.clientY : window.innerHeight / 2;

    let gained = 0;
    let isSuccess = false;
    let ratePercent = 35;
    let isTired = false;
    let remainingCooldownSec = 0;
    let currentStamina = 8;

    if (onPlayWithToy) {
      const res = onPlayWithToy(ballId, cx, cy);
      gained = res.gainedCoins;
      isSuccess = res.success;
      ratePercent = res.ratePercent;
      isTired = !!res.isTired;
      remainingCooldownSec = res.remainingCooldownSec || 0;
      currentStamina = res.currentStamina ?? 8;
      if (res.isTired && res.remainingCooldownSec) {
        setToyTiredSeconds(res.remainingCooldownSec);
      }
    } else {
      soundManager.playPop(1.2 + idx * 0.1);
    }

    // Hiển thị popup cục bộ ngay tại vị trí của đồ chơi trong phòng
    const pos = toyPositions[idx] || DEFAULT_TOY_POSITIONS[idx] || { x: 14 + idx * 22, y: 76 };
    let popupText = `🐾 Vui đùa! (${ratePercent}%)`;
    if (isTired) {
      popupText = `💤 Boss mệt rồi! (${remainingCooldownSec}s)`;
    } else if (isSuccess) {
      popupText = `+${gained} Xu (${currentStamina}/8⚡)`;
    } else {
      popupText = `🐾 Vui đùa! (${currentStamina}/8⚡)`;
    }

    const newPopup: LocalPopupItem = {
      id: `pop_toy_${Date.now()}_${Math.random()}`,
      xPercent: pos.x,
      yPercent: Math.max(12, pos.y - 10),
      text: popupText,
      isCrit: isSuccess && !isTired,
    };
    setLocalPopups((prev) => [...prev.slice(-6), newPopup]);
    setTimeout(() => {
      setLocalPopups((prev) => prev.filter((p) => p.id !== newPopup.id));
    }, 950);
  };

  const handleBowlClick = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) e.stopPropagation();
    soundManager.playEat();
    setBowlClickAnim(true);
    setTimeout(() => setBowlClickAnim(false), 300);
    setIsFeedModalOpen(true);
  };

  // Xử lý giữ và kéo (Drag & Drop) đồ vật trong phòng
  const handleItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: string
  ) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    let curPos: DecorPosition;
    if (item.startsWith('toy_')) {
      const idx = parseInt(item.replace('toy_', ''), 10) || 0;
      curPos = toyPositions[idx] || DEFAULT_TOY_POSITIONS[idx] || { x: 20, y: 80 };
    } else {
      curPos = bowlPos;
    }

    dragStartRef.current = {
      item,
      startX: e.clientX,
      startY: e.clientY,
      currentX: curPos.x,
      currentY: curPos.y,
      hasMoved: false,
    };
    setDraggingItem(item);
  };

  const handleItemPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !playStageRef.current) return;
    const { item, startX, startY } = dragStartRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragStartRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    if (dragStartRef.current.hasMoved) {
      const rect = playStageRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nextX = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
        const nextY = Math.max(10, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));

        dragStartRef.current.currentX = nextX;
        dragStartRef.current.currentY = nextY;

        if (item.startsWith('toy_')) {
          const idx = parseInt(item.replace('toy_', ''), 10) || 0;
          setToyPositions((prev) => ({ ...prev, [idx]: { x: nextX, y: nextY } }));
        } else {
          setBowlPos({ x: nextX, y: nextY });
        }
      }
    }
  };

  const handleItemPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    item: string
  ) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasDragging = dragStartRef.current?.hasMoved;
    const finalPos = dragStartRef.current
      ? { x: dragStartRef.current.currentX, y: dragStartRef.current.currentY }
      : null;

    dragStartRef.current = null;
    setDraggingItem(null);

    if (wasDragging && finalPos) {
      soundManager.playPop(1.15);
      if (item.startsWith('toy_')) {
        const idx = parseInt(item.replace('toy_', ''), 10) || 0;
        saveDecorPos(`purr_toy_pos_${idx}`, finalPos);
        if (idx === 0) {
          saveDecorPos('purr_ball_pos', finalPos);
        }
      } else {
        saveDecorPos('purr_bowl_pos', finalPos);
      }
    } else {
      if (item.startsWith('toy_')) {
        const idx = parseInt(item.replace('toy_', ''), 10) || 0;
        handleToyClick(e, idx);
      } else {
        handleBowlClick(e);
      }
    }
  };

  // Trigger cuddle popups on pet
  const triggerPetting = (clientX?: number, clientY?: number) => {
    // Squish animation
    setCatSquishAnim(true);
    setTimeout(() => setCatSquishAnim(false), 160);

    // Call game state handler
    const cx = clientX ?? (window.innerWidth / 2);
    const cy = clientY ?? (window.innerHeight / 2);
    const res = onCatClick(cx, cy);

    // Nếu Boss đang mệt mỏi vì bị nựng / spam click quá nhiều
    if (res && res.isTired) {
      if (res.remainingCooldownSec) {
        setPetTiredSeconds(res.remainingCooldownSec);
      }
      return;
    }

    const currentStamina = res?.currentStamina ?? 10;
    const maxStamina = res?.maxStamina ?? 10;

    // Spawn localized cute cuddle popup in sanctuary clicker stage
    const isCrit = Math.random() < (0.15 + (isFrenzy ? 0.35 : 0));
    if (isCrit && Date.now() - lastPetMeowRef.current > 1800) {
      lastPetMeowRef.current = Date.now();
      soundManager.playCatMeow(currentSkin.sound);
    }

    if (!isCatHungry) {
      const cuteQuotes = [
        'Meow~! Boss yêu Sen 💖',
        'Gừ gừ... thích quá meow~ 🐾',
        'Sen vuốt ve khéo ghê! ✨',
        'Cưng xỉu luôn á meow~ 💕',
        'Boss chuẩn bị đi săn cá đây! 🐟',
      ];
      if (Math.random() < 0.4) {
        const q = cuteQuotes[Math.floor(Math.random() * cuteQuotes.length)];
        setPetSpeech(q);
        if (petSpeechTimeoutRef.current) clearTimeout(petSpeechTimeoutRef.current);
        petSpeechTimeoutRef.current = setTimeout(() => setPetSpeech(null), 1800);
      }
    }

    const earned = res?.earned ?? Math.max(1, Math.round(actualClickPower * (isCrit ? 2.5 : 1)));
    const newPopup: LocalPopupItem = {
      id: `pop_${Date.now()}_${Math.random()}`,
      xPercent: 35 + Math.random() * 30,
      yPercent: 35 + Math.random() * 25,
      text: isCrit ? `CRIT! +${earned} Xu (${currentStamina}/${maxStamina}⚡)` : `+${earned} Xu (${currentStamina}/${maxStamina}⚡)`,
      isCrit,
    };

    setLocalPopups((prev) => [...prev.slice(-6), newPopup]);
    setTimeout(() => {
      setLocalPopups((prev) => prev.filter((p) => p.id !== newPopup.id));
    }, 850);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsPressed(true);
    triggerPetting(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const handlePetButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerPetting(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const isSatiated = (_satietyExpiresAt || 0) > Date.now();
  const isWellCared = isSatiated || (food >= 60 && water >= 60);
  const isHungry = !isSatiated && food < 25;
  const isCatHungry = !isSatiated && food < 15;
  const isThirsty = !isSatiated && water < 25;

  const { palette } = currentSkin;
  const isMouthOpen = isPressed || isCatActive;
  const displayImage = isMouthOpen
    ? (currentSkin.imageOpen || currentSkin.image)
    : (currentSkin.image || currentSkin.imageOpen);

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto px-2 sm:px-gutter py-1 sm:py-space-sm gap-2 sm:gap-space-md select-none font-body-md text-on-surface">
      {/* 1. Sub-header & Cat Level Status Card */}
      <div className="w-full bg-surface-container-lowest rounded-lg p-2.5 sm:p-space-md shadow-[0_4px_16px_rgba(122,105,104,0.08)] flex flex-col gap-1 sm:gap-space-xs relative overflow-hidden border border-outline-variant/30">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary-fixed/30 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between gap-2">
          {/* Left Avatar & Level Badge - Click to pick Avatar */}
          <div
            className={`relative shrink-0 w-12 h-12 mr-1 ${onOpenAvatarPicker ? 'cursor-pointer group' : ''}`}
            onClick={onOpenAvatarPicker}
            role={onOpenAvatarPicker ? 'button' : undefined}
            tabIndex={onOpenAvatarPicker ? 0 : undefined}
            title="Nhấn để đổi ảnh đại diện Mèo Cưng"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shadow-inner overflow-hidden border-2 border-primary-fixed text-2xl group-hover:ring-2 group-hover:ring-primary/70 group-hover:scale-105 active:scale-95 transition-all">
              {catAvatar ? (
                <img
                  src={catAvatar}
                  alt={catName || currentSkin.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : currentSkin.image ? (
                <img
                  src={currentSkin.image}
                  alt={currentSkin.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <span>{currentSkin.icon || '🐱'}</span>
              )}
            </div>
            {onOpenAvatarPicker && (
              <span className="absolute -top-1 -right-1 z-10 bg-amber-400 text-amber-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-white font-bold opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all">
                📷
              </span>
            )}
            <span
              className={`absolute -bottom-1 -right-1 z-10 bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full shadow-sm font-black border border-white whitespace-nowrap leading-tight ${
                onOpenGrowth ? 'cursor-pointer hover:bg-emerald-700 active:scale-95 transition-all' : ''
              }`}
              onClick={(e) => {
                if (onOpenGrowth) {
                  e.stopPropagation();
                  onOpenGrowth('upgrades');
                }
              }}
              title="Nhấn để xem Nâng Cấp Kỹ Năng"
            >
              Lv.{levelInfo.level}
            </span>
          </div>

          {/* Middle Info Row */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-on-surface truncate">
                {catName || currentSkin.name}
              </h2>
              {username && (
                <span className="text-[10px] sm:text-xs text-on-surface-variant font-semibold bg-surface-container-high px-1.5 py-0.5 rounded-md">
                  @{username}
                </span>
              )}
              <span className="bg-primary/10 text-primary text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                {catStage.label}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium leading-tight truncate mt-0.5">
              Giai đoạn Tăng trưởng • Tinh nghịch
            </p>
          </div>

          {/* Right Auto-fish Rate Pill */}
          <div className="h-8 px-2.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className="material-symbols-outlined text-emerald-600 text-[16px]">bolt</span>
            <span className="text-xs sm:text-sm font-black tracking-tight">
              +{formatNumber(autoFishRate)} 🐟/s
            </span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-space-xs flex flex-col gap-1">
          <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-tertiary text-[14px]">stars</span>
              Kinh nghiệm (XP)
            </span>
            <span className="font-label-md text-label-md text-on-surface font-bold">
              {formatNumber(levelInfo.currentLevelXp)} / {formatNumber(levelInfo.nextLevelXpRequired)} XP
            </span>
          </div>
          <div className="w-full h-3.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-tertiary-fixed-dim to-tertiary rounded-full transition-all duration-500 relative"
              style={{ width: `${Math.min(100, Math.max(0, levelInfo.progressPercent))}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-surface-bright/70 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Cozy Sanctuary Clicker Stage */}
      <div
        ref={catContainerRef}
        className="w-full bg-surface-container-low rounded-xl p-2 sm:p-space-md shadow-[0_6px_20px_rgba(122,105,104,0.08)] relative overflow-hidden flex flex-col items-center border border-outline-variant/30"
      >
        {/* Living Background Room Art */}
        {curRoom?.image ? (
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden rounded-xl">
            <img
              src={curRoom.image}
              alt={curRoom.name}
              className="w-full h-full object-cover object-bottom transition-all duration-700 pointer-events-none select-none"
              draggable={false}
            />
            {/* Soft subtle gradient to keep UI buttons and texts readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/15 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-3 left-4 w-12 h-16 bg-surface-container rounded-t-full" />
            <div className="absolute top-2 right-8 flex items-center gap-1">
              <span className="material-symbols-outlined text-primary-fixed-dim text-lg">wb_sunny</span>
              <div className="w-16 h-8 bg-surface-bright/50 rounded-full" />
            </div>
            <div className="absolute bottom-6 left-3 w-10 h-24 bg-surface-container-high rounded-full" />
          </div>
        )}

        {/* Floating Hat Fitting Toast */}
        {hatToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-primary/20 animate-bounce-in text-xs font-bold pointer-events-none">
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
            <span>{hatToast}</span>
          </div>
        )}

        {/* Cozy Room Floating Info Tag & Hat Fitting Toggle Button (Đồng đều chiều cao h-7.5 sm:h-8, chuẩn mobile) */}
        <div className="z-10 flex items-center justify-between w-full px-1 mb-1.5 sm:mb-2 gap-1.5">
          {/* Room Selector Toggle Pill */}
          <button
            type="button"
            className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-full backdrop-blur-md text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-sm border whitespace-nowrap shrink-0 ${
              isRoomPickerOpen
                ? 'bg-amber-500 text-white border-amber-400 ring-2 ring-amber-300/40 shadow-md scale-102'
                : 'bg-surface-container-lowest/85 text-on-surface hover:text-primary border-outline-variant/30 hover:border-primary/40'
            }`}
            onClick={() => {
              soundManager.playPop();
              setIsRoomPickerOpen(!isRoomPickerOpen);
              if (isFittingHatOpen) setIsFittingHatOpen(false);
            }}
            title="Đổi phòng nền background cho mèo"
          >
            <span className="text-sm">{curRoom?.icon || '🏡'}</span>
            <span className="max-w-[75px] min-[360px]:max-w-[100px] sm:max-w-[140px] truncate">
              {curRoom?.name || 'Phòng Gỗ'}
            </span>
            <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
              {isRoomPickerOpen ? 'expand_less' : 'swap_horiz'}
            </span>
          </button>

          {/* Hat Fitting Toggle Button */}
          <button
            type="button"
            className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-full backdrop-blur-md text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-sm border whitespace-nowrap shrink-0 ${
              isFittingHatOpen
                ? 'bg-primary text-on-primary border-primary ring-2 ring-primary/30 shadow-md scale-102'
                : 'bg-surface-container-lowest/90 text-on-surface hover:text-primary border-outline-variant/30 hover:border-primary/40'
            }`}
            onClick={() => {
              soundManager.playPop();
              setIsFittingHatOpen(!isFittingHatOpen);
              if (isRoomPickerOpen) setIsRoomPickerOpen(false);
            }}
            title="Mở bảng di chuyển, xoay và gắn mũ cho mèo"
          >
            <span className="text-sm">👒</span>
            <span>{isFittingHatOpen ? 'Đang Chỉnh' : curHat ? 'Chỉnh Mũ' : 'Gắn Mũ'}</span>
            <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
              {isFittingHatOpen ? 'expand_less' : 'tune'}
            </span>
          </button>
        </div>

        {/* Quick Room Picker Drawer */}
        {isRoomPickerOpen && (
          <div className="z-20 w-full mb-3 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-outline-variant/40 animate-fade-in">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-outline-variant/20">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🏡</span>
                <span className="font-label-sm text-label-sm font-bold text-on-surface">
                  Chọn Nền Phòng ({ownedRoomsList.length} phòng)
                </span>
              </div>
              <div className="flex items-center gap-1">
                {onOpenFashionShop && (
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold transition-colors cursor-pointer"
                    onClick={() => {
                      soundManager.playPop();
                      onOpenFashionShop();
                    }}
                  >
                    + Thêm phòng
                  </button>
                )}
                <button
                  type="button"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs cursor-pointer"
                  onClick={() => setIsRoomPickerOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Horizontal scroll of owned rooms */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
              {ownedRoomsList.map((roomItem) => {
                const isCurrent = (equippedDecor?.room || 'room_go_co_dien') === roomItem.id;
                return (
                  <button
                    key={`quick_room_${roomItem.id}`}
                    type="button"
                    className={`shrink-0 w-28 rounded-xl p-1.5 flex flex-col items-center text-left transition-all cursor-pointer border ${
                      isCurrent
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm scale-102'
                        : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low'
                    }`}
                    onClick={() => {
                      if (onEquipFashionItem) {
                        onEquipFashionItem(roomItem);
                        soundManager.playUpgrade();
                        showHatToast(`Đã chuyển sang ${roomItem.name}! 🏡`);
                      }
                    }}
                  >
                    <div className="w-full h-16 rounded-lg overflow-hidden relative mb-1 bg-surface-container shadow-2xs">
                      {roomItem.image ? (
                        <img
                          src={roomItem.image}
                          alt={roomItem.name}
                          className="w-full h-full object-cover object-bottom"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {roomItem.icon}
                        </div>
                      )}
                      {isCurrent && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white shadow-xs" />
                      )}
                    </div>
                    <span className="font-label-sm text-[11px] font-bold text-on-surface line-clamp-1 w-full text-center">
                      {roomItem.name}
                    </span>
                    <span className="text-[9px] text-on-surface-variant line-clamp-1 w-full text-center">
                      {roomItem.perk || roomItem.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Center Play Stage & Interactive Cat */}
        <div ref={playStageRef} className="relative w-full aspect-[16/11] sm:aspect-[4/3] max-h-52 sm:max-h-72 flex items-center justify-center my-1 sm:my-space-xs touch-none select-none">
          {/* Rug based on equippedDecor.rug (Nằm ngay bên dưới nhân vật Cat) */}
          <div className="absolute z-0 w-48 h-48 sm:w-72 sm:h-72 max-w-[94%] max-h-[94%] flex items-center justify-center pointer-events-none select-none transition-all duration-300 translate-y-11 sm:translate-y-17">
            {curRug?.image ? (
              <img
                src={curRug.image}
                alt={curRug.name}
                className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] pointer-events-none select-none transition-transform duration-300"
                draggable={false}
              />
            ) : equippedDecor?.rug === 'rug_cloud' ? (
              <div className="w-44 h-38 sm:w-60 sm:h-52 rounded-[2rem] sm:rounded-[2.5rem] bg-sky-200/50 shadow-inner flex items-center justify-center pointer-events-none border border-sky-300/40">
                <div className="w-38 h-32 sm:w-52 sm:h-44 rounded-[1.5rem] sm:rounded-[2rem] bg-surface-container-lowest/90 shadow-sm flex items-center justify-center">
                  <div className="w-32 h-26 sm:w-44 sm:h-36 rounded-[1rem] sm:rounded-[1.5rem] bg-sky-100/60" />
                </div>
              </div>
            ) : equippedDecor?.rug === 'rug_paw' ? (
              <div className="w-42 h-42 sm:w-56 sm:h-56 rounded-full bg-rose-200/50 shadow-inner flex items-center justify-center pointer-events-none border border-rose-300/40">
                <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-surface-container-lowest/90 shadow-sm flex items-center justify-center">
                  <div className="w-30 h-30 sm:w-40 sm:h-40 rounded-full bg-rose-100/60 flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl opacity-30">🐾</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-42 h-42 sm:w-56 sm:h-56 rounded-full bg-primary-fixed/40 shadow-inner flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-surface-container-lowest/90 shadow-sm flex items-center justify-center">
                  <div className="w-30 h-30 sm:w-40 sm:h-40 rounded-full bg-surface-container-low/70" />
                </div>
              </div>
            )}
          </div>

          {/* 3 MÓN ĐỒ CHƠI TRANG TRÍ SẢNH PHÒNG MÈO (TỰ DO KÉO THẢ, CHẠM ĐỂ CHƠI) */}
          {equippedBallsList.map((ballId, idx) => {
            const ballItem = getFashionItemById(ballId);
            if (!ballItem) return null;
            const pos = toyPositions[idx] || DEFAULT_TOY_POSITIONS[idx] || { x: 14 + idx * 22, y: 76 };
            const isDraggingThis = draggingItem === `toy_${idx}`;
            const isBouncingThis = bouncingToyIndex === idx;
            const toyReward = getToyRewardConfig(ballItem);

            return (
              <div
                key={`room_toy_${ballId}_${idx}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-14 sm:h-14 max-w-[48px] max-h-[48px] sm:max-w-[56px] sm:max-h-[56px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform duration-75 ${
                  isDraggingThis
                    ? 'scale-125 z-30 drop-shadow-2xl opacity-90'
                    : isBouncingThis
                    ? '-translate-y-6 rotate-12 scale-125'
                    : toyTiredSeconds > 0
                    ? 'opacity-70 hover:scale-105'
                    : 'hover:scale-110 active:scale-95'
                }`}
                onPointerDown={(e) => handleItemPointerDown(e, `toy_${idx}`)}
                onPointerMove={handleItemPointerMove}
                onPointerUp={(e) => handleItemPointerUp(e, `toy_${idx}`)}
                onPointerCancel={(e) => handleItemPointerUp(e, `toy_${idx}`)}
                title={`${ballItem.name} (#${idx + 1} • ${toyReward.label} • Chạm chơi với Boss)`}
              >
                {ballItem.image ? (
                  <img
                    src={ballItem.image}
                    alt={ballItem.name}
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)] select-none pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)] select-none pointer-events-none">
                    {ballItem.icon || '🧶'}
                  </span>
                )}
                {/* Huy hiệu số thứ tự hoặc trạng thái nghỉ ngơi của đồ chơi */}
                {toyTiredSeconds > 0 ? (
                  <span className="absolute -bottom-2 px-1.5 py-0.2 rounded-full bg-slate-900/90 text-amber-300 text-[8px] font-black flex items-center gap-0.5 shadow-md pointer-events-none border border-amber-400/60 animate-pulse whitespace-nowrap">
                    💤 {toyTiredSeconds}s
                  </span>
                ) : (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs pointer-events-none border border-white/70">
                    {idx + 1}
                  </span>
                )}
              </div>
            );
          })}

          {/* MÁNG ĂN TRANG TRÍ SẢNH PHÒNG (KHÔNG NỀN TRẮNG/KHUNG, TỰ DO KÉO THẢ) */}
          <div
            style={{
              left: `${bowlPos.x}%`,
              top: `${bowlPos.y}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 sm:w-16 sm:h-16 max-w-[52px] max-h-[52px] sm:max-w-[64px] sm:max-h-[64px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform duration-75 ${
              draggingItem === 'bowl'
                ? 'scale-125 z-30 drop-shadow-2xl opacity-90'
                : bowlClickAnim
                ? 'scale-110 -rotate-12'
                : 'hover:scale-110 active:scale-95'
            }`}
            onPointerDown={(e) => handleItemPointerDown(e, 'bowl')}
            onPointerMove={handleItemPointerMove}
            onPointerUp={(e) => handleItemPointerUp(e, 'bowl')}
            onPointerCancel={(e) => handleItemPointerUp(e, 'bowl')}
            title={`${curBowl?.name || 'Máng ăn'} (Chạm để cho ăn / Giữ để di chuyển)`}
          >
            {curBowl?.image ? (
              <img
                src={curBowl.image}
                alt={curBowl.name}
                className="w-full h-full object-contain filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)] select-none pointer-events-none"
                draggable={false}
              />
            ) : (
              <span className="text-3xl sm:text-4xl filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.2)] select-none pointer-events-none">
                {curBowl?.icon || '🥣'}
              </span>
            )}
          </div>

          {/* Floating Free Water Gift Button (8 tiếng nhận 5 nước miễn phí) */}
          <div className="absolute top-2 right-2.5 z-30">
            <FreeWaterGiftButton
              lastClaimedAt={lastWaterGiftClaimedAt}
              onClaim={onClaimFreeWater || (() => ({ success: false, message: 'Chưa hỗ trợ' }))}
            />
          </div>

          {/* Kawaii Cat Hero (Interactive Touch / Pet Target) */}
          <div
            className={`relative z-10 w-32 h-32 sm:w-48 sm:h-48 cursor-pointer active:scale-95 transition-transform duration-100 flex items-center justify-center ${
              catSquishAnim || isPressed ? 'scale-110 -rotate-2' : 'hover:scale-105'
            }`}
            id="cat-avatar"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            role="button"
            tabIndex={0}
            aria-label="Vuốt ve mèo cưng để nhận xu"
          >
            {/* BONG BÓNG KHI MÈO MỆT DO CHƠI ĐỒ CHƠI HOẶC BỊ VUỐT VE QUÁ NHIỀU */}
            {!isCatHungry && (petTiredSeconds > 0 || toyTiredSeconds > 0) && (
              <div
                className="absolute -top-14 sm:-top-16 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-none animate-pulse"
                title="Mèo đang nghỉ ngơi hồi sức"
              >
                <div
                  className={`relative bg-white/95 backdrop-blur-md text-slate-800 border-2 rounded-2xl px-2.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 whitespace-nowrap ${
                    petTiredSeconds > 0
                      ? 'border-pink-400 shadow-[0_8px_20px_rgba(244,114,182,0.3)]'
                      : 'border-amber-400 shadow-[0_8px_20px_rgba(245,158,11,0.25)]'
                  }`}
                >
                  <span className="text-sm sm:text-base">💤</span>
                  <div className="flex flex-col text-left leading-tight">
                    <span
                      className={`text-[10px] sm:text-[11px] font-black ${
                        petTiredSeconds > 0 ? 'text-pink-600' : 'text-amber-600'
                      }`}
                    >
                      Boss mệt rồi! Nghỉ ngơi ({petTiredSeconds > 0 ? petTiredSeconds : toyTiredSeconds}s)
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">
                      {petTiredSeconds > 0
                        ? 'Bị nựng liên tục mệt quá meow~ 🐾'
                        : 'Đang hồi sức để chơi tiếp... 🐾'}
                    </span>
                  </div>
                  <div
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] ${
                      petTiredSeconds > 0 ? 'border-t-pink-400' : 'border-t-amber-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* BONG BÓNG CHAT KHI MÈO ĐÓI (HUNGRY SPEECH BUBBLE) */}
            {isCatHungry && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playPop();
                  setIsFeedModalOpen(true);
                }}
                className="absolute -top-16 sm:-top-20 left-1/2 -translate-x-1/2 z-40 cursor-pointer animate-bounce-gentle select-none pointer-events-auto"
                title="Mèo đang đói bụng! Chạm để mở túi cho Boss ăn ngay"
              >
                <div className="relative bg-white/95 backdrop-blur-md text-slate-800 border-2 border-red-400 hover:border-red-500 rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-[0_8px_24px_rgba(239,68,68,0.28)] flex items-center gap-1.5 whitespace-nowrap transition-transform hover:scale-105 active:scale-95">
                  <span className="text-base sm:text-lg animate-pulse">😿</span>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[11px] sm:text-xs font-black text-red-600 flex items-center gap-1">
                      Đói quá meow~! ({Math.round(food)}%)
                      <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[9px] font-black">
                        Không thể câu cá
                      </span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                      Cho Boss ăn mới đi câu cá được nhé! 🍱
                    </span>
                  </div>
                  {/* Tail of speech bubble */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-red-400" />
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-white" />
                </div>
              </div>
            )}

            {/* BONG BÓNG CHAT KHI VUỐT VE (PETTING SPEECH BUBBLE) */}
            {!isCatHungry && petSpeech && (
              <div className="absolute -top-14 sm:-top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce-in select-none">
                <div className="relative bg-white/95 backdrop-blur-md text-amber-950 border-2 border-amber-300 rounded-2xl px-3 py-1 sm:px-3.5 sm:py-1.5 shadow-md flex items-center gap-1.5 whitespace-nowrap text-xs font-black">
                  <span>🐱</span>
                  <span>{petSpeech}</span>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-amber-300" />
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white" />
                </div>
              </div>
            )}

            {/* Equipped Hat on Cat Head (Hỗ trợ kéo thả, xoay và gắn vị trí) */}
            {curHat && (
              <div
                style={{
                  transform: `translate(calc(-50% + ${hatTransform.offsetX}px), ${hatTransform.offsetY}px) rotate(${hatTransform.rotation}deg) scale(${hatTransform.scale})`,
                  transformOrigin: 'bottom center',
                }}
                className={`absolute -top-4 sm:-top-6 left-1/2 z-20 flex items-center justify-center select-none touch-none transition-transform duration-75 ${
                  isFittingHatOpen
                    ? isDraggingHat
                      ? 'cursor-grabbing p-1 sm:p-1.5 rounded-2xl ring-4 ring-primary ring-offset-2 ring-offset-surface-container-low bg-primary/20 shadow-2xl scale-105'
                      : 'cursor-grab p-1 sm:p-1.5 rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low bg-primary/10 shadow-lg hover:scale-105'
                    : 'pointer-events-none animate-bounce-gentle'
                }`}
                onPointerDown={isFittingHatOpen ? handleHatPointerDown : undefined}
                onPointerMove={isFittingHatOpen ? handleHatPointerMove : undefined}
                onPointerUp={isFittingHatOpen ? handleHatPointerUp : undefined}
                onPointerCancel={isFittingHatOpen ? handleHatPointerUp : undefined}
                title={isFittingHatOpen ? 'Kéo để di chuyển vị trí mũ trên đầu Boss' : curHat.name}
              >
                {curHat.image ? (
                  <img
                    src={curHat.image}
                    alt={curHat.name}
                    className="w-18 h-18 sm:w-24 sm:h-24 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)] select-none pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl filter drop-shadow-md select-none pointer-events-none">{curHat.icon}</span>
                )}

                {/* Badge hiển thị góc xoay hoặc trạng thái khi đang chỉnh */}
                {isFittingHatOpen && (
                  <div className="absolute -top-2 -right-2 bg-primary text-on-primary rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[9px] font-bold shadow-md pointer-events-none animate-pulse">
                    <span>
                      {isDraggingHat
                        ? 'Đang kéo'
                        : hatTransform.rotation !== 0
                        ? `${hatTransform.rotation}°`
                        : 'Chỉnh'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Equipped Clothes Badge on Cat Chest */}
            {curClothes && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-surface-container-lowest/95 backdrop-blur-md px-2 py-0.5 rounded-full border border-outline-variant/40 shadow-sm flex items-center gap-1 text-[10px] font-bold text-secondary pointer-events-none"
                title={curClothes.name}
              >
                <span>{curClothes.icon}</span>
                <span>{curClothes.badge}</span>
              </div>
            )}

            {displayImage ? (
              <img
                src={displayImage}
                alt={currentSkin.name}
                className="w-full h-full object-contain filter drop-shadow-[0_12px_18px_rgba(165,59,41,0.22)] select-none pointer-events-none transition-all duration-150"
                draggable={false}
              />
            ) : (
              <svg
                className="w-full h-full drop-shadow-[0_10px_14px_rgba(165,59,41,0.18)]"
                fill="none"
                viewBox="0 0 200 180"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Tail with Wag Animation */}
                <path
                  className="animate-bounce origin-bottom-left"
                  d="M45 125C25 115 15 85 30 70C38 62 50 68 45 82C40 95 55 110 65 118"
                  fill="none"
                  stroke={palette.stripes || palette.fur || '#ff7e67'}
                  strokeLinecap="round"
                  strokeWidth="14"
                  style={{ animationDuration: '2.2s' }}
                />

                {/* Round Body */}
                <ellipse cx="100" cy="115" fill={palette.fur || '#ffb4a6'} rx="65" ry="50" />
                <ellipse cx="100" cy="118" fill={palette.furLight || '#fff0ef'} rx="46" ry="34" />

                {/* Cat Ears */}
                <path d="M60 62L46 25C44 20 52 16 57 20L80 50Z" fill={palette.fur || '#ff7e67'} />
                <path d="M60 55L50 30L73 48Z" fill={palette.ears || '#ffdad4'} />
                <path d="M140 62L154 25C156 20 148 16 143 20L120 50Z" fill={palette.fur || '#ff7e67'} />
                <path d="M140 55L150 30L127 48Z" fill={palette.ears || '#ffdad4'} />

                {/* Round Head */}
                <circle cx="100" cy="74" fill={palette.fur || '#ffb4a6'} r="46" />

                {/* Cute Chubby Cheeks Blush */}
                <ellipse cx="72" cy="85" fill={palette.cheeks || '#ff7e67'} opacity="0.5" rx="9" ry="6" />
                <ellipse cx="128" cy="85" fill={palette.cheeks || '#ff7e67'} opacity="0.5" rx="9" ry="6" />

                {/* Happy Curved Smiling Eyes */}
                <path
                  d="M72 73C76 68 84 68 88 73"
                  stroke={palette.eyes || '#731709'}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
                <path
                  d="M112 73C116 68 124 68 128 73"
                  stroke={palette.eyes || '#731709'}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />

                {/* Little Nose & Cute Cat Mouth */}
                <polygon fill={palette.nose || '#a53b29'} points="98,81 102,81 100,84" />
                <path
                  d="M94 85C97 88 100 88 100 85C100 88 103 88 106 85"
                  fill="none"
                  stroke={(palette as Record<string, string | undefined>).mouth || '#731709'}
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />

                {/* Whiskers */}
                <line stroke={(palette as Record<string, string | undefined>).whiskers || '#dec0ba'} strokeLinecap="round" strokeWidth="2" x1="56" x2="40" y1="80" y2="78" />
                <line stroke={(palette as Record<string, string | undefined>).whiskers || '#dec0ba'} strokeLinecap="round" strokeWidth="2" x1="56" x2="38" y1="86" y2="88" />
                <line stroke={(palette as Record<string, string | undefined>).whiskers || '#dec0ba'} strokeLinecap="round" strokeWidth="2" x1="144" x2="160" y1="80" y2="78" />
                <line stroke={(palette as Record<string, string | undefined>).whiskers || '#dec0ba'} strokeLinecap="round" strokeWidth="2" x1="144" x2="162" y1="86" y2="88" />

                {/* Sleeping Paws tucked in */}
                <ellipse cx="80" cy="132" fill={palette.furLight || '#fff8f7'} rx="14" ry="10" />
                <ellipse cx="120" cy="132" fill={palette.furLight || '#fff8f7'} rx="14" ry="10" />
              </svg>
            )}
          </div>

          {/* Local Simulated Dynamic Tap Popups - NO FISH IMAGE */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {localPopups.map((pop) => (
              <div
                key={pop.id}
                className="absolute text-xs sm:text-sm font-bold transition-all duration-700 pointer-events-none select-none animate-bounce whitespace-nowrap"
                style={{
                  left: `${pop.xPercent}%`,
                  top: `${pop.yPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {pop.isCrit ? (
                  <span className="bg-surface-container-lowest/95 px-2 py-0.5 rounded-full text-tertiary font-extrabold shadow-md border border-tertiary-fixed text-[11px] sm:text-xs">
                     {pop.text}
                  </span>
                ) : (
                  <span className="bg-surface-container-lowest/95 px-1.5 py-0.5 rounded-full text-primary font-bold shadow-sm border border-primary-fixed text-[11px] sm:text-xs">
                    💖 {pop.text}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 👒 BẢNG ĐIỀU KHIỂN CHỈNH VỊ TRÍ, XOAY & GẮN MŨ */}
        {isFittingHatOpen && (
          <div className="z-30 w-full max-w-md my-2 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border-2 border-primary/40 flex flex-col gap-3 animate-fade-in text-on-surface">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-xl overflow-hidden shrink-0 border border-primary/20">
                  {curHat?.image ? (
                    <img src={curHat.image} alt={curHat.name} className="w-full h-full object-contain p-0.5" />
                  ) : (
                    curHat?.icon || '👒'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-on-surface">
                      {curHat ? curHat.name : 'Chưa Chọn Mũ'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                      {curHat ? (hatTransform.isAttached ? 'Đang Gắn' : 'Đang Chỉnh') : 'Chưa Có Mũ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-medium">
                    {curHat
                      ? 'Kéo trực tiếp mũ trên đầu Boss hoặc dùng thanh điều khiển bên dưới'
                      : 'Chọn một chiếc mũ đã có bên dưới để đội và chỉnh vị trí'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer text-xs font-bold transition-colors"
                onClick={() => setIsFittingHatOpen(false)}
                title="Đóng bảng chỉnh"
              >
                ✕
              </button>
            </div>

            {curHat ? (
              <>
                {/* 1. Thanh trượt Xoay góc (Rotate) */}
                <div className="flex flex-col gap-1 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[16px]">rotate_right</span>
                      Góc Xoay Mũ
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-primary font-mono text-[11px] border border-outline-variant/30 font-bold">
                      {hatTransform.rotation > 0 ? `+${hatTransform.rotation}°` : `${hatTransform.rotation}°`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-xs font-bold border border-outline-variant/30 cursor-pointer active:scale-95 transition-transform"
                      onClick={() => handleNudgeRotate(-5)}
                      title="Nghiêng trái 5°"
                    >
                      ⟲ -5°
                    </button>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      step="1"
                      value={hatTransform.rotation}
                      onChange={(e) => handleRotateHat(Number(e.target.value))}
                      className="flex-1 accent-primary cursor-pointer h-2 bg-surface-container-highest rounded-lg"
                    />
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-xs font-bold border border-outline-variant/30 cursor-pointer active:scale-95 transition-transform"
                      onClick={() => handleNudgeRotate(5)}
                      title="Nghiêng phải 5°"
                    >
                      ⟳ +5°
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-[11px] font-bold text-on-surface-variant border border-outline-variant/30 cursor-pointer"
                      onClick={() => handleRotateHat(0)}
                      title="Thẳng đứng 0°"
                    >
                      0°
                    </button>
                  </div>
                </div>

                {/* 2. Căn Vị Trí X, Y (D-pad & Fine Tune) & Kích Thước (Scale) */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Vị trí X, Y */}
                  <div className="flex flex-col gap-1 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-secondary text-[16px]">open_with</span>
                        Vị Trí X, Y
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono font-bold">
                        {hatTransform.offsetX > 0 ? `+${hatTransform.offsetX}` : hatTransform.offsetX},{hatTransform.offsetY > 0 ? `+${hatTransform.offsetY}` : hatTransform.offsetY}px
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 my-1">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center font-bold text-xs hover:bg-surface-container active:scale-90 cursor-pointer"
                        onClick={() => handleNudgePosition(-3, 0)}
                        title="Dịch trái 3px"
                      >
                        ◀
                      </button>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center font-bold text-xs hover:bg-surface-container active:scale-90 cursor-pointer"
                          onClick={() => handleNudgePosition(0, -3)}
                          title="Dịch lên 3px"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center font-bold text-xs hover:bg-surface-container active:scale-90 cursor-pointer"
                          onClick={() => handleNudgePosition(0, 3)}
                          title="Dịch xuống 3px"
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center font-bold text-xs hover:bg-surface-container active:scale-90 cursor-pointer"
                        onClick={() => handleNudgePosition(3, 0)}
                        title="Dịch phải 3px"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Kích thước mũ (Scale) */}
                  <div className="flex flex-col justify-between bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-amber-700 text-[16px]">aspect_ratio</span>
                        Cỡ Mũ
                      </span>
                      <span className="text-[10px] text-amber-800 font-mono font-bold">
                        {Math.round(hatTransform.scale * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        className="flex-1 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-bold text-xs hover:bg-surface-container active:scale-95 cursor-pointer text-center"
                        onClick={() => handleScaleHat(hatTransform.scale - 0.05)}
                        title="Thu nhỏ 5%"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-bold text-[10px] hover:bg-surface-container cursor-pointer text-center"
                        onClick={() => handleScaleHat(1.0)}
                        title="Cỡ chuẩn 100%"
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-bold text-xs hover:bg-surface-container active:scale-95 cursor-pointer text-center"
                        onClick={() => handleScaleHat(hatTransform.scale + 0.05)}
                        title="Phóng to 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Action Buttons: Gắn Mũ Chắc Chắn & Gắn Chuẩn */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Nút Snap Chuẩn */}
                  <button
                    type="button"
                    className="px-3 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex items-center justify-center gap-1 border border-outline-variant/30 active:scale-95 cursor-pointer shrink-0"
                    onClick={handleSnapHatToHead}
                    title="Đưa mũ về vị trí cân đối chuẩn trên đầu mèo"
                  >
                    <span>🎯</span>
                    <span>Gắn Chuẩn</span>
                  </button>

                  {/* NÚT CHÍNH: GẮN MŨ CHẮC CHẮN */}
                  <button
                    type="button"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_0_#842415] active:translate-y-0.5 cursor-pointer transition-all"
                    onClick={handleAttachAndLockHat}
                    title="Lưu vị trí và gắn chặt mũ vào đầu Boss"
                  >
                    <span className="material-symbols-outlined text-[18px]">push_pin</span>
                    <span>Gắn Mũ Chắc Chắn</span>
                  </button>

                  {/* Tháo Mũ */}
                  <button
                    type="button"
                    className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center gap-1 border border-rose-200 active:scale-95 cursor-pointer shrink-0"
                    onClick={handleUnequipHat}
                    title="Tháo mũ cất vào balo"
                  >
                    <span>✕</span>
                    <span>Tháo</span>
                  </button>
                </div>
              </>
            ) : null}

            {/* 4. Khay Đổi Mũ Nhanh (Quick Tray) */}
            {ownedHatsList.length > 0 ? (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/20">
                <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant">
                  <span>Chọn mũ để gắn ({ownedHatsList.length} mũ đã có):</span>
                  {onOpenFashionShop && (
                    <button
                      type="button"
                      className="text-primary hover:underline text-[10px] cursor-pointer"
                      onClick={onOpenFashionShop}
                    >
                      + Sắm thêm mũ
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {ownedHatsList.map((hat) => {
                    const isEquipped = curHat?.id === hat.id;
                    return (
                      <button
                        key={hat.id}
                        type="button"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                          isEquipped
                            ? 'bg-primary text-on-primary border-primary shadow-xs'
                            : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
                        }`}
                        onClick={() => {
                          if (onEquipFashionItem) {
                            onEquipFashionItem(hat);
                            soundManager.playPop();
                          }
                        }}
                      >
                        {hat.image ? (
                          <img src={hat.image} alt={hat.name} className="w-5 h-5 object-contain" />
                        ) : (
                          <span>{hat.icon}</span>
                        )}
                        <span className="truncate max-w-[90px]">{hat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <span>Bạn chưa sở hữu mũ nào.</span>
                {onOpenFashionShop && (
                  <button
                    type="button"
                    className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    onClick={onOpenFashionShop}
                  >
                    🛍️ Mua Mũ Ngay
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Big Bouncy CTA: Vuốt ve Mèo (Tap to Pet) */}
        <button
          type="button"
          className={`relative z-10 w-full max-w-xs mt-1.5 sm:mt-2 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-full font-headline-sm text-sm sm:text-headline-sm transition-all flex items-center justify-center gap-1.5 sm:gap-space-sm cursor-pointer select-none font-bold ${
            petTiredSeconds > 0
              ? 'bg-slate-300 text-slate-700 shadow-[0_3px_0_#94a3b8] sm:shadow-[0_4px_0_#94a3b8] opacity-85'
              : 'bg-primary-container text-on-primary shadow-[0_3px_0_#842415] sm:shadow-[0_5px_0_#842415] active:translate-y-0.5 active:shadow-[0_1px_0_#842415]'
          }`}
          id="pet-button"
          onClick={handlePetButtonClick}
        >
          <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
            {petTiredSeconds > 0 ? 'bedtime' : 'favorite'}
          </span>
          <span className="truncate flex items-center justify-center gap-1">
            {petTiredSeconds > 0 ? (
              <span>Boss đang nghỉ ({petTiredSeconds}s)</span>
            ) : (
              <>
                <span>Vuốt ve {catName || currentSkin.name} (+{actualClickPower}</span>
                <img
                  src="/images/icon/xu-vang.webp"
                  alt="Xu"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain inline-block shrink-0"
                  draggable={false}
                />
                <span>)</span>
              </>
            )}
          </span>
          <span className="material-symbols-outlined text-[16px] sm:text-[20px] opacity-80">
            {petTiredSeconds > 0 ? 'hourglass_top' : 'touch_app'}
          </span>
        </button>
      </div>

      {/* 3. Cat Vitals & Frenzy Meter */}
      <div className="w-full bg-surface-container-lowest rounded-lg p-2.5 sm:p-space-md shadow-[0_4px_16px_rgba(122,105,104,0.08)] flex flex-col gap-2 sm:gap-space-md border border-outline-variant/30">

        <div className="grid grid-cols-2 gap-1.5 sm:gap-space-sm">
          {/* Food Indicator */}
          <div
            className="bg-surface-container-low rounded-lg p-2 sm:p-space-sm flex flex-col gap-1 sm:gap-1.5 cursor-pointer hover:bg-surface-container transition-colors"
            onClick={() => setIsFeedModalOpen(true)}
            role="button"
            tabIndex={0}
            title="Chạm để mở túi thức ăn cho mèo"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container text-[14px] sm:text-[16px]">set_meal</span>
                </div>
                <span className="font-label-sm sm:font-label-md text-xs sm:text-label-md text-on-surface font-bold">Thức ăn</span>
              </div>
              <span className="font-label-sm sm:font-label-md text-xs sm:text-label-md text-secondary font-bold">
                {Math.round(food)}%
              </span>
            </div>
            <div className="w-full h-2 sm:h-2.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, food))}%` }}
              />
            </div>
            <span className="font-label-sm text-[10px] sm:text-label-sm text-on-secondary-container font-semibold truncate">
              {isSatiated
                ? `✨ No lâu (${Math.max(1, Math.ceil((_satietyExpiresAt - Date.now()) / 60000))}p) (+25%)`
                : food >= 60
                ? 'No nê (+25%)'
                : food >= 25
                ? 'Bình thường'
                : 'Đói bụng! (-30%)'}
            </span>
          </div>

          {/* Water Indicator */}
          <div
            className="bg-surface-container-low rounded-lg p-2 sm:p-space-sm flex flex-col gap-1 sm:gap-1.5 cursor-pointer hover:bg-surface-container transition-colors"
            onClick={() => setIsFeedModalOpen(true)}
            role="button"
            tabIndex={0}
            title="Chạm để mở túi thức ăn và nước uống cho mèo"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">water_drop</span>
                </div>
                <span className="font-label-sm sm:font-label-md text-xs sm:text-label-md text-on-surface font-bold">Nước uống</span>
              </div>
              <span className="font-label-sm sm:font-label-md text-xs sm:text-label-md text-primary font-bold">
                {Math.round(water)}%
              </span>
            </div>
            <div className="w-full h-2 sm:h-2.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, water))}%` }}
              />
            </div>
            <span className="font-label-sm text-[10px] sm:text-label-sm text-on-surface-variant font-semibold truncate">
              {isSatiated
                ? `✨ Đủ nước (${Math.max(1, Math.ceil((_satietyExpiresAt - Date.now()) / 60000))}p) (+25%)`
                : water >= 60
                ? 'Tươi mát (+25%)'
                : water >= 25
                ? 'Bình thường'
                : 'Khát nước!'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Cute Notification Banner */}
      <div className="w-full bg-secondary-container/50 rounded-lg p-2 sm:p-space-sm flex items-center gap-2 sm:gap-space-sm shadow-sm border border-secondary/20">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 font-bold">
          <span className="material-symbols-outlined text-[16px] sm:text-[18px]">sentiment_very_satisfied</span>
        </div>
        <p className="text-xs sm:text-sm text-on-secondary-container leading-snug min-w-0 font-semibold">
          {isHungry ? (
            <>😿 Mèo đang đói bụng! Hãy cho ăn để nhận đủ 100% xu vuốt ve.</>
          ) : isThirsty ? (
            <>💧 Mèo đang khát nước! Hãy cho mèo uống nước sạch nhé.</>
          ) : isWellCared ? (
            <>Mèo đang rất hạnh phúc! Tốc độ bắt cá tự động tăng thêm <strong>+25%</strong>.</>
          ) : (
            <>Chạm vuốt ve mèo để nhận thêm xu thưởng!</>
          )}
        </p>
      </div>

      {/* Nút Balo Nổi Hình Mèo Tách Nền Ở Góc Dưới Cùng Bên Phải */}
      {onOpenBasket && (
        <button
          type="button"
          onClick={() => {
            soundManager.playPop();
            onOpenBasket();
          }}
          className="floating-backpack-btn animate-backpack-wiggle active:scale-90 hover:scale-105 transition-transform"
          title="Mở Balo Của Boss (Túi cá, Thời trang, Thức ăn, Cần câu)"
          aria-label="Mở Balo Của Boss"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src="/images/icon/ba-lo-hinh-meo.webp"
              alt="Balo Hình Mèo"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.32)]"
              draggable={false}
            />
            {basketCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-md border-2 border-white leading-tight z-10 animate-pulse">
                {basketCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* 6. Built-in Feeding Drawer / Modal */}
      {isFeedModalOpen && (
        <div className="feeding-modal-backdrop" onClick={() => setIsFeedModalOpen(false)}>
          <div className="feeding-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="feeding-modal-header">
              <div className="f-m-title-row">
                <span className="f-m-icon">🍽️</span>
                <div>
                  <h3 className="f-m-title">Cho Mèo Ăn Từ Túi</h3>
                  <p className="f-m-subtitle">Chọn loại thức ăn & số lượng để bồi dưỡng cho mèo cưng</p>
                </div>
              </div>
              <button
                type="button"
                className="f-m-close-btn"
                onClick={() => setIsFeedModalOpen(false)}
                title="Đóng bảng"
              >
                ✕
              </button>
            </div>

            {feedToast && (
              <div className="f-m-toast-banner animate-bounce-in">{feedToast}</div>
            )}

            {/* Current belly status */}
            <div className="f-m-belly-status">
              <div className="f-m-stat-pill">
                <span>🍖 Độ No:</span>
                <strong>{Math.round(food)}%</strong>
              </div>
              <div className="f-m-stat-pill">
                <span>💧 Độ Khát:</span>
                <strong>{Math.round(water)}%</strong>
              </div>
            </div>

            {/* Owned food list */}
            <div className="f-m-food-list-title">
              <span>Thức ăn trong túi của bạn:</span>
              <button
                type="button"
                className="f-m-shop-link-btn"
                onClick={() => {
                  setIsFeedModalOpen(false);
                  onOpenFoodShop();
                }}
              >
                🛒 Mua Thêm
              </button>
            </div>

            {(() => {
              const ownedFoodItems = FOOD_SHOP_CATALOG.filter(
                (item) => (foodInventory[item.id] || 0) > 0
              );

              if (ownedFoodItems.length === 0) {
                return (
                  <div className="f-m-empty-selection py-6">
                    <span className="text-3xl mb-1">🧺</span>
                    <p className="font-bold text-amber-900">Túi thức ăn của bạn đang trống!</p>
                    <p className="text-xs text-amber-700">Hãy ghé Cửa Hàng Thức Ăn để mua thêm đồ ăn bồi dưỡng cho mèo cưng nhé.</p>
                    <button
                      type="button"
                      className="f-m-buy-now-btn mt-2"
                      onClick={() => {
                        setIsFeedModalOpen(false);
                        onOpenFoodShop();
                      }}
                    >
                      🛒 Đến Cửa Hàng Thức Ăn
                    </button>
                  </div>
                );
              }

              const selectedItem =
                ownedFoodItems.find((f) => f.id === selectedFoodId) || ownedFoodItems[0];
              const available = foodInventory[selectedItem.id] || 0;
              const currentFeedQty = Math.max(1, Math.min(feedQuantity, available));
              const richnessBonus = 1 + Math.min(1.5, selectedItem.price / 3000);
              const foodGain = selectedItem.foodRestore * currentFeedQty;
              const waterGain = selectedItem.waterRestore * currentFeedQty;
              const xpGain = Math.round(selectedItem.xpReward * currentFeedQty * richnessBonus);

              return (
                <>
                  <div className="f-m-food-grid">
                    {ownedFoodItems.map((item) => {
                      const count = foodInventory[item.id] || 0;
                      const isSelected = selectedItem.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`f-m-food-item ${isSelected ? 'item-selected' : ''}`}
                          onClick={() => {
                            soundManager.playPop();
                            setSelectedFoodId(item.id);
                            setFeedQuantity(1);
                          }}
                        >
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-9 h-9 object-contain shrink-0" />
                          ) : (
                            <span className="f-m-item-icon shrink-0">{item.icon}</span>
                          )}
                          <div className="f-m-item-info">
                            <strong className="f-m-item-name">{item.name}</strong>
                            <span className="f-m-item-qty">Còn: x{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected item feeding control */}
                  <div className="f-m-selected-details-box">
                    <div className="flex items-center gap-3 p-2 bg-amber-50/70 rounded-xl border border-amber-100 mb-1">
                      {selectedItem.image ? (
                        <img src={selectedItem.image} alt={selectedItem.name} className="w-10 h-10 object-contain shrink-0 drop-shadow-xs" />
                      ) : (
                        <span className="text-2xl">{selectedItem.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <strong className="text-sm font-bold text-gray-800 block truncate">{selectedItem.name}</strong>
                        <span className="text-xs text-amber-800 line-clamp-1">{selectedItem.description}</span>
                      </div>
                    </div>
                    <div className="f-m-stepper-control">
                      <span className="f-m-stepper-label">Số lượng cho ăn:</span>
                      <div className="f-m-stepper-btns">
                        <button
                          type="button"
                          className="f-m-step-btn"
                          disabled={currentFeedQty <= 1}
                          onClick={() => setFeedQuantity((q) => Math.max(1, q - 1))}
                        >
                          -
                        </button>
                        <strong className="f-m-step-num">{currentFeedQty}</strong>
                        <button
                          type="button"
                          className="f-m-step-btn"
                          disabled={currentFeedQty >= available}
                          onClick={() => setFeedQuantity((q) => Math.min(available, q + 1))}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="f-m-all-btn"
                        onClick={() => setFeedQuantity(available)}
                      >
                        Ăn hết (x{available})
                      </button>
                    </div>

                    {/* Restoration calculation breakdown */}
                    <div className="f-m-gain-row">
                      {selectedItem.foodRestore > 0 && (
                        <span className="f-m-gain-pill food-gain">
                          +{foodGain}% No ({Math.round(food)}% ➔ {Math.min(100, Math.round(food + foodGain))}%)
                        </span>
                      )}
                      {selectedItem.waterRestore > 0 && (
                        <span className="f-m-gain-pill water-gain">
                          +{waterGain}% Nước ({Math.round(water)}% ➔ {Math.min(100, Math.round(water + waterGain))}%)
                        </span>
                      )}
                      <span className="f-m-gain-pill xp-gain">
                        +{formatNumber(xpGain)} XP ⭐
                      </span>
                    </div>

                    <button
                      type="button"
                      className="f-m-submit-feed-btn"
                      onClick={() => {
                        if (!onFeedFromInventory) return;
                        const res = onFeedFromInventory(selectedItem, currentFeedQty);
                        if (res.success) {
                          setFeedToast(
                            `😋 Mèo đã ăn ${currentFeedQty}x ${selectedItem.name}! (+${res.restoredFood}% no, +${formatNumber(res.gainedXp)} XP ⭐)`
                          );
                          setFeedQuantity(1);
                          setTimeout(() => setFeedToast(null), 3000);
                        }
                      }}
                    >
                      🍽️ Cho Mèo Ăn {currentFeedQty}x {selectedItem.name}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});
