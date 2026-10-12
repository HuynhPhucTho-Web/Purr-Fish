import React from 'react';
import { formatNumber } from '../utils/economy';
import type { UserProfileInfo } from '../services/authService';

interface ScoreDisplayProps {
  fish: number; // Coins
  highestFish: number;
  level: number;
  rankBadge: string;
  rankTierName: string;
  currentUser: UserProfileInfo | null;
  soundEnabled: boolean;
  pageSubtitle?: string;
  onToggleSound: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  fish,
  highestFish,
  level,
  rankBadge,
  rankTierName,
  currentUser,
  soundEnabled,
  pageSubtitle = '• Phòng Mèo',
  onToggleSound,
  onOpenLeaderboard,
  onOpenAuth,
  onOpenSettings,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl pt-safe shadow-[0_2px_12px_rgba(122,105,104,0.08)] border-b border-outline-variant/30">
      <div className="h-16 max-w-xl mx-auto px-gutter flex items-center justify-between gap-space-sm">
        {/* Brand Logo & Room Subtitle */}
        <div
          className="flex items-center gap-space-xs shrink-0 cursor-pointer select-none"
          onClick={onOpenAuth}
          role="button"
          tabIndex={0}
          title="Thông tin tài khoản"
        >
          <span className="text-2xl">🐱</span>
          <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold hidden min-[360px]:inline">
            Purr-Fish
          </span>
          <span className="font-label-md text-label-md text-on-surface-variant hidden sm:inline">
            {pageSubtitle}
          </span>
        </div>

        {/* Currency & Rank Pills Row */}
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar">
          {/* Coins Pill */}
          <div
            className="flex items-center bg-surface-container-lowest/95 px-2.5 py-1 rounded-full shadow-[0_2px_6px_rgba(122,105,104,0.08)] border border-outline-variant/40"
            title="Số xu tích lũy"
          >
            <span className="mr-1 text-[16px]">🪙</span>
            <span className="font-label-md text-label-md text-on-surface font-bold">
              {formatNumber(fish)}
            </span>
          </div>

          {/* Rank Tier Pill */}
          <div
            className="flex items-center bg-surface-container-lowest/95 px-2.5 py-1 rounded-full shadow-[0_2px_6px_rgba(122,105,104,0.08)] border border-outline-variant/40 cursor-pointer"
            onClick={onOpenLeaderboard}
            title="Bảng xếp hạng danh hiệu"
          >
            <span className="mr-1 text-[16px]">{rankBadge}</span>
            <span className="font-label-sm text-label-sm text-on-surface font-bold">
              {rankTierName}
            </span>
          </div>

          {/* Quick Sound Toggle */}
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-surface-container-lowest/95 shadow-[0_2px_6px_rgba(122,105,104,0.08)] border border-outline-variant/40 flex items-center justify-center text-sm cursor-pointer"
            onClick={onToggleSound}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            aria-label="Cài đặt âm thanh"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Profile Avatar with Level Badge */}
        <div
          className="relative shrink-0 flex items-center justify-center cursor-pointer select-none"
          onClick={onOpenAuth}
          role="button"
          tabIndex={0}
          title={currentUser ? `${currentUser.displayName} (Lv.${level})` : `Tài khoản (Lv.${level})`}
        >
          <div className="relative w-9 h-9 rounded-full bg-primary-container p-0.5 shadow-[0_2px_6px_rgba(122,105,104,0.15)] flex items-center justify-center text-base">
            <span>{currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" /> : '👤'}</span>
            <span className="absolute -bottom-1 -right-1 bg-primary text-on-primary font-label-sm text-label-sm px-1.5 rounded-full leading-tight font-bold shadow-sm">
              {level}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
