import React from 'react';
import { soundManager } from '../utils/sound';

export type AppPage = 'cat' | 'pond' | 'basket' | 'growth' | 'shop' | 'leaderboard' | 'account' | 'fashion' | 'food';

interface BottomNavBarProps {
  activePage: AppPage;
  onChangePage: (page: AppPage) => void;
  basketCount: number;
  foodPercent: number;
  waterPercent: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = React.memo(({
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
      badge: isHungryOrThirsty ? 'Đói!' : null,
      badgeColor: '#EF4444',
    },
    {
      id: 'pond' as AppPage,
      label: 'Hồ Câu',
      iconName: 'phishing',
      badge: basketCount > 0 ? `${basketCount}` : null,
      badgeColor: '#3B82F6',
    },
    {
      id: 'growth' as AppPage,
      label: 'Nâng Cấp',
      iconName: 'bolt',
      badge: null,
    },
    {
      id: 'shop' as AppPage,
      label: 'Cửa Hàng',
      iconName: 'storefront',
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
      className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-amber-100/80 select-none"
      style={{
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
      }}
      aria-label="Thanh điều hướng trò chơi"
    >
      <div className="flex justify-around items-center h-13 sm:h-16 px-1 sm:px-2 max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive =
            activePage === item.id ||
            (item.id === 'pond' && activePage === 'basket') ||
            (item.id === 'shop' && (activePage === 'fashion' || activePage === 'food')) ||
            (item.id === 'cat' && activePage === 'account');

          return (
            <button
              key={item.id}
              type="button"
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 max-w-[76px] min-h-[42px] sm:min-h-[50px] py-0.5 sm:py-1 px-0.5 sm:px-1 rounded-xl sm:rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-amber-100/70 text-primary font-black shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => handleTabClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px] sm:text-[24px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.iconName}
                </span>
                {item.badge && (
                  <span
                    className="absolute -top-1.5 -right-3 text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full leading-tight shadow-sm whitespace-nowrap"
                    style={{ backgroundColor: item.badgeColor || '#EF4444' }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] text-center leading-none mt-0.5 whitespace-nowrap font-bold ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
