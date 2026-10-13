import React, { useState, useMemo } from 'react';
import type { RankTier } from '../data/rankTiers';
import type { CatSkin } from '../data/skins';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

export interface LeaderboardViewProps {
  myLevel: number;
  myXp: number;
  myRankTier: RankTier;
  myDisplayName?: string;
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
}

type FilterTab = 'week' | 'all' | 'record';

interface PodiumPlayer {
  rank: 1 | 2 | 3;
  name: string;
  level: number;
  avatar: string;
  skinTitle?: string;
  recordFish?: string;
  scoreDisplay: string;
  fishCount: number;
}

interface RankedPlayer {
  rank: number;
  name: string;
  level: number;
  avatar: string;
  recordText: string;
  fishCount: number;
}

// Chibi avatar links from template
const AVATARS = {
  first:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBvDknMYsVS0gPMaOvp5fVCsL7TZ5vDd1_RrMOAF1gsgg8HVu1wJv31iwdgG-Ija8lJ4fNYQuf8w9d69u0Qt6obw12v3M38YeIBB2wY1aVBBVyfK-PkMjY9WXffMJWZHAk1C0gVxfnoDg9SxuPGqBRloH4sllMYAcYsZEv22SHtDse6yvduwmcPh0qdJet5pFzocPW1z2Jr43pcx8E0OFLjb0GnYB6-QMtcYa03axRa2TQhdt_DGH8nIg',
  second:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBmP3ppPhQ-OtTnxibrF5ulZhAX3woNjJXqWbAUFDTYaibJMWS3nTg0sIU8yZE1_c6hOo4mIGwFEGVyOuzHT_CTvTmN6N1C6n7aaRaLxRLwhSZK39t5wXlee5mYDHS61Ls_jzBQRu9P3tOkvR4rB0hELYy0PwpRhlAjsxqXEp92WqgEQTRj30DD2zQqpz6fGJJXwYAsYMailYQrYBH7CQurF8Z2fXa07MWJGprh6CEXYvrZ8aw0PdGUQQ',
  third:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBQMgM_dJcKbRqVw7oTumJKtQtKs8eXvk37cr_4mCU-gIpiq9uzfd5Rydb92_1KaA3biKxr3W2gNBvn8FNA_CZudNHky9hBffOk1aNOamvc9uv2HLJc-gxOQkdQ1OyfXqYGBKIygqrgUzkAwtexYruH_p5-KS46RySUUeSxkbn5klYWpSdmGnz7dFAIBel3Kuc9tc8YoNDHx-eiTwGWCa5JXpfUOVquuxYBbH058-n34EDJaAv_VDazPQ',
  rank4:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCT2cGM2R4qGUgUho0KLaie6FgKqPpDl_2fNAia409WQWSFpqk7BQ5bYIKaNSyYLoKCIY2IYDNosJdwO8KQhUhKf_awTlivzzQtNTxxnv-OD1XpvPdeWZl1FxS2YdusmlMN6_0_PP_j14tmnE5P8297ZxZ8MXKbUEIEpsLoLUALxmgBOJF6FrURWew5unJW6BZvegFAFsHjnTJAEuP79_R2IVGiNCTR47NnY8w8BUn7oggBsG_WKNC1gw',
  rank5:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-OK0tMPXcZPnwEVjsOT9cF66X_5bqTQRArHjMoKDKaa422o8Rp8BuRK85lb32L2MaJYUgbsvH8_W8A8DOFxmLinn7C7OuinExr7HYPoX7fR1mB8MhEIm8tQj__ciRfOweMdYKILAg6y9wAC-JYCqZqLCF6VCm6ELT94NBfZIlVDmYynxBPRNaJNoDyNMOwTwzbMKeUyQP-c1nukOGANGhp578y9Ww4mBkA43JcJleWxSqgeOj3IN8_g',
  rank6:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAQPIVX_yZvn4mAVjQdrg03KcI6ZV1nNA0T1LjKC1he4C_11G_XCBFLODHJdfiA3vrevD5cUJaMfnmVT8S2gGHW7gH9Tl1nPd52jYd_n-IHIfaX6a6xT2bogC5BZYuMJTbBWtPm8dq1Xum0pkTLFkLj4JlRRBLCkq5Jl3Pu6Xb4zP9mfrQYZdBtR_E4j0jFay4F_3LXLq58gEEKniAwMgkL55jSWZMK9WqC4dekUbHaFU5MQMFgXOGaAQ',
  rank7:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDf2E6ldbO4SOlmCo6ycplyzndwuSEbkjFu9w-OVdSqqlYBA0rWl1ICmQc3_MxY3DIsggAxNZk05unPl3cm1GnPOTSlxmvoPgMFPsbb7eCpNr5QF_D4Ae9uv5Q2mDuZkhe9UBU_gxOllN-vuVEcLGFwod6GpLn5ryRyfDtdFQWYKAW-r8N2bylWyPDvjsIdaK6bFYN-p2SP_yMUxJJ9zLTgvWnthb2U9qoljCzVdOgA_vXU7YYuIGTsOA',
  rank8:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBG1olXpVxzNXxUhqimAar6tw5XFkG9l_Uobpv4M_scISTs6I6XFpQ2_3SH-hiIJHtBA7ZZRtqldFEYJi2DZcWJqJ4VneU6BEtmNrRFI6vpy3Z2T6R1WpFjCo4ls4pJe9Uk0Tj2_Xm5QaaK4voQNw-tRXhPgiKw5mCgYqWeCwEgWVYh9D7-sBXYw1vWbkSmrDrXIGOpyZH2VyeQLEA0anNONSICRQxjZrYqPJAsJm_WSUPvrkm9p9htYA',
  player:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDnIUH5f2ufen8MJIqXzH_MpCUmQd9KO7_mKe6IgG1XDlfKD71lXtLxo4SCAPUy-XqN96doTMXcU_0uBfLb2LbzmazLx4YB2e-W22FK9W3Fh5Zy2C9dLy3WIfDoG1FKa2cCnmkHPz2dt176ONSgclT_YPhcBiWZu0Oaq-PlMQ-eH0imv-YjwF_5d5k-O5TauiRJueW3nRIzTO8-9U2W3c3dUAEiP5L1Bi0Iu9xGsOA_LzYiQ5HxwEqJRQ',
  trophy:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC7ODlT-kecUwJ4HpIE50zfZUZ2O0C_j9Nl5r_gqfjqrgxh8DT0QQ-9BKPNxGKY8nYy4M_WGbbQ8-bzSjMg61zUFbKGqTw80X6_pxJlj7PzS2VN9_VDnczEIzvB00XFQWsqYTNTCFuXwDqSJ65tbQJ8xU0QQD-f820PRwGzlYR13U_zme2cxReqLhnhfXPtwJIM5vIdvvcUCB5KL-aGLvQZHMxc3nRoq4tjyyVAlAe1asFlLUv5uNKMeg',
};

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  myLevel,
  myXp,
  myRankTier,
  myDisplayName = 'Bạn (Ngư Thủ Cá Bự)',
  myBiggestFishKg = 12.5,
  currentSkin,
  totalFishCaught = 148250,
  saveStatus = 'Đã đồng bộ an toàn',
  onSaveNow,
  onSyncCloudNow,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('week');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState({
    title: 'Đồng Bộ Thành Công!',
    subtitle: `${formatNumber(totalFishCaught)} cá & tiến trình Rank #42 đã sao lưu đám mây.`,
  });

  // Sync Status display
  const syncTimeText = useMemo(() => {
    if (saveStatus && saveStatus.includes('Đã lưu')) return saveStatus;
    return 'Đã đồng bộ an toàn';
  }, [saveStatus]);

  // Rank position (Hypothetical rank)
  const myPosition = useMemo(() => {
    if (myXp > 50000) return 3;
    if (myXp > 25000) return 8;
    if (myXp > 10000) return 19;
    return 42;
  }, [myXp]);

  // Tab change
  const handleTabClick = (tab: FilterTab) => {
    soundManager.playPop();
    setFilterTab(tab);
  };

  // Refresh
  const handleRefresh = () => {
    soundManager.playPop();
    setToastMessage({
      title: 'Bảng Xếp Hạng Đã Cập Nhật!',
      subtitle: 'Dữ liệu ngư thủ toàn cầu đã được đồng bộ mới nhất.',
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2400);
  };

  // Cloud Save Now action
  const handleSaveNow = async () => {
    soundManager.playPop();
    if (onSaveNow) onSaveNow();
    if (onSyncCloudNow) {
      try {
        await onSyncCloudNow();
      } catch {
        // Handled internally
      }
    }
    soundManager.playUpgrade();
    setToastMessage({
      title: 'Đồng Bộ Thành Công!',
      subtitle: `${formatNumber(totalFishCaught)} cá & tiến trình Rank #${myPosition} đã sao lưu đám mây.`,
    });
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3200);
  };

  // Podium Data based on active tab
  const podiumData: { first: PodiumPlayer; second: PodiumPlayer; third: PodiumPlayer } = useMemo(() => {
    if (filterTab === 'all') {
      return {
        first: {
          rank: 1,
          name: 'Mèo Hoàng Gia',
          level: 105,
          avatar: AVATARS.first,
          skinTitle: 'Huyền Thoại (Legend)',
          recordFish: 'Cá Voi Sát Thủ 58.4kg',
          scoreDisplay: '15.4M',
          fishCount: 15450000,
        },
        second: {
          rank: 2,
          name: 'Boss Mèo Tuxedo',
          level: 88,
          avatar: AVATARS.second,
          skinTitle: 'Kim Cương (Diamond)',
          scoreDisplay: '9,890K',
          fishCount: 9890000,
        },
        third: {
          rank: 3,
          name: 'MiuMiuQueen',
          level: 74,
          avatar: AVATARS.third,
          skinTitle: 'Quý Tộc Thần Thánh',
          scoreDisplay: '7,200K',
          fishCount: 7200000,
        },
      };
    }

    if (filterTab === 'record') {
      return {
        first: {
          rank: 1,
          name: 'Mèo Hoàng Gia',
          level: 105,
          avatar: AVATARS.first,
          skinTitle: 'Thợ Câu Vĩ Đại',
          recordFish: 'Cá Voi Kỷ Lục 58.4kg',
          scoreDisplay: '58.4 kg',
          fishCount: 15450000,
        },
        second: {
          rank: 2,
          name: 'Boss Mèo Tuxedo',
          level: 88,
          avatar: AVATARS.second,
          skinTitle: 'Chiến Tướng Biển Sâu',
          scoreDisplay: '49.2 kg',
          fishCount: 9890000,
        },
        third: {
          rank: 3,
          name: 'MiuMiuQueen',
          level: 45,
          avatar: AVATARS.third,
          skinTitle: 'Nữ Hoàng Biển Cả',
          scoreDisplay: '48.2 kg',
          fishCount: 2450000,
        },
      };
    }

    // Default: 'week'
    return {
      first: {
        rank: 1,
        name: 'MiuMiuQueen',
        level: 45,
        avatar: AVATARS.first,
        skinTitle: 'Mèo Tuxedo Quý Tộc',
        recordFish: 'Cá Vua 48.2kg',
        scoreDisplay: '2,450K',
        fishCount: 2450000,
      },
      second: {
        rank: 2,
        name: 'CatWhisperer',
        level: 31,
        avatar: AVATARS.second,
        skinTitle: 'Thợ Câu Rừng Sâu',
        scoreDisplay: '1,890,000',
        fishCount: 1890000,
      },
      third: {
        rank: 3,
        name: 'HoàngThượngBéo',
        level: 28,
        avatar: AVATARS.third,
        skinTitle: 'Đầu Bếp Sushi',
        scoreDisplay: '1,420,000',
        fishCount: 1420000,
      },
    };
  }, [filterTab]);

  // Ranked List (4th - 10th) based on active tab
  const rankedPlayers: RankedPlayer[] = useMemo(() => {
    if (filterTab === 'all') {
      return [
        {
          rank: 4,
          name: 'Thợ Câu Đại Dương',
          level: 68,
          avatar: AVATARS.rank4,
          recordText: 'Cá Mập Trắng: 36.5kg',
          fishCount: 5430000,
        },
        {
          rank: 5,
          name: 'CatWhisperer',
          level: 58,
          avatar: AVATARS.rank5,
          recordText: 'Cá Ngừ Đại Dương: 32.5kg',
          fishCount: 4120000,
        },
        {
          rank: 6,
          name: 'HoàngThượngBéo',
          level: 52,
          avatar: AVATARS.rank6,
          recordText: 'Cá Trê Bự: 28.1kg',
          fishCount: 3450000,
        },
        {
          rank: 7,
          name: 'Mèo Mướp Tinh Nhuệ',
          level: 46,
          avatar: AVATARS.rank7,
          recordText: 'Cá Chép Hồng: 25.4kg',
          fishCount: 2890000,
        },
        {
          rank: 8,
          name: 'ThíchĂnCáNướng',
          level: 41,
          avatar: AVATARS.rank8,
          recordText: 'Cá Vàng Kỷ Lục: 22.8kg',
          fishCount: 2120000,
        },
      ];
    }

    if (filterTab === 'record') {
      return [
        {
          rank: 4,
          name: 'Thợ Câu Đại Dương',
          level: 68,
          avatar: AVATARS.rank4,
          recordText: 'Cá Mập Trắng: 36.5kg',
          fishCount: 5430000,
        },
        {
          rank: 5,
          name: 'CatWhisperer',
          level: 31,
          avatar: AVATARS.rank5,
          recordText: 'Cá Hề Khổng Lồ: 32.5kg',
          fishCount: 1890000,
        },
        {
          rank: 6,
          name: 'HoàngThượngBéo',
          level: 28,
          avatar: AVATARS.rank6,
          recordText: 'Cá Trê Bự: 28.1kg',
          fishCount: 1420000,
        },
        {
          rank: 7,
          name: 'Mèo Mướp Tinh Nhuệ',
          level: 42,
          avatar: AVATARS.rank7,
          recordText: 'Cá Chép Hồng: 25.4kg',
          fishCount: 1850000,
        },
        {
          rank: 8,
          name: 'ThíchĂnCáNướng',
          level: 25,
          avatar: AVATARS.rank8,
          recordText: 'Cá Vàng Kỷ Lục: 22.8kg',
          fishCount: 1120400,
        },
      ];
    }

    // Default 'week'
    return [
      {
        rank: 4,
        name: 'ThíchĂnCáNướng',
        level: 25,
        avatar: AVATARS.rank4,
        recordText: 'Cá Vàng Kỷ Lục: 22.8kg',
        fishCount: 1120400,
      },
      {
        rank: 5,
        name: 'HắcMiuSátThủ',
        level: 24,
        avatar: AVATARS.rank5,
        recordText: 'Cá Vàng Kỷ Lục: 19.5kg',
        fishCount: 985600,
      },
      {
        rank: 6,
        name: 'CôngChúaBông',
        level: 22,
        avatar: AVATARS.rank6,
        recordText: 'Cá Vàng Kỷ Lục: 18.2kg',
        fishCount: 840120,
      },
      {
        rank: 7,
        name: 'MèoDâuTây',
        level: 20,
        avatar: AVATARS.rank7,
        recordText: 'Cá Vàng Kỷ Lục: 16.9kg',
        fishCount: 762000,
      },
      {
        rank: 8,
        name: 'BéNgáiNgủ',
        level: 19,
        avatar: AVATARS.rank8,
        recordText: 'Cá Vàng Kỷ Lục: 15.0kg',
        fishCount: 690450,
      },
    ];
  }, [filterTab]);

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto px-margin pb-8 gap-space-lg select-none">
      {/* 2. PLAYER PERSONAL RANK CARD */}
      <section className="bg-gradient-to-br from-primary-fixed to-surface-container rounded-lg p-space-md shadow-[0_6px_16px_rgba(165,59,41,0.12)] relative overflow-hidden border border-primary-fixed-dim/40">
        {/* Floating Ribbon Badge */}
        <div className="flex items-center justify-between pb-space-xs">
          <div className="flex items-center gap-1.5 bg-surface-container-lowest/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-[0_2px_6px_rgba(122,105,104,0.08)]">
            <span className="material-symbols-outlined text-tertiary text-[18px]">
              workspace_premium
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-bold">
              {myRankTier?.name || 'Hạng Vàng II'}
            </span>
            <span className="font-body-sm text-body-sm text-tertiary font-bold">
              ({myRankTier?.badge || 'Gold Paws'})
            </span>
          </div>
          <div className="bg-primary text-on-primary font-label-md text-label-md px-3 py-1 rounded-full shadow-[0_2px_4px_rgba(165,59,41,0.25)] flex items-center gap-1">
            <span>Vị trí:</span>
            <span className="font-headline-sm text-headline-sm tracking-tight font-bold">
              #{myPosition}
            </span>
            <span className="font-label-sm text-label-sm opacity-90">/ 12.5k</span>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex items-center gap-space-md pt-2">
          {/* Player Chibi Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-surface-container-lowest p-1 shadow-[0_4px_10px_rgba(122,105,104,0.18)]">
              <img
                src={currentSkin?.image || AVATARS.player}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 font-bold">
              <span className="material-symbols-outlined text-[10px]">star</span>
              Lv.{myLevel}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-headline-sm text-headline-sm text-on-surface truncate font-bold">
                {myDisplayName}
              </h2>
              <span className="material-symbols-outlined text-secondary text-[16px]">
                verified
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-primary text-[14px]">styler</span>
              Skin đang mặc:{' '}
              <span className="text-primary font-bold">
                {currentSkin?.name || 'Mèo Cam Vui Vẻ'}
              </span>
            </p>
          </div>
        </div>

        {/* Personal Metrics Grid */}
        <div className="grid grid-cols-2 gap-space-xs mt-space-md bg-surface-container-lowest/90 backdrop-blur-sm rounded-DEFAULT p-space-sm shadow-[inset_0_1px_3px_rgba(122,105,104,0.06)] border border-outline-variant/30">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-secondary-container text-[18px]">
                set_meal
              </span>
            </div>
            <div className="min-w-0">
              <span className="font-body-sm text-body-sm text-on-surface-variant block text-xs">
                Tổng cá đã câu
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                {formatNumber(totalFishCaught)} 🐟
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-tertiary-fixed text-[18px]">
                trophy
              </span>
            </div>
            <div className="min-w-0">
              <span className="font-body-sm text-body-sm text-on-surface-variant block text-xs">
                Cá lớn nhất
              </span>
              <span className="font-headline-sm text-headline-sm text-tertiary font-bold truncate">
                {myBiggestFishKg > 0 ? myBiggestFishKg.toFixed(1) : '12.5'} kg
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant block truncate">
                Cá Ngừ Khổng Lồ
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEASONAL REWARD SPOTLIGHT */}
      <section className="bg-tertiary-fixed/30 rounded-lg p-space-md shadow-[0_4px_12px_rgba(202,157,69,0.15)] flex items-center gap-space-md relative overflow-hidden border border-tertiary-fixed-dim/40">
        <div className="w-12 h-12 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 shadow-inner">
          <span className="material-symbols-outlined text-[26px]">stars</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-label-lg text-label-lg text-on-tertiary-container font-bold">
              Phần Thưởng Mùa Giải
            </span>
            <span className="bg-tertiary text-on-tertiary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
              Top 100
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
            Còn <strong className="text-primary font-bold">3 ngày 14 giờ</strong> để nhận{' '}
            <span className="font-bold text-tertiary">
              Khung Avatar Mèo Thần Tài Kim Tiền
            </span>!
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-lowest p-1 shrink-0 shadow-sm">
          <img
            src={AVATARS.trophy}
            alt="Trophy"
            className="w-full h-full object-contain"
          />
        </div>
      </section>

      {/* 4. FILTER TABS (SQUISHY TOGGLE) */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <span className="font-label-lg text-label-lg text-on-surface flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-primary text-[18px]">
              leaderboard
            </span>{' '}
            Bảng Vinh Danh
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveNow}
              className="font-body-sm text-body-sm text-secondary hover:text-primary flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title={syncTimeText}
            >
              <span className="material-symbols-outlined text-[15px]">cloud_sync</span>
              <span>Đồng bộ Rank</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 p-1 bg-surface-container-high rounded-full shadow-[inset_0_2px_4px_rgba(122,105,104,0.1)] gap-1">
          <button
            type="button"
            onClick={() => handleTabClick('week')}
            className={`filter-tab py-1.5 px-2 rounded-full font-label-md text-label-md text-center transition-all cursor-pointer font-bold ${
              filterTab === 'week'
                ? 'bg-surface-container-lowest text-primary shadow-[0_2px_6px_rgba(122,105,104,0.12)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('all')}
            className={`filter-tab py-1.5 px-2 rounded-full font-label-md text-label-md text-center transition-all cursor-pointer font-bold ${
              filterTab === 'all'
                ? 'bg-surface-container-lowest text-primary shadow-[0_2px_6px_rgba(122,105,104,0.12)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Mọi thời đại
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('record')}
            className={`filter-tab py-1.5 px-2 rounded-full font-label-md text-label-md text-center transition-all cursor-pointer truncate font-bold ${
              filterTab === 'record'
                ? 'bg-surface-container-lowest text-primary shadow-[0_2px_6px_rgba(122,105,104,0.12)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Cá Kỷ Lục
          </button>
        </div>
      </section>

      {/* 5. TOP 3 PODIUM SHOWCASE (ASYMMETRIC VISUAL STAGING) */}
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_6px_20px_rgba(122,105,104,0.08)] flex flex-col gap-space-md border border-outline-variant/30">
        <div className="text-center">
          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Top 3 Bục Vinh Quang
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Huyền thoại câu cá siêu cấp của đảo Mèo
          </p>
        </div>

        {/* Podium Staging Grid (Silver 2nd, Gold 1st Center Elevated, Bronze 3rd) */}
        <div className="grid grid-cols-3 items-end gap-2 pt-4 pb-2">
          {/* 2ND PLACE (SILVER) */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-full bg-surface-container-high p-1 shadow-[0_3px_10px_rgba(122,105,104,0.15)] ring-2 ring-surface-variant">
                <img
                  src={podiumData.second.avatar}
                  alt="Silver"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -top-2 -left-1 w-6 h-6 rounded-full bg-surface-variant text-on-surface font-label-sm text-label-sm flex items-center justify-center shadow-md font-bold">
                2
              </span>
              <span className="material-symbols-outlined text-outline absolute -bottom-1 -right-1 text-[18px]">
                military_tech
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface truncate w-full font-bold">
              {podiumData.second.name}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Lv.{podiumData.second.level}
            </span>

            {/* Pillar #2 */}
            <div className="w-full h-24 bg-surface-container rounded-t-lg mt-2 flex flex-col items-center justify-center p-1 shadow-inner">
              <span className="font-label-sm text-label-sm text-primary font-bold">
                {formatNumber(podiumData.second.fishCount)}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
                🐟 Cá
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded-full bg-surface-container-lowest font-label-sm text-label-sm text-outline font-bold">
                Bạc
              </span>
            </div>
          </div>

          {/* 1ST PLACE (GOLD - Tallest & Decorated) */}
          <div className="flex flex-col items-center text-center -mt-4">
            {/* Floating Gold Crown */}
            <span className="material-symbols-outlined text-tertiary-container text-[28px] animate-bounce mb-0.5">
              crown
            </span>
            <div className="relative mb-2">
              <div className="w-18 h-18 rounded-full bg-tertiary-fixed p-1.5 shadow-[0_6px_14px_rgba(202,157,69,0.35)] ring-4 ring-tertiary-container/30">
                <img
                  src={podiumData.first.avatar}
                  alt="Gold"
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
              <span className="absolute -top-2 -right-1 w-7 h-7 rounded-full bg-tertiary-container text-on-tertiary-container font-headline-sm text-headline-sm flex items-center justify-center shadow-md font-bold">
                1
              </span>
            </div>
            <span className="font-label-lg text-label-lg text-primary truncate w-full font-bold">
              {podiumData.first.name}
            </span>
            <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.2 rounded-full mt-0.5 font-bold truncate max-w-[110px]">
              {podiumData.first.skinTitle || 'Mèo Tuxedo Quý Tộc'}
            </span>
            <span className="font-body-sm text-body-sm text-tertiary font-bold mt-0.5 truncate max-w-[110px]">
              {podiumData.first.recordFish || 'Cá Vua 48.2kg'}
            </span>

            {/* Pillar #1 */}
            <div className="w-full h-32 bg-tertiary-fixed/60 rounded-t-lg mt-2 flex flex-col items-center justify-center p-1 shadow-[inset_0_2px_4px_rgba(202,157,69,0.2)]">
              <span className="font-headline-sm text-headline-sm text-on-tertiary-fixed font-bold leading-none">
                {podiumData.first.scoreDisplay}
              </span>
              <span className="font-body-sm text-body-sm text-tertiary text-[11px] font-bold">
                🐟 Tổng Cá
              </span>
              <span className="mt-2 px-2.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-bold shadow-sm whitespace-nowrap">
                👑 Quán Quân
              </span>
            </div>
          </div>

          {/* 3RD PLACE (BRONZE) */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-full bg-surface-container-high p-1 shadow-[0_3px_10px_rgba(122,105,104,0.15)] ring-2 ring-outline-variant">
                <img
                  src={podiumData.third.avatar}
                  alt="Bronze"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-outline-variant text-on-surface font-label-sm text-label-sm flex items-center justify-center shadow-md font-bold">
                3
              </span>
              <span className="material-symbols-outlined text-outline text-[18px] absolute -bottom-1 -left-1">
                emoji_events
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface truncate w-full font-bold">
              {podiumData.third.name}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Lv.{podiumData.third.level}
            </span>

            {/* Pillar #3 */}
            <div className="w-full h-20 bg-surface-container-highest rounded-t-lg mt-2 flex flex-col items-center justify-center p-1 shadow-inner">
              <span className="font-label-sm text-label-sm text-primary font-bold">
                {formatNumber(podiumData.third.fishCount)}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
                🐟 Cá
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded-full bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant font-bold">
                Đồng
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LEADERBOARD RANKED LIST (4TH - 10TH) */}
      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
            Top Ngư Thủ Tiếp Theo
          </h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Hạng 4 – {rankedPlayers.length + 3}
          </span>
        </div>

        <div className="flex flex-col gap-space-xs" id="rank-list">
          {rankedPlayers.map((player) => (
            <div
              key={player.rank}
              className="flex items-center justify-between p-space-sm bg-surface-container-lowest rounded-DEFAULT shadow-[0_2px_8px_rgba(122,105,104,0.06)] active:scale-[0.99] transition-transform border border-outline-variant/30"
            >
              <div className="flex items-center gap-space-sm">
                <span className="w-6 font-headline-sm text-headline-sm text-on-surface-variant text-center font-bold">
                  {player.rank}
                </span>
                <div className="relative w-11 h-11 rounded-full bg-surface-container p-0.5 shrink-0 ml-1">
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="min-w-0 ml-2">
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-label-md text-on-surface truncate font-bold">
                      {player.name}
                    </span>
                    <span className="font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded-full font-bold">
                      Lv.{player.level}
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px] text-tertiary">
                      military_tech
                    </span>{' '}
                    {player.recordText}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-label-lg text-label-lg text-primary font-bold">
                  {formatNumber(player.fishCount)}
                </span>
                <span className="block font-label-sm text-label-sm text-on-surface-variant">
                  🐟 Cá
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. TOAST NOTIFICATION */}
      <div
        className={`fixed top-20 left-4 right-4 z-50 transform transition-all duration-300 max-w-md mx-auto ${
          showToast
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : '-translate-y-24 opacity-0 pointer-events-none'
        }`}
        id="save-toast"
      >
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_12px_28px_rgba(74,62,61,0.2)] flex items-center gap-space-sm border-2 border-secondary-container">
          <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">cloud_done</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md text-on-surface font-bold">
              {toastMessage.title}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {toastMessage.subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
