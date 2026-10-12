import React from 'react';
import type { CaughtFishItem } from '../data/fishes';
import { formatNumber } from '../utils/economy';

interface FishBasketModalProps {
  basket: CaughtFishItem[];
  onSellFish: (instanceId: string) => number;
  onSellAllFish: () => { count: number; totalEarned: number };
  onOpenPond?: () => void;
  onClose: () => void;
}

export const FishBasketModal: React.FC<FishBasketModalProps> = ({
  basket,
  onSellFish,
  onSellAllFish,
  onOpenPond,
  onClose,
}) => {
  const totalWeight = +(basket.reduce((sum, f) => sum + f.weightKg, 0)).toFixed(1);
  const totalValue = basket.reduce((sum, f) => sum + f.sellPrice, 0);

  const handleSellOne = (instanceId: string) => {
    onSellFish(instanceId);
  };

  const handleSellAll = () => {
    if (basket.length === 0) return;
    onSellAllFish();
  };

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal-card fish-basket-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🧺</span>
            <div>
              <h3>Giỏ Cá & Chợ Bán Cá</h3>
              <p className="modal-subtext">Cân ký và bán cá tươi lấy Xu Vàng mua đồ ăn cho mèo</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Basket Summary Banner */}
        <div className="basket-summary-banner">
          <div className="basket-stats-row">
            <div className="b-stat-item">
              <span className="b-stat-label">Số lượng cá:</span>
              <strong className="b-stat-value">{basket.length} con</strong>
            </div>
            <div className="b-stat-item">
              <span className="b-stat-label">Tổng trọng lượng:</span>
              <strong className="b-stat-value">{totalWeight} kg</strong>
            </div>
            <div className="b-stat-item highlight-coins">
              <span className="b-stat-label">Tổng giá trị:</span>
              <strong className="b-stat-value">🪙 {formatNumber(totalValue)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="sell-all-basket-btn"
            onClick={handleSellAll}
            disabled={basket.length === 0}
          >
            💰 Bán Tất Cả Lấy {formatNumber(totalValue)} Xu
          </button>
        </div>

        <div className="modal-body fish-basket-body">
          {basket.length === 0 ? (
            <div className="empty-basket-state">
              <div className="empty-basket-icon">🎣</div>
              <h4>Giỏ cá hiện đang trống!</h4>
              <p>Mèo đang đói bụng đấy! Hãy thò tay vào Bể Cá Săn Mồi để câu cá tươi về bán lấy tiền nhé.</p>
              {onOpenPond && (
                <button
                  type="button"
                  className="go-fishing-btn"
                  onClick={() => {
                    onClose();
                    onOpenPond();
                  }}
                >
                  🐠 Vào Bể Cá Săn Mồi Ngay
                </button>
              )}
            </div>
          ) : (
            <div className="basket-fish-grid">
              {basket.map((item) => (
                <div key={item.instanceId} className="basket-fish-card">
                  <div className="b-card-img-wrap">
                    <img src={item.image} alt={item.name} className="b-fish-img" />
                    <span
                      className="b-rarity-pill"
                      style={{ background: item.rarityColor }}
                    >
                      {item.rarityLabel}
                    </span>
                  </div>

                  <div className="b-fish-details">
                    <h4 className="b-fish-name">{item.name}</h4>
                    <div className="b-fish-metrics">
                      <span className="metric-weight">⚖️ <strong>{item.weightKg}</strong> kg</span>
                      <span className="metric-diff">({item.difficultyLabel})</span>
                    </div>
                  </div>

                  <div className="b-card-action">
                    <div className="b-price-tag">
                      <span>🪙</span>
                      <strong>{formatNumber(item.sellPrice)}</strong>
                    </div>
                    <button
                      type="button"
                      className="sell-single-btn"
                      onClick={() => handleSellOne(item.instanceId)}
                    >
                      Bán Cá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="basket-footer-tip">
          <p>
            💡 <strong>Quy luật thị trường:</strong> Cá càng to và càng nặng ký thì giá bán càng cao ngất ngưởng! Hãy kiên nhẫn săn những con cá đại dương khổng lồ.
          </p>
        </div>
      </div>
    </div>
  );
};
