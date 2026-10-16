import React, { useState, useMemo } from 'react';
import { FISHING_RODS_CATALOG, getRodById, type FishingRod, getRodRepairCost } from '../data/fishingRods';
import { FOOD_SHOP_CATALOG, type FoodItem, type FoodTier } from '../data/foodShop';
import { FISH_CATALOG, type CaughtFishItem } from '../data/fishes';
import { FashionShopView } from './FashionShopView';
import type { FashionDecorItem } from '../data/fashionAndDecor';
import type { CatSkin } from '../data/skins';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';
import { CoinIcon } from './CoinIcon';

export type MasterShopSubTab = 'rods' | 'food' | 'fashion' | 'fish';

export interface MasterShopViewProps {
  coins: number;
  currentSkin: CatSkin;
  equippedRodId?: string;
  rodDurability?: number;
  unlockedRods?: string[];
  foodInventory: { [foodId: string]: number };
  fishBasket: CaughtFishItem[];
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
  defaultSubTab?: MasterShopSubTab;
  onBuyOrEquipRod: (rodId: string) => { success: boolean; message: string };
  onBuyFoodToInventory: (item: FoodItem, quantity: number) => boolean;
  onBuyFashionItem: (item: FashionDecorItem) => { success: boolean; message: string };
  onEquipFashionItem: (item: FashionDecorItem) => boolean;
  onSellFish: (instanceId: string) => number;
  onSellAllFish: () => { count: number; totalEarned: number };
  onBackToCat: () => void;
  onOpenPond?: () => void;
}

export const MasterShopView: React.FC<MasterShopViewProps> = ({
  coins,
  currentSkin,
  equippedRodId = 'wood_rod',
  rodDurability,
  unlockedRods = ['wood_rod'],
  foodInventory = {},
  fishBasket = [],
  ownedHats = [],
  equippedHat = '',
  ownedClothes = [],
  equippedClothes = '',
  ownedRoomDecor = ['bowl_clay', 'ball_yarn_red', 'rug_peach', 'room_go_co_dien'],
  equippedDecor = { bowl: 'bowl_clay', ball: 'ball_yarn_red', balls: ['ball_yarn_red'], rug: 'rug_peach', room: 'room_go_co_dien' },
  defaultSubTab = 'rods',
  onBuyOrEquipRod,
  onBuyFoodToInventory,
  onBuyFashionItem,
  onEquipFashionItem,
  onSellFish,
  onSellAllFish,
  onBackToCat,
  onOpenPond,
}) => {
  const [subTab, setSubTab] = useState<MasterShopSubTab>(defaultSubTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subtab 2: Food filters & quantity
  const [foodTierFilter, setFoodTierFilter] = useState<'all' | FoodTier>('all');
  const [foodBuyQty, setFoodBuyQty] = useState<number>(1);

  // Subtab 4: Fish Selling state & Price catalog toggle
  const [fishRarityFilter, setFishRarityFilter] = useState<'all' | 'common' | 'rare_plus'>('all');
  const [showPriceCatalog, setShowPriceCatalog] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Active Rod details
  const activeRodObj = getRodById(equippedRodId);
  const currentActiveDurability = rodDurability ?? activeRodObj.maxDurability;

  const handleRodAction = (rodId: string) => {
    soundManager.playPop();
    const res = onBuyOrEquipRod(rodId);
    showToast(res.message);
  };

  // Filtered Food items
  const filteredFoods = useMemo(() => {
    if (foodTierFilter === 'all') return FOOD_SHOP_CATALOG;
    return FOOD_SHOP_CATALOG.filter((f) => f.tier === foodTierFilter);
  }, [foodTierFilter]);

  const handleBuyFood = (item: FoodItem) => {
    const totalCost = item.price * foodBuyQty;
    if (coins < totalCost) {
      soundManager.playPop();
      showToast(`Không đủ xu! Cần ${formatNumber(totalCost)} xu để mua ${foodBuyQty}x ${item.name}.`);
      return;
    }
    const ok = onBuyFoodToInventory(item, foodBuyQty);
    if (ok) {
      showToast(`🛒 Đã mua thành công ${foodBuyQty}x ${item.name} vào kho thức ăn!`);
    }
  };

  // Basket calculations
  const totalBasketValue = useMemo(() => {
    return fishBasket.reduce((sum, f) => sum + (f.sellPrice || 0), 0);
  }, [fishBasket]);

  const normalFishList = useMemo(() => {
    return fishBasket.filter((f) => f.rarity === 'common');
  }, [fishBasket]);

  const normalFishTotalValue = useMemo(() => {
    return normalFishList.reduce((sum, f) => sum + (f.sellPrice || 0), 0);
  }, [normalFishList]);

  const filteredBasket = useMemo(() => {
    if (fishRarityFilter === 'common') {
      return fishBasket.filter((f) => f.rarity === 'common');
    }
    if (fishRarityFilter === 'rare_plus') {
      return fishBasket.filter((f) => f.rarity !== 'common');
    }
    return fishBasket;
  }, [fishBasket, fishRarityFilter]);

  const handleSellOne = (item: CaughtFishItem) => {
    const earned = onSellFish(item.instanceId);
    showToast(`Đã bán 1 con ${item.name} (+${formatNumber(earned)} Xu)!`);
  };

  const handleSellAllNormal = () => {
    if (normalFishList.length === 0) {
      showToast('Không có cá thường để bán!');
      return;
    }
    normalFishList.forEach((f) => onSellFish(f.instanceId));
    showToast(`Đã bán hết ${normalFishList.length} con cá thường! Nhận +${formatNumber(normalFishTotalValue)} Xu!`);
  };

  const handleSellAllBasket = () => {
    if (fishBasket.length === 0) {
      showToast('Giỏ cá đang trống!');
      return;
    }
    const res = onSellAllFish();
    showToast(`Đã bán toàn bộ ${res.count} con cá trong giỏ! Nhận +${formatNumber(res.totalEarned)} Xu!`);
  };

  return (
    <div className="view-page-container master-shop-view max-w-xl mx-auto px-2 sm:px-4 pt-1 sm:pt-2 pb-20 sm:pb-24 select-none font-body-md text-on-surface">
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-white font-bold text-xs sm:text-sm shadow-xl backdrop-blur-md border border-white/20 animate-bounce text-center">
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="view-header-bar flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 shadow-2xs mb-2 sm:mb-3">
        <div className="view-title-wrap flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="view-title-icon text-xl sm:text-2xl shrink-0">🛍️</span>
          <div className="min-w-0">
            <h2 className="view-title text-sm sm:text-lg font-black text-on-surface truncate">
              Cửa Hàng Tổng Hợp
            </h2>
            <p className="view-subtitle hidden sm:block text-[11px] sm:text-xs text-on-surface-variant line-clamp-1">
              Cần câu • Thức ăn • Thời trang • Chợ thu mua cá
            </p>
          </div>
        </div>
        <button
          type="button"
          className="view-back-btn px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container text-primary font-bold text-xs shrink-0 cursor-pointer transition-all border border-outline-variant/30"
          onClick={onBackToCat}
          title="Quay lại phòng mèo"
        >
          🐱 Về Mèo
        </button>
      </div>

      {/* Coins Balance Banner */}
      <div className="shop-balance-banner mb-2.5 sm:mb-3.5">
        <img
          src="/images/icon/xu-vang.webp"
          alt="Xu"
          className="w-5 h-5 object-contain inline-block shrink-0"
          draggable={false}
        />
        <span className="balance-label">Xu Vàng Hiện Có:</span>
        <strong className="balance-val">{formatNumber(coins)} Xu</strong>
      </div>

      {/* Master 4 Subtabs Switcher */}
      <div className="view-subtabs-nav grid grid-cols-4 gap-1 p-1 bg-surface-container-highest/80 rounded-2xl mb-3">
        <button
          type="button"
          className={`subtab-btn flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
            subTab === 'rods' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('rods');
          }}
        >
          <span className="text-sm sm:text-base">🎣</span>
          <span className="truncate">Cần Câu</span>
        </button>

        <button
          type="button"
          className={`subtab-btn flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
            subTab === 'food' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('food');
          }}
        >
          <span className="text-sm sm:text-base">🥫</span>
          <span className="truncate">Thức Ăn</span>
        </button>

        <button
          type="button"
          className={`subtab-btn flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
            subTab === 'fashion' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('fashion');
          }}
        >
          <span className="text-sm sm:text-base">👒</span>
          <span className="truncate">Thời Trang</span>
        </button>

        <button
          type="button"
          className={`subtab-btn flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer relative ${
            subTab === 'fish' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('fish');
          }}
        >
          <span className="text-sm sm:text-base">🐟</span>
          <span className="truncate">Chợ Cá</span>
          {fishBasket.length > 0 && (
            <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 rounded-full leading-tight absolute -top-1 -right-1 sm:static">
              {fishBasket.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: CẦN CÂU & NGƯ CỤ (RODS) */}
      {/* ========================================================================= */}
      {subTab === 'rods' && (
        <div className="shop-section rods-tab-container flex flex-col gap-3">
          {/* Active Equipped Rod Banner */}
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-amber-200/80 p-1.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                {activeRodObj.image ? (
                  <img
                    src={activeRodObj.image}
                    alt={activeRodObj.name}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">{activeRodObj.icon}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                    ĐANG DÙNG
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-on-surface truncate">
                    {activeRodObj.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-amber-900 border border-amber-200/80">
                    {activeRodObj.badge}
                  </span>
                </div>
                {/* Durability status & bar */}
                <div className="mt-1.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                    <span>
                      Độ bền:{' '}
                      <strong className={currentActiveDurability <= 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {currentActiveDurability}/{activeRodObj.maxDurability} lượt
                      </strong>
                    </span>
                    <span>
                      Ra dây: <strong>{activeRodObj.lineSpeed}x</strong>
                    </span>
                  </div>
                  <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentActiveDurability <= 0
                          ? 'bg-red-500'
                          : currentActiveDurability <= Math.round(activeRodObj.maxDurability * 0.3)
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.round((Math.max(0, currentActiveDurability) / activeRodObj.maxDurability) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {currentActiveDurability <= 0 && (
              <button
                type="button"
                onClick={() => handleRodAction(activeRodObj.id)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-105 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>🔧</span>
                <span>Sửa ngay ({formatNumber(activeRodObj.repairPrice ?? activeRodObj.repairCost ?? getRodRepairCost(activeRodObj))} Xu)</span>
              </button>
            )}
          </div>

          {/* Catalog of all Fishing Rods */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {FISHING_RODS_CATALOG.map((rod: FishingRod) => {
              const isEquipped = rod.id === equippedRodId;
              const isUnlocked = unlockedRods.includes(rod.id);
              const rodDur = isEquipped ? currentActiveDurability : rod.maxDurability;
              const isBroken = isEquipped && rodDur <= 0;
              const canAfford = coins >= rod.price;
              const repairCost = rod.repairPrice ?? rod.repairCost ?? getRodRepairCost(rod);
              const canAffordRepair = coins >= repairCost;

              return (
                <div
                  key={rod.id}
                  className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col gap-2.5 ${
                    isEquipped
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                      : 'border-outline-variant/30 bg-surface-container-lowest hover:border-amber-300'
                  }`}
                >
                  {/* Top: Icon + Name + Badge + Price */}
                  <div className="flex items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-outline-variant/40 p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        {rod.image ? (
                          <img
                            src={rod.image}
                            alt={rod.name}
                            className="w-full h-full object-contain hover:scale-105 transition-transform"
                            draggable={false}
                          />
                        ) : (
                          <span className="text-2xl">{rod.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-sm sm:text-base text-on-surface truncate">
                            {rod.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30">
                            {rod.badge}
                          </span>
                          {isEquipped && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                              ĐANG DÙNG
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 mt-0.5 leading-tight">
                          {rod.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isUnlocked ? (
                        <span className="text-[11px] sm:text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          Đã sở hữu
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-black shadow-2xs">
                          <CoinIcon size={16} />
                          <span>{rod.price === 0 ? 'Miễn phí' : formatNumber(rod.price)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats Pills Grid - Responsive 2 cols on mobile, 4 cols on tablet/desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-on-surface-variant font-medium">
                    <div className="bg-surface-container/60 border border-outline-variant/20 px-2 py-1.5 rounded-xl flex items-center justify-between truncate">
                      <span className="flex items-center gap-1">
                        <span>🎣</span>
                        <span>Độ bền:</span>
                      </span>
                      <strong className="text-on-surface font-bold ml-1">
                        {isEquipped ? `${rodDur}/${rod.maxDurability}` : `${rod.maxDurability}`}
                      </strong>
                    </div>
                    <div className="bg-surface-container/60 border border-outline-variant/20 px-2 py-1.5 rounded-xl flex items-center justify-between truncate">
                      <span className="flex items-center gap-1">
                        <span>⚡</span>
                        <span>Ra dây:</span>
                      </span>
                      <strong className="text-on-surface font-bold ml-1">{rod.lineSpeed}x</strong>
                    </div>
                    <div className="bg-surface-container/60 border border-outline-variant/20 px-2 py-1.5 rounded-xl flex items-center justify-between truncate">
                      <span className="flex items-center gap-1">
                        <span>🐋</span>
                        <span>Cá khủng:</span>
                      </span>
                      <strong className="text-on-surface font-bold ml-1">+{Math.round((rod.bigFishLuck || 0) * 100)}%</strong>
                    </div>
                    <div className="bg-surface-container/60 border border-outline-variant/20 px-2 py-1.5 rounded-xl flex items-center justify-between truncate">
                      <span className="flex items-center gap-1">
                        <span>💪</span>
                        <span>Kéo cá:</span>
                      </span>
                      <strong className="text-on-surface font-bold ml-1">+{Math.round(((rod.reelingPower || 1) - 1) * 100)}%</strong>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isEquipped && !isBroken ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded-xl bg-emerald-100/90 text-emerald-800 font-bold text-xs sm:text-sm cursor-default flex items-center justify-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Đang sử dụng ({rodDur}/{rod.maxDurability} lượt)</span>
                      </button>
                    ) : isBroken ? (
                      <button
                        type="button"
                        onClick={() => handleRodAction(rod.id)}
                        disabled={!canAffordRepair}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 ${
                          canAffordRepair
                            ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:opacity-95'
                            : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span>🔧</span>
                        <span>Sửa cần câu hỏng ({formatNumber(repairCost)} Xu)</span>
                      </button>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleRodAction(rod.id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>🐾</span>
                        <span>Đổi sang cần này (Đã sở hữu)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRodAction(rod.id)}
                        disabled={!canAfford && rod.price > 0}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 ${
                          rod.price === 0
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white'
                            : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {rod.price > 0 && <CoinIcon size={16} />}
                        <span>
                          {rod.price === 0
                            ? 'Nhận & Trang Bị Miễn Phí'
                            : canAfford
                            ? `Mua & Trang Bị (${formatNumber(rod.price)} Xu)`
                            : `Chưa đủ xu (${formatNumber(rod.price)} Xu)`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: THỨC ĂN & NƯỚC UỐNG (FOOD) */}
      {/* ========================================================================= */}
      {subTab === 'food' && (
        <div className="shop-section food-tab-container flex flex-col gap-3">
          {/* Controls Bar: Tier Filter + Quantity Stepper */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30">
            {/* Filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['all', 'low', 'mid', 'high'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    foodTierFilter === tier
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setFoodTierFilter(tier)}
                >
                  {tier === 'all'
                    ? 'Tất Cả 🍲'
                    : tier === 'low'
                    ? 'Cấp Thấp 🟢'
                    : tier === 'mid'
                    ? 'Cấp Trung 🔵'
                    : 'Cao Cấp 🟣'}
                </button>
              ))}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-outline-variant/20">
              <span className="text-xs text-on-surface-variant font-bold">Số lượng mua:</span>
              <div className="flex items-center gap-1">
                {[1, 5, 10].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    className={`px-2 py-0.8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      foodBuyQty === qty
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                    onClick={() => setFoodBuyQty(qty)}
                  >
                    {qty}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Informative Note */}
          <div className="text-[11px] text-on-surface-variant px-1 flex items-center gap-1">
            <span>ℹ️</span>
            <span>Thực phẩm đã mua sẽ được chuyển thẳng vào <strong>Balo / Tủ đồ ăn</strong> để cho mèo ăn bất cứ lúc nào.</span>
          </div>

          {/* Food Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredFoods.map((item) => {
              const currentOwned = foodInventory[item.id] || 0;
              const totalCost = item.price * foodBuyQty;
              const canAfford = coins >= totalCost;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between gap-2.5 hover:border-amber-300 transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-50/80 border border-amber-200/60 p-1 flex items-center justify-center shrink-0 shadow-xs">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">{item.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-black text-xs sm:text-sm text-on-surface truncate">
                          {item.name}
                        </h4>
                        <span
                          className="text-[9px] font-black px-1.5 py-0.2 rounded-full text-white shrink-0"
                          style={{ backgroundColor: item.speedBadgeColor || '#3B82F6' }}
                        >
                          {item.growthSpeedLabel}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                        {item.description}
                      </p>

                      {/* Stat summary */}
                      <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-medium mt-1 flex-wrap">
                        {item.foodRestore > 0 && (
                          <span className="text-amber-800 font-bold">🍗 +{item.foodRestore}%</span>
                        )}
                        {item.waterRestore > 0 && (
                          <span className="text-sky-700 font-bold">💧 +{item.waterRestore}%</span>
                        )}
                        {item.satietyMinutes > 0 && (
                          <span className="text-purple-700 font-bold">⏳ {item.satietyMinutes}p</span>
                        )}
                        <span className="text-emerald-700 font-bold">⭐ +{item.xpReward} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Price + Owned count + Buy button */}
                  <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-amber-700 flex items-center gap-1">
                        <img
                          src="/images/icon/xu-vang.webp"
                          alt="Xu"
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain inline-block shrink-0"
                          draggable={false}
                        />
                        <span>{formatNumber(totalCost)} Xu</span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant truncate">
                        Đang có: <strong className="text-on-surface">x{currentOwned}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95'
                          : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => handleBuyFood(item)}
                      disabled={!canAfford}
                    >
                      Mua x{foodBuyQty}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: THỜI TRANG & NỘI THẤT (FASHION & ROOM DECOR) */}
      {/* ========================================================================= */}
      {subTab === 'fashion' && (
        <div className="shop-section fashion-tab-container">
          <FashionShopView
            coins={coins}
            currentSkin={currentSkin}
            ownedHats={ownedHats}
            equippedHat={equippedHat}
            ownedClothes={ownedClothes}
            equippedClothes={equippedClothes}
            ownedRoomDecor={ownedRoomDecor}
            equippedDecor={equippedDecor}
            onBuyItem={onBuyFashionItem}
            onEquipItem={onEquipFashionItem}
            onBackToCat={onBackToCat}
            hideHeader={true}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: CHỢ CÁ / BÁN CÁ (FISH MARKET) */}
      {/* ========================================================================= */}
      {subTab === 'fish' && (
        <div className="shop-section fish-market-tab-container flex flex-col gap-3">
          {/* Basket Capacity & Value HUD */}
          <div className="p-3 sm:p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🧺</span>
                <span className="font-bold text-xs sm:text-sm text-on-surface">
                  Giỏ Cá Ngư Thủ: <strong>{fishBasket.length} con</strong>
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black text-amber-700 flex items-center gap-1">
                <span>Ước tính: +{formatNumber(totalBasketValue)}</span>
                <img
                  src="/images/icon/xu-vang.webp"
                  alt="Xu"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain inline-block shrink-0"
                  draggable={false}
                />
              </span>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                className="py-2.5 px-2 rounded-xl bg-surface-container-highest border border-outline-variant/40 text-on-surface font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                disabled={normalFishList.length === 0}
                onClick={handleSellAllNormal}
              >
                <span>🐟</span>
                <span className="truncate flex items-center gap-1">
                  <span>Bán Cá Thường (+{formatNumber(normalFishTotalValue)}</span>
                  <img src="/images/icon/xu-vang.webp" alt="Xu" className="w-3 h-3 inline-block shrink-0" draggable={false} />
                  <span>)</span>
                </span>
              </button>

              <button
                type="button"
                className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                disabled={fishBasket.length === 0}
                onClick={handleSellAllBasket}
              >
                <span>💰</span>
                <span className="truncate flex items-center gap-1">
                  <span>Bán Hết (+{formatNumber(totalBasketValue)}</span>
                  <img src="/images/icon/xu-vang.webp" alt="Xu" className="w-3 h-3 inline-block shrink-0" draggable={false} />
                  <span>)</span>
                </span>
              </button>
            </div>
          </div>

          {/* Filter Pills + Toggle Fish Catalog */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              {(['all', 'common', 'rare_plus'] as const).map((rarity) => (
                <button
                  key={rarity}
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    fishRarityFilter === rarity
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setFishRarityFilter(rarity)}
                >
                  {rarity === 'all'
                    ? `Tất cả (${fishBasket.length})`
                    : rarity === 'common'
                    ? `Cá Thường (${normalFishList.length})`
                    : `Cá Hiếm/Khủng (${fishBasket.length - normalFishList.length})`}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer py-1"
              onClick={() => setShowPriceCatalog((v) => !v)}
            >
              <span>{showPriceCatalog ? 'Ẩn bảng giá ▲' : 'Bảng giá chợ ▼'}</span>
            </button>
          </div>

          {/* Collapsible Market Price Guide */}
          {showPriceCatalog && (
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2 animate-fade-in">
              <h4 className="text-xs font-black text-on-surface flex items-center gap-1">
                <span>📋</span>
                <span>Bảng Giá Thị Trường 12 Loài Cá:</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {FISH_CATALOG.map((f) => (
                  <div
                    key={f.id}
                    className="p-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center gap-1.5 text-[11px]"
                  >
                    <img src={f.image} alt={f.name} className="w-6 h-6 object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-on-surface truncate">{f.name}</div>
                      <div className="text-[10px] text-amber-800 font-semibold">{f.pricePerKg} xu/kg</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Caught Fish in Basket */}
          {filteredBasket.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center flex flex-col items-center gap-2">
              <span className="text-4xl">🎣</span>
              <p className="text-xs text-on-surface-variant font-medium">
                {fishBasket.length === 0
                  ? 'Giỏ cá của bạn đang trống trơn! Hãy ghé Hồ Câu để đi săn cá nhé.'
                  : 'Không có con cá nào khớp với bộ lọc đang chọn.'}
              </p>
              {onOpenPond && (
                <button
                  type="button"
                  className="mt-1 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer"
                  onClick={onOpenPond}
                >
                  Đi Đến Hồ Câu Ngay 🐟
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBasket.map((item) => (
                <div
                  key={item.instanceId}
                  className="p-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-2 hover:border-amber-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-50/80 border border-blue-200/50 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="font-black text-xs text-on-surface truncate">
                          {item.name}
                        </h4>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded-full text-white shrink-0"
                          style={{ backgroundColor: item.rarityColor }}
                        >
                          {item.rarityLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                        Cân nặng: <strong className="text-on-surface">{item.weightKg} kg</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-amber-700 mb-1 flex items-center justify-end gap-1">
                      <span>+{formatNumber(item.sellPrice)}</span>
                      <img
                        src="/images/icon/xu-vang.webp"
                        alt="Xu"
                        className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                        draggable={false}
                      />
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-surface-container-highest hover:bg-amber-100 text-on-surface hover:text-amber-900 font-bold text-xs transition-colors cursor-pointer border border-outline-variant/40"
                      onClick={() => handleSellOne(item)}
                    >
                      Bán lẻ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MasterShopView;
