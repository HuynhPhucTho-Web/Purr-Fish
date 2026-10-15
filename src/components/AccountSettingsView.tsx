import React, { useState } from 'react';
import { authService, type UserProfileInfo, type SimpleLocalUser, CAT_AVATARS } from '../services/authService';
import type { GameSaveData } from '../utils/saveGame';
import { soundManager } from '../utils/sound';

interface AccountSettingsViewProps {
  currentUser: UserProfileInfo | null;
  settings: GameSaveData['settings'];
  saveStatus?: string;
  defaultSubTab?: 'account' | 'settings';
  gameState?: GameSaveData;
  onUpdateSettings: (newSettings: Partial<GameSaveData['settings']>) => void;
  onSaveNow: () => void;
  onResetGame: () => void;
  onExportSave: () => string;
  onImportSave: (code: string) => boolean;
  onSyncCloudNow?: () => void;
  onOpenAuthModal?: () => void;
  onBackToCat: () => void;
  onLogout?: () => Promise<void> | void;
  onUpdateCatName?: (newName: string) => Promise<string>;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  currentUser,
  settings,
  saveStatus,
  defaultSubTab = 'account',
  gameState: _gameState,
  onUpdateSettings,
  onSaveNow,
  onResetGame,
  onExportSave,
  onImportSave,
  onSyncCloudNow,
  onOpenAuthModal,
  onBackToCat,
  onLogout,
  onUpdateCatName,
}) => {
  const [subTab, setSubTab] = useState<'account' | 'settings'>(defaultSubTab);

  // Cat Rename State
  const [editCatName, setEditCatName] = useState(currentUser?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Status & Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Backup Code State
  const [exportCode, setExportCode] = useState<string>('');
  const [importCodeInput, setImportCodeInput] = useState<string>('');
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const showToast = (type: 'error' | 'success', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // 1. Đổi Tên Mèo Cưng
  const handleSaveCatName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editCatName.trim();
    if (!trimmed) {
      showToast('error', 'Tên mèo cưng không được để trống!');
      return;
    }
    if (!onUpdateCatName) {
      showToast('error', 'Chức năng đổi tên tạm thời chưa khả dụng!');
      return;
    }

    setIsSavingName(true);
    try {
      soundManager.playPop();
      const updated = await onUpdateCatName(trimmed);
      showToast('success', `✨ Đã đổi tên Mèo Cưng thành "${updated}"!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Lỗi khi đổi tên mèo!');
    } finally {
      setIsSavingName(false);
    }
  };

  // 2. Đăng xuất
  const handleLogout = async () => {
    soundManager.playPop();
    if (onLogout) {
      await onLogout();
    } else {
      await authService.logout();
    }
    showToast('success', 'Đã đăng xuất. Dữ liệu game đã được đặt lại ban đầu.');
    if (onOpenAuthModal) {
      setTimeout(onOpenAuthModal, 400);
    }
  };

  // Export Save
  const handleGenerateExportCode = () => {
    soundManager.playPop();
    const code = onExportSave();
    setExportCode(code);
    navigator.clipboard?.writeText(code);
    showToast('success', 'Đã sao chép mã sao lưu vào bộ nhớ tạm (Clipboard)!');
  };

  // Import Save
  const handleApplyImport = () => {
    if (!importCodeInput.trim()) return;
    const ok = onImportSave(importCodeInput.trim());
    if (ok) {
      showToast('success', 'Khôi phục tiến trình trò chơi thành công!');
      setImportCodeInput('');
    } else {
      showToast('error', 'Mã sao lưu không hợp lệ! Vui lòng kiểm tra lại.');
    }
  };

  const isLoggedIn = Boolean(currentUser && !currentUser.isAnonymous);
  const savedAccounts = authService.getSavedAccountsList();

  return (
    <div className="view-page-container account-settings-view">
      {/* Header */}
      <div className="view-header-bar">
        <div className="view-title-wrap">
          <span className="view-title-icon">👤</span>
          <div>
            <h2 className="view-title">Tài Khoản & Cài Đặt Trò Chơi</h2>
            <p className="view-subtitle">Quản lý hồ sơ người chơi, lưu trữ đám mây & tùy biến</p>
          </div>
        </div>
        <button type="button" className="view-back-btn" onClick={onBackToCat} title="Quay lại phòng mèo">
          🐱 Về Mèo
        </button>
      </div>

      {/* Subtabs Switcher */}
      <div className="view-subtabs-nav">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'account' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('account');
          }}
        >
          👤 Tài Khoản Người Chơi
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'settings' ? 'subtab-active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setSubTab('settings');
          }}
        >
          ⚙️ Cài Đặt & Sao Lưu
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className={`account-feedback-toast toast-${feedbackMessage.type} animate-bounce-in`}>
          {feedbackMessage.text}
        </div>
      )}

      {/* SUBTAB 1: TÀI KHOẢN NGƯỜI CHƠI */}
      {subTab === 'account' && (
        <div className="account-management-section">
          {isLoggedIn && currentUser ? (
            <>
              {/* Logged in Profile Hero Card */}
              <div className="user-profile-hero-card">
                <div className="hero-avatar-box overflow-hidden">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    '👑'
                  )}
                </div>

                <div className="hero-user-details">
                  <h3 className="hero-display-name">{currentUser.displayName}</h3>
                  <span className="hero-account-badge">
                    ☁️ Đã Liên Kết: {currentUser.username ? `@${currentUser.username}` : (currentUser.email || 'Cloud')}
                  </span>
                  <p className="hero-uid-text">Mã UID: <code>{currentUser.uid}</code></p>
                </div>

                <div className="hero-actions-row">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                    <span>🟢</span>
                    <span>Tự động lưu Cloud</span>
                  </div>
                  <button type="button" className="account-logout-btn" onClick={handleLogout}>
                    Đăng Xuất
                  </button>
                </div>
              </div>

              {/* Chức năng Đổi Tên Mèo Cưng khi Đăng Nhập */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-200/90 my-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                    <span>✏️</span> Đổi Tên Mèo Cưng (Hiển thị phòng mèo & BXH)
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold">Tối đa 30 ký tự</span>
                </div>
                <form onSubmit={handleSaveCatName} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Nhập tên mới cho bé mèo..."
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    maxLength={30}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-all disabled:opacity-50 shadow-sm shrink-0"
                    disabled={isSavingName || !editCatName.trim() || editCatName.trim() === currentUser.displayName}
                  >
                    {isSavingName ? 'Đang lưu...' : 'Lưu Tên Mới ✨'}
                  </button>
                </form>
              </div>

              {/* Avatar Selector Card (8 Mẫu WebP dành riêng cho tài khoản) */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 my-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs sm:text-sm text-gray-800 flex items-center gap-1.5">
                    <span>📸</span> Chọn Ảnh Đại Diện Boss Mèo (8 Mẫu WebP)
                  </span>
                  <span className="text-[11px] text-orange-600 font-semibold">Chạm để đổi</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {CAT_AVATARS.map((avatarUrl, idx) => {
                    const isCurrent = currentUser.photoURL === avatarUrl;
                    return (
                      <button
                        key={avatarUrl}
                        type="button"
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer bg-orange-50/50 ${
                          isCurrent
                            ? 'border-orange-500 ring-2 ring-orange-300 scale-105 shadow-md'
                            : 'border-gray-200 hover:border-orange-300 opacity-80 hover:opacity-100'
                        }`}
                        onClick={async () => {
                          soundManager.playPop();
                          await authService.updateUserAvatar(avatarUrl);
                          showToast('success', `Đã cập nhật Avatar #${idx + 1}!`);
                          if (onSyncCloudNow) onSyncCloudNow();
                        }}
                        title={`Avatar ${idx + 1}`}
                      >
                        <img
                          src={avatarUrl}
                          alt={`Avatar ${idx + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {isCurrent && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-1 ring-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Chế Độ Chơi Thử: Tránh trùng lặp form, chỉ hiển thị thông báo & nút mở Modal duy nhất */
            <div className="auth-forms-container">
              <div className="bg-gradient-to-b from-amber-50/90 via-orange-50/70 to-amber-50/90 border-2 border-dashed border-amber-300 rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-amber-100/90 border border-amber-300 flex items-center justify-center text-3xl shadow-xs">
                  🐾
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-950">
                    Bạn Đang Ở Chế Độ Chơi Thử (Khách)
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-800/90 max-w-md mt-1 leading-relaxed">
                    Trang khách chỉ hỗ trợ chơi thử nhanh trên máy. Để <strong>lưu vĩnh viễn trên Cloud</strong>, <strong>đổi tên mèo cưng</strong>, <strong>chọn 8 mẫu avatar độc quyền</strong> và <strong>đua Top bảng xếp hạng</strong>, vui lòng tạo tài khoản!
                  </p>
                </div>

                <div className="w-full max-w-sm grid grid-cols-2 gap-2 my-1 text-left text-xs">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900 block">🔒 Avatar & Đổi tên:</span>
                    <span className="text-amber-700 text-[11px]">Cần tài khoản để mở khóa</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900 block">🏆 Đua Top Toàn Cầu:</span>
                    <span className="text-amber-700 text-[11px]">Chỉ dành cho tài khoản</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full max-w-sm py-3 px-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  onClick={() => {
                    soundManager.playPop();
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                >
                  <span>✨</span>
                  <span>Tạo Tài Khoản / Đăng Nhập Đua Top</span>
                </button>
              </div>

              {/* Danh sách tài khoản đã lưu trên máy nếu có */}
              {savedAccounts.length > 0 && (
                <div className="saved-accounts-quick-box mt-4">
                  <h5>Tài khoản đã tạo trên máy này ({savedAccounts.length}):</h5>
                  <div className="saved-accounts-list">
                    {savedAccounts.map((acc: SimpleLocalUser) => (
                      <div key={acc.username} className="saved-acc-pill">
                        <span className="acc-name">👤 {acc.displayName} (@{acc.username})</span>
                        <button
                          type="button"
                          className="switch-acc-btn"
                          onClick={() => {
                            soundManager.playPop();
                            if (onOpenAuthModal) onOpenAuthModal();
                          }}
                        >
                          Đăng Nhập
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CÀI ĐẶT TRÒ CHƠI & SAO LƯU */}
      {subTab === 'settings' && (
        <div className="game-settings-section">
          {/* Audio & Haptic Toggles */}
          <div className="settings-group-card">
            <h4 className="group-title">🔊 Âm Thanh & Cảm Giác</h4>

            <div className="setting-toggle-row">
              <span className="setting-label">Âm thanh (SFX)</span>
              <button
                type="button"
                className={`toggle-switch-btn ${settings.soundEnabled ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              >
                {settings.soundEnabled ? 'BẬT 🔊' : 'TẮT 🔇'}
              </button>
            </div>

            {settings.soundEnabled && (
              <div className="setting-volume-row">
                <span className="volume-label">Âm lượng SFX:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume ?? 80}
                  onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })}
                  className="volume-slider"
                />
                <span className="volume-value">{settings.sfxVolume ?? 80}%</span>
              </div>
            )}

            <div className="setting-toggle-row">
              <span className="setting-label">Nhạc nền (BGM)</span>
              <button
                type="button"
                className={`toggle-switch-btn ${(settings.musicEnabled ?? true) ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => onUpdateSettings({ musicEnabled: !(settings.musicEnabled ?? true) })}
              >
                {(settings.musicEnabled ?? true) ? 'BẬT 🎵' : 'TẮT 🔇'}
              </button>
            </div>

            {(settings.musicEnabled ?? true) && (
              <div className="setting-volume-row">
                <span className="volume-label">Âm lượng BGM:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume ?? 50}
                  onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
                  className="volume-slider"
                />
                <span className="volume-value">{settings.musicVolume ?? 50}%</span>
              </div>
            )}

            <div className="setting-toggle-row">
              <span className="setting-label">Rung (Haptics)</span>
              <button
                type="button"
                className={`toggle-switch-btn ${settings.hapticsEnabled ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              >
                {settings.hapticsEnabled ? 'BẬT 📳' : 'TẮT 📴'}
              </button>
            </div>

            <div className="setting-toggle-row">
              <span className="setting-label">Hiệu ứng hạt</span>
              <button
                type="button"
                className={`toggle-switch-btn ${settings.particlesEnabled ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => onUpdateSettings({ particlesEnabled: !settings.particlesEnabled })}
              >
                {settings.particlesEnabled ? 'BẬT ✨' : 'TẮT ❌'}
              </button>
            </div>
          </div>

          {/* Backup & Save Management */}
          <div className="settings-group-card">
            <h4 className="group-title">💾 Dữ Liệu & Sao Lưu</h4>

            <div className="save-action-row">
              <button
                type="button"
                className="action-btn export-code-btn"
                onClick={handleGenerateExportCode}
              >
                📋 Xuất Mã
              </button>
              <button
                type="button"
                className="action-btn save-now-btn"
                onClick={() => {
                  onSaveNow();
                  showToast('success', 'Đã lưu trò chơi vào máy!');
                }}
              >
                💾 Lưu Máy {saveStatus ? `(${saveStatus})` : ''}
              </button>
            </div>

            {exportCode && (
              <div className="code-display-box">
                <span className="code-label">Mã sao lưu:</span>
                <textarea className="code-textarea" readOnly value={exportCode} rows={2} />
              </div>
            )}

            <div className="import-box-wrap">
              <label className="import-label">Khôi phục từ mã sao lưu:</label>
              <div className="import-input-row">
                <input
                  type="text"
                  className="import-input"
                  placeholder="Dán mã sao lưu..."
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="apply-import-btn"
                  onClick={handleApplyImport}
                  disabled={!importCodeInput.trim()}
                >
                  Nhập
                </button>
              </div>
            </div>
          </div>

          {/* Reset Game Section */}
          <div className="settings-group-card reset-card">
            <h4 className="group-title text-danger">⚠️ Đặt Lại Trò Chơi (Reset)</h4>
            <p className="reset-desc">
              Xóa bỏ toàn bộ tiến trình hiện tại trên máy và bắt đầu lại từ đầu như người chơi mới.
            </p>

            {!showConfirmReset ? (
              <button
                type="button"
                className="reset-game-btn"
                onClick={() => setShowConfirmReset(true)}
              >
                Đặt Lại Game
              </button>
            ) : (
              <div className="confirm-reset-box">
                <p>Bạn có chắc chắn muốn xóa hết cá, xu và cấp độ không?</p>
                <div className="confirm-btns-row">
                  <button
                    type="button"
                    className="danger-confirm-btn"
                    onClick={() => {
                      onResetGame();
                      setShowConfirmReset(false);
                      showToast('success', 'Đã đặt lại trò chơi về trạng thái ban đầu.');
                    }}
                  >
                    Xác Nhận Xóa Hết
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowConfirmReset(false)}
                  >
                    Hủy Bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettingsView;
