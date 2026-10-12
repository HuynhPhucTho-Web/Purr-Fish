import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sound';

interface FreeWaterGiftButtonProps {
  lastClaimedAt?: number;
  onClaim: () => { success: boolean; message: string; remainingMs?: number; gainedWater?: number };
}

const COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 tiếng

export const FreeWaterGiftButton: React.FC<FreeWaterGiftButtonProps> = ({
  lastClaimedAt = 0,
  onClaim,
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClaimedAnim, setIsClaimedAnim] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - (lastClaimedAt || 0);
      if (!lastClaimedAt || elapsed >= COOLDOWN_MS) {
        setTimeLeftMs(0);
      } else {
        setTimeLeftMs(COOLDOWN_MS - elapsed);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastClaimedAt]);

  const isReady = timeLeftMs <= 0;

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (isReady) {
      const res = onClaim();
      if (res.success) {
        setIsClaimedAnim(true);
        setTimeout(() => setIsClaimedAnim(false), 1500);
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(null), 3200);
      } else {
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(null), 2500);
      }
    } else {
      soundManager.playPop();
      setToastMessage(`⏳ Quà nước đang hồi chiêu! Vui lòng quay lại sau ${formatTime(timeLeftMs)}.`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <div className="relative select-none">
      {/* Toast Alert Popover */}
      {toastMessage && (
        <div className="absolute bottom-16 right-0 z-50 whitespace-nowrap bg-slate-900/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-cyan-400/30 flex items-center gap-1.5 animate-bounce-in">
          <span>💧</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Free Water Gift Button */}
      <button
        type="button"
        onClick={handleClick}
        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-md border transition-all cursor-pointer group active:scale-95 ${
          isReady
            ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-200 animate-bounce shadow-cyan-500/30 ring-2 ring-cyan-300'
            : 'bg-surface-container-lowest/90 backdrop-blur-md text-on-surface border-outline-variant/40 hover:bg-surface-container-low shadow-sm'
        } ${isClaimedAnim ? 'scale-125 rotate-6' : ''}`}
        title={
          isReady
            ? 'Sẵn sàng nhận 5 Nước Miễn Phí! Nhấp để nhận ngay!'
            : `Đang đếm ngược: Còn ${formatTime(timeLeftMs)} để nhận 5 nước miễn phí.`
        }
      >
        {/* Gift Icon Box with Drop */}
        <div className="relative">
          <span className="text-xl drop-shadow-xs">🎁</span>
          <span className="absolute -top-1 -right-1 text-xs">💧</span>
          {isReady && (
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
          )}
        </div>

        {/* Text and Timer */}
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-black tracking-tight">
              {isReady ? 'Quà Nước 5x' : 'Quà Nước'}
            </span>
            {isReady && (
              <span className="bg-yellow-300 text-yellow-950 text-[9px] font-extrabold px-1 rounded-full uppercase">
                Nhận!
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-bold mt-0.5 ${
              isReady ? 'text-cyan-100 font-extrabold' : 'text-cyan-700'
            }`}
          >
            {isReady ? 'Miễn Phí' : `⏳ ${formatTime(timeLeftMs)}`}
          </span>
        </div>
      </button>
    </div>
  );
};
