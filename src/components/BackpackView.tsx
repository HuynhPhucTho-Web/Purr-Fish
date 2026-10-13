import React, { useState, useMemo } from 'react';
import type { CaughtFishItem } from '../data/fishes';
import type { CatSkin } from '../data/skins';
import { SKINS } from '../data/skins';
import type { RankTier, CatGrowthStage } from '../data/rankTiers';
import { FISHING_RODS_CATALOG, getRodById, type FishingRod } from '../data/fishingRods';
import { FOOD_SHOP_CATALOG, type FoodItem } from '../data/foodShop';
import {
  FASHION_DECOR_CATALOG,
  type FashionDecorItem,
  getFashionItemById,
} from '../data/fashionAndDecor';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

export type BackpackTab = 'fish' | 'rods' | 'outfits' | 'food';

export interface BackpackViewProps {
  basket: CaughtFishItem[];
  fish: number; // Coins
  currentSkin: CatSkin;
  unlockedSkins: string[];
  equippedRodId?: string;
  rodDurability?: number;
  unlockedRods?: string[];
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
  levelInfo: {
    level: number;
    currentLevelXp: number;
    nextLevelXpRequired: number;
    progressPercent: number;
    rankTier: RankTier;
  };
  catStage: CatGrowthStage;
  onSellFish: (instanceId: string) => number;
  onSellAllFish: () => { count: number; totalEarned: number };
  onEquipSkin?: (skinId: string) => boolean | void;
  onUnlockSkin?: (skinId: string) => boolean;
  onBuyOrEquipRod?: (rodId: string) => { success: boolean; message: string };
  onEquipFashionItem?: (item: FashionDecorItem) => boolean;
  onOpenFashionShop?: () => void;
  onFeedFromInventory?: (
    foodItem: FoodItem,
    quantity: number
  ) => { success: boolean; restoredFood: number; restoredWater: number; gainedXp: number };
  onOpenPond: () => void;
  onOpenFoodShop?: () => void;
  onBackToCat: () => void;
}

export const BackpackView: React.FC<BackpackViewProps> = ({
  basket = [],
  fish,
  currentSkin,
  unlockedSkins = [],
  equippedRodId = 'wood_rod',
  rodDurability = 10,
  unlockedRods = ['wood_rod'],
  foodInventory = {},
  ownedHats = [],
  equippedHat = '',
  ownedClothes = [],
  equippedClothes = '',
  ownedRoomDecor = ['bowl_clay', 'ball_yarn_red', 'rug_peach'],
  equippedDecor = { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach' },
  levelInfo,
  catStage,
  onSellFish,
  onSellAllFish,
  onEquipSkin,
  onBuyOrEquipRod,
  onEquipFashionItem,
  onOpenFashionShop,
  onFeedFromInventory,
  onOpenPond,
  onOpenFoodShop,
  onBackToCat,
}) => {
  const [activeTab, setActiveTab] = useState<BackpackTab>('fish');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'newest' | 'heaviest' | 'value' | 'rarity'>('newest');
  const [catSquish, setCatSquish] = useState<boolean>(false);
  const [fashionFilter, setFashionFilter] = useState<'all' | 'skins' | 'hats' | 'clothes' | 'decor'>('all');

  // Trigger floating haptic toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Safe basket & totals
  const safeBasket = useMemo(() => (Array.isArray(basket) ? basket : []), [basket]);
  const basketCapacity = 50;
  const isNearFull = safeBasket.length >= 40;

  // Normal / Common fish calculation for quick sell
  const normalFishList = useMemo(
    () => safeBasket.filter((f) => f.rarity === 'common'),
    [safeBasket]
  );
  const normalFishTotalValue = useMemo(
    () => normalFishList.reduce((sum, f) => sum + (f.sellPrice || 0), 0),
    [normalFishList]
  );
  const totalBasketValue = useMemo(
    () => safeBasket.reduce((sum, f) => sum + (f.sellPrice || 0), 0),
    [safeBasket]
  );

  // Sorting fish basket
  const sortedBasket = useMemo(() => {
    const list = [...safeBasket];
    switch (sortOption) {
      case 'heaviest':
        return list.sort((a, b) => (b.weightKg || 0) - (a.weightKg || 0));
      case 'value':
        return list.sort((a, b) => (b.sellPrice || 0) - (a.sellPrice || 0));
      case 'rarity': {
        const rankMap: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
        return list.sort((a, b) => (rankMap[b.rarity] || 0) - (rankMap[a.rarity] || 0));
      }
      case 'newest':
      default:
        return list;
    }
  }, [safeBasket, sortOption]);

  // CHỈ HIỆN CẦN CÂU ĐÃ SỞ HỮU TRONG BALO
  const ownedRods = useMemo(() => {
    const list = Array.isArray(unlockedRods) && unlockedRods.length > 0 ? unlockedRods : ['wood_rod'];
    return FISHING_RODS_CATALOG.filter(
      (r) => list.includes(r.id) || r.id === 'wood_rod' || r.id === equippedRodId
    );
  }, [unlockedRods, equippedRodId]);

  // Current Rod object
  const currentRod = useMemo(() => getRodById(equippedRodId), [equippedRodId]);

  // CHỈ HIỆN THỜI TRANG & ĐỒ ĐẠC ĐÃ SỞ HỮU TRONG BALO
  const ownedSkinsList = useMemo(() => {
    return SKINS.filter(
      (skin) => unlockedSkins.includes(skin.id) || skin.unlockCost === 0 || skin.id === 'orange_tabby'
    );
  }, [unlockedSkins]);

  const ownedHatsList = useMemo(() => {
    return FASHION_DECOR_CATALOG.filter(
      (item) => item.category === 'hats' && (ownedHats.includes(item.id) || item.price === 0)
    );
  }, [ownedHats]);

  const ownedClothesList = useMemo(() => {
    return FASHION_DECOR_CATALOG.filter(
      (item) => item.category === 'clothes' && (ownedClothes.includes(item.id) || item.price === 0)
    );
  }, [ownedClothes]);

  const ownedDecorList = useMemo(() => {
    return FASHION_DECOR_CATALOG.filter(
      (item) =>
        (item.category === 'bowls' || item.category === 'balls' || item.category === 'rugs') &&
        (ownedRoomDecor.includes(item.id) || item.price === 0)
    );
  }, [ownedRoomDecor]);

  // CHỈ HIỆN THỨC ĂN CÒN SỐ LƯỢNG TRONG KHO (count > 0)
  const ownedFoodsList = useMemo(() => {
    return FOOD_SHOP_CATALOG.filter((item) => (foodInventory[item.id] || 0) > 0);
  }, [foodInventory]);

  // Cat Meow Reaction in Dressing Room
  const handleCatMeow = () => {
    soundManager.playPop();
    setCatSquish(true);
    setTimeout(() => setCatSquish(false), 260);
    showToast('Meow~! Boss rất thích diện đồ đẹp! 🐾');
  };

  // Sell 1 fish
  const handleSellOne = (item: CaughtFishItem) => {
    const earned = onSellFish(item.instanceId);
    showToast(`Đã bán 1 con ${item.name} nhận +${formatNumber(earned)} 🪙!`);
  };

  // Sell all normal fish
  const handleSellAllNormal = () => {
    if (normalFishList.length === 0) {
      showToast('Không có cá thường để bán!');
      return;
    }
    normalFishList.forEach((f) => onSellFish(f.instanceId));
    showToast(`Đã bán hết cá thường! Nhận +${formatNumber(normalFishTotalValue)} 🪙 🐟`);
  };

  // Sell all fish
  const handleSellAll = () => {
    if (safeBasket.length === 0) return;
    const res = onSellAllFish();
    showToast(`Đã bán toàn bộ ${res.count} con cá trong giỏ! Nhận +${formatNumber(res.totalEarned)} 🪙`);
  };

  // Equip Skin
  const handleEquipSkin = (skin: CatSkin) => {
    if (skin.id === currentSkin.id) return;
    if (onEquipSkin) {
      const ok = onEquipSkin(skin.id);
      if (ok) {
        soundManager.playUpgrade();
        showToast(`Đã diện bộ skin: ${skin.name}! `);
      }
    }
  };

  // Equip Rod
  const handleEquipRod = (rod: FishingRod) => {
    if (rod.id === equippedRodId) return;
    if (onBuyOrEquipRod) {
      const res = onBuyOrEquipRod(rod.id);
      showToast(res.message);
    }
  };

  // Feed Cat directly from backpack
  const handleFeedCat = (item: FoodItem) => {
    const available = foodInventory[item.id] || 0;
    if (available <= 0) {
      if (onOpenFoodShop) onOpenFoodShop();
      return;
    }
    if (onFeedFromInventory) {
      const res = onFeedFromInventory(item, 1);
      if (res.success) {
        showToast(`😋 Mèo đã chén ${item.name}! (+${res.restoredFood}% No, +${formatNumber(res.gainedXp)} XP)`);
      }
    }
  };

  const curHatObj = getFashionItemById(equippedHat);
  const curClothesObj = getFashionItemById(equippedClothes);
  const curBowlObj = getFashionItemById(equippedDecor.bowl);
  const curBallObj = getFashionItemById(equippedDecor.ball);

  return (
    <div className="view-page-container max-w-xl mx-auto px-margin pb-24 pt-2 select-none font-body-md text-on-surface">
      {/* Floating Haptic Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-surface-container-lowest text-on-surface px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-primary/20 animate-bounce-in">
          <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <span className="font-label-md text-label-md font-bold text-on-surface">{toastMessage}</span>
        </div>
      )}

      {/* Backpack Header Banner */}
      <div className="relative overflow-hidden rounded-lg bg-surface-container-high p-space-md shadow-sm mb-3">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-space-sm">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                backpack
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-headline-md text-headline-md text-on-surface">Balo Của Boss</span>
                <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
                  Lv.{levelInfo.level} {catStage.label}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Quản lý chiến lợi phẩm và các đồ đạc đã sở hữu
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full bg-surface-container-lowest flex items-center gap-1 text-on-surface shadow-sm hover:text-primary transition-colors cursor-pointer text-xs font-bold shrink-0"
            onClick={onBackToCat}
            title="Quay lại phòng mèo"
          >
            🐱 Về Mèo
          </button>
        </div>
      </div>

      {/* Primary 4 Navigation Capsule Tabs (Squishy Kawaii Style) */}
      <div className="grid grid-cols-4 p-1 bg-surface-container-highest rounded-full shadow-inner gap-1 mb-4">
        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'fish'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('fish');
          }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            set_meal
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">Túi Cá</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'rods'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('rods');
          }}
        >
          <span className="material-symbols-outlined text-[20px]">phishing</span>
          <span className="font-label-sm text-label-sm mt-0.5">Cần Câu ({ownedRods.length})</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'outfits'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('outfits');
          }}
        >
          <span className="material-symbols-outlined text-[20px]">styler</span>
          <span className="font-label-sm text-label-sm mt-0.5">Thời Trang</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'food'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('food');
          }}
        >
          <span className="material-symbols-outlined text-[20px]">restaurant</span>
          <span className="font-label-sm text-label-sm mt-0.5">Thức Ăn ({ownedFoodsList.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TÚI CÁ (FISH BAG) */}
      {/* ========================================================================= */}
      {activeTab === 'fish' && (
        <div className="flex flex-col gap-space-md animate-fade-in">
          {/* Basket Capacity HUD */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">shopping_basket</span>
                <span className="font-label-lg text-label-lg text-on-surface font-bold">Sức Chứa Giỏ Cá</span>
              </div>
              <span className={`font-label-md text-label-md font-bold ${isNearFull ? 'text-error animate-pulse' : 'text-secondary'}`}>
                {safeBasket.length} / {basketCapacity} Con {isNearFull && '(Gần Đầy!)'}
              </span>
            </div>

            <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden p-0.5 border border-outline-variant/30">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isNearFull ? 'bg-error' : safeBasket.length > 25 ? 'bg-tertiary' : 'bg-secondary'
                }`}
                style={{ width: `${Math.min(100, (safeBasket.length / basketCapacity) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-on-surface-variant mt-1">
              <span>Ước tính giá trị giỏ: <strong className="text-amber-900 font-bold">+{formatNumber(totalBasketValue)} 🪙</strong></span>
              <button
                type="button"
                className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                onClick={onOpenPond}
              >
                <span>Hồ Câu</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Quick Sell Action Bar */}
          <div className="flex gap-space-sm">
            <button
              type="button"
              className="flex-1 py-2.5 px-3 rounded-full bg-surface-container-lowest border border-outline-variant/50 text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-bold disabled:opacity-50"
              disabled={normalFishList.length === 0}
              onClick={handleSellAllNormal}
            >
              <span className="material-symbols-outlined text-primary text-[18px]">sell</span>
              <span>Bán Cá Thường (+{formatNumber(normalFishTotalValue)}🪙)</span>
            </button>

            <button
              type="button"
              className="flex-1 py-2.5 px-3 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-[0_3px_0_#842415] active:translate-y-0.5 transition-all cursor-pointer font-bold disabled:opacity-50"
              disabled={safeBasket.length === 0}
              onClick={handleSellAll}
            >
              <span className="material-symbols-outlined text-[18px]">paid</span>
              <span>Bán Tất Cả (+{formatNumber(totalBasketValue)}🪙)</span>
            </button>
          </div>

          {/* Sort Filters Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
              Danh Sách Cá Trong Balo ({safeBasket.length})
            </span>
            <div className="flex gap-1">
              {(['newest', 'heaviest', 'value', 'rarity'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    sortOption === opt
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setSortOption(opt)}
                >
                  {opt === 'newest' ? 'Mới' : opt === 'heaviest' ? 'Nặng' : opt === 'value' ? 'Giá' : 'Hiếm'}
                </button>
              ))}
            </div>
          </div>

          {/* Caught Fish Cards Grid */}
          {safeBasket.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-surface-container-lowest rounded-lg border border-dashed border-outline-variant/40 text-center gap-2">
              <span className="text-4xl">🧺</span>
              <p className="font-headline-sm text-headline-sm text-on-surface font-bold">Giỏ Cá Đang Trống</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                Bạn chưa bắt được con cá nào. Hãy vào Hồ Câu để thả cần và săn những chú cá bự nhé!
              </p>
              <button
                type="button"
                className="mt-2 px-5 py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-[0_3px_0_#842415] active:translate-y-0.5 cursor-pointer font-bold flex items-center gap-1.5"
                onClick={onOpenPond}
              >
                <span>🎣 Vào Hồ Câu Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-space-sm">
              {sortedBasket.map((item) => (
                <div
                  key={item.instanceId}
                  className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col justify-between border border-outline-variant/30 hover:border-primary/40 transition-all relative overflow-hidden"
                >
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full font-label-sm text-label-sm text-white font-bold text-[10px]"
                    style={{ backgroundColor: item.rarityColor }}
                  >
                    {item.rarityLabel}
                  </span>

                  <div className="w-full aspect-square max-h-24 flex items-center justify-center my-1 p-1">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain drop-shadow-xs"
                      loading="lazy"
                    />
                  </div>

                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold line-clamp-1">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant my-1">
                      <span>⚖️ {item.weightKg} kg</span>
                      <span className="font-bold text-amber-900">+{formatNumber(item.sellPrice)} 🪙</span>
                    </div>

                    <button
                      type="button"
                      className="w-full py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                      onClick={() => handleSellOne(item)}
                    >
                      <span>Bán (+{formatNumber(item.sellPrice)}🪙)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN CÂU (CHỈ HIỆN CẦN ĐÃ MUA / SỞ HỮU) */}
      {/* ========================================================================= */}
      {activeTab === 'rods' && (
        <div className="flex flex-col gap-space-md animate-fade-in">
          <div className="bg-surface-container-high rounded-lg p-space-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">build_circle</span>
              <span className="font-label-md text-label-md text-on-surface font-bold">
                Cần Câu Đã Sở Hữu ({ownedRods.length})
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
              Đang dùng: {currentRod.name}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {ownedRods.map((rod) => {
              const isEquipped = rod.id === equippedRodId;
              const currentDura = isEquipped ? rodDurability : rod.maxDurability;
              const duraPercent = Math.round((currentDura / rod.maxDurability) * 100);
              const isCritical = isEquipped && currentDura <= 2;
              const isLow = isEquipped && currentDura <= Math.round(rod.maxDurability * 0.4);

              return (
                <div
                  key={rod.id}
                  className={`bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm relative border ${
                    isEquipped ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center shrink-0 overflow-hidden p-1">
                        <img src={rod.image} alt={rod.name} className="w-12 h-12 object-contain drop-shadow-xs" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{rod.name}</span>
                          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-highest text-on-surface-variant font-bold">
                            {rod.badge}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{rod.description}</p>
                      </div>
                    </div>

                    {isEquipped && (
                      <span className="bg-secondary text-on-secondary font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs font-bold shrink-0">
                        <span className="material-symbols-outlined text-[14px]">check</span> Đang Dùng
                      </span>
                    )}
                  </div>

                  {/* Durability Bar */}
                  <div className={`flex flex-col gap-1 p-2 rounded-DEFAULT ${isCritical ? 'bg-error-container/30' : 'bg-surface-container-low'}`}>
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                      <span className={isCritical ? 'text-error font-bold flex items-center gap-1' : ''}>
                        {isCritical && <span className="material-symbols-outlined text-[14px]">error</span>}
                        {isCritical ? 'Cảnh báo hỏng!' : 'Độ bền cần câu'}
                      </span>
                      <span className={`font-bold ${isCritical ? 'text-error' : isLow ? 'text-tertiary' : 'text-secondary'}`}>
                        {currentDura} / {rod.maxDurability} lượt {isEquipped && duraPercent === 100 ? '(Hoàn hảo)' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCritical ? 'bg-error animate-pulse' : isLow ? 'bg-tertiary' : 'bg-secondary'
                        }`}
                        style={{ width: `${duraPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-space-sm pt-1">
                    {!isEquipped ? (
                      <button
                        type="button"
                        className="flex-1 py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-[0_3px_0_#842415] active:translate-y-0.5 cursor-pointer font-bold"
                        onClick={() => handleEquipRod(rod)}
                      >
                        Trang Bị Cần Này
                      </button>
                    ) : (
                      currentDura < rod.maxDurability && (
                        <button
                          type="button"
                          className="flex-1 py-2 rounded-full bg-tertiary-container text-on-tertiary-container font-label-md text-label-md flex items-center justify-center gap-1 hover:brightness-105 cursor-pointer font-bold shadow-xs"
                          onClick={() => {
                            if (fish < 150) {
                              showToast('Không đủ xu! Cần 150 xu để sửa cần.');
                              return;
                            }
                            handleEquipRod(rod);
                            showToast(`Đã phục hồi độ bền cho ${rod.name}!`);
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">build</span>
                          <span>Sửa Độ Bền (150 🪙)</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick link to pond for more rods */}
          <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎣</span>
              <div>
                <p className="text-xs font-bold text-on-surface">Khám phá thêm các loại cần câu xịn</p>
                <p className="text-[11px] text-on-surface-variant font-medium">Cần máy guồng, cần carbon, cần vàng tại Bể Săn Cá</p>
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shrink-0 shadow-xs cursor-pointer"
              onClick={onOpenPond}
            >
              Vào Hồ Câu
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: THỜI TRANG & ĐỒ TRANG TRÍ (CHỈ HIỆN ĐỒ ĐÃ SỞ HỮU) */}
      {/* ========================================================================= */}
      {activeTab === 'outfits' && (
        <div className="flex flex-col gap-space-md animate-fade-in">
          {/* Live Preview Stage (Phòng Thay Đồ Của Boss) */}
          <div className="bg-gradient-to-b from-surface-container to-surface-container-low rounded-lg p-space-md flex flex-col items-center relative shadow-sm overflow-hidden">
            <div className="absolute top-3 left-3 bg-surface-container-lowest/80 backdrop-blur-md px-2.5 py-1 rounded-full font-label-sm text-label-sm text-primary flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>Phòng Thử Đồ</span>
            </div>

            {/* Interactive Cat Avatar with Current Tried Items */}
            <div className="w-36 h-36 relative my-2 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary-fixed-dim/30 rounded-full blur-xl" />
              <img
                src={currentSkin.image || currentSkin.imageOpen}
                alt={currentSkin.name}
                className={`w-32 h-32 object-contain relative z-10 transition-transform duration-300 cursor-pointer drop-shadow-md ${
                  catSquish ? 'scale-110 -rotate-3' : 'hover:scale-105'
                }`}
                onClick={handleCatMeow}
                title="Nhấp vào Boss để tương tác meow meow!"
              />
              <div className="absolute -bottom-1 -right-1 bg-surface-container-lowest p-1 rounded-full shadow-md z-20">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </div>
            </div>

            {/* Current Active Equipments */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-on-surface">
                🐱 {currentSkin.name}
              </span>
              {curHatObj && (
                <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-primary">
                  {curHatObj.icon} {curHatObj.name}
                </span>
              )}
              {curClothesObj && (
                <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-secondary">
                  {curClothesObj.icon} {curClothesObj.name}
                </span>
              )}
              {curBowlObj && (
                <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-amber-800">
                  {curBowlObj.icon} {curBowlObj.name}
                </span>
              )}
              {curBallObj && (
                <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-emerald-800">
                  {curBallObj.icon} {curBallObj.name}
                </span>
              )}
            </div>

            {/* Banner: Open Fashion Shop to buy more */}
            {onOpenFashionShop && (
              <button
                type="button"
                className="w-full py-2 px-3 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-label-md text-label-md shadow-sm active:scale-95 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                onClick={onOpenFashionShop}
              >
                <span>🛍️</span>
                <span>Mở Shop Thời Trang & Trang Trí (Sắm Thêm Đồ Mới)</span>
              </button>
            )}
          </div>

          {/* Sub-categories Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 cursor-pointer font-bold ${
                fashionFilter === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
              onClick={() => setFashionFilter('all')}
            >
              🐾 Tất Cả Đã Có
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 cursor-pointer font-bold ${
                fashionFilter === 'skins' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
              onClick={() => setFashionFilter('skins')}
            >
              🎨 Skin Mèo ({ownedSkinsList.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 cursor-pointer font-bold ${
                fashionFilter === 'hats' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
              onClick={() => setFashionFilter('hats')}
            >
              👒 Mũ ({ownedHatsList.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 cursor-pointer font-bold ${
                fashionFilter === 'clothes' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
              onClick={() => setFashionFilter('clothes')}
            >
              🧥 Áo ({ownedClothesList.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 cursor-pointer font-bold ${
                fashionFilter === 'decor' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
              onClick={() => setFashionFilter('decor')}
            >
              🛋️ Đồ Sảnh ({ownedDecorList.length})
            </button>
          </div>

          {/* Owned Items Grid */}
          <div className="grid grid-cols-2 gap-space-sm">
            {/* 1. Owned Skins */}
            {(fashionFilter === 'all' || fashionFilter === 'skins') &&
              ownedSkinsList.map((skin) => {
                const isWearing = skin.id === currentSkin.id;
                return (
                  <div
                    key={`skin_${skin.id}`}
                    className={`bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col justify-between items-center text-center relative border ${
                      isWearing ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-outline-variant/30'
                    }`}
                  >
                    <span
                      className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                        isWearing ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {isWearing ? 'Đang Mặc' : 'Skin'}
                    </span>

                    <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center my-2 overflow-hidden p-1">
                      {skin.image ? (
                        <img src={skin.image} alt={skin.name} className="w-14 h-14 object-contain drop-shadow-xs" />
                      ) : (
                        <span className="text-3xl">{skin.icon}</span>
                      )}
                    </div>

                    <span className="font-label-md text-label-md text-on-surface mb-1 font-bold line-clamp-1">{skin.name}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mb-2 line-clamp-1">{skin.perk}</span>

                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-full font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        isWearing
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-primary text-on-primary shadow-[0_2px_0_#842415] active:translate-y-0.5'
                      }`}
                      onClick={() => handleEquipSkin(skin)}
                    >
                      {isWearing ? 'Đang Diện 🐾' : 'Mặc Ngay'}
                    </button>
                  </div>
                );
              })}

            {/* 2. Owned Hats */}
            {(fashionFilter === 'all' || fashionFilter === 'hats') &&
              ownedHatsList.map((item) => {
                const isEquipped = equippedHat === item.id;
                return (
                  <div
                    key={`hat_${item.id}`}
                    className={`bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col justify-between items-center text-center relative border ${
                      isEquipped ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-outline-variant/30'
                    }`}
                  >
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm bg-amber-100 text-amber-900 font-bold">
                      {isEquipped ? 'Đang Đội' : 'Mũ'}
                    </span>

                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center my-2 text-3xl">
                      {item.icon}
                    </div>

                    <span className="font-label-md text-label-md text-on-surface mb-1 font-bold line-clamp-1">{item.name}</span>
                    <span className="font-body-sm text-body-sm text-secondary text-[11px] mb-2 line-clamp-1">{item.perk}</span>

                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-full font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-high text-primary hover:bg-surface-container'
                      }`}
                      onClick={() => onEquipFashionItem && onEquipFashionItem(item)}
                    >
                      {isEquipped ? 'Đang Đội (Tháo)' : 'Đội Mũ'}
                    </button>
                  </div>
                );
              })}

            {/* 3. Owned Clothes */}
            {(fashionFilter === 'all' || fashionFilter === 'clothes') &&
              ownedClothesList.map((item) => {
                const isEquipped = equippedClothes === item.id;
                return (
                  <div
                    key={`cloth_${item.id}`}
                    className={`bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col justify-between items-center text-center relative border ${
                      isEquipped ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-outline-variant/30'
                    }`}
                  >
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm bg-blue-100 text-blue-900 font-bold">
                      {isEquipped ? 'Đang Mặc' : 'Áo'}
                    </span>

                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center my-2 text-3xl">
                      {item.icon}
                    </div>

                    <span className="font-label-md text-label-md text-on-surface mb-1 font-bold line-clamp-1">{item.name}</span>
                    <span className="font-body-sm text-body-sm text-secondary text-[11px] mb-2 line-clamp-1">{item.perk}</span>

                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-full font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-high text-primary hover:bg-surface-container'
                      }`}
                      onClick={() => onEquipFashionItem && onEquipFashionItem(item)}
                    >
                      {isEquipped ? 'Đang Mặc (Tháo)' : 'Mặc Áo'}
                    </button>
                  </div>
                );
              })}

            {/* 4. Owned Room Decor (Bowls, Balls, Rugs) */}
            {(fashionFilter === 'all' || fashionFilter === 'decor') &&
              ownedDecorList.map((item) => {
                const isEquipped =
                  item.category === 'bowls'
                    ? equippedDecor.bowl === item.id
                    : item.category === 'balls'
                    ? equippedDecor.ball === item.id
                    : equippedDecor.rug === item.id;

                return (
                  <div
                    key={`decor_${item.id}`}
                    className={`bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col justify-between items-center text-center relative border ${
                      isEquipped ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-outline-variant/30'
                    }`}
                  >
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm bg-purple-100 text-purple-900 font-bold">
                      {isEquipped ? 'Đang Đặt' : 'Sảnh'}
                    </span>

                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center my-2 text-3xl overflow-hidden border border-purple-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain p-1"
                          loading="lazy"
                        />
                      ) : (
                        item.icon
                      )}
                    </div>

                    <span className="font-label-md text-label-md text-on-surface mb-1 font-bold line-clamp-1">{item.name}</span>
                    <span className="font-body-sm text-body-sm text-secondary text-[11px] mb-2 line-clamp-1">{item.perk}</span>

                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-full font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-high text-primary hover:bg-surface-container'
                      }`}
                      onClick={() => onEquipFashionItem && onEquipFashionItem(item)}
                    >
                      {isEquipped ? 'Đang Trưng Bày' : 'Đặt Vào Sảnh'}
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Empty hint */}
          {ownedHatsList.length === 0 && ownedClothesList.length === 0 && (
            <div className="bg-surface-container-lowest rounded-xl p-4 text-center border border-dashed border-outline-variant/40">
              <p className="text-xs font-bold text-on-surface">Bạn chưa sở hữu chiếc mũ hay áo nào</p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Ghé Shop Thời Trang để sắm những bộ cánh lộng lẫy nhất cho Boss mèo nhé!
              </p>
              {onOpenFashionShop && (
                <button
                  type="button"
                  className="mt-2 px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-xs cursor-pointer"
                  onClick={onOpenFashionShop}
                >
                  🛍️ Mở Shop Thời Trang
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: THỨC ĂN (CHỈ HIỆN THỨC ĂN CÓ TRONG KHO count > 0) */}
      {/* ========================================================================= */}
      {activeTab === 'food' && (
        <div className="flex flex-col gap-space-md animate-fade-in">
          {/* Food Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">lunch_dining</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Thức Ăn Trong Balo ({ownedFoodsList.length})
              </span>
            </div>
            {onOpenFoodShop && (
              <button
                type="button"
                className="font-label-sm text-label-sm text-primary font-bold hover:underline cursor-pointer"
                onClick={onOpenFoodShop}
              >
                🛒 Mua Thêm Tại Shop
              </button>
            )}
          </div>

          {/* If No Food in inventory */}
          {ownedFoodsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-center gap-2">
              <span className="text-4xl">🥣</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Túi Thức Ăn Đang Trống</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                Boss mèo đang chờ được thưởng món ngon! Hãy ghé Cửa Hàng để sắm các món tươi ngon bồi dưỡng nhé.
              </p>
              {onOpenFoodShop && (
                <button
                  type="button"
                  className="mt-2 px-5 py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-[0_3px_0_#842415] active:translate-y-0.5 cursor-pointer font-bold"
                  onClick={onOpenFoodShop}
                >
                  🛒 Mua Thức Ăn Tại Shop
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ownedFoodsList.map((item) => {
                const count = foodInventory[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex items-center justify-between gap-space-sm border border-outline-variant/30"
                  >
                    <div className="flex items-center gap-space-sm">
                      <div className="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden relative p-1">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-14 h-14 object-contain drop-shadow-xs" />
                        ) : (
                          <span className="text-3xl">{item.icon}</span>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-primary text-on-primary font-label-sm text-label-sm px-1.5 rounded-full font-bold">
                          x{count}
                        </span>
                      </div>

                      <div>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{item.name}</span>
                        <div className="flex flex-wrap gap-1 my-1">
                          <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-1.5 py-0.2 rounded-full font-bold">
                            +{formatNumber(item.xpReward)} XP
                          </span>
                          {item.foodRestore > 0 && (
                            <span className="bg-surface-container-high text-on-surface font-label-sm text-label-sm px-1.5 py-0.2 rounded-full font-bold">
                              Hồi {item.foodRestore}% No
                            </span>
                          )}
                          {item.waterRestore > 0 && (
                            <span className="bg-blue-100 text-blue-900 font-label-sm text-label-sm px-1.5 py-0.2 rounded-full font-bold">
                              Hồi {item.waterRestore}% Nước
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="py-2 px-4 rounded-full font-label-md text-label-md shrink-0 font-bold bg-primary text-on-primary shadow-[0_3px_0_#842415] active:translate-y-0.5 cursor-pointer"
                      onClick={() => handleFeedCat(item)}
                    >
                      Cho Ăn
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Re-export as FishBasketView for backward compatibility
export const FishBasketView = BackpackView;
