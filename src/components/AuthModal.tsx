import React, { useState, useRef } from 'react';
import { authService, type UserProfileInfo, type SimpleLocalUser, CAT_AVATARS } from '../services/authService';
import { soundManager } from '../utils/sound';
import type { GameSaveData } from '../utils/saveGame';

interface AuthModalProps {
  currentUser: UserProfileInfo | null;
  onClose: () => void;
  onSyncNow?: (overrideUser?: UserProfileInfo) => void;
  onLoginSuccess?: (user: UserProfileInfo) => Promise<any> | any;
  initialTab?: 'register' | 'login' | 'profile';
  gameState?: GameSaveData;
  level?: number;
  rankBadge?: string;
  rankTierName?: string;
  onLogout?: () => Promise<void> | void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onClose,
  onSyncNow,
  onLoginSuccess,
  initialTab = 'register',
  gameState,
  level = 1,
  rankBadge = '🥉',
  rankTierName = 'Đồng (Bronze)',
  onLogout,
}) => {
  const isLoggedIn = Boolean(currentUser && !currentUser.isAnonymous);

  const [tab, setTab] = useState<'register' | 'login' | 'profile'>(() => {
    if (isLoggedIn) return 'profile';
    return initialTab === 'profile' ? 'register' : initialTab;
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [catName, setCatName] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Overlay click guard refs to prevent modal from accidentally auto-closing
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

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
      const defaultAvatar = currentUser?.photoURL || localStorage.getItem('PURR_FISH_AVATAR') || CAT_AVATARS[0];
      const user = await authService.registerSimpleAccount(cleanUser, cleanPass, catName, defaultAvatar, gameState);
      soundManager.playUnlock();
      setSuccessMessage(`🎉 Chào mừng "${user.displayName}"! Đã tạo tài khoản & đăng nhập thành công.`);
      if (onLoginSuccess) {
        await onLoginSuccess(user);
      }
      if (onSyncNow) {
        await onSyncNow(user);
      }
      setTimeout(() => {
        onClose();
      }, 600);
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
      if (onLoginSuccess) {
        await onLoginSuccess(user);
      }
      setTimeout(() => {
        onClose();
      }, 500);
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
      if (onSyncNow) onSyncNow(guest);
      setTimeout(onClose, 600);
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
      if (onLogout) {
        await onLogout();
      } else {
        await authService.logout();
      }
      setSuccessMessage('Đã đăng xuất tài khoản. Dữ liệu game đã được đặt lại ban đầu.');
      setTab('login');
      setUsername('');
      setPassword('');
      setCatName('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi đăng xuất.');
    }
  };

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="game-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div
        className="game-modal-card auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <img
              src="/images/logo-purr-fish.jpg"
              alt="Purr-Fish Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-amber-300 shadow-xs shrink-0"
              draggable={false}
            />
            <div>
              <h3>
                {isLoggedIn
                  ? 'Hồ Sơ Mèo Cưng'
                  : tab === 'register'
                  ? 'Tạo Tài Khoản Mèo Cưng'
                  : 'Đăng Nhập Tài Khoản'}
              </h3>
              <p className="modal-subtext">
                {isLoggedIn
                  ? 'Dữ liệu và thứ hạng đã liên kết máy chủ Cloud'
                  : 'Lưu tiến trình Cloud & đua top Bảng Xếp Hạng'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        <div className="modal-body auth-modal-body">
          {/* NẾU ĐÃ ĐĂNG NHẬP: KHÔNG HIỆN NÚT ĐĂNG NHẬP HAY TẠO NỮA, CHỈ HIỆN HỒ SƠ & NÚT ĐĂNG XUẤT */}
          {isLoggedIn && currentUser ? (
            <div className="auth-profile-box mt-1">
              <div className="relative mx-auto w-20 h-20 rounded-full border-4 border-amber-300 shadow-md overflow-hidden bg-amber-50 flex items-center justify-center">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src="/images/logo-purr-fish.jpg" alt="Avatar" className="w-full h-full object-cover" />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-white text-[10px] font-black py-0.5 text-center leading-none">
                  Lv.{level}
                </span>
              </div>

              <h4 className="auth-user-name text-lg font-black text-slate-800 mt-2 mb-0.5">
                {currentUser.displayName}
              </h4>

              <div className="flex items-center justify-center gap-1.5 flex-wrap my-1">
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {rankBadge} {rankTierName}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  ☁️ Đã Lưu Cloud
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-2">
                Tài khoản: <strong className="text-slate-700">{currentUser.email?.replace('@purrfish.com', '') || currentUser.displayName}</strong> • UID: <code className="text-[11px]">{currentUser.uid.slice(0, 10)}...</code>
              </p>

              {successMessage && <div className="auth-success-banner mb-3">{successMessage}</div>}

              <div className="auth-actions-row flex flex-col gap-2 w-full mt-2">
                <div className="w-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 rounded-xl p-2.5 flex items-center gap-2 text-xs font-semibold">
                  <span className="text-base">🟢</span>
                  <div className="text-left">
                    <p className="font-bold">Tự Động Lưu Dữ Liệu Liên Tục</p>
                    <p className="text-[11px] text-emerald-700">Mọi tiến trình, số xu và vật phẩm luôn tự động lưu lên Cloud.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="auth-logout-btn w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all text-sm"
                  onClick={handleLogout}
                >
                  🚪 Đăng Xuất Khỏi Tài Khoản
                </button>

                <button
                  type="button"
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl cursor-pointer text-xs transition-colors"
                  onClick={onClose}
                >
                  🐾 Tiếp Tục Chơi Ngay
                </button>
              </div>
            </div>
          ) : (
            /* NẾU CHƯA ĐĂNG NHẬP: HIỂN THỊ TAB TẠO MỚI / ĐĂNG NHẬP */
            <>
              {/* Game Branding & Logo */}
              <div className="flex flex-col items-center justify-center pt-1 pb-3 text-center">
                <img
                  src="/images/logo-purr-fish.jpg"
                  alt="Purr-Fish Logo"
                  className="w-16 h-16 rounded-2xl shadow-md border-2 border-amber-300 object-cover mb-1.5"
                  draggable={false}
                />
                <h4 className="text-base font-black text-amber-950 tracking-tight">Purr-Fish</h4>
                <p className="text-xs text-slate-500 font-medium">Trò chơi nuôi mèo & câu cá thư giãn</p>
              </div>

              {/* Tab Selector */}
              <div className="auth-tabs-row">
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    soundManager.playPop();
                    setTab('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  📝 Tạo Mới
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    soundManager.playPop();
                    setTab('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  🔑 Đăng Nhập
                </button>
              </div>

              {/* Saved accounts chip picker on login tab */}
              {tab === 'login' && savedAccounts.length > 0 && (
                <div className="p-2 bg-orange-50/90 border border-orange-200 rounded-xl text-left mb-2">
                  <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wide block mb-1">
                    🐱 Tài khoản trên máy:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {savedAccounts.map((acc) => (
                      <button
                        key={acc.username}
                        type="button"
                        className="text-xs bg-white hover:bg-orange-100 border border-orange-300 text-orange-950 font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                        onClick={() => {
                          soundManager.playPop();
                          setUsername(acc.username);
                          setPassword(acc.pass);
                          setErrorMessage(null);
                        }}
                        title={`Tài khoản: ${acc.username} • Mèo: ${acc.catName || acc.displayName}`}
                      >
                        <span>🐾</span>
                        <span>{acc.catName || acc.displayName}</span>
                        <span className="text-[10px] text-orange-600 font-semibold">(@{acc.username})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input Container */}
              <form onSubmit={tab === 'register' ? handleSimpleRegister : handleSimpleLogin} className="auth-form">
                <div className="form-group">
                  <label>Tên Tài Khoản (Username)</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="vd: meobap, senmeo123..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                </div>

                {tab === 'register' && (
                  <div className="form-group">
                    <label>Tên Mèo Cưng Của Bạn</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="vd: Hoàng Thượng Múp, Bánh Bao..."
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <span className="text-[11px] text-amber-800 font-medium mt-1 block">
                      🐱 Tên này sẽ xuất hiện trên thanh phòng mèo, nút clicker và Bảng Xếp Hạng
                    </span>
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
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    required
                  />
                </div>

                {errorMessage && <div className="auth-error-banner">{errorMessage}</div>}
                {successMessage && <div className="auth-success-banner">{successMessage}</div>}

                <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                  {isLoading
                    ? 'Đang xử lý...'
                    : tab === 'register'
                    ? '✨ Tạo Tài Khoản & Vào Chơi'
                    : '🚀 Đăng Nhập & Vào Chơi'}
                </button>
              </form>

              {/* Bottom Quick Guest Action Bar */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2 text-xs mt-2">
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
                    ✨ Tạo tài khoản mới
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

export default AuthModal;
