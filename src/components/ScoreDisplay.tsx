import React from 'react';
import { formatNumber } from '../utils/economy';
import type { UserProfileInfo } from '../services/authService';

interface ScoreDisplayProps {
  fish: number; // Coins
  highestFish?: number;
  level: number;
  rankBadge: string;
  rankBadgeImage?: string;
  rankTierName: string;
  currentUser: UserProfileInfo | null;
  soundEnabled: boolean;
  pageSubtitle?: string;
  onToggleSound: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
  onOpenSettings?: () => void;
  onOpenAvatarPicker?: () => void;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  fish,
  level,
  rankBadge,
  rankBadgeImage,
  rankTierName,
  currentUser,
  pageSubtitle = '• Phòng Mèo',
  onOpenLeaderboard,
  onOpenAuth,
  onOpenSettings,
  onOpenAvatarPicker,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl pt-safe shadow-[0_2px_12px_rgba(122,105,104,0.08)] border-b border-outline-variant/30 select-none">
      <div className="h-14 sm:h-16 max-w-xl mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-1.5">
        {/* Brand Logo & Room Subtitle */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer select-none"
          onClick={onOpenAuth}
          role="button"
          tabIndex={0}
          title="Thông tin tài khoản"
        >
          <span className="text-xl sm:text-2xl">🐱</span>
          <div className="flex flex-col">
            <span className="font-headline-sm text-xs sm:text-base text-primary tracking-tight font-black leading-none">
              Purr-Fish
            </span>
            <span className="text-[9px] sm:text-[10px] text-on-surface-variant hidden min-[400px]:inline leading-tight font-semibold">
              {pageSubtitle}
            </span>
          </div>
        </div>

        {/* Currency & Rank Pills Row */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          {/* Coins Pill */}
          <div
            className="h-7 sm:h-8 flex items-center bg-surface-container-lowest/95 px-2 sm:px-2.5 rounded-full shadow-[0_2px_6px_rgba(122,105,104,0.08)] border border-outline-variant/40 shrink-0"
            title="Số xu tích lũy"
          >
            <span className="mr-0.5 sm:mr-1 text-xs sm:text-sm">🪙</span>
            <span className="text-[11px] sm:text-sm text-on-surface font-black">
              {formatNumber(fish)}
            </span>
          </div>

          {/* Rank Tier Pill with Badge Image */}
          <div
            className="h-7 sm:h-8 flex items-center bg-surface-container-lowest/95 px-1.5 sm:px-2.5 rounded-full shadow-[0_2px_6px_rgba(122,105,104,0.08)] border border-outline-variant/40 cursor-pointer hover:border-primary/40 transition-colors shrink-0"
            onClick={onOpenLeaderboard}
            title="Bảng xếp hạng danh hiệu"
          >
            {rankBadgeImage ? (
              <img
                src={rankBadgeImage}
                alt={rankTierName}
                className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain mr-1 shrink-0 drop-shadow-xs"
              />
            ) : (
              <span className="mr-1 text-[11px] sm:text-sm">{rankBadge}</span>
            )}
            <span className="text-[9px] sm:text-xs text-on-surface font-bold truncate max-w-[55px] min-[360px]:max-w-[70px] sm:max-w-none">
              {rankTierName}
            </span>
          </div>

          {/* Settings Gear Button (Includes Sound & Music toggles) */}
          {onOpenSettings && (
            <button
              type="button"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container-lowest/95 shadow-[0_2px_6px_rgba(122,105,104,0.08)] border border-outline-variant/40 flex items-center justify-center text-xs sm:text-sm cursor-pointer hover:bg-surface-container active:scale-95 transition-transform shrink-0"
              onClick={onOpenSettings}
              title="Cài đặt trò chơi (Âm thanh, Nhạc, Đăng xuất...)"
              aria-label="Cài đặt trò chơi"
            >
              ⚙️
            </button>
          )}
        </div>

        {/* Profile Cat Avatar with Level Badge (Clicking opens Avatar Picker) */}
        <div
          className="relative shrink-0 flex items-center justify-center cursor-pointer select-none pl-0.5 sm:pl-1 group"
          onClick={onOpenAvatarPicker || onOpenAuth}
          role="button"
          tabIndex={0}
          title={
            currentUser
              ? `${currentUser.displayName} (Lv.${level}) - Nhấn để đổi ảnh đại diện Boss Mèo`
              : `Mèo Cưng (Lv.${level}) - Nhấn để đổi ảnh đại diện`
          }
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-100 p-0.5 shadow-[0_2px_8px_rgba(122,105,104,0.22)] flex items-center justify-center text-sm sm:text-base border-2 border-white group-hover:ring-2 group-hover:ring-primary/60 group-active:scale-95 transition-all">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <img
                src="/images/cat_avatars_webp/avatar_01.webp"
                alt="Avatar Default"
                className="w-full h-full rounded-full object-cover"
              />
            )}
            <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[9px] sm:text-[10px] px-1 rounded-full leading-tight font-black shadow-sm border border-white">
              {level}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ScoreDisplay;
