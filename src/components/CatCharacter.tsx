import React, { useState, useRef } from 'react';
import type { CatSkin } from '../data/skins';
import type { FishSpecies } from '../data/fishes';
import type { RankTier, CatGrowthStage } from '../data/rankTiers';
import { FOOD_SHOP_CATALOG, type FoodItem } from '../data/foodShop';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';
import { FreeWaterGiftButton } from './FreeWaterGiftButton';
import { type FashionDecorItem, getFashionItemById } from '../data/fashionAndDecor';

interface CatCharacterProps {
  currentSkin: CatSkin;
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
    rug?: string;
  };
  lastWaterGiftClaimedAt?: number;
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
  onFeedFromInventory?: (
    foodItem: FoodItem,
    quantity: number
  ) => {
    success: boolean;
    restoredFood: number;
    restoredWater: number;
    gainedXp: number;
  };
  onGiveWater?: () => void;
  onClaimFreeWater?: () => { success: boolean; message: string; remainingMs?: number; gainedWater?: number };
  onBuyFashionItem?: (item: FashionDecorItem) => { success: boolean; message: string };
  onEquipFashionItem?: (item: FashionDecorItem) => boolean;
  onCatClick: (clientX: number, clientY: number) => void;
}

interface LocalPopupItem {
  id: string;
  xPercent: number;
  yPercent: number;
  text: string;
  isCrit: boolean;
}

interface DecorPosition {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

const DEFAULT_BALL_POS: DecorPosition = { x: 12, y: 78 };
const DEFAULT_BOWL_POS: DecorPosition = { x: 86, y: 78 };

const loadSavedDecorPos = (key: string, defaultPos: DecorPosition): DecorPosition => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return {
          x: Math.max(6, Math.min(94, parsed.x)),
          y: Math.max(10, Math.min(92, parsed.y)),
        };
      }
    }
  } catch {}
  return defaultPos;
};

export const CatCharacter: React.FC<CatCharacterProps> = ({
  currentSkin,
  isCatActive,
  actualClickPower,
  autoFishRate,
  comboMultiplier,
  comboCount,
  isFrenzy,
  food,
  water,
  foodInventory = {},
  equippedHat = '',
  equippedClothes = '',
  equippedDecor = { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach' },
  lastWaterGiftClaimedAt = 0,
  levelInfo,
  catStage,
  onOpenFoodShop,
  onOpenFashionShop,
  onOpenBasket,
  onFeedFromInventory,
  onGiveWater,
  onClaimFreeWater,
  onCatClick,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [catSquishAnim, setCatSquishAnim] = useState(false);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [ballBounceAnim, setBallBounceAnim] = useState(false);
  const [bowlClickAnim, setBowlClickAnim] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string>(FOOD_SHOP_CATALOG[0]?.id || '01_thuc_an_kho');
  const [feedQuantity, setFeedQuantity] = useState<number>(1);
  const [feedToast, setFeedToast] = useState<string | null>(null);
  const [localPopups, setLocalPopups] = useState<LocalPopupItem[]>([]);

  // Tọa độ vị trí kéo thả của Bát Ăn & Quả Banh trong phòng
  const playStageRef = useRef<HTMLDivElement | null>(null);
  const [ballPos, setBallPos] = useState<DecorPosition>(() =>
    loadSavedDecorPos('purr_ball_pos', DEFAULT_BALL_POS)
  );
  const [bowlPos, setBowlPos] = useState<DecorPosition>(() =>
    loadSavedDecorPos('purr_bowl_pos', DEFAULT_BOWL_POS)
  );
  const [draggingItem, setDraggingItem] = useState<'ball' | 'bowl' | null>(null);

  const dragStartRef = useRef<{
    item: 'ball' | 'bowl';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
  } | null>(null);

  const catContainerRef = useRef<HTMLDivElement | null>(null);

  const curHat = getFashionItemById(equippedHat);
  const curClothes = getFashionItemById(equippedClothes);
  const curBowl = getFashionItemById(equippedDecor?.bowl || 'bowl_clay');
  const curBall = getFashionItemById(equippedDecor?.ball || 'ball_yarn_red');
  const curRug = getFashionItemById(equippedDecor?.rug || 'rug_peach');

  const handleBallClick = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) e.stopPropagation();
    soundManager.playPop();
    setBallBounceAnim(true);
    setTimeout(() => setBallBounceAnim(false), 450);
    const cx = e ? e.clientX : window.innerWidth / 2;
    const cy = e ? e.clientY : window.innerHeight / 2;
    onCatClick(cx, cy);
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
    item: 'ball' | 'bowl'
  ) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const curPos = item === 'ball' ? ballPos : bowlPos;
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

        if (item === 'ball') {
          setBallPos({ x: nextX, y: nextY });
        } else {
          setBowlPos({ x: nextX, y: nextY });
        }
      }
    }
  };

  const handleItemPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    item: 'ball' | 'bowl'
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
      if (item === 'ball') {
        localStorage.setItem('purr_ball_pos', JSON.stringify(finalPos));
      } else {
        localStorage.setItem('purr_bowl_pos', JSON.stringify(finalPos));
      }
    } else {
      if (item === 'ball') {
        handleBallClick(e);
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
    onCatClick(cx, cy);

    // Spawn localized cute cuddle popup in sanctuary clicker stage
    const isCrit = Math.random() < (0.15 + (isFrenzy ? 0.35 : 0));
    const earned = Math.max(1, Math.round(actualClickPower * (isCrit ? 2.5 : 1)));
    const newPopup: LocalPopupItem = {
      id: `pop_${Date.now()}_${Math.random()}`,
      xPercent: 35 + Math.random() * 30,
      yPercent: 35 + Math.random() * 25,
      text: isCrit ? `CRIT! +${earned} 🪙` : `+${earned} 🪙`,
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

  const isWellCared = food >= 60 && water >= 60;
  const isHungry = food < 25;
  const isThirsty = water < 25;

  const { palette } = currentSkin;
  const isMouthOpen = isPressed || isCatActive;
  const displayImage = isMouthOpen
    ? (currentSkin.imageOpen || currentSkin.image)
    : (currentSkin.image || currentSkin.imageOpen);

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto px-gutter py-space-sm gap-space-md select-none font-body-md text-on-surface">
      {/* 1. Sub-header & Cat Level Status Card */}
      <div className="w-full bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_16px_rgba(122,105,104,0.08)] flex flex-col gap-space-xs relative overflow-hidden border border-outline-variant/30">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary-fixed/30 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center shadow-inner overflow-hidden border-2 border-primary-fixed text-2xl">
                {currentSkin.image ? (
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
              <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary font-label-sm text-label-sm px-1.5 py-0.5 rounded-full shadow-sm font-bold">
                Lv.{levelInfo.level}
              </span>
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-sm text-headline-sm text-on-surface truncate font-bold">
                  {currentSkin.name}
                </h2>
                <span className="bg-surface-container text-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full shrink-0 font-bold">
                  {catStage.label}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Giai đoạn Tăng trưởng • Tinh nghịch
              </p>
            </div>
          </div>
          <div className="bg-secondary-container/60 px-space-sm py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm border border-secondary/20">
            <span className="material-symbols-outlined text-on-secondary-container text-[18px]">bolt</span>
            <span className="font-label-md text-label-md text-on-secondary-container font-bold">
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
        className="w-full bg-surface-container-low rounded-xl p-space-md shadow-[0_6px_20px_rgba(122,105,104,0.08)] relative overflow-hidden flex flex-col items-center border border-outline-variant/30"
      >
        {/* Living Background Room Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-3 left-4 w-12 h-16 bg-surface-container rounded-t-full" />
          <div className="absolute top-2 right-8 flex items-center gap-1">
            <span className="material-symbols-outlined text-primary-fixed-dim text-lg">wb_sunny</span>
            <div className="w-16 h-8 bg-surface-bright/50 rounded-full" />
          </div>
          <div className="absolute bottom-6 left-3 w-10 h-24 bg-surface-container-high rounded-full" />
        </div>

        {/* Cozy Room Floating Info Tag */}
        <div className="z-10 flex items-center gap-1.5 bg-surface-container-lowest/80 backdrop-blur-md px-3 py-1 rounded-full shadow-sm mb-2 border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary text-[16px]">roofing</span>
          <span className="font-label-sm text-label-sm text-on-surface font-bold">
            Căn Phòng Đón Nắng Ấm
          </span>
        </div>

        {/* Center Play Stage & Interactive Cat */}
        <div ref={playStageRef} className="relative w-full aspect-[4/3] max-h-72 flex items-center justify-center my-space-xs touch-none select-none">
          {/* Rug based on equippedDecor.rug (Nằm ngay bên dưới nhân vật Cat) */}
          <div className="absolute z-0 w-64 h-64 sm:w-72 sm:h-72 max-w-[94%] max-h-[94%] flex items-center justify-center pointer-events-none select-none transition-all duration-300 translate-y-16 sm:translate-y-17">
            {curRug?.image ? (
              <img
                src={curRug.image}
                alt={curRug.name}
                className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] pointer-events-none select-none transition-transform duration-300"
                draggable={false}
              />
            ) : equippedDecor?.rug === 'rug_cloud' ? (
              <div className="w-60 h-52 rounded-[2.5rem] bg-sky-200/50 shadow-inner flex items-center justify-center pointer-events-none border border-sky-300/40">
                <div className="w-52 h-44 rounded-[2rem] bg-surface-container-lowest/90 shadow-sm flex items-center justify-center">
                  <div className="w-44 h-36 rounded-[1.5rem] bg-sky-100/60" />
                </div>
              </div>
            ) : equippedDecor?.rug === 'rug_paw' ? (
              <div className="w-56 h-56 rounded-full bg-rose-200/50 shadow-inner flex items-center justify-center pointer-events-none border border-rose-300/40">
                <div className="w-48 h-48 rounded-full bg-surface-container-lowest/90 shadow-sm flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full bg-rose-100/60 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🐾</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 rounded-full bg-primary-fixed/40 shadow-inner flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full bg-surface-container-lowest/90 shadow-sm flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full bg-surface-container-low/70" />
                </div>
              </div>
            )}
          </div>

          {/* QUẢ BANH / ĐỒ CHƠI TRANG TRÍ SẢNH PHÒNG (KHÔNG NỀN TRẮNG/KHUNG, TỰ DO KÉO THẢ) */}
          <div
            style={{
              left: `${ballPos.x}%`,
              top: `${ballPos.y}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform duration-75 ${
              draggingItem === 'ball'
                ? 'scale-125 z-30 drop-shadow-2xl opacity-90'
                : ballBounceAnim
                ? '-translate-y-8 rotate-12 scale-125'
                : 'hover:scale-110 active:scale-95'
            }`}
            onPointerDown={(e) => handleItemPointerDown(e, 'ball')}
            onPointerMove={handleItemPointerMove}
            onPointerUp={(e) => handleItemPointerUp(e, 'ball')}
            onPointerCancel={(e) => handleItemPointerUp(e, 'ball')}
            title={`${curBall?.name || 'Đồ chơi'} (Chạm để chơi / Giữ để di chuyển)`}
          >
            {curBall?.image ? (
              <img
                src={curBall.image}
                alt={curBall.name}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.22)] select-none pointer-events-none"
                draggable={false}
              />
            ) : (
              <span className="text-4xl filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.2)] select-none pointer-events-none">
                {curBall?.icon || '🧶'}
              </span>
            )}
          </div>

          {/* MÁNG ĂN TRANG TRÍ SẢNH PHÒNG (KHÔNG NỀN TRẮNG/KHUNG, TỰ DO KÉO THẢ) */}
          <div
            style={{
              left: `${bowlPos.x}%`,
              top: `${bowlPos.y}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform duration-75 ${
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
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)] select-none pointer-events-none"
                draggable={false}
              />
            ) : (
              <span className="text-4xl filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.2)] select-none pointer-events-none">
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
            className={`relative z-10 w-48 h-48 cursor-pointer active:scale-95 transition-transform duration-100 flex items-center justify-center ${
              catSquishAnim || isPressed ? 'scale-110 -rotate-2' : 'hover:scale-105'
            }`}
            id="cat-avatar"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            role="button"
            tabIndex={0}
            aria-label="Vuốt ve mèo cưng để nhận xu"
          >
            {/* Equipped Hat on Cat Head */}
            {curHat && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-3xl filter drop-shadow-md pointer-events-none animate-bounce-gentle"
                title={curHat.name}
              >
                {curHat.icon}
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

        {/* Big Bouncy CTA: Vuốt ve Mèo (Tap to Pet) */}
        <button
          type="button"
          className="relative z-10 w-full max-w-xs mt-2 bg-primary-container text-on-primary py-3.5 px-6 rounded-full font-headline-sm text-headline-sm shadow-[0_5px_0_#842415] active:translate-y-1 active:shadow-[0_1px_0_#842415] transition-all flex items-center justify-center gap-space-sm cursor-pointer select-none font-bold"
          id="pet-button"
          onClick={handlePetButtonClick}
        >
          <span className="material-symbols-outlined text-[24px]">favorite</span>
          <span>Vuốt ve {currentSkin.name} (+{actualClickPower} 🪙)</span>
          <span className="material-symbols-outlined text-[20px] opacity-80">touch_app</span>
        </button>
      </div>

      {/* 3. Cat Vitals & Frenzy Meter */}
      <div className="w-full bg-surface-container-lowest rounded-lg p-space-md shadow-[0_4px_16px_rgba(122,105,104,0.08)] flex flex-col gap-space-md border border-outline-variant/30">
        <div className="grid grid-cols-2 gap-space-sm">
          {/* Food Indicator */}
          <div
            className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5 cursor-pointer hover:bg-surface-container transition-colors"
            onClick={() => setIsFeedModalOpen(true)}
            role="button"
            tabIndex={0}
            title="Chạm để mở túi thức ăn cho mèo"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container text-[16px]">set_meal</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface font-bold">Thức ăn</span>
              </div>
              <span className="font-label-md text-label-md text-secondary font-bold">
                {Math.round(food)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, food))}%` }}
              />
            </div>
            <span className="font-label-sm text-label-sm text-on-secondary-container font-semibold">
              {food >= 60 ? 'No nê (Auto-fish +25%)' : food >= 25 ? 'Bình thường' : 'Đói bụng! (-30% xu)'}
            </span>
          </div>

          {/* Water Indicator */}
          <div
            className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5 cursor-pointer hover:bg-surface-container transition-colors"
            onClick={onGiveWater}
            role="button"
            tabIndex={0}
            title="Chạm để cho mèo uống nước sạch (+40%)"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[16px]">water_drop</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface font-bold">Nước uống</span>
              </div>
              <span className="font-label-md text-label-md text-primary font-bold">
                {Math.round(water)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, water))}%` }}
              />
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
              {water >= 60 ? 'Đầy đủ và tươi mát' : water >= 25 ? 'Bình thường' : 'Khát nước!'}
            </span>
          </div>
        </div>

        {/* Frenzy Combo Bar */}
        <div className="w-full bg-surface-container-high rounded-lg p-space-sm flex flex-col gap-1.5 border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-[20px] animate-pulse">
                local_fire_department
              </span>
              <span className="font-label-lg text-label-lg text-on-surface font-bold">
                Combo Frenzy: <strong className="text-tertiary">{comboCount}x Combo</strong>
              </span>
            </div>
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse font-bold">
              x{comboMultiplier.toFixed(1)}
            </span>
          </div>
          <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-tertiary-container via-primary-container to-tertiary rounded-full relative transition-all duration-300"
              style={{ width: `${Math.min(100, comboCount * 10)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              {comboCount >= 10 ? '🔥 FRENZY ĐANG BÙNG NỔ! Nhấp liên tục!' : 'Nhấp liên tục để kích hoạt FRENZY!'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
              x{comboMultiplier.toFixed(1)} Sản Lượng
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
            <>Chạm vuốt ve mèo để nhận xu thưởng và kích hoạt combo bùng nổ!</>
          )}
        </p>
      </div>

      {/* 5. Quick Action Floating Pill Bar */}
      <div className="w-full flex items-center justify-between gap-space-xs pt-space-xs">
        

        {/* Shop Thời Trang & Trang Trí Phòng (Chuyển trang toàn màn hình) */}
        <button
          type="button"
          onClick={onOpenFashionShop}
          className="flex-1 bg-surface-container-lowest text-on-surface p-space-sm rounded-lg flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_#dec0ba] active:translate-y-0.5 active:shadow-[0_1px_0_#dec0ba] transition-all cursor-pointer border border-outline-variant/30 hover:bg-surface-bright"
          title="Mở Shop Thời Trang (Áo, Mũ & Đồ Trang Trí Phòng)"
        >
          <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              styler
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-center leading-tight font-bold">Thời Trang</span>
          {/* <span className="font-label-sm text-label-sm text-rose-700 font-bold">Áo, Mũ & Phòng</span> */}
        </button>

        {/* Balo Của Boss Shortcut */}
        <button
          type="button"
          onClick={onOpenBasket}
          className="flex-1 bg-surface-container-lowest text-on-surface p-space-sm rounded-lg flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_#dec0ba] active:translate-y-0.5 active:shadow-[0_1px_0_#dec0ba] transition-all cursor-pointer border border-outline-variant/30 hover:bg-surface-bright"
          title="Mở Balo Của Boss (Túi cá, Cần câu, Thời trang, Thức ăn)"
        >
          <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span>
          </div>
          <span className="font-label-sm text-label-sm text-center leading-tight font-bold">Balo</span>
          {/* <span className="font-label-sm text-label-sm text-secondary font-bold">
            {basketCount > 0 ? `${basketCount} cá • Đồ đạc` : 'Kho đồ đạc'}
          </span> */}
        </button>
      </div>

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

            <div className="f-m-food-grid">
              {FOOD_SHOP_CATALOG.map((item) => {
                const count = foodInventory[item.id] || 0;
                const isSelected = selectedFoodId === item.id;
                const isOutOfStock = count <= 0;

                return (
                  <div
                    key={item.id}
                    className={`f-m-food-item ${isSelected ? 'item-selected' : ''} ${
                      isOutOfStock ? 'item-out-of-stock' : ''
                    }`}
                    onClick={() => {
                      if (!isOutOfStock) {
                        soundManager.playPop();
                        setSelectedFoodId(item.id);
                        setFeedQuantity(1);
                      }
                    }}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-8 h-8 object-contain shrink-0" />
                    ) : (
                      <span className="f-m-item-icon">{item.icon}</span>
                    )}
                    <div className="f-m-item-info">
                      <strong className="f-m-item-name">{item.name}</strong>
                      <span className="f-m-item-qty">
                        {isOutOfStock ? 'Hết hàng (x0)' : `Còn: x${count}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected item feeding control */}
            {(() => {
              const selectedItem =
                FOOD_SHOP_CATALOG.find((f) => f.id === selectedFoodId) || FOOD_SHOP_CATALOG[0];
              const available = foodInventory[selectedItem.id] || 0;

              if (available <= 0) {
                return (
                  <div className="f-m-empty-selection">
                    <p>Món này hiện đã hết trong túi!</p>
                    <button
                      type="button"
                      className="f-m-buy-now-btn"
                      onClick={() => {
                        setIsFeedModalOpen(false);
                        onOpenFoodShop();
                      }}
                    >
                      🛒 Vào Shop Mua Thêm {selectedItem.name}
                    </button>
                  </div>
                );
              }

              const richnessBonus = 1 + Math.min(1.5, selectedItem.price / 3000);
              const foodGain = selectedItem.foodRestore * feedQuantity;
              const waterGain = selectedItem.waterRestore * feedQuantity;
              const xpGain = Math.round(selectedItem.xpReward * feedQuantity * richnessBonus);

              return (
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
                        disabled={feedQuantity <= 1}
                        onClick={() => setFeedQuantity((q) => Math.max(1, q - 1))}
                      >
                        -
                      </button>
                      <strong className="f-m-step-num">{feedQuantity}</strong>
                      <button
                        type="button"
                        className="f-m-step-btn"
                        disabled={feedQuantity >= available}
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
                      const res = onFeedFromInventory(selectedItem, feedQuantity);
                      if (res.success) {
                        setFeedToast(
                          `😋 Mèo đã ăn ${feedQuantity}x ${selectedItem.name}! (+${res.restoredFood}% no, +${formatNumber(res.gainedXp)} XP)`
                        );
                        setFeedQuantity(1);
                        setTimeout(() => setFeedToast(null), 3000);
                      }
                    }}
                  >
                    🍽️ Cho Mèo Ăn {feedQuantity}x {selectedItem.name}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
