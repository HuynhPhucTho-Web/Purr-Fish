import React, { useRef, useState } from 'react';
import { CAT_AVATARS } from '../services/authService';
import { soundManager } from '../utils/sound';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string | null;
  currentLevel: number;
  displayName?: string;
  rankBadge?: string;
  rankTierName?: string;
  onSelectAvatar: (avatarUrl: string) => void;
  onOpenAuth?: () => void;
  isLoggedIn?: boolean;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  currentLevel,
  displayName = 'Sen Nuôi Mèo',
  rankBadge = '🥉',
  rankTierName = 'Tập Sự',
  onSelectAvatar,
  onOpenAuth,
  isLoggedIn = true,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const activeAvatar = currentAvatar || CAT_AVATARS[0];

  if (!isOpen) return null;

  const handleSelect = (avatarUrl: string) => {
    soundManager.playPop();
    soundManager.playUnlock();
    onSelectAvatar(avatarUrl);
    setToastMessage('✨ Đã cập nhật ảnh đại diện thành công!');
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
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
            <span className="modal-icon">🐾</span>
            <div>
              <h3>Ảnh Đại Diện Boss Mèo</h3>
              <p className="modal-subtext">Hiển thị trên thanh trạng thái (Lv.{currentLevel}) & BXH</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body auth-modal-body flex flex-col gap-3">
          {/* Active Avatar Profile Banner */}
          <div className="bg-gradient-to-r from-orange-100/90 via-amber-50 to-orange-100/90 border border-orange-200/80 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-0.5 shadow-md border-2 border-orange-400 shrink-0">
              <img
                src={activeAvatar}
                alt="Current Cat Avatar"
                className="w-full h-full rounded-full object-cover"
              />
              <span className="absolute -bottom-1 -right-1 bg-orange-600 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-black shadow-sm border border-white">
                Lv.{currentLevel}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm sm:text-base text-orange-950 truncate max-w-[150px]">
                  {displayName}
                </span>
                <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  {rankBadge} {rankTierName}
                </span>
              </div>
              <p className="text-[11px] text-orange-800/80 mt-0.5 font-medium">
                {isLoggedIn ? 'Chọn một trong 8 phong cách Boss bên dưới 👇' : 'Chế độ Chơi Thử chưa mở khóa đổi Avatar'}
              </p>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold text-center">
              {toastMessage}
            </div>
          )}

          {/* NẾU CHƯA ĐĂNG NHẬP: THÔNG BÁO TẠO TÀI KHOẢN ĐỂ ĐỔI AVATAR & ĐUA HẠNG */}
          {!isLoggedIn ? (
            <div className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-5 text-center flex flex-col items-center gap-2.5 my-2 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl shadow-xs border border-amber-300">
                🔒
              </div>
              <h4 className="font-black text-sm sm:text-base text-amber-950">
                Mở Khóa Đổi Avatar & Đua Top BXH
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed max-w-sm">
                Bạn đang ở <strong>Chế Độ Chơi Thử</strong>. Hãy <strong>Tạo Tài Khoản</strong> hoặc <strong>Đăng Nhập</strong> để tùy chọn 8 mẫu Avatar Boss Mèo độc quyền và tham gia Đua Top Bảng Xếp Hạng Toàn Cầu!
              </p>
              <button
                type="button"
                className="mt-2 w-full max-w-xs py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
              >
                ✨ Tạo Tài Khoản / Đăng Nhập Đua Top
              </button>
            </div>
          ) : (
            /* 8 Cat Avatars Grid cho người đã đăng nhập */
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 py-1">
              {CAT_AVATARS.map((avatarUrl, idx) => {
                const isSelected = activeAvatar === avatarUrl;
                return (
                  <button
                    key={avatarUrl}
                    type="button"
                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 cursor-pointer bg-white flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-orange-500 ring-4 ring-orange-300/80 scale-105 shadow-lg bg-orange-50'
                        : 'border-orange-100 hover:border-orange-300 hover:scale-102 hover:shadow-md'
                    }`}
                    onClick={() => handleSelect(avatarUrl)}
                    title={`Avatar Mèo ${idx + 1}`}
                  >
                    <img
                      src={avatarUrl}
                      alt={`Avatar ${idx + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-orange-600 text-white text-[9px] flex items-center justify-center font-black shadow ring-1 ring-white">
                        ✓
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-orange-900/70 mt-0.5">
                      Mèo #{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-orange-100 flex items-center justify-between gap-2 mt-1">
            {onOpenAuth && (
              <button
                type="button"
                className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
              >
                👤 Đổi tên / Tạo tài khoản
              </button>
            )}
            <button
              type="button"
              className="ml-auto px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
              onClick={onClose}
            >
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
