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
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);
  const [selectedFeedItem, setSelectedFeedItem] = useState<FoodItem>(FOOD_SHOP_CATALOG[0]);
  const [feedQuantity, setFeedQuantity] = useState<number>(1);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const totalInventoryCount = Object.values(foodInventory).reduce(
    (acc, val) => acc + (val > 0 ? val : 0),
    0
  );

  // Helper: Độ đắt / Phẩm cấp thức ăn
  const getFoodTierLabel = (price: number) => {
    if (price < 100) return { label: 'Bình Dân 🥣', color: '#9CA3AF', bonus: '1.0x' };
    if (price < 500) return { label: 'Hảo Hạng 🐟', color: '#10B981', bonus: '1.15x' };
    if (price < 3000) return { label: 'Thượng Hạng 🥫', color: '#3B82F6', bonus: '1.6x' };
    return { label: 'Đế Vương Xa Xỉ 👑', color: '#EC4899', bonus: '2.5x' };
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
      showToast(
        `😋 Mèo chén no nê ${qty}x ${item.name}! (+${res.restoredFood}% no, +${res.restoredWater}% nước, +${formatNumber(res.gainedXp)} XP ⭐)`
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
    <div className="view-page-container food-shop-meal-view">
      {/* Header */}
      <div className="view-header-bar">
        <div className="view-title-wrap">
          <span className="view-title-icon">🥫</span>
          <div>
            <h2 className="view-title">Thực Đơn, Túi Thức Ăn & Dinh Dưỡng</h2>
            <p className="view-subtitle">Mua thức ăn theo số lượng, trữ vào túi và bồi dưỡng mèo cưng</p>
          </div>
        </div>
        <button type="button" className="view-back-btn" onClick={onBackToCat} title="Quay lại phòng mèo">
          🐱 Về Mèo
        </button>
      </div>

      {/* Pet Belly & Coins Status Row */}
      <div className="food-status-cards-row">
        {/* <div className="f-status-card coins-card">
          <span className="f-stat-icon">🪙</span>
          <div>
            <span className="f-stat-label">Xu tích lũy</span>
            <strong className="f-stat-val">{formatNumber(coins)}</strong>
          </div>
        </div> */}
        <div className="f-status-card hunger-card">
          <span className="f-stat-icon">🍖</span>
          <div>
            {/* <span className="f-stat-label">Độ No</span> */}
            <strong className="f-stat-val">{Math.round(currentFood)}%</strong>
          </div>
        </div>
        <div className="f-status-card thirst-card">
          <span className="f-stat-icon">💧</span>
          <div>
            {/* <span className="f-stat-label">Độ Khát</span> */}
            <strong className="f-stat-val">{Math.round(currentWater)}%</strong>
          </div>
        </div>
        <div className="f-status-card bag-card">
          <span className="f-stat-icon">🎒</span>
          <div>
            {/* <span className="f-stat-label">Túi Đồ Ăn</span> */}
            <strong className="f-stat-val">{totalInventoryCount} món</strong>
          </div>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="view-subtabs-nav">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'individual' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('individual');
          }}
        >
          🛒 Thức Ăn
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'inventory' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('inventory');
          }}
        >
          🎒 Chi tiết món ({totalInventoryCount})
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'mealPlans' ? 'subtab-active' : ''}`}
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

          {/* Food Cards Grid */}
          <div className="food-catalog-grid">
            {FOOD_SHOP_CATALOG.map((item) => {
              const totalPrice = item.price * purchaseQuantity;
              const canAfford = coins >= totalPrice;
              const ownedCount = foodInventory[item.id] || 0;
              const tierInfo = getFoodTierLabel(item.price);
              const richnessBonus = 1 + Math.min(1.5, item.price / 3000);
              const totalXp = Math.round(item.xpReward * purchaseQuantity * richnessBonus);

              return (
                <div key={item.id} className="food-catalog-card">
                  <div className="food-card-top-row">
                    {item.image ? (
                      <div className="w-12 h-12 rounded-xl bg-amber-50 p-1 flex items-center justify-center overflow-hidden border border-amber-200 shadow-2xs shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-xs" />
                      </div>
                    ) : (
                      <span className="food-icon-big">{item.icon}</span>
                    )}
                    <div className="food-badges-wrap">
                      <span
                        className="speed-growth-badge"
                        style={{ backgroundColor: tierInfo.color }}
                      >
                        {tierInfo.label}
                      </span>
                      <span className="owned-inventory-badge">
                        🎒 Đang có: <strong>x{ownedCount}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="food-card-body">
                    <h4 className="food-name">{item.name}</h4>
                    <p className="food-desc-text">{item.description}</p>

                    <div className="food-stat-buffs">
                      {item.foodRestore > 0 && (
                        <span className="f-buff-pill food-pill">
                          +{item.foodRestore * purchaseQuantity}% No 🍖
                        </span>
                      )}
                      {item.waterRestore > 0 && (
                        <span className="f-buff-pill water-pill">
                          +{item.waterRestore * purchaseQuantity}% Nước 💧
                        </span>
                      )}
                      <span className="f-buff-pill xp-pill" title={`Hệ số độ đắt ${tierInfo.bonus}`}>
                        +{formatNumber(totalXp)} XP ⭐
                      </span>
                    </div>
                  </div>

                  <div className="food-card-bottom-row">
                    <div className="item-price-display">
                      <span className="coin-sign">🪙</span>
                      <strong className="item-cost-text">{formatNumber(totalPrice)}</strong>
                      {purchaseQuantity > 1 && (
                        <span className="cost-per-unit">({formatNumber(item.price)}/món)</span>
                      )}
                    </div>

                    <div className="food-card-actions-group">
                      <button
                        type="button"
                        className={`buy-food-submit-btn ${canAfford ? 'can-buy' : 'cannot-buy'}`}
                        onClick={() => handleBuyToInventory(item)}
                        disabled={!canAfford}
                      >
                        {canAfford ? `Mua x${purchaseQuantity} 🛒` : 'Thiếu Xu'}
                      </button>

                      {ownedCount > 0 && (
                        <button
                          type="button"
                          className="quick-feed-from-card-btn"
                          onClick={() => handleFeedCat(item, 1)}
                          title="Cho mèo ăn ngay 1 món từ túi"
                        >
                          Cho Ăn 🍽️
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
                    const tierInfo = getFoodTierLabel(item.price);

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
