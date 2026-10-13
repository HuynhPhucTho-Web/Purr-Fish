import React, { useState } from 'react';
import {
  getItemsByCategory,
  type FashionCategory,
  type FashionDecorItem,
  getFashionItemById,
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
    rug?: string;
  };
  onBuyItem: (item: FashionDecorItem) => { success: boolean; message: string };
  onEquipItem: (item: FashionDecorItem) => boolean;
  onBackToCat: () => void;
}

export const FashionShopView: React.FC<FashionShopViewProps> = ({
  coins,
  currentSkin,
  ownedHats = [],
  equippedHat = '',
  ownedClothes = [],
  equippedClothes = '',
  ownedRoomDecor = ['bowl_clay', 'ball_yarn_red', 'rug_peach'],
  equippedDecor = { bowl: 'bowl_clay', ball: 'ball_yarn_red', rug: 'rug_peach' },
  onBuyItem,
  onEquipItem,
  onBackToCat,
}) => {
  const [activeTab, setActiveTab] = useState<FashionCategory>('hats');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [catSquish, setCatSquish] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const currentItems = getItemsByCategory(activeTab);

  const isItemOwned = (item: FashionDecorItem): boolean => {
    if (item.price === 0) return true;
    if (item.category === 'hats') return ownedHats.includes(item.id);
    if (item.category === 'clothes') return ownedClothes.includes(item.id);
    return ownedRoomDecor.includes(item.id);
  };

  const isItemEquipped = (item: FashionDecorItem): boolean => {
    if (item.category === 'hats') return equippedHat === item.id;
    if (item.category === 'clothes') return equippedClothes === item.id;
    if (item.category === 'bowls') return equippedDecor.bowl === item.id;
    if (item.category === 'balls') return equippedDecor.ball === item.id;
    if (item.category === 'rugs') return equippedDecor.rug === item.id;
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
    } else {
      const equipped = isItemEquipped(item);
      onEquipItem(item);
      if (equipped && (item.category === 'hats' || item.category === 'clothes')) {
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

  const curHatObj = getFashionItemById(equippedHat);
  const curClothesObj = getFashionItemById(equippedClothes);
  const curBowlObj = getFashionItemById(equippedDecor.bowl);
  const curBallObj = getFashionItemById(equippedDecor.ball);
  const curRugObj = getFashionItemById(equippedDecor?.rug || 'rug_peach');

  return (
    <div className="view-page-container max-w-xl mx-auto px-margin pb-24 pt-2 select-none font-body-md text-on-surface">
      {/* Floating Haptic Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-primary/20 animate-bounce-in text-xs font-bold">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-lg bg-surface-container-high p-space-md shadow-sm mb-3">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-space-sm">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                styler
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-headline-md text-headline-md text-on-surface">Shop Thời Trang</h1>
                <span className="bg-rose-100 text-rose-800 font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
                  Áo, Mũ & Phòng
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Trang bị mũ nón, quần áo và đồ nội thất sảnh phòng cho Boss
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

      {/* 2. Coins Balance Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-3 shadow-xs flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <div>
            <span className="text-xs text-amber-900 font-bold block leading-tight">Xu Vàng Hiện Có</span>
            <span className="text-lg font-black text-amber-950">{formatNumber(coins)} Xu</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold bg-white/80 px-2.5 py-1 rounded-full border border-amber-200">
          <span> Sắm đồ đẹp tăng năng lượng</span>
        </div>
      </div>

      {/* 3. Live Fitting Room Stage (Phòng Thử Đồ & Decor của Boss) */}
      <div className="bg-gradient-to-b from-surface-container to-surface-container-low rounded-xl p-space-md flex flex-col items-center relative shadow-sm mb-4 border border-outline-variant/30">
        <div className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-primary flex items-center gap-1 font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>Gương Thử Đồ Trực Tiếp</span>
        </div>

        {/* Interactive Cat Avatar with Equipped Items */}
        <div className="w-40 h-40 relative my-1.5 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary-fixed-dim/30 rounded-full blur-xl" />

          {/* Equipped Rug under Cat */}
          {curRugObj && (
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none translate-y-10">
              {curRugObj.image ? (
                <img
                  src={curRugObj.image}
                  alt={curRugObj.name}
                  className="w-36 h-36 object-contain opacity-95 drop-shadow-sm transition-transform duration-300"
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-full border-2 border-dashed opacity-60 flex items-end justify-center pb-1"
                  style={{ backgroundColor: curRugObj.color }}
                >
                  <span className="text-xl">{curRugObj.icon}</span>
                </div>
              )}
            </div>
          )}

          {/* Equipped Hat on Avatar */}
          {curHatObj && (
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 text-3xl filter drop-shadow-md pointer-events-none animate-bounce-gentle"
              title={curHatObj.name}
            >
              {curHatObj.icon}
            </div>
          )}

          <img
            src={currentSkin.image || currentSkin.imageOpen}
            alt={currentSkin.name}
            className={`w-32 h-32 object-contain relative z-10 transition-transform duration-300 cursor-pointer drop-shadow-md ${
              catSquish ? 'scale-110 -rotate-3' : 'hover:scale-105'
            }`}
            onClick={handleCatMeow}
            title="Nhấp vào Boss để thử phản ứng!"
          />

          {/* Equipped Clothes Badge on Avatar */}
          {curClothesObj && (
            <div
              className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 bg-surface-container-lowest/95 backdrop-blur-md px-2 py-0.5 rounded-full border border-outline-variant/40 shadow-sm flex items-center gap-1 text-[10px] font-bold text-secondary pointer-events-none"
              title={curClothesObj.name}
            >
              <span>{curClothesObj.icon}</span>
              <span>{curClothesObj.badge}</span>
            </div>
          )}

          {/* Mini Bowl Decor in Fitting Room */}
          {curBowlObj && (
            <div
              className="absolute -right-1 bottom-1 z-20 w-9 h-9 rounded-xl bg-surface-container-lowest/95 border border-outline-variant/40 flex items-center justify-center overflow-hidden p-0.5 shadow-sm"
              title={curBowlObj.name}
            >
              {curBowlObj.image ? (
                <img src={curBowlObj.image} alt={curBowlObj.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-base">{curBowlObj.icon}</span>
              )}
            </div>
          )}

          {/* Mini Toy Ball Decor in Fitting Room */}
          {curBallObj && (
            <div
              className="absolute -left-1 bottom-1 z-20 w-9 h-9 rounded-xl bg-surface-container-lowest/95 border border-outline-variant/40 flex items-center justify-center overflow-hidden p-0.5 shadow-sm"
              title={curBallObj.name}
            >
              {curBallObj.image ? (
                <img src={curBallObj.image} alt={curBallObj.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-base">{curBallObj.icon}</span>
              )}
            </div>
          )}
        </div>

        {/* Current Active Accessories Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-on-surface shadow-2xs">
            {curHatObj ? `${curHatObj.icon} ${curHatObj.name}` : '👒 Chưa đội mũ'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-on-surface shadow-2xs">
            {curClothesObj ? `${curClothesObj.icon} ${curClothesObj.name}` : '🧥 Chưa mặc áo'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-emerald-800 shadow-2xs">
            🌸 {curRugObj?.name || 'Thảm cỏ hoa'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-secondary shadow-2xs">
            🥣 {curBowlObj?.name || 'Máng mộc'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-xs font-bold text-primary shadow-2xs">
            🎾 {curBallObj?.name || 'Cuộn len'}
          </span>
        </div>
      </div>

      {/* 4. Category Navigation Capsule Tabs */}
      <div className="grid grid-cols-5 p-1 bg-surface-container-highest rounded-full shadow-inner gap-1 mb-4">
        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'hats'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('hats');
          }}
        >
          <span className="text-lg">👒</span>
          <span className="font-label-sm text-[11px] mt-0.5">Mũ Mèo</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'clothes'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('clothes');
          }}
        >
          <span className="text-lg">🧥</span>
          <span className="font-label-sm text-[11px] mt-0.5">Áo Mèo</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'bowls'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('bowls');
          }}
        >
          <span className="text-lg">🥣</span>
          <span className="font-label-sm text-[11px] mt-0.5">Máng Ăn</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'balls'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('balls');
          }}
        >
          <span className="text-lg">🎾</span>
          <span className="font-label-sm text-[11px] mt-0.5">Đồ Chơi</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center py-2 px-1 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'rugs'
              ? 'bg-primary text-on-primary font-bold shadow-[0_3px_0_#842415]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('rugs');
          }}
        >
          <span className="text-lg">🌸</span>
          <span className="font-label-sm text-[11px] mt-0.5">Thảm Phòng</span>
        </button>
      </div>

      {/* 5. Special Hint Alert for Room Decor */}
      {activeTab === 'bowls' && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold p-3 rounded-xl flex items-center gap-2 mb-3.5 shadow-2xs">
          <span className="text-xl">🥣</span>
          <span>Máng ăn đặt tại sảnh phòng. Bạn có thể nhấn giữ để di chuyển vị trí tự do, nhấp nhẹ để cho Boss ăn ngon miệng!</span>
        </div>
      )}

      {activeTab === 'balls' && (
        <div className="bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold p-3 rounded-xl flex items-center gap-2 mb-3.5 shadow-2xs">
          <span className="text-xl">🎾</span>
          <span>Đồ chơi sẽ đặt tại sảnh phòng. Bạn có thể nhấn giữ để kéo thả tự do, nhấp nhẹ để đồ chơi nảy tưng bừng rơi Xu thưởng!</span>
        </div>
      )}

      {activeTab === 'rugs' && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold p-3 rounded-xl flex items-center gap-2 mb-3.5 shadow-2xs">
          <span className="text-xl">🌸</span>
          <span>Thảm mèo & giường êm sẽ lót ngay dưới Boss tại sảnh phòng, giúp Boss ngủ ngon và tăng hồi phục năng lượng!</span>
        </div>
      )}

      {/* 6. Items Catalog Grid (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        {currentItems.map((item) => {
          const owned = isItemOwned(item);
          const equipped = isItemEquipped(item);

          return (
            <div
              key={item.id}
              className={`bg-surface-container-lowest rounded-xl p-3.5 flex flex-col justify-between gap-2.5 border transition-all ${
                equipped
                  ? 'border-primary shadow-md ring-2 ring-primary/20'
                  : owned
                  ? 'border-emerald-300 shadow-xs'
                  : 'border-outline-variant/30 hover:border-outline-variant'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Large Icon Preview */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-2xs border overflow-hidden"
                  style={{
                    backgroundColor: item.accentColor,
                    borderColor: item.color,
                  }}
                >
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

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-headline-sm text-sm font-bold text-on-surface truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant shrink-0">
                      {item.badge}
                    </span>
                  </div>

                  {item.perk && (
                    <p className="text-xs font-bold text-secondary mt-0.5 leading-tight">
                       {item.perk}
                    </p>
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

                <button
                  type="button"
                  className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs ${
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
                      : 'Đang Trưng Bày'
                    : owned
                    ? 'Trang Bị'
                    : `Mua (${formatNumber(item.price)}🪙)`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
