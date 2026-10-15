import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  getItemsByCategory,
  type FashionCategory,
  type FashionDecorItem,
  getFashionItemById,
  type HatFittingState,
  getSavedHatTransform,
  saveHatTransform,
  getToyRewardConfig,
  type DecorPosition,
  DEFAULT_TOY_POSITIONS,
  DEFAULT_BOWL_POS,
  DECOR_POS_CHANGED_EVENT,
  loadSavedDecorPos,
  saveDecorPos,
} from '../data/fashionAndDecor';
import type { CatSkin } from '../data/skins';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

export interface FashionShopViewProps {
  coins: number;
  currentSkin: CatSkin;
  ownedHats: string[];
  equippedHat: string;
  ownedClothes: string[];
  equippedClothes: string;
  ownedRoomDecor: string[];
  equippedDecor: {
    bowl?: string;
    ball?: string;
    balls?: string[];
    rug?: string;
    room?: string;
  };
  onBuyItem: (item: FashionDecorItem) => { success: boolean; message: string };
  onEquipItem: (item: FashionDecorItem) => boolean;
  onBackToCat: () => void;
  hideHeader?: boolean;
}

export const FashionShopView: React.FC<FashionShopViewProps> = ({
  coins,
  currentSkin,
  ownedHats = [],
  equippedHat = '',
  ownedClothes = [],
  equippedClothes = '',
  ownedRoomDecor = ['bowl_clay', 'ball_yarn_red', 'rug_peach', 'room_go_co_dien'],
  equippedDecor = { bowl: 'bowl_clay', ball: 'ball_yarn_red', balls: ['ball_yarn_red'], rug: 'rug_peach', room: 'room_go_co_dien' },
  onBuyItem,
  onEquipItem,
  onBackToCat,
  hideHeader = false,
}) => {
  const [activeTab, setActiveTab] = useState<FashionCategory>('hats');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [catSquish, setCatSquish] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<FashionDecorItem | null>(null);

  // Danh sách tối đa 3 đồ chơi đang gắn
  const equippedBallsList: string[] = useMemo(() => {
    if (Array.isArray(equippedDecor?.balls) && equippedDecor.balls.length > 0) {
      return equippedDecor.balls.slice(0, 3);
    }
    return [equippedDecor?.ball || 'ball_yarn_red'];
  }, [equippedDecor?.balls, equippedDecor?.ball]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const currentItems = getItemsByCategory(activeTab);

  const isItemOwned = (item: FashionDecorItem): boolean => {
    if (item.price === 0) return true;
    if (item.category === 'hats') {
      if (ownedHats.includes(item.id)) return true;
      if (item.id === 'hat_hai_tac' && ownedHats.includes('hat_pirate')) return true;
      if (item.id === 'hat_phu_thuy' && ownedHats.includes('hat_wizard')) return true;
      if (item.id === 'hat_len_xam' && ownedHats.includes('hat_warm_beanie')) return true;
      if (item.id === 'hat_rong_vanh' && ownedHats.includes('hat_straw')) return true;
      if (item.id === 'hat_vuong_mien_hoang_gia' && ownedHats.includes('hat_crown')) return true;
      return false;
    }
    if (item.category === 'clothes') return ownedClothes.includes(item.id);
    if (item.category === 'rooms') return ownedRoomDecor.includes(item.id) || item.price === 0;
    return ownedRoomDecor.includes(item.id);
  };

  const isItemEquipped = (item: FashionDecorItem): boolean => {
    if (item.category === 'hats') {
      if (equippedHat === item.id) return true;
      if (item.id === 'hat_hai_tac' && equippedHat === 'hat_pirate') return true;
      if (item.id === 'hat_phu_thuy' && equippedHat === 'hat_wizard') return true;
      if (item.id === 'hat_len_xam' && equippedHat === 'hat_warm_beanie') return true;
      if (item.id === 'hat_rong_vanh' && equippedHat === 'hat_straw') return true;
      if (item.id === 'hat_vuong_mien_hoang_gia' && equippedHat === 'hat_crown') return true;
      return false;
    }
    if (item.category === 'clothes') return equippedClothes === item.id;
    if (item.category === 'bowls') return equippedDecor.bowl === item.id;
    if (item.category === 'balls') return equippedBallsList.includes(item.id);
    if (item.category === 'rugs') return equippedDecor.rug === item.id;
    if (item.category === 'rooms') return (equippedDecor.room || 'room_go_co_dien') === item.id;
    return false;
  };

  const handleAction = (item: FashionDecorItem) => {
    const owned = isItemOwned(item);
    if (!owned) {
      if (coins < item.price) {
        soundManager.playPop();
        showToast(`Không đủ xu! Cần ${formatNumber(item.price)} xu để mua.`);
        return;
      }
      const res = onBuyItem(item);
      showToast(res.message);
      if (res.success && previewItem?.id === item.id) {
        setPreviewItem(null);
      }
    } else {
      const equipped = isItemEquipped(item);
      onEquipItem(item);
      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }
      if (item.category === 'balls') {
        if (equipped) {
          showToast(`Đã tháo ${item.name} khỏi phòng!`);
        } else {
          showToast(`Đã gắn ${item.name} lên phòng mèo (tối đa 3 món)! 🧸`);
        }
      } else if (equipped && (item.category === 'hats' || item.category === 'clothes')) {
        showToast(`Đã tháo ${item.name}!`);
      } else {
        showToast(`Đã trang bị ${item.name}! `);
      }
    }
  };

  const handleCatMeow = () => {
    soundManager.playPop();
    setCatSquish(true);
    setTimeout(() => setCatSquish(false), 260);
    showToast('Meow~! Boss rất thích diện đồ đẹp từ Shop! 🐾');
  };

  // Xác định vật phẩm hiển thị trực tiếp trên sân khấu xem trước (ưu tiên preview nếu đang thử)
  const effectiveHatId = previewItem?.category === 'hats' ? previewItem.id : equippedHat;
  const effectiveClothesId = previewItem?.category === 'clothes' ? previewItem.id : equippedClothes;
  const effectiveBowlId = previewItem?.category === 'bowls' ? previewItem.id : (equippedDecor?.bowl || 'bowl_clay');
  const effectiveRugId = previewItem?.category === 'rugs' ? previewItem.id : (equippedDecor?.rug || 'rug_peach');
  const effectiveRoomId = previewItem?.category === 'rooms' ? previewItem.id : (equippedDecor?.room || 'room_go_co_dien');

  const curHatObj = getFashionItemById(effectiveHatId);
  const curClothesObj = getFashionItemById(effectiveClothesId);
  const curBowlObj = getFashionItemById(effectiveBowlId);
  const curRugObj = getFashionItemById(effectiveRugId);
  const curRoomObj = getFashionItemById(effectiveRoomId);

  // Danh sách đồ chơi trên sân khấu xem trước (kết hợp preview nếu đang thử đồ chơi mới)
  const previewBallsList: string[] = useMemo(() => {
    let list = [...equippedBallsList];
    if (previewItem?.category === 'balls') {
      if (!list.includes(previewItem.id)) {
        if (list.length < 3) {
          list.push(previewItem.id);
        } else {
          list = [...list.slice(1), previewItem.id];
        }
      }
    }
    return list;
  }, [equippedBallsList, previewItem]);

  // Vị trí kéo thả của Bát Ăn & Đồ Chơi trên sân khấu
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
  const dragStartRef = useRef<{
    item: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
  } | null>(null);

  // Chế độ di chuyển, xoay & gắn mũ trong Shop
  const [isFittingHatOpen, setIsFittingHatOpen] = useState(false);
  const [hatTransform, setHatTransform] = useState<HatFittingState>(() =>
    getSavedHatTransform(curHatObj?.id || '')
  );
  const [isDraggingHat, setIsDraggingHat] = useState(false);
  const hatDragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  useEffect(() => {
    if (curHatObj?.id) {
      setHatTransform(getSavedHatTransform(curHatObj.id));
    }
  }, [curHatObj?.id]);

  // Lắng nghe sự kiện đồng bộ vị trí vật trang trí (bát ăn, đồ chơi, mũ) từ sảnh phòng mèo hoặc từ shop
  useEffect(() => {
    const handleSync = () => {
      setBowlPos(loadSavedDecorPos('purr_bowl_pos', DEFAULT_BOWL_POS));
      setToyPositions({
        0: loadSavedDecorPos('purr_toy_pos_0', loadSavedDecorPos('purr_ball_pos', DEFAULT_TOY_POSITIONS[0])),
        1: loadSavedDecorPos('purr_toy_pos_1', DEFAULT_TOY_POSITIONS[1]),
        2: loadSavedDecorPos('purr_toy_pos_2', DEFAULT_TOY_POSITIONS[2]),
      });
      if (curHatObj?.id) {
        setHatTransform(getSavedHatTransform(curHatObj.id));
      }
    };
    window.addEventListener(DECOR_POS_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(DECOR_POS_CHANGED_EVENT, handleSync);
  }, [curHatObj?.id]);

  // Xử lý giữ và kéo (Drag & Drop) đồ vật máng ăn & đồ chơi
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
        showToast(`📌 Đã lưu vị trí đồ chơi #${idx + 1}!`);
      } else {
        saveDecorPos('purr_bowl_pos', finalPos);
        showToast('📌 Đã lưu vị trí máng ăn!');
      }
    }
  };

  // Kéo di chuyển trực tiếp mũ trên đầu mèo trong Shop
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
        if (Math.hypot(finalX, finalY) < 10) {
          finalX = 0;
          finalY = 0;
          showToast('🎯 Mũ đã tự động gắn vào tâm đầu!');
        } else {
          showToast('📌 Đã lưu vị trí mũ!');
        }
        const updated = { ...prev, offsetX: finalX, offsetY: finalY };
        if (curHatObj) {
          saveHatTransform(curHatObj.id, updated);
        }
        return updated;
      });
    }
  };

  const handleRotateHat = (angle: number) => {
    setHatTransform((prev) => {
      const clamped = Math.max(-60, Math.min(60, angle));
      const updated = { ...prev, rotation: clamped };
      if (curHatObj) saveHatTransform(curHatObj.id, updated);
      return updated;
    });
  };

  const handleNudgeRotate = (delta: number) => {
    soundManager.playPop(1.05);
    setHatTransform((prev) => {
      const next = Math.max(-60, Math.min(60, prev.rotation + delta));
      const updated = { ...prev, rotation: next };
      if (curHatObj) saveHatTransform(curHatObj.id, updated);
      return updated;
    });
  };

  const handleNudgePosition = (dx: number, dy: number) => {
    soundManager.playPop(1.05);
    setHatTransform((prev) => {
      const nextX = Math.max(-80, Math.min(80, prev.offsetX + dx));
      const nextY = Math.max(-100, Math.min(60, prev.offsetY + dy));
      const updated = { ...prev, offsetX: nextX, offsetY: nextY };
      if (curHatObj) saveHatTransform(curHatObj.id, updated);
      return updated;
    });
  };

  const handleScaleHat = (newScale: number) => {
    setHatTransform((prev) => {
      const clamped = Math.max(0.7, Math.min(1.4, Math.round(newScale * 100) / 100));
      const updated = { ...prev, scale: clamped };
      if (curHatObj) saveHatTransform(curHatObj.id, updated);
      return updated;
    });
  };

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
    if (curHatObj) {
      saveHatTransform(curHatObj.id, updated);
    }
    showToast('🎯 Đã căn mũ ngay ngắn vào đỉnh đầu Boss!');
  };

  return (
    <div className="view-page-container max-w-xl mx-auto px-2 sm:px-margin pb-20 sm:pb-24 pt-1 sm:pt-2 select-none font-body-md text-on-surface">
      {/* Floating Haptic Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-primary/20 animate-bounce-in text-xs font-bold">
          <span className="material-symbols-outlined text-primary text-[16px] sm:text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner & Coins Banner (Omitted when embedded in MasterShopView) */}
      {!hideHeader && (
        <>
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-surface-container-high p-2 sm:p-space-md shadow-sm mb-2 sm:mb-3">
            <div className="flex items-center justify-between relative z-10 gap-2">
              <div className="flex items-center gap-2 sm:gap-space-sm min-w-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[20px] sm:text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    styler
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <h1 className="text-sm sm:text-headline-md font-black text-on-surface leading-tight truncate">Shop Thời Trang</h1>
                    <span className="bg-rose-100 text-rose-800 text-[9px] sm:text-label-sm px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full font-bold shrink-0">
                      Áo, Mũ & Phòng
                    </span>
                  </div>
                  <p className="hidden sm:block text-xs sm:text-body-sm text-on-surface-variant truncate">
                    Trang bị mũ nón, quần áo và đồ nội thất sảnh phòng cho Boss
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-surface-container-lowest flex items-center gap-1 text-on-surface shadow-xs hover:text-primary transition-colors cursor-pointer text-[11px] sm:text-xs font-bold shrink-0"
                onClick={onBackToCat}
                title="Quay lại phòng mèo"
              >
                🐱 Về Mèo
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-2 sm:p-3 shadow-xs flex items-center justify-between mb-2 sm:mb-3.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-2xl">🪙</span>
              <div>
                <span className="text-[10px] sm:text-xs text-amber-900 font-bold block leading-none">Xu Vàng Hiện Có</span>
                <span className="text-sm sm:text-lg font-black text-amber-950 leading-tight">{formatNumber(coins)} Xu</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-800 font-semibold bg-white/80 px-2.5 py-1 rounded-full border border-amber-200">
              <span> Sắm đồ đẹp tăng năng lượng</span>
            </div>
          </div>
        </>
      )}

      {/* 3. Live Fitting Room Stage (Đồng bộ UI & vị trí đồ vật sống động như sảnh Phòng Mèo) */}
      <div className="relative w-full rounded-xl sm:rounded-2xl p-2 sm:p-space-md shadow-[0_8px_24px_rgba(122,105,104,0.12)] flex flex-col items-center border border-outline-variant/30 overflow-hidden bg-gradient-to-b from-surface-container to-surface-container-low transition-colors duration-500 mb-2.5 sm:mb-4">
        {/* Real Cozy Room Background Image */}
        {curRoomObj?.image ? (
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <img
              src={curRoomObj.image}
              alt={curRoomObj.name}
              className="w-full h-full object-cover object-bottom transition-all duration-700 pointer-events-none select-none"
              draggable={false}
            />
            {/* Soft subtle gradient to keep UI buttons and texts readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/15 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-orange-50 pointer-events-none" />
        )}

        {/* Top Header Tag: Status, Live Preview Alert & Hat Fitting Toggle (Đồng đều chiều cao h-7 sm:h-8, gọn gàng text) */}
        <div className="z-10 flex items-center justify-between w-full px-0.5 sm:px-1 mb-1.5 sm:mb-2 gap-1 sm:gap-1.5">
          {previewItem ? (
            <div className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full bg-amber-500 text-white text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-md border border-amber-300 animate-bounce-gentle shrink min-w-0">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-ping shrink-0" />
              <span className="truncate max-w-[75px] sm:max-w-[140px] whitespace-nowrap">
                Thử: {previewItem.name}
              </span>
              <button
                type="button"
                className="ml-0.5 bg-black/25 hover:bg-black/40 text-white rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center text-[9px] cursor-pointer shrink-0"
                onClick={() => setPreviewItem(null)}
                title="Bỏ chế độ thử đồ"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-[10px] sm:text-xs text-primary flex items-center gap-1 font-bold shadow-xs border border-outline-variant/30 shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-ping shrink-0" />
              <span>Gương Thử</span>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {curHatObj && (
              <button
                type="button"
                className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-full backdrop-blur-md text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs whitespace-nowrap border ${
                  isFittingHatOpen
                    ? 'bg-primary text-on-primary border-primary ring-2 ring-primary/30 shadow-md scale-102'
                    : 'bg-surface-container-lowest/90 text-on-surface hover:text-primary border-outline-variant/30 hover:border-primary/40'
                }`}
                onClick={() => {
                  soundManager.playPop();
                  setIsFittingHatOpen(!isFittingHatOpen);
                }}
                title="Kéo & Chỉnh vị trí mũ đồng bộ với sảnh"
              >
                <span className="text-xs sm:text-sm">👒</span>
                <span className="hidden min-[360px]:inline">{isFittingHatOpen ? 'Đang Chỉnh' : 'Chỉnh Mũ'}</span>
                <span className="inline min-[360px]:hidden">{isFittingHatOpen ? 'Chỉnh' : 'Mũ'}</span>
                <span className="material-symbols-outlined text-[12px] sm:text-[13px]">
                  {isFittingHatOpen ? 'expand_less' : 'tune'}
                </span>
              </button>
            )}

            <div
              className="h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-md text-[10px] sm:text-xs font-bold text-slate-800 shadow-2xs border border-outline-variant/20 flex items-center gap-1 whitespace-nowrap shrink-0"
              title={curRoomObj?.name || 'Phòng Gỗ'}
            >
              <span className="text-xs sm:text-sm">{curRoomObj?.icon || '🏡'}</span>
              <span className="max-w-[60px] min-[360px]:max-w-[80px] sm:max-w-[120px] truncate">
                {curRoomObj?.name || 'Phòng Gỗ'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Play Stage & Interactive Cat (Tỷ lệ thu gọn chuẩn mobile) */}
        <div
          ref={playStageRef}
          className="relative w-full aspect-[16/11] sm:aspect-[4/3] max-h-52 sm:max-h-72 flex items-center justify-center my-1 sm:my-space-xs touch-none select-none"
        >
          {/* Rug based on effectiveRug (Nằm ngay bên dưới nhân vật Cat) */}
          <div className="absolute z-0 w-48 h-48 sm:w-72 sm:h-72 max-w-[94%] max-h-[94%] flex items-center justify-center pointer-events-none select-none transition-all duration-300 translate-y-11 sm:translate-y-17">
            {curRugObj?.image ? (
              <img
                src={curRugObj.image}
                alt={curRugObj.name}
                className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] pointer-events-none select-none transition-transform duration-300"
                draggable={false}
              />
            ) : (
              <div
                className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-dashed opacity-60 flex items-center justify-center"
                style={{ backgroundColor: curRugObj?.color || '#ffdad4' }}
              >
                <span className="text-2xl sm:text-3xl">{curRugObj?.icon || '🌸'}</span>
              </div>
            )}
          </div>

          {/* Feeding Bowl (Máng Ăn) - Đồng bộ vị trí & kéo thả tự do */}
          {curBowlObj && (
            <div
              style={{
                left: `${bowlPos.x}%`,
                top: `${bowlPos.y}%`,
              }}
              onPointerDown={(e) => handleItemPointerDown(e, 'bowl')}
              onPointerMove={handleItemPointerMove}
              onPointerUp={(e) => handleItemPointerUp(e, 'bowl')}
              onPointerCancel={(e) => handleItemPointerUp(e, 'bowl')}
              title={`${curBowlObj.name} (Kéo để chỉnh vị trí đồng bộ với phòng mèo)`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 sm:w-16 sm:h-16 max-w-[52px] max-h-[52px] sm:max-w-[64px] sm:max-h-[64px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform duration-75 ${
                draggingItem === 'bowl'
                  ? 'scale-125 z-30 drop-shadow-2xl opacity-90'
                  : 'hover:scale-110 active:scale-95'
              }`}
            >
              {curBowlObj.image ? (
                <img
                  src={curBowlObj.image}
                  alt={curBowlObj.name}
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)] select-none pointer-events-none"
                  draggable={false}
                />
              ) : (
                <span className="text-3xl sm:text-4xl filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.2)] select-none pointer-events-none">
                  {curBowlObj.icon || '🥣'}
                </span>
              )}
            </div>
          )}

          {/* 3 Món Đồ Chơi trên sân khấu xem trước - Đồng bộ vị trí & kéo thả tự do */}
          {previewBallsList.map((ballId, idx) => {
            const ballItem = getFashionItemById(ballId);
            if (!ballItem) return null;
            const pos = toyPositions[idx] || DEFAULT_TOY_POSITIONS[idx] || { x: 14 + idx * 22, y: 76 };
            const isDraggingThis = draggingItem === `toy_${idx}`;
            const toyReward = getToyRewardConfig(ballItem);

            return (
              <div
                key={`preview_toy_${ballId}_${idx}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-14 sm:h-14 max-w-[48px] max-h-[48px] sm:max-w-[56px] sm:max-h-[56px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform duration-75 ${
                  isDraggingThis
                    ? 'scale-125 z-30 drop-shadow-2xl opacity-90'
                    : 'hover:scale-110 active:scale-95'
                }`}
                onPointerDown={(e) => handleItemPointerDown(e, `toy_${idx}`)}
                onPointerMove={handleItemPointerMove}
                onPointerUp={(e) => handleItemPointerUp(e, `toy_${idx}`)}
                onPointerCancel={(e) => handleItemPointerUp(e, `toy_${idx}`)}
                title={`${ballItem.name} (#${idx + 1} • ${toyReward.label} • Kéo để chỉnh vị trí đồng bộ với phòng mèo)`}
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
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs pointer-events-none border border-white/70">
                  {idx + 1}
                </span>
              </div>
            );
          })}

          {/* Cat Container with equipped/previewed items (Tỷ lệ thu gọn trên mobile) */}
          <div className="relative z-10 w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center pointer-events-auto">
            {/* Subtle glow behind cat */}
            <div className="absolute inset-2 bg-primary-fixed-dim/20 rounded-full blur-xl pointer-events-none" />

            {/* Hat on cat (Hỗ trợ kéo di chuyển, xoay góc & gắn trực tiếp trong Shop) */}
            {curHatObj && (
              <div
                style={{
                  transform: `translate(calc(-50% + ${hatTransform.offsetX}px), ${hatTransform.offsetY}px) rotate(${hatTransform.rotation}deg) scale(${hatTransform.scale})`,
                  transformOrigin: 'bottom center',
                }}
                className={`absolute -top-5 sm:-top-6 left-1/2 z-20 flex items-center justify-center select-none touch-none transition-transform duration-75 ${
                  isFittingHatOpen
                    ? isDraggingHat
                      ? 'cursor-grabbing p-1 rounded-xl ring-3 ring-primary ring-offset-2 ring-offset-surface-container-low bg-primary/20 shadow-xl scale-105'
                      : 'cursor-grab p-1 rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low bg-primary/10 shadow-md hover:scale-105'
                    : 'pointer-events-none animate-bounce-gentle'
                }`}
                onPointerDown={isFittingHatOpen ? handleHatPointerDown : undefined}
                onPointerMove={isFittingHatOpen ? handleHatPointerMove : undefined}
                onPointerUp={isFittingHatOpen ? handleHatPointerUp : undefined}
                onPointerCancel={isFittingHatOpen ? handleHatPointerUp : undefined}
                title={isFittingHatOpen ? 'Kéo để di chuyển vị trí mũ trên đầu Boss' : curHatObj.name}
              >
                {curHatObj.image ? (
                  <img
                    src={curHatObj.image}
                    alt={curHatObj.name}
                    className="w-18 h-18 sm:w-24 sm:h-24 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)] select-none pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl filter drop-shadow-md select-none pointer-events-none">{curHatObj.icon}</span>
                )}
                {isFittingHatOpen && (
                  <div className="absolute -top-2 -right-2 bg-primary text-on-primary rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold shadow-md pointer-events-none animate-pulse">
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

            {/* Cat Sprite (Thu nhỏ vừa vặn trên màn hình mobile) */}
            <img
              src={currentSkin.image || currentSkin.imageOpen}
              alt={currentSkin.name}
              className={`w-26 h-26 sm:w-40 sm:h-40 object-contain relative z-10 transition-transform duration-300 cursor-pointer drop-shadow-md ${
                catSquish ? 'scale-110 -rotate-3' : 'hover:scale-105 active:scale-95'
              }`}
              onClick={handleCatMeow}
              title="Chạm vào Boss để thử phản ứng!"
            />

            {/* Clothes Badge on Avatar */}
            {curClothesObj && (
              <div
                className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-2 py-0.2 sm:py-0.5 rounded-full border border-orange-200 shadow-xs flex items-center gap-1 text-[9px] sm:text-[11px] font-bold text-orange-900 pointer-events-none whitespace-nowrap"
                title={curClothesObj.name}
              >
                <span>{curClothesObj.icon}</span>
                <span>{curClothesObj.badge}</span>
              </div>
            )}
          </div>
        </div>

        {/* 👒 BẢNG ĐIỀU KHIỂN CHỈNH VỊ TRÍ, XOAY & GẮN MŨ TRONG SHOP */}
        {isFittingHatOpen && curHatObj && (
          <div className="z-30 w-full max-w-md my-2 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border-2 border-primary/40 flex flex-col gap-2.5 animate-fade-in text-on-surface">
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg overflow-hidden shrink-0 border border-primary/20">
                  {curHatObj.image ? (
                    <img src={curHatObj.image} alt={curHatObj.name} className="w-full h-full object-contain p-0.5" />
                  ) : (
                    curHatObj.icon || '👒'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-on-surface">
                      Chỉnh {curHatObj.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                      Đồng bộ Sảnh
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-medium">
                    Kéo mũ trực tiếp trên đầu mèo hoặc dùng nút bên dưới
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer text-xs font-bold transition-colors"
                onClick={() => setIsFittingHatOpen(false)}
                title="Đóng bảng chỉnh"
              >
                ✕
              </button>
            </div>

            {/* 1. Xoay góc */}
            <div className="flex flex-col gap-1 bg-surface-container-low p-2 rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between text-[11px] font-bold text-on-surface">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[14px]">rotate_right</span>
                  Góc Xoay Mũ
                </span>
                <span className="font-mono text-primary bg-surface-container px-1.5 py-0.5 rounded text-[10px]">
                  {hatTransform.rotation > 0 ? `+${hatTransform.rotation}°` : `${hatTransform.rotation}°`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold border border-outline-variant/30 cursor-pointer active:scale-95"
                  onClick={() => handleNudgeRotate(-5)}
                  title="Xoay trái 5 độ"
                >
                  ↺ -5°
                </button>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={hatTransform.rotation}
                  onChange={(e) => handleRotateHat(parseInt(e.target.value, 10))}
                  className="flex-1 accent-primary h-2 cursor-pointer"
                />
                <button
                  type="button"
                  className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold border border-outline-variant/30 cursor-pointer active:scale-95"
                  onClick={() => handleNudgeRotate(5)}
                  title="Xoay phải 5 độ"
                >
                  +5° ↻
                </button>
              </div>
            </div>

            {/* 2. D-pad dịch chuyển & Scale */}
            <div className="grid grid-cols-2 gap-2">
              {/* D-Pad */}
              <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 flex flex-col items-center">
                <span className="text-[10px] font-bold text-on-surface-variant mb-1">
                  Dịch Chuyển (X:{hatTransform.offsetX}, Y:{hatTransform.offsetY})
                </span>
                <div className="grid grid-cols-3 gap-1 w-24">
                  <div />
                  <button
                    type="button"
                    className="h-6 rounded bg-surface-container hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold border border-outline-variant/30 active:scale-90 cursor-pointer"
                    onClick={() => handleNudgePosition(0, -4)}
                    title="Lên"
                  >
                    ▲
                  </button>
                  <div />
                  <button
                    type="button"
                    className="h-6 rounded bg-surface-container hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold border border-outline-variant/30 active:scale-90 cursor-pointer"
                    onClick={() => handleNudgePosition(-4, 0)}
                    title="Trái"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="h-6 rounded bg-primary/20 hover:bg-primary hover:text-white flex items-center justify-center text-[10px] font-bold border border-primary/30 active:scale-90 cursor-pointer"
                    onClick={handleSnapHatToHead}
                    title="Căn giữa đầu"
                  >
                    🎯
                  </button>
                  <button
                    type="button"
                    className="h-6 rounded bg-surface-container hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold border border-outline-variant/30 active:scale-90 cursor-pointer"
                    onClick={() => handleNudgePosition(4, 0)}
                    title="Phải"
                  >
                    ▶
                  </button>
                  <div />
                  <button
                    type="button"
                    className="h-6 rounded bg-surface-container hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold border border-outline-variant/30 active:scale-90 cursor-pointer"
                    onClick={() => handleNudgePosition(0, 4)}
                    title="Xuống"
                  >
                    ▼
                  </button>
                  <div />
                </div>
              </div>

              {/* Tỉ lệ kích thước (Scale) & Căn chuẩn */}
              <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                    <span>Kích Thước</span>
                    <span className="font-mono text-primary font-bold">
                      {Math.round(hatTransform.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.05"
                    value={hatTransform.scale}
                    onChange={(e) => handleScaleHat(parseFloat(e.target.value))}
                    className="w-full accent-primary h-2 cursor-pointer mb-2"
                  />
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="flex-1 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[10px] font-bold border border-outline-variant/30 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    onClick={handleSnapHatToHead}
                    title="Đặt lại vị trí chuẩn"
                  >
                    <span>🎯 Căn Giữa</span>
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-1 rounded-lg bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                    onClick={() => {
                      soundManager.playUpgrade();
                      setIsFittingHatOpen(false);
                      showToast(`📌 Đã lưu vị trí ${curHatObj.name}!`);
                    }}
                    title="Xong và lưu"
                  >
                    <span>✓ Xong</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hướng dẫn di chuyển vật trang trí (Chiều cao h-6 sm:h-7 đồng bộ, text ngắn gọn súc tích) */}
        <div className="z-10 h-6 sm:h-7 px-2.5 sm:px-3 rounded-full flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-medium text-on-surface-variant/90 bg-surface-container-lowest/80 backdrop-blur-xs border border-outline-variant/20 mt-1 mb-1 shadow-2xs max-w-full">
          <span className="text-[11px] sm:text-xs">✋</span>
          <span className="truncate">Giữ & kéo máng, đồ chơi, mũ để dời chỗ</span>
        </div>

        {/* Current Active Accessories Pills (Đồng đều chiều cao h-6 sm:h-7, chỉ hiển thị món đang gắn/preview) */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
          {curHatObj && (
            <span className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-on-surface shadow-2xs border border-outline-variant/20 flex items-center gap-1 whitespace-nowrap">
              <span>{curHatObj.icon}</span>
              <span className="max-w-[70px] min-[360px]:max-w-[90px] sm:max-w-[110px] truncate">{curHatObj.name}</span>
            </span>
          )}
          {curClothesObj && (
            <span className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-on-surface shadow-2xs border border-outline-variant/20 flex items-center gap-1 whitespace-nowrap">
              <span>{curClothesObj.icon}</span>
              <span className="max-w-[70px] min-[360px]:max-w-[90px] sm:max-w-[110px] truncate">{curClothesObj.name}</span>
            </span>
          )}
          {curRugObj && (
            <span className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-emerald-900 shadow-2xs border border-emerald-200/40 flex items-center gap-1 whitespace-nowrap">
              <span>{curRugObj.icon}</span>
              <span className="max-w-[70px] min-[360px]:max-w-[90px] sm:max-w-[110px] truncate">{curRugObj.name}</span>
            </span>
          )}
          {curBowlObj && (
            <span className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-secondary shadow-2xs border border-outline-variant/20 flex items-center gap-1 whitespace-nowrap">
              <span>{curBowlObj.icon}</span>
              <span className="max-w-[70px] min-[360px]:max-w-[90px] sm:max-w-[110px] truncate">{curBowlObj.name}</span>
            </span>
          )}
          <span className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs text-[10px] sm:text-[11px] font-bold text-primary shadow-2xs border border-outline-variant/20 flex items-center gap-1 whitespace-nowrap">
            <span>🎾</span>
            <span>{previewBallsList.length}/3 Đồ chơi</span>
          </span>
        </div>
      </div>

      {/* 4. Category Navigation Capsule Tabs (5 cột đều nhau, chiều cao h-10.5 sm:h-13 chuẩn mobile) */}
      <div className="grid grid-cols-5 p-0.5 sm:p-1 bg-surface-container-highest rounded-xl sm:rounded-full shadow-inner gap-0.5 sm:gap-1 mb-2.5 sm:mb-3.5">
        <button
          type="button"
          className={`h-11 sm:h-13 flex flex-col items-center justify-center py-0.5 sm:py-1 px-0.5 rounded-lg sm:rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'hats'
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_0_#842415] sm:shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('hats');
          }}
        >
          <span className="text-sm sm:text-lg">👒</span>
          <span className="font-label-sm text-[9px] sm:text-[11px] mt-0.5 leading-none font-bold">Mũ Mèo</span>
        </button>

        <button
          type="button"
          className={`h-11 sm:h-13 flex flex-col items-center justify-center py-0.5 sm:py-1 px-0.5 rounded-lg sm:rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_0_#842415] sm:shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('rooms');
          }}
        >
          <span className="text-sm sm:text-lg">🏡</span>
          <span className="font-label-sm text-[9px] sm:text-[11px] mt-0.5 leading-none font-bold">Phòng</span>
        </button>

        <button
          type="button"
          className={`h-11 sm:h-13 flex flex-col items-center justify-center py-0.5 sm:py-1 px-0.5 rounded-lg sm:rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'rugs'
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_0_#842415] sm:shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('rugs');
          }}
        >
          <span className="text-sm sm:text-lg">🌸</span>
          <span className="font-label-sm text-[9px] sm:text-[11px] mt-0.5 leading-none font-bold">Thảm</span>
        </button>

        <button
          type="button"
          className={`h-11 sm:h-13 flex flex-col items-center justify-center py-0.5 sm:py-1 px-0.5 rounded-lg sm:rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'bowls'
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_0_#842415] sm:shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('bowls');
          }}
        >
          <span className="text-sm sm:text-lg">🥣</span>
          <span className="font-label-sm text-[9px] sm:text-[11px] mt-0.5 leading-none font-bold">Máng Ăn</span>
        </button>

        <button
          type="button"
          className={`h-11 sm:h-13 flex flex-col items-center justify-center py-0.5 sm:py-1 px-0.5 rounded-lg sm:rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'balls'
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_0_#842415] sm:shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('balls');
          }}
        >
          <span className="text-sm sm:text-lg">🎾</span>
          <span className="font-label-sm text-[9px] sm:text-[11px] mt-0.5 leading-none font-bold">Đồ Chơi</span>
        </button>
      </div>

      {/* 5. Special Hint Alert for Room Decor */}
      {activeTab === 'rooms' && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] sm:text-xs font-bold p-2 sm:p-3 rounded-xl flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3.5 shadow-2xs">
          <span className="text-base sm:text-xl shrink-0">🏡</span>
          <span>Phòng nền tuyệt đẹp tạo không gian sống động cho Boss tại sảnh chính, kèm các bùa lợi hấp dẫn!</span>
        </div>
      )}

      {activeTab === 'bowls' && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] sm:text-xs font-bold p-2 sm:p-3 rounded-xl flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3.5 shadow-2xs">
          <span className="text-base sm:text-xl shrink-0">🥣</span>
          <span>Máng ăn tại sảnh. Nhấn giữ để di chuyển vị trí tự do, nhấp nhẹ để cho Boss ăn ngon miệng!</span>
        </div>
      )}

      {activeTab === 'balls' && (
        <div className="bg-blue-50 text-blue-900 border border-blue-200 text-[11px] sm:text-xs font-bold p-2 sm:p-3 rounded-xl flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3.5 shadow-2xs">
          <span className="text-base sm:text-xl shrink-0">🎾</span>
          <span>Đồ chơi tại sảnh. Nhấn giữ để dời vị trí, nhấp nhẹ để tưng bóng rơi Xu thưởng!</span>
        </div>
      )}

      {activeTab === 'rugs' && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] sm:text-xs font-bold p-2 sm:p-3 rounded-xl flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3.5 shadow-2xs">
          <span className="text-base sm:text-xl shrink-0">🌸</span>
          <span>Thảm êm lót dưới Boss tại sảnh phòng, giúp Boss ngủ ngon và tăng hồi phục năng lượng!</span>
        </div>
      )}

      {/* 6. Items Catalog Grid (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        {currentItems.map((item) => {
          const owned = isItemOwned(item);
          const equipped = isItemEquipped(item);
          const isPreviewing = previewItem?.id === item.id;

          return (
            <div
              key={item.id}
              className={`bg-surface-container-lowest rounded-xl p-3.5 flex flex-col justify-between gap-2.5 border transition-all cursor-pointer ${
                isPreviewing
                  ? 'border-amber-500 shadow-md ring-2 ring-amber-300/80 bg-amber-50/20'
                  : equipped
                  ? 'border-primary shadow-md ring-2 ring-primary/20'
                  : owned
                  ? 'border-emerald-300 shadow-xs hover:border-emerald-400'
                  : 'border-outline-variant/30 hover:border-outline-variant'
              }`}
              onClick={() => {
                soundManager.playPop();
                if (isPreviewing) {
                  setPreviewItem(null);
                } else {
                  setPreviewItem(item);
                  showToast(`Đang thử: ${item.name}! Nhìn lên gương xem Boss diện nhé.`);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Large Icon Preview */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-2xs border overflow-hidden relative"
                  style={{
                    backgroundColor: item.accentColor,
                    borderColor: item.color,
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-full h-full ${item.category === 'rooms' ? 'object-cover object-bottom' : 'object-contain p-1'}`}
                      loading="lazy"
                    />
                  ) : (
                    item.icon
                  )}
                  {isPreviewing && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-headline-sm text-sm font-bold text-on-surface truncate">
                      {item.name}
                    </span>
                    {isPreviewing ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shrink-0 shadow-2xs">
                        Đang Thử ✨
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {item.perk && (
                    <p className="text-xs font-bold text-secondary mt-0.5 leading-tight">
                       {item.perk}
                    </p>
                  )}

                  {item.category === 'balls' && (
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black leading-none">
                      <span>🪙</span>
                      <span>{getToyRewardConfig(item).label}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-on-surface-variant font-medium mt-1 line-clamp-2 leading-tight">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Price & Action Button Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <div className="flex items-center gap-1">
                  {item.price === 0 ? (
                    <span className="text-xs font-bold text-emerald-700">Miễn phí</span>
                  ) : !owned ? (
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-0.5">
                      🪙 {formatNumber(item.price)} Xu
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Đã sở hữu
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`h-8 px-3 rounded-full text-xs font-bold flex items-center justify-center whitespace-nowrap transition-transform active:scale-95 cursor-pointer shadow-xs ${
                      equipped
                        ? 'bg-secondary text-on-secondary font-extrabold'
                        : owned
                        ? 'bg-surface-container-high text-primary hover:bg-surface-container'
                        : coins >= item.price
                        ? 'bg-primary text-on-primary shadow-[0_2px_0_#842415]'
                        : 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-70'
                    }`}
                    onClick={() => handleAction(item)}
                  >
                    {equipped
                      ? item.category === 'hats' || item.category === 'clothes'
                        ? 'Đang Dùng (Tháo)'
                        : item.category === 'balls'
                        ? `Đang Đặt (#${equippedBallsList.indexOf(item.id) + 1} - Tháo)`
                        : 'Đang Dùng'
                      : owned
                      ? item.category === 'rooms'
                        ? 'Đổi Phòng'
                        : item.category === 'balls'
                        ? `Gắn Phòng (${equippedBallsList.length}/3)`
                        : 'Trang Bị'
                      : `Mua (${formatNumber(item.price)}🪙)`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
