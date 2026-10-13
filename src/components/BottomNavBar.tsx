import React from 'react';
import { soundManager } from '../utils/sound';

export type AppPage = 'cat' | 'pond' | 'basket' | 'food' | 'shop' | 'leaderboard' | 'account' | 'fashion';

interface BottomNavBarProps {
  activePage: AppPage;
  onChangePage: (page: AppPage) => void;
  basketCount: number;
  foodPercent: number;
  waterPercent: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activePage,
  onChangePage,
  basketCount,
  foodPercent,
  waterPercent,
}) => {
  const isHungryOrThirsty = foodPercent < 25 || waterPercent < 25;

  const handleTabClick = (page: AppPage) => {
    soundManager.playPop();
    onChangePage(page);
  };

  const navItems = [
    {
      id: 'cat' as AppPage,
      label: 'Phòng Mèo',
      iconName: 'pets',
      badge: null,
    },
    {
      id: 'pond' as AppPage,
      label: 'Hồ & Balo',
      iconName: 'phishing',
      badge: basketCount > 0 ? `${basketCount}` : null,
      badgeColor: '#3B82F6',
    },
    {
      id: 'food' as AppPage,
      label: 'Ăn Uống',
      iconName: 'lunch_dining',
      badge: isHungryOrThirsty ? 'Đói!' : null,
      badgeColor: '#EF4444',
    },
    {
      id: 'shop' as AppPage,
      label: 'Nâng Cấp',
      iconName: 'auto_fix_high',
      badge: null,
    },
    {
      id: 'leaderboard' as AppPage,
      label: 'Xếp Hạng',
      iconName: 'military_tech',
      badge: null,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(122,105,104,0.1)] border-t border-outline-variant/30 select-none"
      aria-label="Thanh điều hướng trò chơi"
    >
      <div className="flex justify-around items-center h-16 px-space-xs max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive =
            activePage === item.id ||
            (item.id === 'pond' && activePage === 'basket') ||
            (item.id === 'cat' && activePage === 'fashion');

          return (
            <button
              key={item.id}
              type="button"
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'bg-surface-container text-primary font-bold shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => handleTabClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">
                  {item.iconName}
                </span>
                {item.badge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full leading-tight shadow-sm whitespace-nowrap"
                    style={{ backgroundColor: item.badgeColor || '#FF8533' }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              {/* <span className="font-label-sm text-label-sm text-center leading-tight">
                {item.label}
              </span> */}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
