import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { type RankTier, RANK_TIERS, getRankTierByLevel } from '../data/rankTiers';
import type { CatSkin } from '../data/skins';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';
import { leaderboardService } from '../services/leaderboardService';
import { authService, type UserProfileInfo } from '../services/authService';

export interface LeaderboardViewProps {
  myLevel: number;
  myXp: number;
  myRankTier: RankTier;
  myDisplayName?: string;
  myAvatar?: string;
  myBiggestFishKg?: number;
  myCoins?: number;
  currentSkin?: CatSkin;
  totalFishCaught?: number;
  saveStatus?: string;
  onSaveNow?: () => void;
  onExportSave?: () => string;
  onImportSave?: (code: string) => boolean;
  onSyncCloudNow?: () => Promise<void>;
  onBackToCat?: () => void;
  currentUser?: UserProfileInfo | null;
  onOpenAuth?: () => void;
}

export type RankCriterion = 'coins' | 'level' | 'xp';

interface LeaderboardPlayer {
  id: string;
  name: string;
  level: number;
  xp: number;
  coins: number;
  avatar: string;
  biggestFishKg: number;
  isMe?: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  myLevel,
  myXp,
  myRankTier,
  myDisplayName = 'Bạn (Ngư Thủ Cá Bự)',
  myAvatar,
  myCoins = 0,
  myBiggestFishKg = 0,
  currentSkin,
  saveStatus: _saveStatus = 'Đã đồng bộ an toàn',
  onSaveNow: _onSaveNow,
  onSyncCloudNow,
  onBackToCat,
  currentUser,
  onOpenAuth,
}) => {
  const [criterion, setCriterion] = useState<RankCriterion>('coins');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [isFetchingCloud, setIsFetchingCloud] = useState<boolean>(false);
  const [showTiersModal, setShowTiersModal] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState({
    title: 'Đồng Bộ Thành Công!',
    subtitle: 'Dữ liệu đã được cập nhật từ máy chủ.',
  });

  const myActualAvatar = myAvatar || currentUser?.photoURL || currentSkin?.image || '/images/cat_avatars_webp/avatar_01.webp';
  const myActualName = myDisplayName || currentUser?.catName || currentUser?.displayName || 'Bạn (Ngư Thủ Cá Bự)';

  // Tải danh sách người chơi THẬT từ Firestore & LocalStorage (không dùng dữ liệu ảo)
  const fetchCloudLeaderboard = useCallback(async () => {
    setIsFetchingCloud(true);
    try {
      // 1. Tự động đồng bộ điểm số mới nhất của người chơi lên Firestore
      if (onSyncCloudNow && currentUser && !currentUser.isAnonymous) {
        try {
          await onSyncCloudNow();
        } catch {
          // Bỏ qua nếu lỗi mạng
        }
      }

      // 2. Lấy danh sách thật từ Firestore /leaderboards
      const entries = await leaderboardService.getTopLeaderboard(100);

      // 3. Lấy thêm các tài khoản cục bộ trên máy nếu có
      const localUsers = authService.getAllLocalUsers();

      // Bản đồ gom người chơi theo id / username để tránh trùng lặp
      const playerMap = new Map<string, LeaderboardPlayer>();

      // Đưa danh sách người chơi thật từ Firestore vào
      for (const e of entries) {
        const id = e.uid || e.username || e.displayName;
        if (!id) continue;
        playerMap.set(id, {
          id: e.uid,
          name: e.displayName || e.catName || e.username || 'Ngư Thủ Boss Mèo',
          level: Math.max(1, Number(e.level) || 1),
          xp: Math.max(0, Number(e.xp) || 0),
          coins: Math.max(0, Number(e.coins) || 0),
          avatar: e.photoURL || '/images/cat_avatars_webp/avatar_01.webp',
          biggestFishKg: Number(e.biggestFishKg) || 0,
          isMe: false,
        });
      }

      // Đưa các tài khoản cục bộ đã đăng ký trên máy vào nếu chưa có
      for (const u of localUsers) {
        if (!playerMap.has(u.uid) && !playerMap.has(u.username)) {
          playerMap.set(u.uid, {
            id: u.uid,
            name: u.catName || u.displayName || u.username,
            level: 1,
            xp: 0,
            coins: 0,
            avatar: u.photoURL || '/images/cat_avatars_webp/avatar_01.webp',
            biggestFishKg: 0,
            isMe: false,
          });
        }
      }

      // 4. Luôn đảm bảo tài khoản người chơi HIỆN TẠI có mặt với số liệu thời gian thực mới nhất
      const myId = currentUser?.uid || 'my_self';

      // Xoá entry cũ trùng lặp nếu có để ghi đè số liệu chính xác nhất
      playerMap.delete(myId);
      if (currentUser?.username) {
        playerMap.delete(currentUser.username);
      }

      playerMap.set(myId, {
        id: myId,
        name: myActualName,
        level: myLevel,
        xp: myXp,
        coins: myCoins,
        avatar: myActualAvatar,
        biggestFishKg: myBiggestFishKg,
        isMe: true,
      });

      setPlayers(Array.from(playerMap.values()));
    } catch (err) {
      console.warn('Lỗi tải bảng xếp hạng thật:', err);
    } finally {
      setIsFetchingCloud(false);
    }
  }, [onSyncCloudNow, currentUser, myActualName, myActualAvatar, myLevel, myXp, myCoins, myBiggestFishKg]);

  useEffect(() => {
    fetchCloudLeaderboard();
  }, [fetchCloudLeaderboard]);

  // Sắp xếp danh sách người chơi dựa trên tiêu chí được chọn (coins, level, xp)
  const sortedPlayers = useMemo(() => {
    const list = [...players];
    if (criterion === 'coins') {
      return list.sort((a, b) => b.coins - a.coins);
    }
    if (criterion === 'level') {
      return list.sort((a, b) => (b.level !== a.level ? b.level - a.level : b.xp - a.xp));
    }
    // xp
    return list.sort((a, b) => b.xp - a.xp);
  }, [criterion, players]);

  // Vị trí thứ hạng chính xác của người chơi hiện tại trong danh sách thật
  const myIndex = useMemo(() => {
    return sortedPlayers.findIndex((p) => p.isMe || p.id === (currentUser?.uid || 'my_self'));
  }, [sortedPlayers, currentUser]);

  const myPosition = myIndex >= 0 ? myIndex + 1 : 1;
  const totalPlayers = sortedPlayers.length;

  const handleCriterionClick = (crit: RankCriterion) => {
    soundManager.playPop();
    setCriterion(crit);
  };

  const handleRefresh = async () => {
    soundManager.playPop();
    await fetchCloudLeaderboard();
    setToastMessage({
      title: 'Bảng Xếp Hạng Đã Cập Nhật!',
      subtitle: `Dữ liệu người chơi thật theo ${criterion === 'coins' ? 'Số Xu' : criterion === 'level' ? 'Level ⭐' : 'Điểm XP ✨'} đã được làm mới.`,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2400);
  };

  // Top 3 Podium
  const top1 = sortedPlayers[0];
  const top2 = sortedPlayers[1];
  const top3 = sortedPlayers[2];

  // Hạng 4 trở đi
  const remainingPlayers = sortedPlayers.slice(3);

  // Helper hiển thị chỉ số chính theo criterion
  const renderScoreDisplay = (player: { coins: number; level: number; xp: number }) => {
    if (criterion === 'coins') {
      return {
        value: `${formatNumber(player.coins)}`,
        unit: 'Xu',
        isCoins: true,
      };
    }
    if (criterion === 'level') {
      return {
        value: `Lv.${player.level}`,
        unit: '⭐ Cấp',
      };
    }
    return {
      value: `${formatNumber(player.xp)}`,
      unit: '✨ XP',
    };
  };

  const allTiersList = Object.values(RANK_TIERS);

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto px-2 sm:px-margin pt-1 sm:pt-2 pb-20 sm:pb-24 gap-space-md select-none font-body-md text-on-surface">
      {/* 1. Header Bar with Back button */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 shadow-2xs gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">🏆</span>
          <div className="min-w-0">
            <h1 className="font-headline-sm text-sm sm:text-headline-sm text-on-surface font-black truncate">
              Bảng Xếp Hạng Ngư Thủ
            </h1>
            <p className="font-body-sm text-[11px] sm:text-xs text-on-surface-variant hidden sm:block truncate">
              Xếp hạng người chơi thật theo Xu, Cấp Độ & Kinh Nghiệm
            </p>
          </div>
        </div>
        {onBackToCat && (
          <button
            type="button"
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container text-xs font-bold text-on-surface flex items-center gap-1 transition-colors cursor-pointer shadow-xs shrink-0"
            onClick={onBackToCat}
          >
            🐱 Về Mèo
          </button>
        )}
      </div>

      {/* Guest Trial Mode Banner */}
      {(!currentUser || currentUser.isAnonymous) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10 border border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">🐾</span>
            <div className="min-w-0 text-left">
              <span className="font-bold text-xs sm:text-sm text-amber-950 block truncate">
                Chế độ Chơi Thử (Khách)
              </span>
              <p className="text-[11px] text-amber-800 leading-tight">
                Tạo tài khoản hoặc đăng nhập để lưu điểm vĩnh viễn và đua Top chính thức!
              </p>
            </div>
          </div>
          {onOpenAuth && (
            <button
              type="button"
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-all"
              onClick={() => {
                soundManager.playPop();
                onOpenAuth();
              }}
            >
              ✨ Đăng Nhập Đua Top
            </button>
          )}
        </div>
      )}

      {/* 2. THÔNG BÁO THỨ HẠNG CỦA BẠN (DÀNH RIÊNG CHO NGƯỜI CHƠI) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md border border-amber-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shrink-0 shadow-inner border border-white/30"
            style={{ width: '52px', height: '52px', minWidth: '52px' }}
          >
            {myPosition === 1 ? '👑' : myPosition === 2 ? '🥈' : myPosition === 3 ? '🥉' : '🎖️'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-100">
                Thứ Hạng Của Bạn
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-orange-950 text-xs font-black shadow-xs">
                Top #{myPosition} / {totalPlayers}
              </span>
              {currentUser?.username && (
                <span className="text-[11px] text-amber-100 font-medium">@{currentUser.username}</span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-black truncate text-white mt-0.5">
              {myPosition === 1
                ? '🎉 Quán Quân! Bạn đang dẫn đầu Bảng Xếp Hạng!'
                : myPosition <= 3
                ? `🔥 Xuất sắc! Bạn đang vinh danh trong Top ${myPosition} Bục Vinh Quang!`
                : `Bạn đang ở vị trí Top #${myPosition} trên tổng số ${totalPlayers} ngư thủ`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetchingCloud}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer border border-white/30"
          title="Làm mới danh sách"
        >
          <span className={`material-symbols-outlined text-[16px] ${isFetchingCloud ? 'animate-spin' : ''}`}>refresh</span>
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* 3. PLAYER PERSONAL STATS CARD */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 rounded-2xl p-4 shadow-sm relative overflow-hidden border border-amber-200/90">
        <div className="flex items-center justify-between pb-3">
          {/* Rank Badge Image & Name */}
          <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xs border border-amber-300/80">
            <img
              src={myRankTier?.badgeImage || '/images/cat_badges_webp/badge_01.webp'}
              alt={myRankTier?.name || 'Tân Thủ'}
              className="w-7 h-7 object-contain filter drop-shadow-xs shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-amber-950">
                {myRankTier?.name || 'Tân Thủ'}
              </span>
              <span className="text-[10px] text-amber-700 font-bold">
                {myRankTier?.badge} Cấp Bậc
              </span>
            </div>
          </div>

          {/* Current Rank Position */}
          <div className="bg-amber-600 text-white font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 text-xs">
            <span className="opacity-90">Hạng:</span>
            <span className="font-black text-sm tracking-tight">#{myPosition}</span>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex items-center gap-3 pt-1">
          <div className="relative shrink-0">
            <div
              className="rounded-full bg-white p-0.5 shadow-sm border-2 border-amber-400 overflow-hidden"
              style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}
            >
              <img
                src={myActualAvatar}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs border border-white">
              Lv.{myLevel}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-slate-800 truncate">
                {myActualName}
              </h2>
              <span className="material-symbols-outlined text-amber-500 text-[18px]">verified</span>
            </div>
            <p className="text-xs text-slate-600 truncate mt-0.5">
              Skin: <strong className="text-orange-700">{currentSkin?.name || 'Mèo Mặc Định'}</strong>
            </p>
          </div>
        </div>

        {/* 3 Metrics: Coins, Level, XP */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 bg-white/90 backdrop-blur-xs rounded-xl p-2.5 border border-amber-200/60 shadow-2xs">
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] text-slate-500 font-medium">Số Xu</span>
            <span className="text-xs sm:text-sm font-black text-amber-900 truncate max-w-full flex items-center justify-center gap-1">
              <img
                src="/images/icon/xu-vang.webp"
                alt="Xu"
                className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                draggable={false}
              />
              <span>{formatNumber(myCoins)}</span>
            </span>
          </div>
          <div className="flex flex-col items-center text-center border-x border-amber-200">
            <span className="text-[11px] text-slate-500 font-medium">Cấp Độ</span>
            <span className="text-xs sm:text-sm font-black text-orange-900 truncate max-w-full">
              ⭐ Lv.{myLevel}
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] text-slate-500 font-medium">Kinh Nghiệm</span>
            <span className="text-xs sm:text-sm font-black text-indigo-900 truncate max-w-full">
              ✨ {formatNumber(myXp)}
            </span>
          </div>
        </div>
      </section>

      {/* 4. 7 RANK BADGES PROGRESSION STRIP (Tân thủ -> Siêu Huyền Thoại) */}
      <section className="bg-white rounded-2xl p-3.5 shadow-sm border border-orange-100 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎖️</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              7 Cấp Bậc Danh Hiệu Đảo Mèo
            </h3>
          </div>
          <button
            type="button"
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
            onClick={() => setShowTiersModal(!showTiersModal)}
          >
            <span>{showTiersModal ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}</span>
          </button>
        </div>

        {/* Horizontal scroll of all 7 Badges */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {allTiersList.map((tier) => {
            const isUnlocked = myLevel >= tier.minLevel;
            const isCurrent = myRankTier?.key === tier.key;
            return (
              <div
                key={tier.key}
                className={`shrink-0 w-24 p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300 shadow-xs'
                    : isUnlocked
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="w-10 h-10 mb-1 flex items-center justify-center relative">
                  <img
                    src={tier.badgeImage}
                    alt={tier.name}
                    className="w-full h-full object-contain filter drop-shadow-xs"
                  />
                  {isCurrent && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 ring-1 ring-white" />
                  )}
                </div>
                <span className="text-[11px] font-black text-slate-800 truncate w-full">
                  {tier.name}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold truncate w-full">
                  Lv.{tier.minLevel}+
                </span>
              </div>
            );
          })}
        </div>

        {showTiersModal && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5 animate-fade-in text-xs">
            {allTiersList.map((tier) => (
              <div
                key={`desc_${tier.key}`}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/80"
              >
                <div className="flex items-center gap-2">
                  <img src={tier.badgeImage} alt={tier.name} className="w-6 h-6 object-contain" />
                  <span className="font-bold text-slate-800">{tier.name}</span>
                  <span className="text-[10px] text-slate-500">(Cấp {tier.minLevel} - {tier.maxLevel === 999 ? '∞' : tier.maxLevel})</span>
                </div>
                <span className="text-[11px] text-slate-600 italic line-clamp-1 max-w-[180px]">
                  {tier.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. CRITERIA TABS SELECTOR (Xu, Level, XP) */}
      <section className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 border border-orange-100">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
            Bộ Lọc Tiêu Chí
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {totalPlayers} người chơi thật
          </span>
        </div>

        {/* 3 Criteria Tabs Segmented Control */}
        <div className="grid grid-cols-3 p-1 bg-surface-container-high rounded-2xl shadow-inner gap-1">
          <button
            type="button"
            onClick={() => handleCriterionClick('coins')}
            className={`py-2 px-1 rounded-xl text-xs text-center transition-all cursor-pointer font-black flex items-center justify-center gap-1 ${
              criterion === 'coins'
                ? 'bg-white text-amber-900 shadow-sm ring-1 ring-amber-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <img
              src="/images/icon/xu-vang.webp"
              alt="Xu"
              className="w-3.5 h-3.5 object-contain inline-block shrink-0"
              draggable={false}
            />
            <span>Số Xu</span>
          </button>
          <button
            type="button"
            onClick={() => handleCriterionClick('level')}
            className={`py-2 px-1 rounded-xl text-xs text-center transition-all cursor-pointer font-black flex items-center justify-center gap-1 ${
              criterion === 'level'
                ? 'bg-white text-orange-900 shadow-sm ring-1 ring-orange-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⭐</span>
            <span>Level</span>
          </button>
          <button
            type="button"
            onClick={() => handleCriterionClick('xp')}
            className={`py-2 px-1 rounded-xl text-xs text-center transition-all cursor-pointer font-black flex items-center justify-center gap-1 ${
              criterion === 'xp'
                ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-indigo-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✨</span>
            <span>Điểm XP</span>
          </button>
        </div>
      </section>

      {/* 6. TOP 3 PODIUM SHOWCASE - CÁC HẠNG AVATAR BẰNG NHAU HOÀN TOÀN */}
      <section className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3 border border-orange-100">
        <div className="text-center">
          <span className="text-sm font-black text-slate-800 block">
            Top 3 Vinh Quang ({criterion === 'coins' ? 'Đại Gia Xu Vàng' : criterion === 'level' ? 'Cấp Độ Thượng Thừa' : 'Bậc Thầy Kinh Nghiệm'})
          </span>
          <p className="text-[11px] text-slate-500">
            Huyền thoại dẫn đầu bảng xếp hạng
          </p>
        </div>

        {/* Podium Grid (Silver 2nd Left, Gold 1st Center Elevated, Bronze 3rd Right) */}
        <div className="grid grid-cols-3 items-end gap-2 pt-3 pb-1">
          {/* 2ND PLACE (SILVER - HẠNG 2) */}
          {top2 ? (() => {
            const t2Tier = getRankTierByLevel(top2.level);
            const score = renderScoreDisplay(top2);
            return (
              <div className="flex flex-col items-center text-center">
                <span className="text-xl mb-1">🥈</span>
                <div className="relative mb-2">
                  <div
                    className={`rounded-full bg-slate-100 p-0.5 shadow-md ring-4 overflow-hidden shrink-0 ${
                      top2.isMe ? 'ring-amber-500 ring-offset-2' : 'ring-slate-300'
                    }`}
                    style={{ width: '74px', height: '74px', minWidth: '74px', minHeight: '74px' }}
                  >
                    <img src={top2.avatar} alt="Silver" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <span className="absolute -top-1.5 -left-1 w-6 h-6 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 text-white text-xs flex items-center justify-center font-black shadow-sm ring-2 ring-white">
                    2
                  </span>
                  <img
                    src={t2Tier.badgeImage}
                    alt={t2Tier.name}
                    className="w-5 h-5 object-contain absolute -bottom-1 -right-1 filter drop-shadow-xs"
                    title={t2Tier.name}
                  />
                </div>

                <div className="flex items-center justify-center gap-1 w-full max-w-[100px]">
                  <span className="text-xs font-black text-slate-800 truncate">
                    {top2.name}
                  </span>
                  {top2.isMe && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-black shrink-0">
                      Bạn
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[90px]">
                  {t2Tier.name}
                </span>

                {/* Pillar #2 (Height 94px) */}
                <div
                  className="w-full bg-gradient-to-t from-slate-200 via-slate-100 to-slate-50 rounded-t-2xl mt-2 flex flex-col items-center justify-center p-1 border-t-2 border-slate-300 shadow-2xs"
                  style={{ height: '94px' }}
                >
                  <span className="text-xs font-black text-slate-800 leading-tight">
                    {score.value}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {score.unit}
                  </span>
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-white text-[9px] font-bold text-slate-600 shadow-2xs">
                    Hạng 2
                  </span>
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center text-center opacity-60">
              <span className="text-xl mb-1 text-slate-300">🥈</span>
              <div
                className="relative rounded-full shrink-0 p-0.5 border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300 mb-2"
                style={{ width: '74px', height: '74px', minWidth: '74px', minHeight: '74px' }}
              >
                <span className="text-2xl">🐾</span>
              </div>
              <span className="text-xs font-bold text-slate-400 truncate w-full">Chờ Ngư Thủ</span>
              <span className="text-[10px] text-slate-400">Chưa có</span>
              <div
                className="w-full bg-slate-100/70 rounded-t-2xl mt-2 flex flex-col items-center justify-center p-1 border-t border-slate-200"
                style={{ height: '94px' }}
              >
                <span className="text-[10px] text-slate-400 font-bold">Vị trí trống</span>
                <span className="mt-1 px-1.5 py-0.2 rounded-full bg-white text-[9px] font-bold text-slate-400 shadow-2xs">Hạng 2</span>
              </div>
            </div>
          )}

          {/* 1ST PLACE (GOLD - QUÁN QUÂN - Center Elevated) */}
          {top1 ? (() => {
            const t1Tier = getRankTierByLevel(top1.level);
            const score = renderScoreDisplay(top1);
            return (
              <div className="flex flex-col items-center text-center -mt-4">
                <span className="text-2xl animate-bounce mb-0.5">👑</span>
                <div className="relative mb-2">
                  <div
                    className={`rounded-full bg-amber-50 p-0.5 shadow-lg ring-4 overflow-hidden shrink-0 ${
                      top1.isMe ? 'ring-amber-500 ring-offset-2' : 'ring-amber-400'
                    }`}
                    style={{ width: '74px', height: '74px', minWidth: '74px', minHeight: '74px' }}
                  >
                    <img src={top1.avatar} alt="Gold" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <span className="absolute -top-1.5 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs flex items-center justify-center font-black shadow-md ring-2 ring-white">
                    1
                  </span>
                  <img
                    src={t1Tier.badgeImage}
                    alt={t1Tier.name}
                    className="w-6 h-6 object-contain absolute -bottom-1 -right-1 filter drop-shadow-xs"
                    title={t1Tier.name}
                  />
                </div>

                <div className="flex items-center justify-center gap-1 w-full max-w-[110px]">
                  <span className="text-xs font-black text-amber-950 truncate">
                    {top1.name}
                  </span>
                  {top1.isMe && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-black shrink-0">
                      Bạn
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100/90 px-2 py-0.2 rounded-full mt-0.5 truncate max-w-[100px]">
                  {t1Tier.name}
                </span>

                {/* Pillar #1 (Height 120px) */}
                <div
                  className="w-full bg-gradient-to-t from-amber-300 via-amber-200 to-amber-100 rounded-t-2xl mt-2 flex flex-col items-center justify-center p-1 border-t-2 border-amber-400 shadow-sm"
                  style={{ height: '120px' }}
                >
                  <span className="text-sm font-black text-amber-950 leading-tight">
                    {score.value}
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold">
                    {score.unit}
                  </span>
                  <span className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black shadow-xs">
                    Quán Quân
                  </span>
                </div>
              </div>
            );
          })() : null}

          {/* 3RD PLACE (BRONZE - HẠNG 3) */}
          {top3 ? (() => {
            const t3Tier = getRankTierByLevel(top3.level);
            const score = renderScoreDisplay(top3);
            return (
              <div className="flex flex-col items-center text-center">
                <span className="text-xl mb-1">🥉</span>
                <div className="relative mb-2">
                  <div
                    className={`rounded-full bg-orange-50 p-0.5 shadow-md ring-4 overflow-hidden shrink-0 ${
                      top3.isMe ? 'ring-amber-500 ring-offset-2' : 'ring-amber-700/60'
                    }`}
                    style={{ width: '74px', height: '74px', minWidth: '74px', minHeight: '74px' }}
                  >
                    <img src={top3.avatar} alt="Bronze" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <span className="absolute -top-1.5 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white text-xs flex items-center justify-center font-black shadow-sm ring-2 ring-white">
                    3
                  </span>
                  <img
                    src={t3Tier.badgeImage}
                    alt={t3Tier.name}
                    className="w-5 h-5 object-contain absolute -bottom-1 -left-1 filter drop-shadow-xs"
                    title={t3Tier.name}
                  />
                </div>

                <div className="flex items-center justify-center gap-1 w-full max-w-[100px]">
                  <span className="text-xs font-black text-slate-800 truncate">
                    {top3.name}
                  </span>
                  {top3.isMe && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-black shrink-0">
                      Bạn
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[90px]">
                  {t3Tier.name}
                </span>

                {/* Pillar #3 (Height 78px) */}
                <div
                  className="w-full bg-gradient-to-t from-orange-200 via-orange-100 to-orange-50 rounded-t-2xl mt-2 flex flex-col items-center justify-center p-1 border-t-2 border-orange-300 shadow-2xs"
                  style={{ height: '78px' }}
                >
                  <span className="text-xs font-black text-amber-950 leading-tight">
                    {score.value}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {score.unit}
                  </span>
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-white text-[9px] font-bold text-amber-800 shadow-2xs">
                    Hạng 3
                  </span>
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center text-center opacity-60">
              <span className="text-xl mb-1 text-slate-300">🥉</span>
              <div
                className="relative rounded-full shrink-0 p-0.5 border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300 mb-2"
                style={{ width: '74px', height: '74px', minWidth: '74px', minHeight: '74px' }}
              >
                <span className="text-2xl">🐾</span>
              </div>
              <span className="text-xs font-bold text-slate-400 truncate w-full">Chờ Ngư Thủ</span>
              <span className="text-[10px] text-slate-400">Chưa có</span>
              <div
                className="w-full bg-slate-100/70 rounded-t-2xl mt-2 flex flex-col items-center justify-center p-1 border-t border-slate-200"
                style={{ height: '78px' }}
              >
                <span className="text-[10px] text-slate-400 font-bold">Vị trí trống</span>
                <span className="mt-1 px-1.5 py-0.2 rounded-full bg-white text-[9px] font-bold text-slate-400 shadow-2xs">Hạng 3</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7. LEADERBOARD RANKED LIST (HẠNG 4 TRỞ ĐI) */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">
            Top Ngư Thủ Tiếp Theo (Hạng 4 – {Math.max(4, sortedPlayers.length)})
          </h3>
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span>Sắp xếp theo</span>
            {criterion === 'coins' ? (
              <span className="inline-flex items-center gap-0.5">
                <span>Xu</span>
                <img
                  src="/images/icon/xu-vang.webp"
                  alt="Xu"
                  className="w-3 h-3 object-contain inline-block shrink-0"
                  draggable={false}
                />
              </span>
            ) : criterion === 'level' ? (
              'Level ⭐'
            ) : (
              'XP ✨'
            )}
          </span>
        </div>

        {remainingPlayers.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-1.5">
            <span className="text-2xl">🎣</span>
            <p className="text-xs font-bold text-slate-600">
              Chưa có ngư thủ nào từ Hạng 4 trở đi
            </p>
            <p className="text-[11px] text-slate-400">
              Hãy mời bạn bè cùng đăng ký tài khoản để cùng nhau đua Top!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {remainingPlayers.map((player, idx) => {
              const rankNum = idx + 4;
              const playerTier = getRankTierByLevel(player.level);
              const score = renderScoreDisplay(player);

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    player.isMe
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 shadow-sm ring-2 ring-amber-300/40'
                      : 'bg-white rounded-xl shadow-2xs border border-slate-100 hover:border-orange-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-sm font-black text-slate-400 text-center shrink-0">
                      {rankNum}
                    </span>
                    <div
                      className="relative rounded-full bg-slate-100 p-0.5 shrink-0 overflow-hidden border border-slate-200"
                      style={{ width: '42px', height: '42px', minWidth: '42px', minHeight: '42px' }}
                    >
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-800 truncate">
                          {player.name}
                        </span>
                        {player.isMe && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img
                          src={playerTier.badgeImage}
                          alt={playerTier.name}
                          className="w-4 h-4 object-contain shrink-0"
                        />
                        <span className="text-[10px] text-slate-500 font-semibold truncate">
                          {playerTier.name} • Lv.{player.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs sm:text-sm font-black text-orange-950 block">
                      {score.value}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center justify-end gap-1">
                      {score.isCoins && (
                        <img
                          src="/images/icon/xu-vang.webp"
                          alt="Xu"
                          className="w-3 h-3 object-contain inline-block shrink-0"
                          draggable={false}
                        />
                      )}
                      <span>{score.unit}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 8. TOAST NOTIFICATION */}
      <div
        className={`fixed top-20 left-4 right-4 z-50 transform transition-all duration-300 max-w-md mx-auto ${
          showToast
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : '-translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900/95 text-white rounded-2xl p-3 shadow-xl flex items-center gap-2.5 border border-white/20">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">check</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white">{toastMessage.title}</p>
            <p className="text-[11px] text-slate-300 truncate">{toastMessage.subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
