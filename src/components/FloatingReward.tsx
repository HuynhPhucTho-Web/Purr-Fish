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
  isCatRoomActive?: boolean;
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
  isCatRoomActive = true,
}) => {
  // Golden Fish State
  const [goldenFishActive, setGoldenFishActive] = useState(false);
  const [goldenFishPos, setGoldenFishPos] = useState({ y: 30 });
  const [goldenToast, setGoldenToast] = useState<{ show: boolean; amount: number }>({
    show: false,
    amount: 0,
  });

  const goldenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextFishRef = useRef<() => void>(() => {});

  // Spawn Golden Fish periodically (mỗi 75 - 120 giây, bơi chậm rãi 12 giây)
  useEffect(() => {
    const scheduleNextFish = () => {
      if (goldenTimerRef.current) clearTimeout(goldenTimerRef.current);
      // Khoảng cách xuất hiện thưa hơn: 75 đến 120 giây (1.25 - 2 phút một lần)
      const delay = 75000 + Math.random() * 45000;
      goldenTimerRef.current = setTimeout(() => {
        // Randomize vertical height (between 18% and 72% of screen)
        setGoldenFishPos({ y: 18 + Math.random() * 54 });
        setGoldenFishActive(true);

        // Bơi thong thả qua màn hình trong 12.5 giây để người chơi trên điện thoại dễ bắt
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setGoldenFishActive(false);
          scheduleNextFish();
        }, 12500);
      }, delay);
    };

    scheduleNextFishRef.current = scheduleNextFish;
    scheduleNextFish();

    return () => {
      if (goldenTimerRef.current) clearTimeout(goldenTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleGoldenFishClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGoldenFishActive(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    // Lên lịch xuất hiện cá vàng tiếp theo sau thời gian chờ
    scheduleNextFishRef.current();

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
              <span className="floating-val inline-flex items-center justify-center gap-1">
                <img
                  src="/images/icon/xu-vang.webp"
                  alt="Xu"
                  className="w-4 h-4 object-contain inline-block shrink-0"
                  draggable={false}
                />
                <span>{item.text}</span>
              </span>
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

      {/* 2. Golden Fish Mystery Swimmer (Chỉ hiện ở phòng mèo) */}
      {goldenFishActive && isCatRoomActive && (
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
              <p className="toast-amount flex items-center justify-center sm:justify-start gap-1 flex-wrap">
                <span>🎒 +2 Cá Vàng vào Balo • +{formatNumber(goldenToast.amount)}</span>
                <img
                  src="/images/icon/xu-vang.webp"
                  alt="Xu"
                  className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                  draggable={false}
                />
                <span>Xu • FRENZY!</span>
              </p>
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
              Trong lúc bạn vắng mặt ({formatTime(offlineReward.offlineSeconds)}), mèo cưng đã miệt mài nhặt xu:
            </p>
            <div className="offline-fish-pill flex items-center justify-center gap-1.5">
              <img
                src="/images/icon/xu-vang.webp"
                alt="Xu"
                className="w-5 h-5 object-contain shrink-0"
                draggable={false}
              />
              <span className="offline-fish-amount">+{formatNumber(offlineReward.offlineFish)} Xu</span>
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
