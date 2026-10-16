import React, { useState } from 'react';
import { UPGRADES } from '../data/upgrades';
import { SKINS, type CatSkin } from '../data/skins';
import { FISHING_RODS_CATALOG, getRodById, type FishingRod, getRodRepairCost } from '../data/fishingRods';
import { calculateUpgradeCost, formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';
import { CoinIcon } from './CoinIcon';

export type ShopSubTab = 'rods' | 'upgrades' | 'skins';

interface UpgradeSkinViewProps {
  fish: number; // coins
  upgrades: { [id: string]: number };
  unlockedSkins: string[];
  equippedSkin: string;
  equippedRodId?: string;
  rodDurability?: number;
  unlockedRods?: string[];
  defaultSubTab?: ShopSubTab;
  onBuyUpgrade: (upgradeId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onUnlockSkin: (skinId: string) => void;
  onBuyOrEquipRod?: (rodId: string) => { success: boolean; message: string };
  onBackToCat: () => void;
}

export const UpgradeSkinView: React.FC<UpgradeSkinViewProps> = ({
  fish,
  upgrades,
  unlockedSkins,
  equippedSkin,
  equippedRodId,
  rodDurability,
  unlockedRods,
  defaultSubTab = 'rods',
  onBuyUpgrade,
  onEquipSkin,
  onUnlockSkin,
  onBuyOrEquipRod,
  onBackToCat,
}) => {
  const [subTab, setSubTab] = useState<ShopSubTab>(defaultSubTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeRodId = equippedRodId || 'wood_rod';
  const activeRodObj = getRodById(activeRodId);
  const currentActiveDurability = rodDurability ?? activeRodObj.maxDurability;
  const unlockedRodsList = unlockedRods || ['wood_rod'];

  const handleRodAction = (rodId: string) => {
    if (!onBuyOrEquipRod) return;
    const res = onBuyOrEquipRod(rodId);
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="view-page-container upgrade-skin-view max-w-xl mx-auto px-2 sm:px-4 pt-1 sm:pt-2 pb-20 sm:pb-24 select-none font-body-md text-on-surface">
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-white font-bold text-xs sm:text-sm shadow-xl backdrop-blur-md border border-white/20 animate-bounce text-center">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="view-header-bar flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 shadow-2xs">
        <div className="view-title-wrap flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="view-title-icon text-xl sm:text-2xl shrink-0">🛍️</span>
          <div className="min-w-0">
            <h2 className="view-title text-sm sm:text-lg font-black text-on-surface truncate">Cửa Hàng & Nâng Cấp</h2>
            <p className="view-subtitle hidden sm:block text-[11px] sm:text-xs text-on-surface-variant line-clamp-1">Sắm cần câu xịn, nâng cấp kỹ năng và sưu tầm skin mèo</p>
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

      {/* Coins Banner */}
      <div className="shop-balance-banner">
        <CoinIcon size={22} />
        <span className="balance-label">Xu Vàng Hiện Có:</span>
        <strong className="balance-val">{formatNumber(fish)} Xu</strong>
      </div>

      {/* Subtabs Switcher */}
      <div className="view-subtabs-nav">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'rods' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('rods');
          }}
        >
          🎣 Cần Câu ({unlockedRodsList.length}/{FISHING_RODS_CATALOG.length})
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'upgrades' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('upgrades');
          }}
        >
          ⚡ Kỹ Năng
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'skins' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('skins');
          }}
        >
          🎨 Skin Mèo ({unlockedSkins.length}/{SKINS.length})
        </button>
      </div>

      {/* SUBTAB 1: SHOP CẦN CÂU */}
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
              const isEquipped = rod.id === activeRodId;
              const isUnlocked = unlockedRodsList.includes(rod.id);
              const rodDur = isEquipped ? currentActiveDurability : rod.maxDurability;
              const isBroken = isEquipped && rodDur <= 0;
              const canAfford = fish >= rod.price;
              const repairCost = rod.repairPrice ?? rod.repairCost ?? getRodRepairCost(rod);
              const canAffordRepair = fish >= repairCost;

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

      {/* SUBTAB 2: UPGRADES */}
      {subTab === 'upgrades' && (
        <div className="shop-section upgrades-tab-container">
          <div className="upgrades-list">
            {UPGRADES.map((item) => {
              const currentLevel = upgrades[item.id] || 0;
              const cost = calculateUpgradeCost(item.baseCost, currentLevel);
              const canAfford = fish >= cost;
              const progressPercent = Math.min(100, Math.floor((fish / cost) * 100));

              return (
                <div
                  key={item.id}
                  className={`upgrade-card ${canAfford ? 'can-afford' : 'cannot-afford'}`}
                >
                  <div className="upgrade-icon-wrap">
                    <span className="upgrade-icon">{item.icon}</span>
                    <span className="upgrade-level-badge">Lv. {currentLevel}</span>
                  </div>

                  <div className="upgrade-details">
                    <div className="upgrade-name-row">
                      <h3 className="upgrade-name">{item.name}</h3>
                    </div>
                    <p className="upgrade-desc">{item.description}</p>

                    <div className="upgrade-effect-pill">
                      {currentLevel > 0 ? (
                        <span>
                          {item.effectDescription(currentLevel)} ➔ <strong>{item.nextEffectDescription(currentLevel)}</strong>
                        </span>
                      ) : (
                        <span>
                          Mở khóa: <strong>{item.nextEffectDescription(0)}</strong>
                        </span>
                      )}
                    </div>

                    {!canAfford && (
                      <div className="cost-progress-bar-bg" title={`${progressPercent}% để nâng cấp`}>
                        <div
                          className="cost-progress-bar-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="upgrade-action">
                    <button
                      type="button"
                      className={`buy-upgrade-btn ${canAfford ? 'btn-active' : 'btn-disabled'}`}
                      disabled={!canAfford}
                      onClick={() => onBuyUpgrade(item.id)}
                    >
                      <CoinIcon size={16} />
                      <span className="buy-cost-text">{formatNumber(cost)}</span>
                      <span className="buy-label">Nâng cấp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SKINS */}
      {subTab === 'skins' && (
        <div className="skins-section skins-tab-container">
          <div className="skins-grid">
            {SKINS.map((skin: CatSkin) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isEquipped = equippedSkin === skin.id;
              const canAfford = fish >= skin.unlockCost;

              return (
                <div
                  key={skin.id}
                  className={`skin-card ${isEquipped ? 'skin-card-equipped' : ''} ${
                    !isUnlocked ? 'skin-card-locked' : ''
                  }`}
                >
                  {/* Mini Avatar Preview */}
                  <div
                    className="skin-preview-box cursor-pointer"
                    style={{ backgroundColor: `${skin.palette.furLight}33` }}
                    onClick={() => soundManager.playCatMeow(skin.sound)}
                    title="Nhấn để nghe tiếng mèo kêu!"
                  >
                    <div className="skin-avatar-wrapper">
                      {skin.image ? (
                        <img
                          src={skin.image}
                          alt={skin.name}
                          className="skin-real-avatar-img"
                          draggable={false}
                        />
                      ) : (
                        <div className="skin-icon-fallback">{skin.icon}</div>
                      )}
                    </div>

                    {isEquipped && <span className="equipped-tag">Đang dùng</span>}
                  </div>

                  {/* Skin Info */}
                  <div className="skin-card-info">
                    <div className="skin-name-row flex items-center justify-between gap-1">
                      <h3 className="skin-name">
                        <span className="skin-icon">{skin.icon}</span> {skin.name}
                      </h3>
                      <button
                        type="button"
                        className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-bold flex items-center gap-0.5 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playCatMeow(skin.sound);
                        }}
                        title="Nghe tiếng kêu của mèo"
                      >
                        🔊 Kêu
                      </button>
                    </div>
                    <p className="skin-subtitle">{skin.subtitle}</p>
                    <p className="skin-desc">{skin.description}</p>

                    {/* Perk Badge */}
                    <div className="skin-perk-badge">
                      <span className="perk-star">⭐</span>
                      <span className="perk-text">{skin.perk}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="skin-card-action">
                    {isEquipped ? (
                      <button type="button" className="skin-btn-active" disabled>
                        ✓ Đang sử dụng
                      </button>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        className="skin-btn-select"
                        onClick={() => onEquipSkin(skin.id)}
                      >
                        🐾 Chọn mèo này
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`skin-btn-unlock ${canAfford ? 'can-buy' : 'cannot-buy'}`}
                        disabled={!canAfford}
                        onClick={() => onUnlockSkin(skin.id)}
                      >
                        <span>Mở khóa</span>
                        <span className="unlock-price flex items-center gap-1">
                          <CoinIcon size={14} />
                          <span>{formatNumber(skin.unlockCost)}</span>
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
    </div>
  );
};

export default UpgradeSkinView;
