import React, { useState } from 'react';
import { UPGRADES } from '../data/upgrades';
import { SKINS, type CatSkin } from '../data/skins';
import { MEAL_PLANS_CATALOG, type MealPlan } from '../data/foodShop';
import type { ActiveMealPlanInfo } from '../utils/saveGame';
import { calculateUpgradeCost, formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

export type GrowthSubTab = 'upgrades' | 'skins' | 'meal_plans';

export interface GrowthUpgradeViewProps {
  coins: number;
  upgrades: { [id: string]: number };
  unlockedSkins: string[];
  equippedSkin: string;
  activeMealPlan?: ActiveMealPlanInfo | null;
  defaultSubTab?: GrowthSubTab;
  onBuyUpgrade: (upgradeId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onUnlockSkin: (skinId: string) => void;
  onBuyMealPlan: (plan: MealPlan) => boolean;
  onBackToCat: () => void;
}

export const GrowthUpgradeView: React.FC<GrowthUpgradeViewProps> = ({
  coins,
  upgrades,
  unlockedSkins,
  equippedSkin,
  activeMealPlan,
  defaultSubTab = 'upgrades',
  onBuyUpgrade,
  onEquipSkin,
  onUnlockSkin,
  onBuyMealPlan,
  onBackToCat,
}) => {
  const [subTab, setSubTab] = useState<GrowthSubTab>(defaultSubTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleBuyPlan = (plan: MealPlan) => {
    if (coins < plan.price) {
      soundManager.playPop();
      showToast(`Không đủ xu! Cần ${formatNumber(plan.price)} xu để kích hoạt ${plan.name}.`);
      return;
    }
    const success = onBuyMealPlan(plan);
    if (success) {
      soundManager.playUpgrade();
      showToast(`🎉 Đã đăng ký thành công ${plan.name}! Mèo được tự động cho ăn khi đói.`);
    }
  };

  return (
    <div className="view-page-container growth-upgrade-view max-w-xl mx-auto px-2 sm:px-4 pt-1 sm:pt-2 pb-20 sm:pb-24 select-none font-body-md text-on-surface">
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-white font-bold text-xs sm:text-sm shadow-xl backdrop-blur-md border border-white/20 animate-bounce text-center">
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="view-header-bar flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 shadow-2xs mb-2 sm:mb-3">
        <div className="view-title-wrap flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="view-title-icon text-xl sm:text-2xl shrink-0">⚡</span>
          <div className="min-w-0">
            <h2 className="view-title text-sm sm:text-lg font-black text-on-surface truncate">
              Nâng Cấp & Phát Triển
            </h2>
            <p className="view-subtitle hidden sm:block text-[11px] sm:text-xs text-on-surface-variant line-clamp-1">
              Kỹ năng câu cá • Skin mèo cưng • Kế hoạch dinh dưỡng dài hạn
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

      {/* Balance Banner */}
      <div className="shop-balance-banner mb-2.5 sm:mb-3.5">
        <span className="balance-icon">🪙</span>
        <span className="balance-label">Xu Vàng Hiện Có:</span>
        <strong className="balance-val">{formatNumber(coins)} Xu</strong>
      </div>

      {/* 3 Subtabs Switcher */}
      <div className="view-subtabs-nav grid grid-cols-3 gap-1 p-1 bg-surface-container-highest/80 rounded-2xl mb-3">
        <button
          type="button"
          className={`subtab-btn flex items-center justify-center gap-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'upgrades' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('upgrades');
          }}
        >
          <span>⚡</span>
          <span>Kỹ Năng</span>
        </button>

        <button
          type="button"
          className={`subtab-btn flex items-center justify-center gap-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'skins' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('skins');
          }}
        >
          <span>🎨</span>
          <span className="truncate">Skin ({unlockedSkins.length}/{SKINS.length})</span>
        </button>

        <button
          type="button"
          className={`subtab-btn flex items-center justify-center gap-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
            subTab === 'meal_plans' ? 'subtab-active shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('meal_plans');
          }}
        >
          <span>📋</span>
          <span>Kế Hoạch</span>
          {activeMealPlan && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 animate-pulse" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: KỸ NĂNG (UPGRADES) */}
      {/* ========================================================================= */}
      {subTab === 'upgrades' && (
        <div className="shop-section upgrades-tab-container flex flex-col gap-2.5">
          <div className="upgrades-list flex flex-col gap-2.5">
            {UPGRADES.map((item) => {
              const currentLevel = upgrades[item.id] || 0;
              const cost = calculateUpgradeCost(item.baseCost, currentLevel);
              const canAfford = coins >= cost;
              const progressPercent = Math.min(100, Math.floor((coins / cost) * 100));

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
                      <span className="buy-fish-icon">🪙</span>
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

      {/* ========================================================================= */}
      {/* SUBTAB 2: SKIN MÈO (SKINS) */}
      {/* ========================================================================= */}
      {subTab === 'skins' && (
        <div className="skins-section skins-tab-container">
          <div className="skins-grid">
            {SKINS.map((skin: CatSkin) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isEquipped = equippedSkin === skin.id;
              const canAfford = coins >= skin.unlockCost;

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
                      <h3 className="skin-name truncate">
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
                        <span className="unlock-price">
                          🪙 {formatNumber(skin.unlockCost)}
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
      {/* SUBTAB 3: KẾ HOẠCH BỮA ĂN (MEAL PLANS) */}
      {/* ========================================================================= */}
      {subTab === 'meal_plans' && (
        <div className="meal-plans-section flex flex-col gap-3">
          {/* Active Plan Status Banner */}
          {activeMealPlan && (
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-300 shadow-xs flex items-center gap-3">
              <div className="text-3xl shrink-0">👑</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-sm sm:text-base text-emerald-950 truncate">
                    Đang chạy: {activeMealPlan.planName}
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    ĐANG HOẠT ĐỘNG
                  </span>
                </div>
                <p className="text-xs text-emerald-900/90 font-medium mt-0.5">
                  Còn lại: <strong className="font-black text-emerald-950">{activeMealPlan.autoFeedMealsRemaining} bữa tự động</strong> dự trữ. Khi độ no/khát dưới 30%, hệ thống tự động bồi bổ cho Boss!
                </p>
              </div>
            </div>
          )}

          {/* Educational Intro */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-2.5">
            <span className="text-xl shrink-0">💡</span>
            <div className="text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface font-bold">Kế Hoạch Bữa Ăn Là Gì?</strong>
              <p className="mt-0.5">
                Các gói kế hoạch kết hợp thực đơn dinh dưỡng cao cấp với <strong className="text-primary">chiết khấu giảm giá lên đến 25%</strong>, tặng kèm hàng trăm điểm XP thăng cấp và kích hoạt tính năng <strong className="text-emerald-700">Tự Động Cho Ăn Khi Đói</strong>, giúp bạn an tâm AFK hay đi ngủ mà mèo không bao giờ bị đói.
              </p>
            </div>
          </div>

          {/* Meal Plans Grid */}
          <div className="meal-plans-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MEAL_PLANS_CATALOG.map((plan) => {
              const canAfford = coins >= plan.price;
              const isCurrent = activeMealPlan?.planId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`meal-plan-card p-3 sm:p-4 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                      : 'border-outline-variant/30 bg-surface-container-lowest hover:border-amber-300'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-2xl">{plan.icon}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-xs"
                        style={{ backgroundColor: plan.badgeColor }}
                      >
                        {plan.badge}
                      </span>
                    </div>

                    <h3 className="font-black text-sm sm:text-base text-on-surface">{plan.name}</h3>
                    <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md mt-1">
                      {plan.durationLabel}
                    </span>
                    <p className="text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 mt-1.5">
                      {plan.description}
                    </p>

                    {/* Included Items */}
                    <div className="my-2.5 p-2 rounded-xl bg-surface-container/50 border border-outline-variant/20">
                      <span className="text-[10px] font-bold text-on-surface-variant block mb-1">
                        Khẩu phần dinh dưỡng gồm có:
                      </span>
                      <ul className="flex flex-col gap-1 text-[11px] text-on-surface font-medium">
                        {plan.itemsIncluded.map((itm, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            {itm.image ? (
                              <img src={itm.image} alt={itm.name} className="w-4 h-4 object-contain rounded" />
                            ) : (
                              <span>{itm.icon}</span>
                            )}
                            <span>{itm.quantity}x {itm.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Perks */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        +{formatNumber(plan.xpRewardTotal)} XP ⭐
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        🤖 {plan.autoFeedMealsCount} bữa tự động
                      </span>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500 text-white">
                          -{plan.discountPercent}%
                        </span>
                        <del className="text-[10px] text-slate-400 font-medium">
                          {formatNumber(plan.originalPrice)}
                        </del>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-amber-700">
                        🪙 {formatNumber(plan.price)} Xu
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-95 cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95'
                          : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => handleBuyPlan(plan)}
                      disabled={!canAfford}
                    >
                      {canAfford ? (isCurrent ? 'Gia Hạn 🔄' : 'Đăng Ký 🥣') : 'Thiếu Xu'}
                    </button>
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

export default GrowthUpgradeView;
