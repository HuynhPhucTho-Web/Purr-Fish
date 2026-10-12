import React, { useState, useMemo } from 'react';
import type { CaughtFishItem } from '../data/fishes';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface FishBasketViewProps {
  basket: CaughtFishItem[];
  fish: number; // coins
  onSellFish: (instanceId: string) => number;
  onSellAllFish: () => { count: number; totalEarned: number };
  onOpenPond: () => void;
  onBackToCat: () => void;
}

const ITEMS_PER_PAGE = 8;

export const FishBasketView: React.FC<FishBasketViewProps> = ({
  basket = [],
  fish,
  onSellFish,
  onSellAllFish,
  onOpenPond,
  onBackToCat,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOption, setSortOption] = useState<'newest' | 'heaviest' | 'value' | 'rarity'>('newest');

  // Safe basket calculations
  const safeBasket = useMemo(() => (Array.isArray(basket) ? basket : []), [basket]);
  const totalWeight = useMemo(
    () => +safeBasket.reduce((sum, f) => sum + (f.weightKg || 0), 0).toFixed(1),
    [safeBasket]
  );
  const totalValue = useMemo(
    () => safeBasket.reduce((sum, f) => sum + (f.sellPrice || 0), 0),
    [safeBasket]
  );

  // Sorting
  const sortedBasket = useMemo(() => {
    const list = [...safeBasket];
    switch (sortOption) {
      case 'heaviest':
        return list.sort((a, b) => (b.weightKg || 0) - (a.weightKg || 0));
      case 'value':
        return list.sort((a, b) => (b.sellPrice || 0) - (a.sellPrice || 0));
      case 'rarity': {
        const rankMap: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
        return list.sort((a, b) => (rankMap[b.rarity] || 0) - (rankMap[a.rarity] || 0));
      }
      case 'newest':
      default:
        return list; // Caught order
    }
  }, [safeBasket, sortOption]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedBasket.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedFish = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return sortedBasket.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedBasket, validCurrentPage]);

  const handleSellOne = (instanceId: string) => {
    onSellFish(instanceId);
  };

  const handleSellAll = () => {
    if (safeBasket.length === 0) return;
    onSellAllFish();
    setCurrentPage(1);
  };

  return (
    <div className="view-page-container paginated-basket-section">
      {/* Top Header */}
      <div className="view-header-bar">
        <div className="view-title-wrap">
          <span className="view-title-icon">🧺</span>
          <div>
            <h2 className="view-title">Giỏ Cá & Chợ Bán Cá</h2>
            <p className="view-subtitle">Cân ký và bán cá tươi lấy Xu Vàng mua đồ ăn cho mèo</p>
          </div>
        </div>
        <div className="view-header-actions-group">
          <button
            type="button"
            className="go-to-pond-btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '10px' }}
            onClick={onOpenPond}
            title="Vào bể cá săn mồi"
          >
            🐠 Vào Bể Săn Cá
          </button>
          <button type="button" className="view-back-btn" onClick={onBackToCat} title="Quay lại phòng mèo">
            🐱 Về Mèo
          </button>
        </div>
      </div>

      {/* Basket Overview Card */}
      <div className="basket-overview-card">
        <div className="overview-stats-grid">
          <div className="stat-box">
            <span className="stat-label">Cá trong giỏ</span>
            <strong className="stat-number">{safeBasket.length} con</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Tổng khối lượng</span>
            <strong className="stat-number">{totalWeight} kg</strong>
          </div>
          <div className="stat-box highlight-gold">
            <span className="stat-label">Giá trị ước tính</span>
            <strong className="stat-number">🪙 {formatNumber(totalValue)} Xu</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Xu đang có</span>
            <strong className="stat-number">🪙 {formatNumber(fish)}</strong>
          </div>
        </div>

        <button
          type="button"
          className="sell-all-big-btn"
          onClick={handleSellAll}
          disabled={safeBasket.length === 0}
        >
          💰 Bán Tất Cả Lấy {formatNumber(totalValue)} Xu Vàng
        </button>
      </div>

      {/* Sort & Filter Controls */}
      {safeBasket.length > 0 && (
        <div className="basket-filter-bar">
          <span className="filter-title">Sắp xếp danh sách:</span>
          <div className="sort-buttons-row">
            <button
              type="button"
              className={`sort-pill ${sortOption === 'newest' ? 'sort-active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                setSortOption('newest');
              }}
            >
              Mới nhất 🕒
            </button>
            <button
              type="button"
              className={`sort-pill ${sortOption === 'heaviest' ? 'sort-active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                setSortOption('heaviest');
              }}
            >
              Nặng nhất ⚖️
            </button>
            <button
              type="button"
              className={`sort-pill ${sortOption === 'value' ? 'sort-active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                setSortOption('value');
              }}
            >
              Giá cao 🪙
            </button>
            <button
              type="button"
              className={`sort-pill ${sortOption === 'rarity' ? 'sort-active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                setSortOption('rarity');
              }}
            >
              Độ hiếm ⭐
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {safeBasket.length === 0 ? (
        <div className="basket-empty-box">
          <div className="empty-illustration">🎣</div>
          <h3>Giỏ cá hiện đang trống!</h3>
          <p>Mèo đang đói bụng đấy! Hãy vào Bể Cá Săn Mồi để thò móng vuốt vồ cá tươi về bán lấy tiền nhé.</p>
          <button
            type="button"
            className="go-to-pond-btn"
            onClick={onOpenPond}
          >
            🐠 Vào Bể Cá Săn Mồi Ngay
          </button>
        </div>
      ) : (
        <>
          {/* Paginated Fish Grid */}
          <div className="basket-grid-paginated">
            {displayedFish.map((item) => (
              <div key={item.instanceId} className="paginated-fish-item-card">
                <div className="fish-img-container">
                  <img src={item.image} alt={item.name} className="basket-fish-photo" />
                  <span
                    className="rarity-badge-corner"
                    style={{ backgroundColor: item.rarityColor }}
                  >
                    {item.rarity.toUpperCase()}
                  </span>
                </div>

                <div className="fish-info-details">
                  <h4 className="fish-item-title">{item.name}</h4>
                  <div className="fish-weight-line">
                    <span className="weight-tag">⚖️ {item.weightKg} kg</span>
                  </div>
                  <div className="fish-value-line">
                    <span className="coin-icon">🪙</span>
                    <strong className="sell-price-num">{formatNumber(item.sellPrice)} Xu</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="sell-single-fish-btn"
                  onClick={() => handleSellOne(item.instanceId)}
                  title={`Bán lấy ${formatNumber(item.sellPrice)} xu`}
                >
                  Bán Lẻ 🪙
                </button>
              </div>
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="pagination-controls-row">
              <button
                type="button"
                className="page-nav-btn prev-btn"
                disabled={validCurrentPage <= 1}
                onClick={() => {
                  soundManager.playPop();
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
              >
                ⬅️ Trang Trước
              </button>

              <div className="page-numbers-group">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={`page-num-btn ${pageNum === validCurrentPage ? 'page-active' : ''}`}
                      onClick={() => {
                        soundManager.playPop();
                        setCurrentPage(pageNum);
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="page-nav-btn next-btn"
                disabled={validCurrentPage >= totalPages}
                onClick={() => {
                  soundManager.playPop();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
              >
                Trang Sau ➡️
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
