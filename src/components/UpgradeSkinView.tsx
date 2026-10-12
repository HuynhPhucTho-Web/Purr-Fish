import React, { useState } from 'react';
import { UPGRADES } from '../data/upgrades';
import { SKINS, type CatSkin } from '../data/skins';
import { calculateUpgradeCost, formatNumber } from '../utils/economy';
import { soundManager } from '../utils/sound';

interface UpgradeSkinViewProps {
  fish: number; // coins
  upgrades: { [id: string]: number };
  unlockedSkins: string[];
  equippedSkin: string;
  defaultSubTab?: 'upgrades' | 'skins';
  onBuyUpgrade: (upgradeId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onUnlockSkin: (skinId: string) => void;
  onBackToCat: () => void;
}

export const UpgradeSkinView: React.FC<UpgradeSkinViewProps> = ({
  fish,
  upgrades,
  unlockedSkins,
  equippedSkin,
  defaultSubTab = 'upgrades',
  onBuyUpgrade,
  onEquipSkin,
  onUnlockSkin,
  onBackToCat,
}) => {
  const [subTab, setSubTab] = useState<'upgrades' | 'skins'>(defaultSubTab);

  return (
    <div className="view-page-container upgrade-skin-view">
      {/* Header */}
      <div className="view-header-bar">
        <div className="view-title-wrap">
          <span className="view-title-icon">⚡</span>
          <div>
            <h2 className="view-title">Nâng Cấp Kỹ Năng & Bộ Sưu Tập Skin</h2>
            <p className="view-subtitle">Gia tăng sức mạnh vuốt ve, câu cá và diện mạo đàn mèo</p>
          </div>
        </div>
        <button type="button" className="view-back-btn" onClick={onBackToCat} title="Quay lại phòng mèo">
          🐱 Về Mèo
        </button>
      </div>

      {/* Coins Banner */}
      <div className="shop-balance-banner">
        <span className="balance-icon">🪙</span>
        <span className="balance-label">Xu Vàng Hiện Có:</span>
        <strong className="balance-val">{formatNumber(fish)} Xu</strong>
      </div>

      {/* Subtabs Switcher */}
      <div className="view-subtabs-nav">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'upgrades' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('upgrades');
          }}
        >
          ⚡ Nâng Cấp Kỹ Năng
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'skins' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('skins');
          }}
        >
          🎨 Bộ Sưu Tập Skin ({unlockedSkins.length}/{SKINS.length})
        </button>
      </div>

      {/* SUBTAB 1: UPGRADES */}
      {subTab === 'upgrades' && (
        <div className="shop-section upgrades-tab-container">
          <div className="upgrades-list">
            {UPGRADES.map((item) => {
              const currentLevel = upgrades[item.id] || 0;
              const cost = calculateUpgradeCost(item.baseCost, currentLevel);
              const canAfford = fish >= cost;
              const progressPercent = Math.min(100, Math.floor((fish / cost) * 100));

              return (
                <div
                  key={item.id}
                  className={`upgrade-card ${canAfford ? 'can-afford' : 'cannot-afford'}`}
                >
                  <div className="upgrade-icon-wrap">
                    <span className="upgrade-icon">{item.icon}</span>
                    <span className="upgrade-level-badge">Lv. {currentLevel}</span>
                  </div>

                  <div className="upgrade-details">
                    <div className="upgrade-name-row">
                      <h3 className="upgrade-name">{item.name}</h3>
                    </div>
                    <p className="upgrade-desc">{item.description}</p>

                    <div className="upgrade-effect-pill">
                      {currentLevel > 0 ? (
                        <span>
                          {item.effectDescription(currentLevel)} ➔ <strong>{item.nextEffectDescription(currentLevel)}</strong>
                        </span>
                      ) : (
                        <span>
                          Mở khóa: <strong>{item.nextEffectDescription(0)}</strong>
                        </span>
                      )}
                    </div>

                    {!canAfford && (
                      <div className="cost-progress-bar-bg" title={`${progressPercent}% để nâng cấp`}>
                        <div
                          className="cost-progress-bar-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="upgrade-action">
                    <button
                      type="button"
                      className={`buy-upgrade-btn ${canAfford ? 'btn-active' : 'btn-disabled'}`}
                      disabled={!canAfford}
                      onClick={() => onBuyUpgrade(item.id)}
                    >
                      <span className="buy-fish-icon">🪙</span>
                      <span className="buy-cost-text">{formatNumber(cost)}</span>
                      <span className="buy-label">Nâng cấp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: SKINS */}
      {subTab === 'skins' && (
        <div className="skins-section skins-tab-container">
          <div className="skins-grid">
            {SKINS.map((skin: CatSkin) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isEquipped = equippedSkin === skin.id;
              const canAfford = fish >= skin.unlockCost;

              return (
                <div
                  key={skin.id}
                  className={`skin-card ${isEquipped ? 'skin-card-equipped' : ''} ${
                    !isUnlocked ? 'skin-card-locked' : ''
                  }`}
                >
                  {/* Mini Avatar Preview */}
                  <div
                    className="skin-preview-box"
                    style={{ backgroundColor: `${skin.palette.furLight}33` }}
                  >
                    <div className="skin-avatar-wrapper">
                      {skin.image ? (
                        <img
                          src={skin.image}
                          alt={skin.name}
                          className="skin-real-avatar-img"
                          draggable={false}
                        />
                      ) : (
                        <div className="skin-icon-fallback">{skin.icon}</div>
                      )}
                    </div>

                    {isEquipped && <span className="equipped-tag">Đang dùng</span>}
                  </div>

                  {/* Skin Info */}
                  <div className="skin-card-info">
                    <div className="skin-name-row">
                      <h3 className="skin-name">
                        <span className="skin-icon">{skin.icon}</span> {skin.name}
                      </h3>
                    </div>
                    <p className="skin-subtitle">{skin.subtitle}</p>
                    <p className="skin-desc">{skin.description}</p>

                    {/* Perk Badge */}
                    <div className="skin-perk-badge">
                      <span className="perk-star">⭐</span>
                      <span className="perk-text">{skin.perk}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="skin-card-action">
                    {isEquipped ? (
                      <button type="button" className="skin-btn-active" disabled>
                        ✓ Đang sử dụng
                      </button>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        className="skin-btn-select"
                        onClick={() => onEquipSkin(skin.id)}
                      >
                        🐾 Chọn mèo này
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`skin-btn-unlock ${canAfford ? 'can-buy' : 'cannot-buy'}`}
                        disabled={!canAfford}
                        onClick={() => onUnlockSkin(skin.id)}
                      >
                        <span>Mở khóa</span>
                        <span className="unlock-price">
                          🪙 {formatNumber(skin.unlockCost)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
