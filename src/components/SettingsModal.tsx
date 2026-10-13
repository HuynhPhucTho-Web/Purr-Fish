import React, { useState } from 'react';
import type { GameSaveData } from '../utils/saveGame';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSaveData['settings'];
  onUpdateSettings: (newSettings: Partial<GameSaveData['settings']>) => void;
  onSaveNow: () => void;
  saveStatus: 'idle' | 'saved';
  onResetGame: () => void;
  onExportSave: () => string;
  onImportSave: (code: string) => boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSaveNow,
  saveStatus,
  onResetGame,
  onExportSave,
  onImportSave,
}) => {
  const [importCode, setImportCode] = useState('');
  const [exportCode, setExportCode] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [swingSpeed, setSwingSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('PURR_FISH_SWING_SPEED');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.3 && val <= 2.0) return val;
      }
    } catch {
      // fallback
    }
    return 1.0;
  });

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const handleExport = () => {
    const code = onExportSave();
    setExportCode(code);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        showFeedback('Đã sao chép mã lưu vào bộ nhớ tạm!', 'success');
      });
    } else {
      showFeedback('Mã lưu đã sẵn sàng trong khung bên dưới!', 'success');
    }
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    const success = onImportSave(importCode.trim());
    if (success) {
      showFeedback('Khôi phục dữ liệu thành công!', 'success');
      setImportCode('');
    } else {
      showFeedback('Mã lưu không hợp lệ. Vui lòng kiểm tra lại!', 'error');
    }
  };

  const handleConfirmReset = () => {
    onResetGame();
    setConfirmReset(false);
    showFeedback('Đã đặt lại tiến trình game về 0!', 'success');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-header-icon">⚙️</span>
            <h2 className="modal-title">Cài Đặt</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Đóng cài đặt">
            ✕
          </button>
        </div>

        {message && (
          <div className={`settings-banner banner-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-body">
          {/* Section 1: Âm thanh */}
          <section className="settings-section">
            <h3 className="section-label">🔊 Âm Thanh</h3>
            
            {/* SFX */}
            <div className="setting-item">
              <div className="setting-row">
                <span className="setting-name">Hiệu ứng (SFX)</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>
              {settings.soundEnabled && (
                <div className="setting-slider-row">
                  <span className="slider-icon">🔉</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.sfxVolume ?? 80}
                    onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })}
                    className="volume-slider"
                  />
                  <span className="slider-val">{settings.sfxVolume ?? 80}%</span>
                </div>
              )}
            </div>

            {/* BGM */}
            <div className="setting-item">
              <div className="setting-row">
                <span className="setting-name">Nhạc nền (BGM)</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.musicEnabled ?? true}
                    onChange={(e) => onUpdateSettings({ musicEnabled: e.target.checked })}
                  />
                  <span className="slider round" />
                </label>
              </div>
              {(settings.musicEnabled ?? true) && (
                <div className="setting-slider-row">
                  <span className="slider-icon">🎼</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.musicVolume ?? 50}
                    onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
                    className="volume-slider"
                  />
                  <span className="slider-val">{settings.musicVolume ?? 50}%</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Hiệu ứng & Điều khiển */}
          <section className="settings-section">
            <h3 className="section-label">✨ Hiệu Ứng & Điều Khiển</h3>

            <div className="setting-row">
              <span className="setting-name">Hiệu ứng hạt</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.particlesEnabled}
                  onChange={(e) => onUpdateSettings({ particlesEnabled: e.target.checked })}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="setting-row">
              <span className="setting-name">Rung phản hồi</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.hapticsEnabled}
                  onChange={(e) => onUpdateSettings({ hapticsEnabled: e.target.checked })}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="setting-row">
              <span className="setting-name">Đồ họa mèo</span>
              <div className="theme-toggle-btns">
                <button
                  type="button"
                  className={`theme-pill ${settings.visualTheme === 'cute_cartoon' ? 'pill-active' : ''}`}
                  onClick={() => onUpdateSettings({ visualTheme: 'cute_cartoon' })}
                >
                  Hoạt Họa
                </button>
                <button
                  type="button"
                  className={`theme-pill ${settings.visualTheme === 'sticker_art' ? 'pill-active' : ''}`}
                  onClick={() => onUpdateSettings({ visualTheme: 'sticker_art' })}
                >
                  Sticker
                </button>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-row">
                <span className="setting-name">Tốc độ quay cần</span>
                <span className="slider-val">{swingSpeed.toFixed(1)}x</span>
              </div>
              <div className="setting-slider-row">
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={swingSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSwingSpeed(val);
                    localStorage.setItem('PURR_FISH_SWING_SPEED', val.toString());
                  }}
                  className="volume-slider"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Sao lưu */}
          <section className="settings-section">
            <h3 className="section-label">💾 Dữ Liệu & Sao Lưu</h3>
            
            <div className="save-actions-grid">
              <button type="button" className="action-btn save-btn" onClick={onSaveNow}>
                💾 {saveStatus === 'saved' ? 'Đã Lưu!' : 'Lưu Máy'}
              </button>
              <button type="button" className="action-btn export-btn" onClick={handleExport}>
                📋 Xuất Mã
              </button>
            </div>

            {exportCode && (
              <div className="code-box-wrap">
                <textarea
                  readOnly
                  value={exportCode}
                  className="code-textarea"
                  rows={2}
                  title="Mã sao lưu"
                />
              </div>
            )}

            <div className="import-row">
              <input
                type="text"
                placeholder="Dán mã sao lưu..."
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className="import-input"
              />
              <button type="button" className="import-btn" onClick={handleImport}>
                Nhập
              </button>
            </div>
          </section>

          {/* Section 4: Đặt lại */}
          <section className="settings-section danger-section">
            {!confirmReset ? (
              <button
                type="button"
                className="danger-btn"
                onClick={() => setConfirmReset(true)}
              >
                🗑️ Đặt Lại Tiến Trình
              </button>
            ) : (
              <div className="confirm-reset-box">
                <p className="confirm-text">Xóa toàn bộ dữ liệu game?</p>
                <div className="confirm-btns-row">
                  <button type="button" className="confirm-yes-btn" onClick={handleConfirmReset}>
                    Xóa Hết
                  </button>
                  <button type="button" className="confirm-no-btn" onClick={() => setConfirmReset(false)}>
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
