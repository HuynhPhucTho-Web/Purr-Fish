import React, { useEffect, useState, useRef } from 'react';
import type { FloatingItem, SparkleItem, OfflineReward } from '../hooks/useGameState';
import { formatNumber, formatTime } from '../utils/economy';

interface FloatingRewardProps {
  floatingItems: FloatingItem[];
  sparkles: SparkleItem[];
  offlineReward: OfflineReward | null;
  onRemoveFloatingItem: (id: string) => void;
  onRemoveSparkle: (id: string) => void;
  onCatchGoldenFish: (bonus: number) => void;
  onClaimOffline: () => void;
  clickPower: number;
}

export const FloatingReward: React.FC<FloatingRewardProps> = ({
  floatingItems,
  sparkles,
  offlineReward,
  onRemoveFloatingItem,
  onRemoveSparkle,
  onCatchGoldenFish,
  onClaimOffline,
  clickPower,
}) => {
  // Golden Fish State
  const [goldenFishActive, setGoldenFishActive] = useState(false);
  const [goldenFishPos, setGoldenFishPos] = useState({ y: 30 });
  const [goldenToast, setGoldenToast] = useState<{ show: boolean; amount: number }>({
    show: false,
    amount: 0,
  });

  const goldenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spawn Golden Fish periodically (every 35 - 55 seconds)
  useEffect(() => {
    const scheduleNextFish = () => {
      const delay = 30000 + Math.random() * 25000;
      goldenTimerRef.current = setTimeout(() => {
        // Randomize vertical height (between 15% and 75% of screen)
        setGoldenFishPos({ y: 15 + Math.random() * 60 });
        setGoldenFishActive(true);

        // Hide after 9 seconds if not caught
        setTimeout(() => {
          setGoldenFishActive(false);
          scheduleNextFish();
        }, 9000);
      }, delay);
    };

    scheduleNextFish();

    return () => {
      if (goldenTimerRef.current) clearTimeout(goldenTimerRef.current);
    };
  }, []);

  const handleGoldenFishClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGoldenFishActive(false);

    // Reward: 20x click power or flat 150 fish, whichever is larger!
    const reward = Math.max(2, clickPower * 1);
    onCatchGoldenFish(reward);

    setGoldenToast({ show: true, amount: reward });
    setTimeout(() => {
      setGoldenToast({ show: false, amount: 0 });
    }, 2800);
  };

  return (
    <>
      {/* 1. Floating Click Numbers */}
      <div className="floating-numbers-layer" aria-hidden="true">
        {floatingItems.map((item) => (
          <div
            key={item.id}
            className={`floating-score-number ${item.isCrit ? 'crit-score' : ''}`}
            style={{ left: `${item.x}px`, top: `${item.y}px` }}
            onAnimationEnd={() => onRemoveFloatingItem(item.id)}
          >
            <div className="floating-text-column">
              <span className="floating-val">{item.text}</span>
              {item.fishName && (
                <span
                  className="floating-fish-species-label"
                  style={{ color: item.rarityColor || '#FFA07A' }}
                >
                  {item.fishName}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Floating Sparkles */}
        {sparkles.map((spark) => (
          <div
            key={spark.id}
            className="floating-sparkle-dot"
            style={{
              left: `${spark.x}px`,
              top: `${spark.y}px`,
              backgroundColor: spark.color,
              ['--vx' as string]: `${spark.vx}px`,
              ['--vy' as string]: `${spark.vy}px`,
            }}
            onAnimationEnd={() => onRemoveSparkle(spark.id)}
          />
        ))}
      </div>

      {/* 2. Golden Fish Mystery Swimmer */}
      {goldenFishActive && (
        <div
          className="swimming-golden-fish-wrap"
          style={{ top: `${goldenFishPos.y}%` }}
          onClick={handleGoldenFishClick}
          role="button"
          tabIndex={0}
          title="Bắt cá vàng may mắn!"
        >
          <div className="golden-fish-glow">
            <img
              src="/images/fish_webp/ca_chep_vang.webp"
              alt="Cá vàng may mắn"
              className="golden-fish-swimmer-img"
              draggable={false}
            />
            <span className="golden-fish-hint">CHẠM VÀO TÔI! </span>
          </div>
        </div>
      )}

      {/* 3. Golden Fish Catch Celebration Toast */}
      {goldenToast.show && (
        <div className="golden-toast-banner">
          <div className="golden-toast-content">
            <span className="toast-sparkle"></span>
            <div className="min-w-0 text-center sm:text-left">
              <h4 className="toast-title truncate sm:text-clip">BẮT ĐƯỢC CÁ VÀNG MAY MẮN!</h4>
              <p className="toast-amount">+{formatNumber(goldenToast.amount)} Cá 🐟 • KÍCH HOẠT FRENZY!</p>
            </div>
            <span className="toast-sparkle"></span>
          </div>
        </div>
      )}

      {/* 4. Offline Welcome Back Reward Dialog */}
      {offlineReward && (
        <div className="modal-backdrop">
          <div className="offline-dialog-card">
            <div className="offline-header-art">
              <span className="offline-cat-emoji">💤🐱🐟</span>
            </div>
            <h3 className="offline-title">Chào Mừng Trở Lại!</h3>
            <p className="offline-message">
              Trong lúc bạn vắng mặt ({formatTime(offlineReward.offlineSeconds)}), mèo cưng đã miệt mài bắt cá:
            </p>
            <div className="offline-fish-pill">
              <span className="offline-fish-icon">🐟</span>
              <span className="offline-fish-amount">+{formatNumber(offlineReward.offlineFish)} Cá</span>
            </div>
            <button
              type="button"
              className="claim-offline-btn"
              onClick={onClaimOffline}
            >
              Nhận Thưởng Ngay! 🐾
            </button>
          </div>
        </div>
      )}
    </>
  );
};
