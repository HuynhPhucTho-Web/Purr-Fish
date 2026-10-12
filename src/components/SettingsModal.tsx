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
            <h2 className="modal-title">Cài Đặt Game</h2>
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
          {/* Toggles Group */}
          <section className="settings-section">
            <h3 className="section-label">Âm Thanh & Hiệu Ứng</h3>
            
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">🔊 Âm thanh (SFX)</span>
                <span className="setting-desc">Tiếng pop, meow và hiệu ứng mua sắm</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-name">✨ Hạt lấp lánh (Particles)</span>
                <span className="setting-desc">Tia sáng và hiệu ứng nổi khi chạm</span>
              </div>
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
              <div className="setting-info">
                <span className="setting-name">📳 Rung phản hồi (Haptics)</span>
                <span className="setting-desc">Rung nhẹ khi chạm trên điện thoại</span>
              </div>
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
              <div className="setting-info">
                <span className="setting-name">🐱 Phong cách đồ họa mèo</span>
                <span className="setting-desc">Chọn phong cách hình ảnh mèo</span>
              </div>
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
                  Sticker Ảnh
                </button>
              </div>
            </div>
          </section>

          {/* Save / Load Management */}
          <section className="settings-section">
            <h3 className="section-label">Lưu & Khôi Phục Tiến Trình</h3>
            
            <div className="save-actions-grid">
              <button type="button" className="action-btn save-btn" onClick={onSaveNow}>
                💾 {saveStatus === 'saved' ? 'Đã Lưu Thành Công!' : 'Lưu Ngay Vào Máy'}
              </button>
              <button type="button" className="action-btn export-btn" onClick={handleExport}>
                📋 Sao Chép Mã Lưu
              </button>
            </div>

            {exportCode && (
              <div className="code-box-wrap">
                <textarea
                  readOnly
                  value={exportCode}
                  className="code-textarea"
                  rows={2}
                  title="Mã sao lưu tiến trình"
                />
              </div>
            )}

            <div className="import-row">
              <input
                type="text"
                placeholder="Dán mã lưu để khôi phục..."
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className="import-input"
              />
              <button type="button" className="import-btn" onClick={handleImport}>
                Tải Lưu
              </button>
            </div>
          </section>

          {/* Reset Game Section */}
          <section className="settings-section danger-section">
            <h3 className="section-label danger-label">Dữ Liệu Trò Chơi</h3>
            {!confirmReset ? (
              <button
                type="button"
                className="danger-btn"
                onClick={() => setConfirmReset(true)}
              >
                🗑️ Đặt Lại Trò Chơi (Reset Toàn Bộ)
              </button>
            ) : (
              <div className="confirm-reset-box">
                <p className="confirm-text">⚠️ Bạn có chắc muốn xóa toàn bộ tiến trình không?</p>
                <div className="confirm-btns-row">
                  <button type="button" className="confirm-yes-btn" onClick={handleConfirmReset}>
                    Chắc Chắn Xóa
                  </button>
                  <button type="button" className="confirm-no-btn" onClick={() => setConfirmReset(false)}>
                    Hủy Bỏ
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
