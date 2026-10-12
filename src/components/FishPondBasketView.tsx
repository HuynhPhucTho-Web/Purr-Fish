import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FISH_CATALOG, type FishSpecies, type CaughtFishItem } from '../data/fishes';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface ActiveSwimmingFish {
  instanceId: string;
  species: FishSpecies;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  facingRight: boolean;
  wiggleOffset: number;
  isCaught: boolean;
  caughtTime?: number;
}

interface WaterSplash {
  id: string;
  x: number;
  y: number;
}

interface FishPondBasketViewProps {
  fish: number; // coins
  basket: CaughtFishItem[];
  defaultSubTab?: 'pond' | 'basket';
  onCatchFish: (species: FishSpecies) => CaughtFishItem;
  onSellFish: (instanceId: string) => number;
  onSellAllFish: () => { count: number; totalEarned: number };
  onBackToCat: () => void;
}

const ITEMS_PER_PAGE = 8;

export const FishPondBasketView: React.FC<FishPondBasketViewProps> = ({
  fish,
  basket = [],
  defaultSubTab = 'pond',
  onCatchFish,
  onSellFish,
  onSellAllFish,
  onBackToCat,
}) => {
  const [subTab, setSubTab] = useState<'pond' | 'basket'>(defaultSubTab);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOption, setSortOption] = useState<'newest' | 'heaviest' | 'value' | 'rarity'>('newest');

  // Swimming fish pond state
  const pondRef = useRef<HTMLDivElement>(null);
  const [swimmingFish, setSwimmingFish] = useState<ActiveSwimmingFish[]>([]);
  const [pawPos, setPawPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPouncing, setIsPouncing] = useState(false);
  const [splashes, setSplashes] = useState<WaterSplash[]>([]);
  const [catchToast, setCatchToast] = useState<{ text: string; sub: string } | null>(null);

  // Initialize swimming fish school
  useEffect(() => {
    const initialSchool: ActiveSwimmingFish[] = [];
    const count = Math.min(7, Math.max(4, FISH_CATALOG.length));

    for (let i = 0; i < count; i++) {
      const species = FISH_CATALOG[i % FISH_CATALOG.length];
      const facingRight = Math.random() > 0.5;
      const speedMag = (0.18 + species.speed * 0.12) * (facingRight ? 1 : -1);

      initialSchool.push({
        instanceId: `fish_${Date.now()}_${i}_${Math.random()}`,
        species,
        x: 10 + Math.random() * 80,
        y: 15 + Math.random() * 65,
        vx: speedMag,
        vy: (Math.random() - 0.5) * 0.15,
        rotation: facingRight ? 0 : 180,
        facingRight,
        wiggleOffset: Math.random() * 100,
        isCaught: false,
      });
    }

    setSwimmingFish(initialSchool);
  }, []);

  // Physics animation loop for pond
  useEffect(() => {
    if (subTab !== 'pond') return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(50, currentTime - lastTime) / 16.67;
      lastTime = currentTime;

      setSwimmingFish((prevList) => {
        return prevList.map((f) => {
          if (f.isCaught) return f;

          let nx = f.x + f.vx * dt;
          let ny = f.y + (f.vy + Math.sin(currentTime * 0.003 + f.wiggleOffset) * 0.08) * dt;
          let nvx = f.vx;
          let nvy = f.vy;
          let nFacing = f.facingRight;

          if (nx < 6) {
            nx = 6;
            nvx = Math.abs(nvx);
            nFacing = true;
          } else if (nx > 92) {
            nx = 92;
            nvx = -Math.abs(nvx);
            nFacing = false;
          }

          if (ny < 12) {
            ny = 12;
            nvy = Math.abs(nvy);
          } else if (ny > 84) {
            ny = 84;
            nvy = -Math.abs(nvy);
          }

          return {
            ...f,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy,
            facingRight: nFacing,
            rotation: nFacing ? 0 : 180,
          };
        });
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [subTab]);

  // Pond click/pounce handler
  const handlePondClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pondRef.current) return;
    const rect = pondRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    setPawPos({ x: clickX, y: clickY });
    setIsPouncing(true);
    setTimeout(() => setIsPouncing(false), 260);

    const splashId = `splash_${Date.now()}`;
    setSplashes((prev) => [...prev.slice(-8), { id: splashId, x: clickX, y: clickY }]);
    setTimeout(() => {
      setSplashes((prev) => prev.filter((s) => s.id !== splashId));
    }, 600);

    // Hit-test against swimming fish
    const hitRadius = 14;
    const hitFish = swimmingFish.find((f) => {
      if (f.isCaught) return false;
      const dx = f.x - clickX;
      const dy = f.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) < hitRadius;
    });

    if (hitFish) {
      const caughtItem = onCatchFish(hitFish.species);

      setCatchToast({
        text: `Đã vồ trúng ${caughtItem.name}! (${caughtItem.weightKg} kg)`,
        sub: `+${formatNumber(caughtItem.sellPrice)} Xu tiềm năng • Cho vào giỏ 🧺`,
      });
      setTimeout(() => setCatchToast(null), 2500);

      // Mark caught and respawn fish
      setSwimmingFish((prev) =>
        prev.map((f) => (f.instanceId === hitFish.instanceId ? { ...f, isCaught: true } : f))
      );

      setTimeout(() => {
        const randSpecies = FISH_CATALOG[Math.floor(Math.random() * FISH_CATALOG.length)];
        const facingRight = Math.random() > 0.5;
        const newFish: ActiveSwimmingFish = {
          instanceId: `fish_respawn_${Date.now()}_${Math.random()}`,
          species: randSpecies,
          x: facingRight ? 8 : 90,
          y: 20 + Math.random() * 60,
          vx: (0.18 + randSpecies.speed * 0.12) * (facingRight ? 1 : -1),
          vy: (Math.random() - 0.5) * 0.15,
          rotation: facingRight ? 0 : 180,
          facingRight,
          wiggleOffset: Math.random() * 100,
          isCaught: false,
        };
        setSwimmingFish((prev) => [...prev.filter((f) => !f.isCaught), newFish]);
      }, 1200);
    } else {
      soundManager.playPop(0.85);
    }
  };

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
    <div className="view-page-container fishing-basket-view">
      {/* Top Header Row with Return & Sub-tabs */}
      <div className="view-header-bar">
        <div className="view-title-wrap">
          <span className="view-title-icon">🎣</span>
          <div>
            <h2 className="view-title">Bể Câu Cá & Giỏ Cá</h2>
            <p className="view-subtitle">Thò móng vuốt bắt cá tươi và bán cá kiếm Xu Vàng</p>
          </div>
        </div>
        <button type="button" className="view-back-btn" onClick={onBackToCat} title="Quay lại phòng mèo">
          🐱 Về Mèo
        </button>
      </div>

      {/* Subtabs Switcher */}
      <div className="view-subtabs-nav">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'pond' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('pond');
          }}
        >
          🐠 Bể Săn Mồi Trực Tiếp
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'basket' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('basket');
          }}
        >
          🧺 Giỏ Cá & Chợ Cá ({safeBasket.length})
        </button>
      </div>

      {/* SUBTAB 1: LIVE INTERACTIVE FISH POND */}
      {subTab === 'pond' && (
        <div className="interactive-pond-section">
          {/* Quick HUD inside pond */}
          <div className="pond-hud-row">
            <div className="pond-hud-item">
              <span className="hud-icon">🧺</span>
              <span>Đang có: <strong>{safeBasket.length}/50</strong> con</span>
            </div>
            <div className="pond-hud-item">
              <span className="hud-icon">🪙</span>
              <span>Xu vàng: <strong>{formatNumber(fish)}</strong></span>
            </div>
            <button
              type="button"
              className="pond-switch-basket-btn"
              onClick={() => {
                soundManager.playPop();
                setSubTab('basket');
              }}
            >
              Mở Giỏ Bán Cá 🧺
            </button>
          </div>

          {/* Interactive Pond Canvas Area */}
          <div
            ref={pondRef}
            className="fish-pond-water-area"
            onClick={handlePondClick}
            title="Chạm vào con cá đang bơi để vồ bắt!"
          >
            {/* Water Light Shimmer */}
            <div className="water-caustics-layer" />

            {/* Swimming Fish List */}
            {swimmingFish.map((f) => (
              <div
                key={f.instanceId}
                className={`swimming-fish-sprite ${f.isCaught ? 'sprite-caught' : ''}`}
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  transform: `translate(-50%, -50%) scaleX(${f.facingRight ? 1 : -1})`,
                }}
              >
                <img
                  src={f.species.image}
                  alt={f.species.name}
                  className="pond-fish-img"
                  draggable={false}
                />
                <span className="fish-mini-name">{f.species.name}</span>
              </div>
            ))}

            {/* Cat Paw Pounce Animation */}
            {isPouncing && (
              <div
                className="paw-pounce-sprite"
                style={{
                  left: `${pawPos.x}%`,
                  top: `${pawPos.y}%`,
                }}
              >
                🐾
              </div>
            )}

            {/* Water Splash Ripples */}
            {splashes.map((s) => (
              <div
                key={s.id}
                className="water-splash-ripple"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                }}
              />
            ))}

            {/* Instruction Tip */}
            <div className="pond-overlay-instruction">
              💡 Chạm/Click trực tiếp lên chú cá bơi để mèo tung móng vuốt vồ cá!
            </div>
          </div>

          {/* Catch Success Toast */}
          {catchToast && (
            <div className="pond-catch-toast animate-bounce-in">
              <div className="toast-headline">🎉 {catchToast.text}</div>
              <div className="toast-subline">{catchToast.sub}</div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PAGINATED FISH BASKET & MARKET */}
      {subTab === 'basket' && (
        <div className="paginated-basket-section">
          {/* Basket Overview Card */}
          <div className="basket-overview-card">
            <div className="overview-stats-grid">
              <div className="stat-box">
                <span className="stat-label">Tổng số cá</span>
                <span className="stat-number">{safeBasket.length} con</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Tổng khối lượng</span>
                <span className="stat-number">{totalWeight} kg</span>
              </div>
              <div className="stat-box highlight-gold">
                <span className="stat-label">Giá trị bán</span>
                <span className="stat-number">🪙 {formatNumber(totalValue)}</span>
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
              <span className="filter-title">Sắp xếp cá:</span>
              <div className="sort-buttons-row">
                <button
                  type="button"
                  className={`sort-pill ${sortOption === 'newest' ? 'sort-active' : ''}`}
                  onClick={() => setSortOption('newest')}
                >
                  Mới nhất 🕒
                </button>
                <button
                  type="button"
                  className={`sort-pill ${sortOption === 'heaviest' ? 'sort-active' : ''}`}
                  onClick={() => setSortOption('heaviest')}
                >
                  Nặng nhất ⚖️
                </button>
                <button
                  type="button"
                  className={`sort-pill ${sortOption === 'value' ? 'sort-active' : ''}`}
                  onClick={() => setSortOption('value')}
                >
                  Giá cao 🪙
                </button>
                <button
                  type="button"
                  className={`sort-pill ${sortOption === 'rarity' ? 'sort-active' : ''}`}
                  onClick={() => setSortOption('rarity')}
                >
                  Độ hiếm ⭐
                </button>
              </div>
            </div>
          )}

          {/* Fish List or Empty State */}
          {safeBasket.length === 0 ? (
            <div className="basket-empty-box">
              <div className="empty-illustration">🎣</div>
              <h3>Giỏ cá hiện đang trống!</h3>
              <p>Hãy sang tab "Bể Săn Mồi" để mèo thò móng vuốt vồ cá tươi về tích lũy xu vàng nhé.</p>
              <button
                type="button"
                className="go-to-pond-btn"
                onClick={() => setSubTab('pond')}
              >
                🐠 Vào Bể Săn Mồi Ngay
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
                      Bán lẻ 🪙
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
      )}
    </div>
  );
};
