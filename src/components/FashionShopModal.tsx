import React, { useState } from 'react';
import {
  FASHION_DECOR_CATALOG,
  getItemsByCategory,
  type FashionCategory,
  type FashionDecorItem,
  getFashionItemById,
} from '../data/fashionAndDecor';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface FashionShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
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
}

export const FashionShopModal: React.FC<FashionShopModalProps> = ({
  isOpen,
  onClose,
  coins,
  ownedHats,
  equippedHat,
  ownedClothes,
  equippedClothes,
  ownedRoomDecor,
  equippedDecor,
  onBuyItem,
  onEquipItem,
}) => {
  const [activeTab, setActiveTab] = useState<FashionCategory>('hats');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
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
        showToast(`Đã trang bị ${item.name}! ✨`);
      }
    }
  };

  const curHatObj = getFashionItemById(equippedHat);
  const curClothesObj = getFashionItemById(equippedClothes);
  const curBowlObj = getFashionItemById(equippedDecor.bowl);
  const curBallObj = getFashionItemById(equippedDecor.ball);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce-in">
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Modal Header Bar */}
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-surface-container to-surface-container-high border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xl shadow-xs">
              🛍️
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface leading-tight">
                Shop Thời Trang & Trang Trí
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium">
                Sắm áo, mũ & decor sảnh phòng cho Boss
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
              <span>🪙</span>
              <span>{formatNumber(coins)}</span>
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface text-base font-bold cursor-pointer transition-colors"
              onClick={onClose}
              title="Đóng shop"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Currently Equipped Quick Summary Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-surface-container-low text-[11px] font-semibold text-on-surface-variant border-b border-outline-variant/20 overflow-x-auto gap-3 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span>Đang dùng:</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-bold">
              {curHatObj ? `${curHatObj.icon} ${curHatObj.name}` : '👒 Không mũ'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-bold">
              {curClothesObj ? `${curClothesObj.icon} ${curClothesObj.name}` : '🧥 Không áo'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-secondary font-bold">
              🥣 {curBowlObj?.name || 'Máng mộc'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-primary font-bold">
              🎾 {curBallObj?.name || 'Cuộn len'}
            </span>
          </div>
        </div>

        {/* 3. Category Capsule Tabs */}
        <div className="flex p-1.5 bg-surface-container-highest gap-1 overflow-x-auto no-scrollbar shrink-0 border-b border-outline-variant/20">
          <button
            type="button"
            className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'hats'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('hats');
            }}
          >
            <span className="text-base">👒</span>
            <span>Mũ Mèo</span>
          </button>

          <button
            type="button"
            className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'clothes'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('clothes');
            }}
          >
            <span className="text-base">🧥</span>
            <span>Áo Mèo</span>
          </button>

          <button
            type="button"
            className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'bowls'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('bowls');
            }}
          >
            <span className="text-base">🥣</span>
            <span>Máng Ăn</span>
          </button>

          <button
            type="button"
            className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'balls'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('balls');
            }}
          >
            <span className="text-base">🎾</span>
            <span>Banh Đồ Chơi</span>
          </button>

          <button
            type="button"
            className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'rugs'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('rugs');
            }}
          >
            <span className="text-base">🌸</span>
            <span>Thảm Sảnh</span>
          </button>
        </div>

        {/* 4. Items Grid Container */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
          {activeTab === 'bowls' && (
            <div className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-base">✨</span>
              <span>Máng ăn sau khi trang bị sẽ xuất hiện ngay tại sảnh phòng của mèo!</span>
            </div>
          )}

          {activeTab === 'balls' && (
            <div className="bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-base">🎾</span>
              <span>Quả banh đồ chơi sẽ xuất hiện trên thảm sảnh. Nhấp vào banh để banh nảy tưng bừng!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentItems.map((item) => {
              const owned = isItemOwned(item);
              const equipped = isItemEquipped(item);

              return (
                <div
                  key={item.id}
                  className={`bg-surface-container-lowest rounded-xl p-3 flex flex-col justify-between gap-2 border transition-all ${
                    equipped
                      ? 'border-primary shadow-md ring-2 ring-primary/20'
                      : owned
                      ? 'border-emerald-300 shadow-xs'
                      : 'border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Item Large Icon */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-2xs border"
                      style={{
                        backgroundColor: item.accentColor,
                        borderColor: item.color,
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-on-surface truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface-variant shrink-0">
                          {item.badge}
                        </span>
                      </div>

                      {item.perk && (
                        <p className="text-[11px] font-bold text-secondary mt-0.5 leading-tight">
                          ✨ {item.perk}
                        </p>
                      )}

                      <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
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
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs ${
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
                          ? 'Đang Đội (Tháo)'
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

        {/* 5. Footer Bar */}
        <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-xs shrink-0">
          <span className="text-on-surface-variant font-medium">
            💡 Mẹo: Mua máng ăn & quả banh sẽ làm sảnh phòng mèo sống động hơn!
          </span>
          <button
            type="button"
            className="px-4 py-1.5 rounded-full bg-surface-container text-on-surface font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
            onClick={onClose}
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
