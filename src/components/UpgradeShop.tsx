import React from 'react';
import { UPGRADES } from '../data/upgrades';
import { calculateUpgradeCost, formatNumber } from '../utils/economy';

interface UpgradeShopProps {
  fish: number;
  upgrades: { [id: string]: number };
  onBuyUpgrade: (upgradeId: string) => void;
  onClose?: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({
  fish,
  upgrades,
  onBuyUpgrade,
  onClose,
}) => {
  return (
    <div className="shop-section">
      <div className="section-header">
        <div className="section-title-wrap">
          <span className="section-icon">🛒</span>
          <div>
            <h2 className="section-title">Cửa Hàng Nâng Cấp</h2>
            <p className="section-subtitle">Tăng sức mạnh bắt cá và mở khóa tính năng tự động</p>
          </div>
        </div>
        {onClose && (
          <button type="button" className="close-section-btn" onClick={onClose} aria-label="Đóng cửa hàng">
            ✕
          </button>
        )}
      </div>

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
                    <span>{item.effectDescription(currentLevel)} ➔ <strong>{item.nextEffectDescription(currentLevel)}</strong></span>
                  ) : (
                    <span>Mở khóa: <strong>{item.nextEffectDescription(0)}</strong></span>
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
                  <span className="buy-fish-icon">🐟</span>
                  <span className="buy-cost-text">{formatNumber(cost)}</span>
                  <span className="buy-label">Nâng cấp</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
