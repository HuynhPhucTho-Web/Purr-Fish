import React, { useState } from 'react';
import type { GameSaveData } from '../utils/saveGame';
import { authService, type UserProfileInfo } from '../services/authService';

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
  currentUser?: UserProfileInfo | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
  onUpdateCatName?: (newName: string) => Promise<string>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSaveNow: _onSaveNow,
  saveStatus: _saveStatus,
  onResetGame,
  onExportSave,
  onImportSave,
  currentUser,
  onLogout,
  onOpenAuth,
  onUpdateCatName,
}) => {
  const [importCode, setImportCode] = useState('');
  const [exportCode, setExportCode] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [newCatName, setNewCatName] = useState(currentUser?.displayName || '');
  const [isRenaming, setIsRenaming] = useState(false);

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
            <img
              src="/images/icon/icon-seting.webp"
              alt="Cài đặt"
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain inline-block shrink-0 drop-shadow-xs"
              draggable={false}
            />
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
          {/* Section 0: Tài khoản & Đổi tên */}
          <section className="settings-section">
            <h3 className="section-label">👤 Tài Khoản Người Chơi</h3>
            {currentUser && !currentUser.isAnonymous ? (
              <div className="flex flex-col gap-2 p-3 bg-amber-50/90 rounded-xl border border-amber-200/90">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-amber-400 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/images/logo-purr-fish.jpg" alt="Avatar" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">{currentUser.displayName}</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">Cloud</span>
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block">
                        @{currentUser.username || currentUser.email?.replace('@purrfish.com', '')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
                    onClick={async () => {
                      if (onLogout) {
                        await onLogout();
                      } else {
                        await authService.logout();
                      }
                      showFeedback('Đã đăng xuất tài khoản!', 'success');
                      setTimeout(() => {
                        onClose();
                        if (onOpenAuth) onOpenAuth();
                      }, 500);
                    }}
                    title="Đăng xuất khỏi tài khoản này"
                  >
                    🚪 Đăng Xuất
                  </button>
                </div>

                {/* Chức năng Đổi Tên Mèo Cưng trong Cài Đặt (Khi Đã Đăng Nhập) */}
                <div className="pt-2.5 border-t border-amber-200/80 mt-1">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    ✏️ Đổi Tên Mèo Cưng:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      className="flex-1 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Nhập tên mới cho mèo cưng..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      maxLength={30}
                    />
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50 shadow-xs shrink-0"
                      disabled={isRenaming || !newCatName.trim() || newCatName.trim() === currentUser.displayName}
                      onClick={async () => {
                        if (!newCatName.trim() || !onUpdateCatName) return;
                        setIsRenaming(true);
                        try {
                          const updated = await onUpdateCatName(newCatName.trim());
                          showFeedback(`✨ Đã đổi tên Mèo Cưng thành "${updated}"!`, 'success');
                        } catch (err: any) {
                          showFeedback(err?.message || 'Lỗi khi đổi tên mèo!', 'error');
                        } finally {
                          setIsRenaming(false);
                        }
                      }}
                    >
                      {isRenaming ? 'Đang lưu...' : 'Lưu Tên'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Trạng thái khách chơi thử: Rõ ràng, chỉ cho chơi thử và nhắc đăng nhập để đua hạng */
              <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-300 text-left">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <img
                    src="/images/logo-purr-fish.jpg"
                    alt="Purr-Fish"
                    className="w-9 h-9 rounded-xl object-cover border border-amber-300 shadow-xs shrink-0"
                    draggable={false}
                  />
                  <div className="min-w-0">
                    <span className="font-black text-xs text-amber-950 block">
                      Chế Độ Chơi Thử (Khách Vãng Lai)
                    </span>
                    <span className="text-[11px] text-amber-800 block leading-tight">
                      Tiến trình tạm thời trên máy. Tạo tài khoản để lưu vĩnh viễn, đổi avatar và đua top!
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth();
                  }}
                >
                  ✨ Tạo Tài Khoản / Đăng Nhập
                </button>
              </div>
            )}
          </section>

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
            
            <div className="p-2.5 bg-emerald-50 border border-emerald-200/90 rounded-xl mb-2 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
              <span className="text-base">🟢</span>
              <div className="text-left">
                <p className="font-bold">Tự Động Lưu Liên Tục</p>
                <p className="text-[11px] text-emerald-700">Mọi tiến trình xu, cấp độ và đồ đạc đều tự động lưu lên máy chủ.</p>
              </div>
            </div>

            <div className="save-actions-grid">
              <button type="button" className="action-btn export-btn w-full" onClick={handleExport}>
                📋 Xuất Mã Sao Lưu
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

          {/* Game Branding & Info Footer */}
          <div className="flex flex-col items-center justify-center pt-3 pb-1 text-center border-t border-amber-200/60 mt-3">
            <img
              src="/images/logo-purr-fish.jpg"
              alt="Purr-Fish Logo"
              className="w-10 h-10 rounded-xl shadow-xs border border-amber-300 object-cover mb-1"
              draggable={false}
            />
            <span className="text-xs font-black text-amber-900">Purr-Fish</span>
            <span className="text-[10px] text-slate-400 font-medium">Phiên bản 1.0.0 • Trò chơi nuôi mèo & câu cá pastel</span>
          </div>
        </div>
      </div>
    </div>
  );
};
