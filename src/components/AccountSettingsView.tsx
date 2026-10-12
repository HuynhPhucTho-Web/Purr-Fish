import React, { useState } from 'react';
import { authService, type UserProfileInfo, type SimpleLocalUser } from '../services/authService';
import type { GameSaveData } from '../utils/saveGame';
import { soundManager } from '../utils/sound';

interface AccountSettingsViewProps {
  currentUser: UserProfileInfo | null;
  settings: GameSaveData['settings'];
  saveStatus?: string;
  defaultSubTab?: 'account' | 'settings';
  onUpdateSettings: (newSettings: Partial<GameSaveData['settings']>) => void;
  onSaveNow: () => void;
  onResetGame: () => void;
  onExportSave: () => string;
  onImportSave: (code: string) => boolean;
  onSyncCloudNow?: () => void;
  onOpenAuthModal?: () => void;
  onBackToCat: () => void;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  currentUser,
  settings,
  saveStatus,
  defaultSubTab = 'account',
  onUpdateSettings,
  onSaveNow,
  onResetGame,
  onExportSave,
  onImportSave,
  onSyncCloudNow,
  onOpenAuthModal,
  onBackToCat,
}) => {
  const [subTab, setSubTab] = useState<'account' | 'settings'>(defaultSubTab);

  // Simple Account Form State
  const [authMode, setAuthMode] = useState<'simple_login' | 'simple_register' | 'email_mode'>('simple_register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [catName, setCatName] = useState('');
  const [email, setEmail] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Backup Code State
  const [exportCode, setExportCode] = useState<string>('');
  const [importCodeInput, setImportCodeInput] = useState<string>('');
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const showToast = (type: 'error' | 'success', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // 1. Tạo Tài Khoản Đơn Giản (Username & Password)
  const handleSimpleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      soundManager.playPop();
      await authService.registerSimpleAccount(username, password, catName);
      showToast('success', `Tạo tài khoản "${username}" thành công! Dữ liệu đã được liên kết.`);
      setUsername('');
      setPassword('');
      setCatName('');
      if (onSyncCloudNow) onSyncCloudNow();
    } catch (err: any) {
      showToast('error', err?.message || 'Lỗi khi tạo tài khoản đơn giản!');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Đăng Nhập Tài Khoản Đơn Giản
  const handleSimpleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      soundManager.playPop();
      await authService.loginSimpleAccount(username, password);
      showToast('success', 'Đăng nhập thành công! Tiến trình đã sẵn sàng.');
      setUsername('');
      setPassword('');
      if (onSyncCloudNow) onSyncCloudNow();
    } catch (err: any) {
      showToast('error', err?.message || 'Tài khoản hoặc mật khẩu không chính xác!');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Chơi Nhanh Khách Ẩn Danh
  const handleGuestPlay = async () => {
    setIsLoading(true);
    try {
      soundManager.playPop();
      await authService.signInAsGuest('Sen Mới');
      showToast('success', 'Đã cấp tài khoản Khách Nhanh 1 Chạm!');
      if (onSyncCloudNow) onSyncCloudNow();
    } catch (err: any) {
      showToast('error', 'Lỗi đăng nhập khách!');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Đăng ký / Đăng nhập Email Firebase
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      soundManager.playPop();
      await authService.registerWithEmail(email, password, catName || 'Sen Nuôi Mèo');
      showToast('success', 'Đăng ký tài khoản Email Firebase thành công!');
      if (onSyncCloudNow) onSyncCloudNow();
    } catch (err: any) {
      try {
        // Thử đăng nhập nếu đã có
        await authService.loginWithEmail(email, password);
        showToast('success', 'Đăng nhập Email Firebase thành công!');
        if (onSyncCloudNow) onSyncCloudNow();
      } catch (inner: any) {
        showToast('error', inner?.message || 'Lỗi đăng nhập Email Firebase!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Đăng xuất
  const handleLogout = async () => {
    soundManager.playPop();
    await authService.logout();
    showToast('success', 'Đã đăng xuất tài khoản.');
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
          {currentUser ? (
            /* Logged in Profile Card */
            <div className="user-profile-hero-card">
              <div className="hero-avatar-box">
                {currentUser.isAnonymous ? '🐱' : '👑'}
              </div>

              <div className="hero-user-details">
                <h3 className="hero-display-name">{currentUser.displayName}</h3>
                <span className="hero-account-badge">
                  {currentUser.isAnonymous ? '🐾 Tài Khoản Khách' : `☁️ Đã Liên Kết: ${currentUser.email || 'Nội Bộ'}`}
                </span>
                <p className="hero-uid-text">Mã UID: <code>{currentUser.uid}</code></p>
              </div>

              <div className="hero-actions-row">
                {currentUser.isAnonymous && onOpenAuthModal && (
                  <button
                    type="button"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
                    onClick={() => {
                      soundManager.playPop();
                      onOpenAuthModal();
                    }}
                  >
                    ✨ Đăng Ký Tài Khoản Chính Thức
                  </button>
                )}
                <button
                  type="button"
                  className="cloud-sync-now-btn"
                  onClick={() => {
                    soundManager.playUpgrade();
                    if (onSyncCloudNow) onSyncCloudNow();
                    showToast('success', 'Đã lưu tiến trình mới nhất lên Cloud Firestore!');
                  }}
                >
                  🔄 Đồng Bộ & Lưu Cloud Ngay
                </button>
                <button type="button" className="account-logout-btn" onClick={handleLogout}>
                  Đăng Xuất
                </button>
              </div>
            </div>
          ) : (
            /* Not logged in: Simple Account Creation / Login */
            <div className="auth-forms-container">
              {/* Quick Guest Play Banner */}
              <div className="quick-guest-banner">
                <div>
                  <h4>Chơi Nhanh 1 Chạm (Khách Ẩn Danh)</h4>
                  <p>Không cần đăng ký, vào chơi ngay lập tức và tự động lưu trên máy.</p>
                </div>
                <button
                  type="button"
                  className="quick-guest-play-btn"
                  onClick={handleGuestPlay}
                  disabled={isLoading}
                >
                  ⚡ Chơi Ngay
                </button>
              </div>

              {/* Mode Toggle Buttons: Simple Register vs Simple Login vs Email */}
              <div className="auth-mode-selector-bar">
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'simple_register' ? 'mode-active' : ''}`}
                  onClick={() => setAuthMode('simple_register')}
                >
                  ✨ Tạo Tài Khoản Đơn Giản
                </button>
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'simple_login' ? 'mode-active' : ''}`}
                  onClick={() => setAuthMode('simple_login')}
                >
                  🔑 Đăng Nhập
                </button>
              </div>

              {/* FORM 1: TẠO TÀI KHOẢN ĐƠN GIẢN */}
              {authMode === 'simple_register' && (
                <form className="simple-auth-form-card" onSubmit={handleSimpleRegister}>
                  <div className="form-info-headline">
                    <h4>Đăng Ký Đơn Giản (Chỉ cần Tên & Mật khẩu)</h4>
                    <p>Không bắt buộc email, tạo trong 2 giây để lưu tên trên bảng xếp hạng!</p>
                  </div>

                  <div className="form-field-group">
                    <label>Tên tài khoản (Username):</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ví dụ: meocon123, bietdoimeo..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Tên chú mèo của bạn (Hiển thị trong game):</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ví dụ: Bé Miu Miu, Chonky Boss..."
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Mật khẩu đơn giản (Tối thiểu 4 ký tự):</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Nhập mật khẩu hoặc mã PIN..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="form-submit-btn" disabled={isLoading}>
                    {isLoading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Ngay 🎉'}
                  </button>
                </form>
              )}

              {/* FORM 2: ĐĂNG NHẬP ĐƠN GIẢN */}
              {authMode === 'simple_login' && (
                <form className="simple-auth-form-card" onSubmit={handleSimpleLogin}>
                  <div className="form-info-headline">
                    <h4>Đăng Nhập Tài Khoản</h4>
                    <p>Nhập tên tài khoản và mật khẩu bạn đã tạo trước đó.</p>
                  </div>

                  <div className="form-field-group">
                    <label>Tên tài khoản (Username):</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nhập username..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Mật khẩu:</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="form-submit-btn" disabled={isLoading}>
                    {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập 🚀'}
                  </button>
                </form>
              )}

              {/* FORM 3: FIREBASE EMAIL MODE */}
              {authMode === 'email_mode' && (
                <form className="simple-auth-form-card" onSubmit={handleEmailAuth}>
                  <div className="form-info-headline">
                    <h4>Đăng Ký / Đăng Nhập Email Firebase</h4>
                    <p>Dành cho người chơi muốn liên kết tài khoản Email toàn cầu.</p>
                  </div>

                  <div className="form-field-group">
                    <label>Địa chỉ Email:</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="tenban@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Tên hiển thị:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Tên của bạn hoặc bé mèo..."
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label>Mật khẩu (Tối thiểu 6 ký tự):</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Mật khẩu Firebase..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="form-submit-btn" disabled={isLoading}>
                    {isLoading ? 'Đang xác thực...' : 'Đăng Ký / Đăng Nhập Email ☁️'}
                  </button>
                </form>
              )}

              {/* Saved Local Accounts Switcher */}
              {savedAccounts.length > 0 && (
                <div className="saved-accounts-quick-box">
                  <h5>Tài khoản đã tạo trên máy này ({savedAccounts.length}):</h5>
                  <div className="saved-accounts-list">
                    {savedAccounts.map((acc: SimpleLocalUser) => (
                      <div key={acc.username} className="saved-acc-pill">
                        <span className="acc-name">👤 {acc.displayName} (@{acc.username})</span>
                        <button
                          type="button"
                          className="switch-acc-btn"
                          onClick={() => {
                            setUsername(acc.username);
                            setPassword(acc.pass);
                            setAuthMode('simple_login');
                          }}
                        >
                          Chọn
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
              <span className="setting-label">Hiệu ứng âm thanh (SFX)</span>
              <button
                type="button"
                className={`toggle-switch-btn ${settings.soundEnabled ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              >
                {settings.soundEnabled ? 'BẬT 🔊' : 'TẮT 🔇'}
              </button>
            </div>

            <div className="setting-toggle-row">
              <span className="setting-label">Rung phản hồi (Haptics)</span>
              <button
                type="button"
                className={`toggle-switch-btn ${settings.hapticsEnabled ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              >
                {settings.hapticsEnabled ? 'BẬT 📳' : 'TẮT 📴'}
              </button>
            </div>

            <div className="setting-toggle-row">
              <span className="setting-label">Hiệu ứng hạt lấp lánh (Particles)</span>
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
            <h4 className="group-title">💾 Sao Lưu & Khôi Phục Dữ Liệu</h4>

            <div className="save-action-row">
              <button
                type="button"
                className="action-btn export-code-btn"
                onClick={handleGenerateExportCode}
              >
                📋 Sao Chép Mã Sao Lưu (Export)
              </button>
              <button
                type="button"
                className="action-btn save-now-btn"
                onClick={() => {
                  onSaveNow();
                  showToast('success', 'Đã lưu trò chơi vào máy!');
                }}
              >
                💾 Lưu Vào Máy Ngay {saveStatus ? `(${saveStatus})` : ''}
              </button>
            </div>

            {exportCode && (
              <div className="code-display-box">
                <span className="code-label">Mã sao lưu của bạn:</span>
                <textarea className="code-textarea" readOnly value={exportCode} rows={2} />
              </div>
            )}

            <div className="import-box-wrap">
              <label className="import-label">Khôi phục tiến trình từ mã sao lưu (Import):</label>
              <div className="import-input-row">
                <input
                  type="text"
                  className="import-input"
                  placeholder="Dán mã sao lưu vào đây..."
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="apply-import-btn"
                  onClick={handleApplyImport}
                  disabled={!importCodeInput.trim()}
                >
                  Khôi phục
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
