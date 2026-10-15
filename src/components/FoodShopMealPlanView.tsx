import React, { useState } from 'react';
import {
  FOOD_SHOP_CATALOG,
  MEAL_PLANS_CATALOG,
  type FoodItem,
  type MealPlan,
} from '../data/foodShop';
import type { ActiveMealPlanInfo } from '../utils/saveGame';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface FoodShopMealPlanViewProps {
  coins: number;
  currentFood: number;
  currentWater: number;
  foodInventory: { [foodId: string]: number };
  activeMealPlan?: ActiveMealPlanInfo | null;
  onBuyFoodToInventory: (item: FoodItem, quantity: number) => boolean;
  onFeedFromInventory: (
    item: FoodItem,
    quantity: number
  ) => {
    success: boolean;
    restoredFood: number;
    restoredWater: number;
    gainedXp: number;
    satietyMinutesAdded?: number;
    satietyDecayReduction?: number;
  };
  onBuyMealPlan: (plan: MealPlan) => boolean;
  onBackToCat: () => void;
}

export const FoodShopMealPlanView: React.FC<FoodShopMealPlanViewProps> = ({
  coins,
  currentFood,
  currentWater,
  foodInventory,
  activeMealPlan,
  onBuyFoodToInventory,
  onFeedFromInventory,
  onBuyMealPlan,
  onBackToCat,
}) => {
  const [subTab, setSubTab] = useState<'individual' | 'inventory' | 'mealPlans'>('individual');
  const [tierFilter, setTierFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);
  const [selectedFeedItem, setSelectedFeedItem] = useState<FoodItem>(FOOD_SHOP_CATALOG[0]);
  const [feedQuantity, setFeedQuantity] = useState<number>(1);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const totalInventoryCount = Object.values(foodInventory).reduce(
    (acc, val) => acc + (val > 0 ? val : 0),
    0
  );

  // Helper: Phân loại món ăn theo cấp độ (Cấp Thấp, Cấp Trung, Cao Cấp)
  const getFoodTierLabel = (item: FoodItem) => {
    if (item.tier === 'low') {
      return {
        label: 'Cấp Thấp 🟢',
        badge: 'Active',
        color: '#10B981',
        desc: 'Online liên tục / Chăm sóc thủ công',
      };
    }
    if (item.tier === 'mid') {
      return {
        label: 'Cấp Trung 🔵',
        badge: 'Kèm Buff',
        color: '#3B82F6',
        desc: 'Buff đói 0% ban đầu & tiêu hóa êm',
      };
    }
    return {
      label: 'Cao Cấp 🟣',
      badge: 'AFK / Ngủ',
      color: '#8B5CF6',
      desc: 'Treo máy / Cho ăn trước khi ngủ',
    };
  };

  const handleBuyToInventory = (item: FoodItem) => {
    const totalCost = item.price * purchaseQuantity;
    if (coins < totalCost) {
      soundManager.playPop();
      showToast(`Không đủ xu! Cần ${formatNumber(totalCost)} xu để mua ${purchaseQuantity}x ${item.name}.`);
      return;
    }

    const ok = onBuyFoodToInventory(item, purchaseQuantity);
    if (ok) {
      showToast(`🛒 Đã mua thành công ${purchaseQuantity}x ${item.name} vào túi đồ ăn!`);
    }
  };

  const handleFeedCat = (item: FoodItem, qty: number) => {
    const available = foodInventory[item.id] || 0;
    if (available < qty) {
      soundManager.playPop();
      showToast(`Không đủ số lượng trong túi! Bạn chỉ có x${available} ${item.name}.`);
      return;
    }

    const res = onFeedFromInventory(item, qty);
    if (res.success) {
      const satietyMins = res.satietyMinutesAdded || (item.satietyMinutes || 8) * qty;
      const durationText = satietyMins >= 60 ? `${Math.round(satietyMins / 60)} giờ` : `${satietyMins} phút`;
      const zeroText = item.zeroDecayMinutes ? ` (🛡️ 0% hao hụt ${item.zeroDecayMinutes * qty}p đầu)` : '';
      showToast(
        `😋 Mèo chén no nê ${qty}x ${item.name}! (+${res.restoredFood}% no, duy trì ${durationText}${zeroText}, +${formatNumber(res.gainedXp)} XP ⭐)`
      );
    }
  };

  const handleBuyPlan = (plan: MealPlan) => {
    if (coins < plan.price) {
      soundManager.playPop();
      showToast(`Không đủ xu! Cần ${formatNumber(plan.price)} xu để kích hoạt ${plan.name}.`);
      return;
    }

    const success = onBuyMealPlan(plan);
    if (success) {
      showToast(`🎉 Đã đăng ký thành công ${plan.name}! Tự động cho ăn khi đói.`);
    }
  };

  return (
    <div className="view-page-container food-shop-meal-view pt-1 sm:pt-4 pb-20 sm:pb-24 max-w-xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 bg-surface-container-lowest/90 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-outline-variant/30 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">🥫</span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-on-surface truncate">Thực Đơn Dinh Dưỡng</h2>
            <p className="hidden sm:block text-[11px] sm:text-xs text-on-surface-variant line-clamp-1">Mua thức ăn trữ vào túi bồi dưỡng mèo cưng</p>
          </div>
        </div>
        <button
          type="button"
          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container text-primary font-bold text-xs shrink-0 cursor-pointer transition-all border border-outline-variant/30"
          onClick={onBackToCat}
          title="Quay lại phòng mèo"
        >
          🐱 Về Mèo
        </button>
      </div>

      {/* Pet Belly & Bag Status Row - 3 ô đồng bộ 1 class */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
        <div className="h-12 sm:h-14 rounded-2xl bg-amber-50/80 border border-amber-200/70 shadow-2xs flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 text-center">
          <span className="text-lg sm:text-xl">🍖</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[9px] sm:text-[10px] text-amber-800 font-bold">Độ No</span>
            <strong className="text-xs sm:text-sm font-black text-amber-950">{Math.round(currentFood)}%</strong>
          </div>
        </div>
        <div className="h-12 sm:h-14 rounded-2xl bg-sky-50/80 border border-sky-200/70 shadow-2xs flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 text-center">
          <span className="text-lg sm:text-xl">💧</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[9px] sm:text-[10px] text-sky-800 font-bold">Độ Khát</span>
            <strong className="text-xs sm:text-sm font-black text-sky-950">{Math.round(currentWater)}%</strong>
          </div>
        </div>
        <div className="h-12 sm:h-14 rounded-2xl bg-purple-50/80 border border-purple-200/70 shadow-2xs flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 text-center">
          <span className="text-lg sm:text-xl">🎒</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[9px] sm:text-[10px] text-purple-800 font-bold">Túi Đồ</span>
            <strong className="text-xs sm:text-sm font-black text-purple-950">{totalInventoryCount} món</strong>
          </div>
        </div>
      </div>

      {/* Subtabs Switcher - Segmented Control 3 cột đều nhau */}
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-gray-100/90 rounded-xl sm:rounded-2xl border border-gray-200/60 mb-2.5 sm:mb-3 select-none">
        <button
          type="button"
          className={`py-1.5 sm:py-2 px-0.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black text-center transition-all cursor-pointer truncate ${
            subTab === 'individual'
              ? 'bg-white text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('individual');
          }}
        >
          🛒 Thức Ăn
        </button>
        <button
          type="button"
          className={`py-1.5 sm:py-2 px-0.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black text-center transition-all cursor-pointer truncate ${
            subTab === 'inventory'
              ? 'bg-white text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('inventory');
          }}
        >
          🎒 Túi Món ({totalInventoryCount})
        </button>
        <button
          type="button"
          className={`py-1.5 sm:py-2 px-0.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black text-center transition-all cursor-pointer truncate ${
            subTab === 'mealPlans'
              ? 'bg-white text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('mealPlans');
          }}
        >
          📋 Kế Hoạch
        </button>
      </div>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="food-action-toast animate-bounce-in">
          {feedbackToast}
        </div>
      )}

      {/* SUBTAB 1: MUA THỨC ĂN VÀO TÚI */}
      {subTab === 'individual' && (
        <div className="individual-food-section">
          {/* Quantity Selector Bar */}
          <div className="food-quantity-selector-bar">
            <span className="qty-label">Chọn số lượng mua vào túi:</span>
            <div className="qty-buttons-group">
              {[1, 5, 10, 20].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  className={`qty-btn ${purchaseQuantity === qty ? 'qty-selected' : ''}`}
                  onClick={() => {
                    soundManager.playPop();
                    setPurchaseQuantity(qty);
                  }}
                >
                  x{qty} Món
                </button>
              ))}
            </div>
          </div>

          {/* Tier Filter Capsule Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 py-1">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                tierFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => {
                soundManager.playPop();
                setTierFilter('all');
              }}
            >
              Tất Cả ({FOOD_SHOP_CATALOG.length})
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                tierFilter === 'low'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              onClick={() => {
                soundManager.playPop();
                setTierFilter('low');
              }}
            >
              <span>🟢</span>
              <span>Cấp Thấp (Active)</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                tierFilter === 'mid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
              onClick={() => {
                soundManager.playPop();
                setTierFilter('mid');
              }}
            >
              <span>🔵</span>
              <span>Cấp Trung (Buff)</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                tierFilter === 'high'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
              onClick={() => {
                soundManager.playPop();
                setTierFilter('high');
              }}
            >
              <span>🟣</span>
              <span>Cao Cấp (AFK)</span>
            </button>
          </div>

          {/* Food Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {FOOD_SHOP_CATALOG.filter((item) => tierFilter === 'all' || item.tier === tierFilter).map((item) => {
              const totalPrice = item.price * purchaseQuantity;
              const canAfford = coins >= totalPrice;
              const ownedCount = foodInventory[item.id] || 0;
              const tierInfo = getFoodTierLabel(item);
              const richnessBonus = 1 + Math.min(1.5, item.price / 3000);
              const totalXp = Math.round(item.xpReward * purchaseQuantity * richnessBonus);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-2.5 sm:p-3 border border-amber-100 shadow-xs flex flex-col justify-between h-full relative"
                >
                  {/* Top Row: Image & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      {item.image ? (
                        <div className="w-12 h-12 rounded-xl bg-amber-50/80 p-1 flex items-center justify-center overflow-hidden border border-amber-100 shadow-2xs shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-xs" />
                        </div>
                      ) : (
                        <span className="text-3xl shrink-0">{item.icon}</span>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white leading-none whitespace-nowrap"
                          style={{ backgroundColor: tierInfo.color }}
                        >
                          {tierInfo.label}
                        </span>
                        <span className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-full font-bold border border-amber-200/60 leading-none whitespace-nowrap">
                          🎒 x{ownedCount}
                        </span>
                      </div>
                    </div>

                    {/* Food Name & Short Description */}
                    <h4 className="text-xs sm:text-sm font-black text-gray-800 line-clamp-1 mb-0.5">{item.name}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 min-h-[30px] leading-tight mb-2">
                      {item.description}
                    </p>

                    {/* Buff Tags */}
                    <div className="flex flex-wrap gap-1 min-h-[36px] content-start mb-2">
                      {item.foodRestore > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
                          +{item.foodRestore * purchaseQuantity}% No 🍖
                        </span>
                      )}
                      {item.waterRestore > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/60">
                          +{item.waterRestore * purchaseQuantity}% Nước 💧
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                        +{formatNumber(totalXp)} XP ⭐
                      </span>
                      {item.buffDescription && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                          🛡️ {item.buffDescription}
                        </span>
                      )}
                      {item.satietyBadgeLabel && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                          ⏳ {item.satietyBadgeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Price & Buy Button (Cố định dưới đáy) */}
                  <div className="pt-2 border-t border-amber-100/70 mt-auto">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs font-black text-amber-900 flex items-center gap-0.5">
                        <span>🪙</span>
                        <span>{formatNumber(totalPrice)}</span>
                      </span>
                      {purchaseQuantity > 1 && (
                        <span className="text-[10px] text-gray-400">({formatNumber(item.price)}/món)</span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                          canAfford
                            ? 'bg-primary text-white shadow-[0_2px_0_#842415] active:translate-y-0.5'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => handleBuyToInventory(item)}
                        disabled={!canAfford}
                      >
                        {canAfford ? `Mua x${purchaseQuantity}` : 'Thiếu Xu'}
                      </button>

                      {ownedCount > 0 && (
                        <button
                          type="button"
                          className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition-all cursor-pointer"
                          onClick={() => handleFeedCat(item, 1)}
                          title="Cho mèo ăn ngay 1 món từ túi"
                        >
                          Ăn 🍽️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TÚI THỨC ĂN & CHỌN LOẠI ĐỂ CHO ĂN */}
      {subTab === 'inventory' && (
        <div className="inventory-feed-section">
          {totalInventoryCount === 0 ? (
            <div className="empty-inventory-box">
              <span className="empty-bag-icon">🎒</span>
              <h3>Túi đồ ăn của bạn đang trống!</h3>
              <p>Bạn chưa có thức ăn dự trữ nào. Hãy ghé Cửa Hàng để mua thức ăn bồi dưỡng cho bé mèo nhé!</p>
              <button
                type="button"
                className="view-back-btn goto-shop-btn"
                onClick={() => setSubTab('individual')}
              >
                🛒 Mua Thức Ăn Ngay
              </button>
            </div>
          ) : (
            <div className="inventory-feed-container">
              {/* Left Column: Owned Items Grid */}
              <div className="owned-items-picker">
                <h3 className="picker-title">Chọn loại thức ăn trong túi:</h3>
                <div className="owned-items-grid">
                  {FOOD_SHOP_CATALOG.filter((item) => (foodInventory[item.id] || 0) > 0).map((item) => {
                    const count = foodInventory[item.id] || 0;
                    const isSelected = selectedFeedItem.id === item.id;
                    const tierInfo = getFoodTierLabel(item);

                    return (
                      <div
                        key={item.id}
                        className={`owned-food-card ${isSelected ? 'owned-card-selected' : ''}`}
                        onClick={() => {
                          soundManager.playPop();
                          setSelectedFeedItem(item);
                          setFeedQuantity(1);
                        }}
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-8 h-8 object-contain shrink-0" />
                        ) : (
                          <span className="owned-card-icon">{item.icon}</span>
                        )}
                        <div className="owned-card-details">
                          <strong className="owned-card-name">{item.name}</strong>
                          <span className="owned-card-tier" style={{ color: tierInfo.color }}>
                            {tierInfo.label}
                          </span>
                        </div>
                        <span className="owned-qty-pill">x{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Feeding Calculator & Action */}
              <div className="feed-calculator-panel">
                <div className="calc-header">
                  {selectedFeedItem.image ? (
                    <img src={selectedFeedItem.image} alt={selectedFeedItem.name} className="w-12 h-12 object-contain shrink-0" />
                  ) : (
                    <span className="calc-icon">{selectedFeedItem.icon}</span>
                  )}
                  <div>
                    <h3 className="calc-name">{selectedFeedItem.name}</h3>
                    <p className="calc-desc">{selectedFeedItem.description}</p>
                  </div>
                </div>

                <div className="calc-inventory-available">
                  <span>Số lượng có trong túi:</span>
                  <strong>x{foodInventory[selectedFeedItem.id] || 0} món</strong>
                </div>

                {/* Quantity Stepper */}
                <div className="feed-stepper-row">
                  <span className="stepper-label">Số lượng cho ăn:</span>
                  <div className="stepper-controls">
                    <button
                      type="button"
                      className="stepper-btn"
                      disabled={feedQuantity <= 1}
                      onClick={() => setFeedQuantity((q) => Math.max(1, q - 1))}
                    >
                      -
                    </button>
                    <span className="stepper-val">{feedQuantity}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      disabled={feedQuantity >= (foodInventory[selectedFeedItem.id] || 1)}
                      onClick={() =>
                        setFeedQuantity((q) =>
                          Math.min(foodInventory[selectedFeedItem.id] || 1, q + 1)
                        )
                      }
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="feed-max-btn"
                    onClick={() => setFeedQuantity(foodInventory[selectedFeedItem.id] || 1)}
                  >
                    Ăn Hết (x{foodInventory[selectedFeedItem.id] || 1})
                  </button>
                </div>

                {/* Nutritional Gains Breakdown */}
                {(() => {
                  const richnessBonus = 1 + Math.min(1.5, selectedFeedItem.price / 3000);
                  const totalFoodGain = selectedFeedItem.foodRestore * feedQuantity;
                  const totalWaterGain = selectedFeedItem.waterRestore * feedQuantity;
                  const totalXpGain = Math.round(selectedFeedItem.xpReward * feedQuantity * richnessBonus);
                  const expectedFood = Math.min(100, Math.round(currentFood + totalFoodGain));
                  const expectedWater = Math.min(100, Math.round(currentWater + totalWaterGain));

                  return (
                    <div className="calc-breakdown-card">
                      <h4 className="breakdown-title">Hiệu Quả Dinh Dưỡng Theo Độ Đắt:</h4>
                      <div className="breakdown-stats">
                        <div className="breakdown-item">
                          <span>🍖 Hồi phục độ no:</span>
                          <strong>
                            +{totalFoodGain}% ({Math.round(currentFood)}% ➔ {expectedFood}%)
                          </strong>
                        </div>
                        <div className="breakdown-item">
                          <span>💧 Hồi phục giải khát:</span>
                          <strong>
                            +{totalWaterGain}% ({Math.round(currentWater)}% ➔ {expectedWater}%)
                          </strong>
                        </div>
                        <div className="breakdown-item xp-highlight">
                          <span>⭐ Thưởng điểm XP:</span>
                          <strong>
                            +{formatNumber(totalXpGain)} XP (Độ đắt x{richnessBonus.toFixed(2)})
                          </strong>
                        </div>
                        {selectedFeedItem.satietyMinutes && (
                          <div className="breakdown-item" style={{ color: '#7E22CE' }}>
                            <span>⏳ Thời gian duy trì no:</span>
                            <strong>
                              +{selectedFeedItem.satietyMinutes * feedQuantity >= 60
                                ? `${Math.floor((selectedFeedItem.satietyMinutes * feedQuantity) / 60)}h ${(selectedFeedItem.satietyMinutes * feedQuantity) % 60}p`
                                : `${selectedFeedItem.satietyMinutes * feedQuantity} phút`}
                              {selectedFeedItem.zeroDecayMinutes ? ` (0% hao hụt ${selectedFeedItem.zeroDecayMinutes * feedQuantity}p đầu)` : ''}
                            </strong>
                          </div>
                        )}
                        {selectedFeedItem.buffDescription && (
                          <div className="breakdown-item" style={{ color: '#2563EB' }}>
                            <span>🛡️ Hiệu ứng buff:</span>
                            <strong>{selectedFeedItem.buffDescription}</strong>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="feed-now-action-btn"
                        onClick={() => handleFeedCat(selectedFeedItem, feedQuantity)}
                        disabled={(foodInventory[selectedFeedItem.id] || 0) < feedQuantity}
                      >
                        🍽️ Cho Mèo Ăn {feedQuantity}x {selectedFeedItem.name}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MEAL PLANS (KẾ HOẠCH DINH DƯỠNG) */}
      {subTab === 'mealPlans' && (
        <div className="meal-plans-section">
          {/* Active Plan Status Banner */}
          {activeMealPlan && (
            <div className="active-plan-banner">
              <div className="active-plan-icon">👑</div>
              <div className="active-plan-info">
                <h4>Đang áp dụng: {activeMealPlan.planName}</h4>
                <p>
                  Còn lại: <strong>{activeMealPlan.autoFeedMealsRemaining} bữa ăn tự động</strong> dự trữ.
                  Khi độ no hoặc khát giảm dưới 30%, hệ thống tự động bồi bổ cho mèo!
                </p>
              </div>
              <span className="active-plan-badge">Đang chạy 🟢</span>
            </div>
          )}

          <div className="plans-intro-box">
            <h4>💡 Mua thức ăn theo kế hoạch là gì?</h4>
            <p>
              Gói kế hoạch kết hợp các món ăn giàu dinh dưỡng với <strong>chiết khấu giảm giá lên đến 30%</strong>,
              tặng kèm hàng chục ngàn XP thăng cấp level và kích hoạt tính năng <strong>Tự động cho ăn khi đói</strong>,
              giúp mèo của bạn không bao giờ sụt giảm năng lượng bắt cá!
            </p>
          </div>

          {/* Meal Plans Grid */}
          <div className="meal-plans-grid">
            {MEAL_PLANS_CATALOG.map((plan) => {
              const canAfford = coins >= plan.price;
              const isCurrent = activeMealPlan?.planId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`meal-plan-card ${isCurrent ? 'plan-currently-active' : ''}`}
                >
                  <div className="plan-card-header">
                    <span className="plan-icon">{plan.icon}</span>
                    <span
                      className="plan-badge-pill"
                      style={{ backgroundColor: plan.badgeColor }}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  <h3 className="plan-name">{plan.name}</h3>
                  <span className="plan-duration-tag">{plan.durationLabel}</span>
                  <p className="plan-desc">{plan.description}</p>

                  {/* Included Items */}
                  <div className="plan-included-items">
                    <span className="included-title">Khẩu phần gồm có:</span>
                    <ul className="included-list">
                      {plan.itemsIncluded.map((itm, i) => (
                        <li key={i} className="included-item-bullet flex items-center gap-1.5">
                          {itm.image ? (
                            <img src={itm.image} alt={itm.name} className="w-5 h-5 object-contain inline-block rounded" />
                          ) : (
                            <span>{itm.icon}</span>
                          )}
                          <span>{itm.quantity}x {itm.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan Buffs */}
                  <div className="plan-buffs-row">
                    <span className="buff-chip xp-chip">+{formatNumber(plan.xpRewardTotal)} XP ⭐</span>
                    <span className="buff-chip auto-feed-chip">
                      🤖 {plan.autoFeedMealsCount} bữa tự động
                    </span>
                  </div>

                  {/* Pricing and Action */}
                  <div className="plan-card-footer">
                    <div className="plan-price-block">
                      <span className="discount-tag">-{plan.discountPercent}%</span>
                      <del className="original-price">{formatNumber(plan.originalPrice)} Xu</del>
                      <strong className="final-price">🪙 {formatNumber(plan.price)} Xu</strong>
                    </div>

                    <button
                      type="button"
                      className={`buy-plan-action-btn ${canAfford ? 'can-buy' : 'cannot-buy'}`}
                      onClick={() => handleBuyPlan(plan)}
                      disabled={!canAfford}
                    >
                      {canAfford ? (isCurrent ? 'Gia Hạn Kế Hoạch 🔄' : 'Đăng Ký Gói 🥣') : 'Thiếu Xu'}
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
