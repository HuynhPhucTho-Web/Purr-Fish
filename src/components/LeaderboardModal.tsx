import React, { useState, useEffect } from 'react';
import { leaderboardService, type LeaderboardEntry } from '../services/leaderboardService';
import { RANK_TIERS, type RankTier } from '../data/rankTiers';
import { formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface LeaderboardModalProps {
  myLevel: number;
  myXp: number;
  myRankTier: RankTier;
  myDisplayName: string;
  myBiggestFishKg: number;
  myCoins: number;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  myLevel,
  myXp,
  myRankTier,
  myDisplayName,
  myBiggestFishKg,
  myCoins,
  onClose,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ranks' | 'info'>('ranks');

  const fetchBoard = async () => {
    setIsLoading(true);
    try {
      const data = await leaderboardService.getTopLeaderboard(50);
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleRefresh = () => {
    soundManager.playPop();
    fetchBoard();
  };

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal-card leaderboard-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🏆</span>
            <div>
              <h3>Bảng Xếp Hạng Thăng Cấp Level</h3>
              <p className="modal-subtext">Hệ thống Xếp Hạng Bậc Rank Toàn Cầu</p>
            </div>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="refresh-btn"
              onClick={handleRefresh}
              title="Làm mới bảng xếp hạng"
            >
              🔄
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Tab switch: Bảng Xếp Hạng vs 6 Bậc Rank */}
        <div className="leaderboard-tabs-nav">
          <button
            type="button"
            className={`lb-nav-tab ${activeTab === 'ranks' ? 'tab-active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('ranks');
            }}
          >
            🥇 Top Cao Thủ
          </button>
          <button
            type="button"
            className={`lb-nav-tab ${activeTab === 'info' ? 'tab-active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('info');
            }}
          >
            🎖️ 6 Bậc Rank & Cấp Độ
          </button>
        </div>

        <div className="modal-body leaderboard-modal-body">
          {activeTab === 'ranks' ? (
            <div className="leaderboard-list-wrapper">
              {isLoading ? (
                <div className="lb-loading-state">
                  <span className="loading-spinner">🌀</span>
                  <p>Đang tải bảng vàng cao thủ từ Cloud...</p>
                </div>
              ) : (
                <div className="leaderboard-rows">
                  {entries.map((item, index) => {
                    const rankNum = index + 1;
                    const isTop1 = rankNum === 1;
                    const isTop2 = rankNum === 2;
                    const isTop3 = rankNum === 3;

                    return (
                      <div
                        key={item.uid || index}
                        className={`leaderboard-row ${isTop1 ? 'top-1' : isTop2 ? 'top-2' : isTop3 ? 'top-3' : ''}`}
                      >
                        <div className="row-rank-badge">
                          {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rankNum}`}
                        </div>

                        <div className="row-user-info">
                          <div className="row-name-line">
                            <span className="user-name">{item.displayName || 'Người Nuôi Mèo'}</span>
                            <span
                              className="rank-tier-pill"
                              style={{
                                background:
                                  RANK_TIERS[item.rankTierKey as keyof typeof RANK_TIERS]?.gradient ||
                                  '#6B7280',
                              }}
                            >
                              {item.rankBadge || '⚪'} {item.rankTierName || 'Tập Sự'}
                            </span>
                          </div>
                          <div className="row-sub-stats">
                            <span className="stat-stage">🐱 {item.catStageLabel || 'Mèo Nuôi'}</span>
                            <span className="stat-fish">🐟 Kỷ lục: {item.biggestFishKg || 0} kg</span>
                          </div>
                        </div>

                        <div className="row-level-badge">
                          <span className="level-num">Lv.{item.level}</span>
                          <span className="xp-num">{formatNumber(item.xp)} XP</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rank-tiers-showcase">
              <p className="tiers-intro">
                Cày cấp Level và cho mèo ăn các loại sơn hào hải vị để thăng hạng qua 6 Bậc Rank danh giá:
              </p>
              <div className="tiers-cards-grid">
                {Object.values(RANK_TIERS).map((tier) => (
                  <div
                    key={tier.key}
                    className="tier-info-card"
                    style={{ borderColor: tier.color }}
                  >
                    <div className="tier-card-header" style={{ background: tier.gradient }}>
                      <span className="tier-badge-icon">{tier.badge}</span>
                      <h4 className="tier-name">{tier.name}</h4>
                    </div>
                    <div className="tier-card-body">
                      <div className="tier-spec">
                        <strong>Cấp độ:</strong> Lv {tier.minLevel} - {tier.maxLevel >= 999 ? '100+' : tier.maxLevel}
                      </div>
                      <div className="tier-spec">
                        <strong>XP Cần:</strong> {formatNumber(tier.minXp)} - {tier.maxXp >= 999999 ? '50,000+' : formatNumber(tier.maxXp)} XP
                      </div>
                      <p className="tier-desc">{tier.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky My Rank Bar */}
        <div className="my-rank-sticky-footer">
          <div className="my-rank-left">
            <span className="my-label">Thứ hạng của bạn:</span>
            <span
              className="my-tier-badge"
              style={{ background: myRankTier.gradient }}
            >
              {myRankTier.badge} {myRankTier.name}
            </span>
          </div>

          <div className="my-rank-center">
            <strong className="my-name">{myDisplayName || 'Tôi'}</strong>
            <span className="my-fish-record">🐟 Kỷ lục: {myBiggestFishKg} kg</span>
          </div>

          <div className="my-rank-right">
            <div className="my-level-tag">Lv.{myLevel}</div>
            <div className="my-xp-tag">{formatNumber(myXp)} XP • 🪙 {formatNumber(myCoins)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
