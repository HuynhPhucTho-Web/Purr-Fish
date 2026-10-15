import React from 'react';
import { FOOD_SHOP_CATALOG, type FoodItem } from '../data/foodShop';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface FoodShopModalProps {
  coins: number;
  currentFood: number;
  currentWater: number;
  onBuyAndFeed: (item: FoodItem) => boolean;
  onClose: () => void;
}

export const FoodShopModal: React.FC<FoodShopModalProps> = ({
  coins,
  currentFood,
  currentWater,
  onBuyAndFeed,
  onClose,
}) => {
  const handleBuy = (item: FoodItem) => {
    if (coins < item.price) {
      soundManager.playPop();
      return;
    }
    onBuyAndFeed(item);
  };

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal-card food-shop-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🥫</span>
            <div>
              <h3>Cửa Hàng Thức Ăn Cho Mèo</h3>
              <p className="modal-subtext">Mua thức ăn cao cấp để mèo lớn nhanh và thăng cấp level!</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Status Bar: Coins & Pet Belly */}
        <div className="food-shop-status-bar">
          <div className="status-item coins-stat">
            <span className="stat-icon">🪙</span>
            <span className="stat-val">{formatNumber(coins)} Xu</span>
          </div>
          <div className="status-item belly-stat">
            <span className="stat-icon">🍖</span>
            <span className="stat-val">Độ No: {Math.round(currentFood)}%</span>
          </div>
          <div className="status-item water-stat">
            <span className="stat-icon">💧</span>
            <span className="stat-val">Độ Khát: {Math.round(currentWater)}%</span>
          </div>
        </div>

        <div className="modal-body food-shop-body">
          <div className="food-items-grid">
            {FOOD_SHOP_CATALOG.map((item) => {
              const canAfford = coins >= item.price;

              return (
                <div key={item.id} className="food-item-card">
                  <div className="food-card-top">
                    {item.image ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-50 p-1 flex items-center justify-center overflow-hidden border border-amber-200 shadow-2xs shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <span className="food-item-icon">{item.icon}</span>
                    )}
                    <span
                      className="growth-speed-badge"
                      style={{ background: item.speedBadgeColor }}
                    >
                      {item.tierLabel || item.growthSpeedLabel}
                    </span>
                  </div>

                  <div className="food-card-info">
                    <h4 className="food-item-name">{item.name}</h4>
                    <p className="food-item-desc">{item.description}</p>
                  </div>

                  <div className="food-buffs-row">
                    {item.foodRestore > 0 && (
                      <span className="buff-tag food-buff">+{item.foodRestore}% No 🍖</span>
                    )}
                    {item.waterRestore > 0 && (
                      <span className="buff-tag water-buff">+{item.waterRestore}% Nước 💧</span>
                    )}
                    <span className="buff-tag xp-buff">+{formatNumber(item.xpReward)} XP ⭐</span>
                    {item.buffDescription && (
                      <span className="buff-tag" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        🛡️ {item.buffDescription}
                      </span>
                    )}
                    {item.satietyBadgeLabel && (
                      <span className="buff-tag" style={{ background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>
                        ⏳ {item.satietyBadgeLabel}
                      </span>
                    )}
                  </div>

                  <div className="food-card-footer">
                    <div className="food-price-tag">
                      <span className="price-coin">🪙</span>
                      <strong className="price-number">{formatNumber(item.price)}</strong>
                    </div>

                    <button
                      type="button"
                      className={`food-buy-btn ${canAfford ? 'can-buy' : 'cannot-buy'}`}
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                    >
                      {canAfford ? 'Mua & Cho Ăn 🥣' : 'Thiếu Xu'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="food-shop-footer-tip">
          <p>
            💡 <strong>Mẹo chăm mèo:</strong> Thức ăn càng cao cấp (như Món Ngon Đặc Biệt, Thức Ăn Cao Cấp) thì cho lượng XP tăng trưởng càng khổng lồ, giúp mèo thăng cấp Level và tiến hóa vù vù!
          </p>
        </div>
      </div>
    </div>
  );
};
