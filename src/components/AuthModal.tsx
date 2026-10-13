import React, { useState } from 'react';
import { authService, type UserProfileInfo, type SimpleLocalUser } from '../services/authService';
import { soundManager } from '../utils/sound';

interface AuthModalProps {
  currentUser: UserProfileInfo | null;
  onClose: () => void;
  onSyncNow?: () => void;
  initialTab?: 'register' | 'login';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onClose,
  onSyncNow,
  initialTab = 'register',
}) => {
  const [tab, setTab] = useState<'register' | 'login'>(initialTab);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [catName, setCatName] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Saved accounts on device
  const savedAccounts: SimpleLocalUser[] = authService.getSavedAccountsList();

  // 1. Tạo Tài Khoản Mới (Đơn Giản)
  const handleSimpleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage('Tên tài khoản phải có ít nhất 3 ký tự!');
      setIsLoading(false);
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setErrorMessage('Mật khẩu phải có ít nhất 4 ký tự!');
      setIsLoading(false);
      return;
    }

    try {
      soundManager.playPop();
      const user = await authService.registerSimpleAccount(cleanUser, cleanPass, catName);
      soundManager.playUnlock();
      setSuccessMessage(`🎉 Chào Sen "${user.displayName}"! Tạo tài khoản thành công.`);
      if (onSyncNow) onSyncNow();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Lỗi khi tạo tài khoản! Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Đăng Nhập Tài Khoản (Đơn Giản)
  const handleSimpleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('Vui lòng nhập tên tài khoản!');
      setIsLoading(false);
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Vui lòng nhập mật khẩu!');
      setIsLoading(false);
      return;
    }

    try {
      soundManager.playPop();
      const user = await authService.loginSimpleAccount(cleanUser, cleanPass);
      soundManager.playUnlock();
      setSuccessMessage(`🐱 Chào mừng trở lại, "${user.displayName}"!`);
      if (onSyncNow) onSyncNow();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Tài khoản hoặc mật khẩu không chính xác!');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Chơi Nhanh Khách Ẩn Danh (1 Chạm)
  const handleGuestLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      soundManager.playPop();
      const guest = await authService.signInAsGuest('Sen Mới');
      setSuccessMessage(`🐾 Đã vào game: "${guest.displayName}"!`);
      if (onSyncNow) onSyncNow();
      setTimeout(onClose, 800);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('Không thể đăng nhập khách. Vui lòng kiểm tra kết nối mạng!');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Đăng xuất
  const handleLogout = async () => {
    try {
      soundManager.playPop();
      await authService.logout();
      setSuccessMessage('Đã đăng xuất tài khoản.');
      setTimeout(onClose, 800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi đăng xuất.');
    }
  };

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">{tab === 'register' ? '' : '🔑'}</span>
            <div>
              <h3>{tab === 'register' ? 'Tạo Tài Khoản Mèo Cưng' : 'Đăng Nhập Tài Khoản'}</h3>
              <p className="modal-subtext">Lưu tiến trình Cloud & đua top Bảng Xếp Hạng</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng để chơi ngay">
            ✕
          </button>
        </div>

        <div className="modal-body auth-modal-body">
          {/* If already logged in */}
          {currentUser && !currentUser.isAnonymous ? (
            <div className="auth-profile-box">
              <div className="auth-avatar-circle">👑</div>
              <h4 className="auth-user-name">{currentUser.displayName}</h4>
              <p className="auth-user-type">
                <span className="badge-verified">☁️ Đã đăng nhập: {currentUser.email || currentUser.displayName}</span>
              </p>
              <p className="auth-sync-status">
                ✅ Dữ liệu trò chơi của bạn đang được tự động đồng bộ trên đám mây!
              </p>

              <div className="auth-actions-row">
                <button
                  type="button"
                  className="auth-sync-btn"
                  onClick={() => {
                    if (onSyncNow) onSyncNow();
                    soundManager.playUpgrade();
                    setSuccessMessage('Đã lưu tiến trình mới nhất lên Cloud!');
                  }}
                >
                  🔄 Đồng Bộ Cloud Ngay
                </button>
                <button type="button" className="auth-logout-btn" onClick={handleLogout}>
                  Đăng Xuất
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="auth-tabs-row">
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    soundManager.playPop();
                    setTab('register');
                    setErrorMessage(null);
                  }}
                >
                   Tạo Tài Khoản Mới
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    soundManager.playPop();
                    setTab('login');
                    setErrorMessage(null);
                  }}
                >
                  🔑 Đăng Nhập
                </button>
              </div>

              {/* Saved accounts chip picker on login tab */}
              {tab === 'login' && savedAccounts.length > 0 && (
                <div className="p-2 bg-orange-50/90 border border-orange-200 rounded-xl text-left">
                  <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wide block mb-1">
                    🐱 Tài khoản trên máy:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {savedAccounts.map((acc) => (
                      <button
                        key={acc.username}
                        type="button"
                        className="text-xs bg-white hover:bg-orange-100 border border-orange-300 text-orange-900 font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                        onClick={() => {
                          soundManager.playPop();
                          setUsername(acc.username);
                          setPassword(acc.pass);
                        }}
                      >
                        👤 {acc.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input Container */}
              <form onSubmit={tab === 'register' ? handleSimpleRegister : handleSimpleLogin} className="auth-form">
                <div className="form-group">
                  <label>Tên Tài Khoản</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="vd: meobap, senmeo123..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                </div>

                {tab === 'register' && (
                  <div className="form-group">
                    <label>Tên Mèo Cưng / Biệt Danh</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="vd: Hoàng Thượng Múp, Bánh Bao..."
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <div className="flex items-center justify-between">
                    <label>Mật Khẩu</label>
                    <button
                      type="button"
                      className="text-xs text-orange-600 font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Ẩn 🙈' : 'Hiện 👁️'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Tối thiểu 4 ký tự..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {errorMessage && <div className="auth-error-banner">{errorMessage}</div>}
                {successMessage && <div className="auth-success-banner">{successMessage}</div>}

                <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                  {isLoading
                    ? 'Đang xử lý...'
                    : tab === 'register'
                    ? ' Tạo Tài Khoản & Vào Chơi'
                    : '🚀 Đăng Nhập & Vào Chơi'}
                </button>
              </form>

              {/* Bottom Quick Guest Action Bar */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-500">
                  {tab === 'register' ? 'Chưa muốn đăng ký?' : 'Chưa có tài khoản?'}
                </span>
                {tab === 'register' ? (
                  <button
                    type="button"
                    className="text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-full cursor-pointer transition-colors border border-amber-300"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    🐾 Chơi Thử Nhanh →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-orange-600 font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                    onClick={() => {
                      soundManager.playPop();
                      setTab('register');
                    }}
                  >
                     Tạo tài khoản mới
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
