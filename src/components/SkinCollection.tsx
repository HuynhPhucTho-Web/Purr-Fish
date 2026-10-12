import React from 'react';
import { SKINS, type CatSkin } from '../data/skins';
import { formatNumber } from '../utils/economy';

interface SkinCollectionProps {
  fish: number;
  unlockedSkins: string[];
  equippedSkin: string;
  onEquipSkin: (skinId: string) => void;
  onUnlockSkin: (skinId: string) => void;
  onClose?: () => void;
}

export const SkinCollection: React.FC<SkinCollectionProps> = ({
  fish,
  unlockedSkins,
  equippedSkin,
  onEquipSkin,
  onUnlockSkin,
  onClose,
}) => {
  return (
    <div className="skins-section">
      <div className="section-header">
        <div className="section-title-wrap">
          <span className="section-icon">🎨</span>
          <div>
            <h2 className="section-title">Bộ Sưu Tập Skin Mèo</h2>
            <p className="section-subtitle">
              Đã thu thập: <strong>{unlockedSkins.length}/{SKINS.length}</strong> chú mèo đáng yêu
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" className="close-section-btn" onClick={onClose} aria-label="Đóng bộ sưu tập">
            ✕
          </button>
        )}
      </div>

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
                    <svg viewBox="0 0 100 100" className="skin-avatar-svg">
                      {/* Ears */}
                      <polygon
                        points="20,40 10,18 35,26"
                        fill={skin.palette.fur}
                        stroke="#3A2A20"
                        strokeWidth="2.5"
                      />
                      <polygon
                        points="20,36 14,24 30,30"
                        fill={skin.palette.ears}
                      />
                      <polygon
                        points="80,40 90,18 65,26"
                        fill={skin.palette.fur}
                        stroke="#3A2A20"
                        strokeWidth="2.5"
                      />
                      <polygon
                        points="80,36 86,24 70,30"
                        fill={skin.palette.ears}
                      />

                      {/* Head */}
                      <circle
                        cx="50"
                        cy="55"
                        r="36"
                        fill={skin.palette.fur}
                        stroke="#3A2A20"
                        strokeWidth="3"
                      />

                      {/* Cheeks / Muzzle */}
                      <ellipse cx="50" cy="65" rx="18" ry="12" fill={skin.palette.belly} />

                      {/* Blushing */}
                      <circle cx="30" cy="62" r="5" fill={skin.palette.cheeks} opacity="0.6" />
                      <circle cx="70" cy="62" r="5" fill={skin.palette.cheeks} opacity="0.6" />

                      {/* Eyes */}
                      <circle cx="36" cy="52" r="6" fill={skin.palette.eyes} />
                      <circle cx="34" cy="50" r="2" fill="#FFF" />
                      <circle cx="64" cy="52" r="6" fill={skin.palette.eyes} />
                      <circle cx="62" cy="50" r="2" fill="#FFF" />

                      {/* Nose */}
                      <polygon points="50,62 47,59 53,59" fill={skin.palette.nose} />

                      {/* Mouth */}
                      <path
                        d="M45 64 Q 48 67 50 64 Q 52 67 55 64"
                        fill="none"
                        stroke="#3A2A20"
                        strokeWidth="2"
                      />

                      {/* Crown if royal */}
                      {skin.palette.accessory === 'crown' && (
                        <polygon
                          points="40,24 44,12 50,18 56,12 60,24"
                          fill="#FFD700"
                          stroke="#B8860B"
                          strokeWidth="1.5"
                        />
                      )}
                    </svg>
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
                      🐟 {formatNumber(skin.unlockCost)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
