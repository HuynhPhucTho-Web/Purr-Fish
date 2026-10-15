import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAutoFish } from './hooks/useAutoFish';
import { useLocalSave } from './hooks/useLocalSave';
import { ScoreDisplay } from './components/ScoreDisplay';
import { CatCharacter } from './components/CatCharacter';
import { BottomNavBar, type AppPage } from './components/BottomNavBar';
import { FloatingReward } from './components/FloatingReward';
import { authService } from './services/authService';
import { soundManager } from './utils/sound';
import './styles/game.css';

// Lazy-loaded heavy views and modals for fast initial load
const FishPond = React.lazy(() => import('./components/FishPond').then((m) => ({ default: m.FishPond })));
const BackpackView = React.lazy(() => import('./components/BackpackView').then((m) => ({ default: m.BackpackView })));
const GrowthUpgradeView = React.lazy(() => import('./components/GrowthUpgradeView').then((m) => ({ default: m.GrowthUpgradeView })));
const MasterShopView = React.lazy(() => import('./components/MasterShopView').then((m) => ({ default: m.MasterShopView })));
const LeaderboardView = React.lazy(() => import('./components/LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const AccountSettingsView = React.lazy(() => import('./components/AccountSettingsView').then((m) => ({ default: m.AccountSettingsView })));
const AuthModal = React.lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const AvatarPickerModal = React.lazy(() => import('./components/AvatarPickerModal').then((m) => ({ default: m.AvatarPickerModal })));

export const App: React.FC = () => {
  const {
    state,
    currentSkin,
    currentUser,
    levelInfo,
    catStage,
    actualClickPower,
    autoFishRate,
    comboCount,
    comboMultiplier,
    isFrenzy,
    isCatActive,
    floatingItems,
    sparkles,
    offlineReward,
    lastCaughtFish,
    foodInventory,
    catchPondFish,
    sellFish,
    sellAllFish,
    buyFoodToInventory,
    feedCatFromInventory,
    buyMealPlan,
    giveWater,
    handleClick,
    playWithToy,
    buyUpgrade,
    unlockSkin,
    equipSkin,
    catchGoldenFish,
    addAutoFishAmount,
    claimOfflineReward,
    updateSettings,
    removeFloatingItem,
    removeSparkle,
    equippedRodId,
    rodDurability,
    unlockedRods,
    ownedHats,
    equippedHat,
    ownedClothes,
    equippedClothes,
    ownedRoomDecor,
    equippedDecor,
    lastWaterGiftClaimedAt,
    claimFreeWaterGift,
    buyFashionDecorItem,
    equipFashionDecorItem,
    buyOrEquipRod,
    useRodDurability,
    resetGame,
    logoutGame,
    importSave,
    exportSave,
    syncToCloud,
    updateUserAvatar,
    updateCatName,
    loadUserDataFromCloud,
  } = useGameState();

  // Automatic idle fish catching
  useAutoFish({
    autoFishRate,
    onAddFish: addAutoFishAmount,
  });

  // Local storage auto-saving (chỉ lưu khi có user đăng nhập)
  const { saveStatus, saveNow } = useLocalSave(state, currentUser);

  // Active Main Navigation Page ('cat' | 'pond' | 'basket' | 'food' | 'shop' | 'leaderboard' | 'account')
  const [activePage, setActivePage] = useState<AppPage>('cat');

  // Quản lý chuyển đổi nhạc nền game:
  // - Khi vào hồ câu cá ('pond'): phát /sounds/music/fish-chill.mp3
  // - Khi ở phòng mèo và các màn hình khác: phát /sounds/music/music-layout.mp3
  useEffect(() => {
    if (activePage === 'pond') {
      soundManager.setBgmTrack('pond');
    } else {
      soundManager.setBgmTrack('room');
    }
  }, [activePage]);

  // Subtab memory for quick-jump transitions
  const [shopSubTab, setShopSubTab] = useState<'rods' | 'food' | 'fashion' | 'fish'>('rods');
  const [growthSubTab, setGrowthSubTab] = useState<'upgrades' | 'skins' | 'meal_plans'>('upgrades');
  const [autoOpenFeedModal, setAutoOpenFeedModal] = useState<boolean>(false);
  const [accountSubTab, setAccountSubTab] = useState<'account' | 'settings'>('account');

  // Màn hình Tạo Tài Khoản / Đăng Nhập: Hiển thị nếu lần đầu vào game và chưa có tài khoản
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    try {
      const hasVisited = localStorage.getItem('PURR_FISH_HAS_VISITED');
      if (!hasVisited) {
        localStorage.setItem('PURR_FISH_HAS_VISITED', 'true');
        const cur = authService.getCurrentUser();
        return !cur || cur.isAnonymous;
      }
    } catch {}
    return false;
  });

  // Modal Chọn Avatar Boss Mèo (Bật lên khi click vào Avatar / Level trên header)
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState<boolean>(false);

  // Modal Cài Đặt (Mở nhanh từ nút bánh răng ⚙️ trên header)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const basketCount = Array.isArray(state.fishBasket) ? state.fishBasket.length : 0;

  return (
    <div className="game-app-layout">
      {/* 1. Universal Top Header Bar */}
      <ScoreDisplay
        fish={state.fish}
        highestFish={state.highestFish}
        level={levelInfo.level}
        rankBadge={levelInfo.rankTier.badge}
        rankBadgeImage={levelInfo.rankTier.badgeImage}
        rankTierName={levelInfo.rankTier.name}
        currentUser={currentUser}
        soundEnabled={state.settings.soundEnabled}
        pageSubtitle={
          activePage === 'leaderboard'
            ? '• Xếp Hạng'
            : activePage === 'pond'
            ? '• Hồ Câu'
            : activePage === 'basket'
            ? '• Balo Của Boss'
            : activePage === 'growth'
            ? '• Nâng Cấp & Skin'
            : activePage === 'shop' || activePage === 'food' || activePage === 'fashion'
            ? '• Cửa Hàng Tổng Hợp'
            : activePage === 'account'
            ? '• Tài Khoản'
            : '• Phòng Mèo'
        }
        onToggleSound={() => updateSettings({ soundEnabled: !state.settings.soundEnabled })}
        onOpenLeaderboard={() => setActivePage('leaderboard')}
        onOpenAuth={() => {
          if (!currentUser || currentUser.isAnonymous) {
            setIsAuthModalOpen(true);
          } else {
            setAccountSubTab('account');
            setActivePage('account');
          }
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
      />

      {/* 2. DEDICATED VIEW PAGES */}
      <main className="game-main-content-area pt-16 sm:pt-20 pb-20 sm:pb-28 min-h-screen bg-surface">
        <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-slate-500 font-bold">Đang tải nội dung...</div>}>
          {/* PAGE 1: PHÒNG MÈO (COZY SANCTUARY CAT ROOM) */}
        {activePage === 'cat' && (
          <div className="cat-page-view">
            <CatCharacter
              currentSkin={currentSkin}
              catName={state.catName || currentUser?.catName || currentUser?.displayName || currentSkin.name}
              username={state.username || currentUser?.username || ''}
              catAvatar={state.catAvatar || currentUser?.photoURL || currentSkin.image}
              onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
              isCatActive={isCatActive}
              actualClickPower={actualClickPower}
              autoFishRate={autoFishRate}
              comboMultiplier={comboMultiplier}
              comboCount={comboCount}
              isFrenzy={isFrenzy}
              visualTheme={state.settings.visualTheme}
              lastCaughtFish={lastCaughtFish}
              food={state.food}
              water={state.water}
              basketCount={basketCount}
              foodInventory={foodInventory}
              ownedHats={ownedHats}
              equippedHat={equippedHat}
              ownedClothes={ownedClothes}
              equippedClothes={equippedClothes}
              ownedRoomDecor={ownedRoomDecor}
              equippedDecor={equippedDecor}
              lastWaterGiftClaimedAt={lastWaterGiftClaimedAt}
              satietyExpiresAt={state.satietyExpiresAt}
              satietyTotalDurationMs={state.satietyTotalDurationMs}
              zeroDecayUntil={state.zeroDecayUntil}
              satietyDecayReduction={state.satietyDecayReduction}
              satietyFoodName={state.satietyFoodName}
              satietyFoodTier={state.satietyFoodTier}
              levelInfo={levelInfo}
              catStage={catStage}
              onOpenPond={() => setActivePage('pond')}
              onOpenFoodShop={() => {
                setShopSubTab('food');
                setActivePage('shop');
              }}
              onOpenFashionShop={() => {
                setShopSubTab('fashion');
                setActivePage('shop');
              }}
              onOpenBasket={() => setActivePage('basket')}
              onOpenRodShop={() => {
                setShopSubTab('rods');
                setActivePage('shop');
              }}
              onOpenGrowth={(tab = 'upgrades') => {
                setGrowthSubTab(tab);
                setActivePage('growth');
              }}
              onFeedFromInventory={feedCatFromInventory}
              onGiveWater={giveWater}
              onClaimFreeWater={claimFreeWaterGift}
              onBuyFashionItem={buyFashionDecorItem}
              onEquipFashionItem={equipFashionDecorItem}
              onCatClick={(x, y) => handleClick(x, y)}
              onPlayWithToy={playWithToy}
              autoOpenFeedModal={autoOpenFeedModal}
              onResetAutoOpenFeed={() => setAutoOpenFeedModal(false)}
            />
          </div>
        )}

        {/* PAGE 2: BỂ SĂN CÁ NGUYÊN BẢN (ORIGINAL IMMERSIVE FISH POND UI) */}
        {activePage === 'pond' && (
          <FishPond
            currentSkin={currentSkin}
            fish={state.fish}
            basketCount={basketCount}
            equippedRodId={equippedRodId}
            rodDurability={rodDurability}
            unlockedRods={unlockedRods}
            catFood={state.food}
            satietyExpiresAt={state.satietyExpiresAt}
            onCatchFish={catchPondFish}
            onBuyRod={buyOrEquipRod}
            onUseRodDurability={useRodDurability}
            onOpenBasket={() => setActivePage('basket')}
            onClose={() => setActivePage('cat')}
            onGoToFeed={() => {
              setActivePage('cat');
              setAutoOpenFeedModal(true);
            }}
          />
        )}

        {/* PAGE 3: BALO CỦA BOSS (BACKPACK: TÚI CÁ, CẦN CÂU, THỜI TRANG, THỨC ĂN) */}
        {activePage === 'basket' && (
          <BackpackView
            basket={state.fishBasket || []}
            fish={state.fish}
            currentSkin={currentSkin}
            unlockedSkins={state.unlockedSkins}
            equippedRodId={equippedRodId}
            rodDurability={rodDurability}
            unlockedRods={unlockedRods}
            foodInventory={foodInventory}
            ownedHats={ownedHats}
            equippedHat={equippedHat}
            ownedClothes={ownedClothes}
            equippedClothes={equippedClothes}
            ownedRoomDecor={ownedRoomDecor}
            equippedDecor={equippedDecor}
            levelInfo={levelInfo}
            catStage={catStage}
            onSellFish={sellFish}
            onSellAllFish={sellAllFish}
            onEquipSkin={(skinId) => { equipSkin(skinId); return true; }}
            onUnlockSkin={unlockSkin}
            onBuyOrEquipRod={buyOrEquipRod}
            onEquipFashionItem={equipFashionDecorItem}
            onOpenFashionShop={() => {
              setShopSubTab('fashion');
              setActivePage('shop');
            }}
            onFeedFromInventory={feedCatFromInventory}
            onOpenPond={() => setActivePage('pond')}
            onOpenFoodShop={() => {
              setShopSubTab('food');
              setActivePage('shop');
            }}
            onBackToCat={() => setActivePage('cat')}
          />
        )}

        {/* PAGE 4: NÂNG CẤP & PHÁT TRIỂN (KỸ NĂNG • SKIN • KẾ HOẠCH BỮA ĂN) */}
        {activePage === 'growth' && (
          <GrowthUpgradeView
            coins={state.fish}
            upgrades={state.upgrades}
            unlockedSkins={state.unlockedSkins}
            equippedSkin={state.equippedSkin}
            activeMealPlan={state.activeMealPlan}
            defaultSubTab={growthSubTab}
            onBuyUpgrade={buyUpgrade}
            onEquipSkin={equipSkin}
            onUnlockSkin={unlockSkin}
            onBuyMealPlan={buyMealPlan}
            onBackToCat={() => setActivePage('cat')}
          />
        )}

        {/* PAGE 5: CỬA HÀNG TỔNG HỢP (CẦN CÂU • THỨC ĂN • THỜI TRANG • CHỢ CÁ) */}
        {(activePage === 'shop' || activePage === 'food' || activePage === 'fashion') && (
          <MasterShopView
            coins={state.fish}
            currentSkin={currentSkin}
            equippedRodId={equippedRodId}
            rodDurability={rodDurability}
            unlockedRods={unlockedRods}
            foodInventory={foodInventory}
            fishBasket={state.fishBasket || []}
            ownedHats={ownedHats}
            equippedHat={equippedHat}
            ownedClothes={ownedClothes}
            equippedClothes={equippedClothes}
            ownedRoomDecor={ownedRoomDecor}
            equippedDecor={equippedDecor}
            defaultSubTab={
              activePage === 'food'
                ? 'food'
                : activePage === 'fashion'
                ? 'fashion'
                : shopSubTab
            }
            onBuyOrEquipRod={buyOrEquipRod}
            onBuyFoodToInventory={buyFoodToInventory}
            onBuyFashionItem={buyFashionDecorItem}
            onEquipFashionItem={equipFashionDecorItem}
            onSellFish={sellFish}
            onSellAllFish={sellAllFish}
            onBackToCat={() => setActivePage('cat')}
            onOpenPond={() => setActivePage('pond')}
          />
        )}

        {/* PAGE 6: BẢNG XẾP HẠNG TOÀN CẦU (LEADERBOARD) */}
        {activePage === 'leaderboard' && (
          <LeaderboardView
            myLevel={levelInfo.level}
            myXp={state.xp}
            myRankTier={levelInfo.rankTier}
            myDisplayName={state.catName || currentUser?.catName || currentUser?.displayName || 'Bạn (Ngư Thủ Cá Bự)'}
            myAvatar={state.catAvatar || currentUser?.photoURL || currentSkin?.image || '/images/cat_avatars_webp/avatar_01.webp'}
            myBiggestFishKg={state.biggestFishKg || 12.5}
            myCoins={state.fish}
            currentSkin={currentSkin}
            totalFishCaught={state.totalFishCaught || state.totalClicks || state.fish || 148250}
            saveStatus={saveStatus}
            onSaveNow={saveNow}
            onExportSave={exportSave}
            onImportSave={importSave}
            onSyncCloudNow={syncToCloud}
            onBackToCat={() => setActivePage('cat')}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* PAGE 7: TÀI KHOẢN & CÀI ĐẶT (ACCOUNT & SETTINGS) */}
        {activePage === 'account' && (
          <AccountSettingsView
            currentUser={currentUser}
            settings={state.settings}
            saveStatus={saveStatus}
            defaultSubTab={accountSubTab}
            gameState={state}
            onUpdateSettings={updateSettings}
            onSaveNow={saveNow}
            onResetGame={resetGame}
            onExportSave={exportSave}
            onImportSave={importSave}
            onSyncCloudNow={syncToCloud}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onBackToCat={() => setActivePage('cat')}
            onLogout={logoutGame}
            onUpdateCatName={updateCatName}
          />
        )}
        </React.Suspense>
      </main>

      {/* 3. Floating Reward Particles & Offline Reward Modal */}
      <FloatingReward
        floatingItems={floatingItems}
        sparkles={sparkles}
        offlineReward={offlineReward}
        onRemoveFloatingItem={removeFloatingItem}
        onRemoveSparkle={removeSparkle}
        onCatchGoldenFish={catchGoldenFish}
        onClaimOffline={claimOfflineReward}
        clickPower={actualClickPower}
        isCatRoomActive={activePage === 'cat'}
      />

      {/* 4. Bottom Navigation Bar */}
      <BottomNavBar
        activePage={activePage}
        onChangePage={setActivePage}
        basketCount={basketCount}
        foodPercent={state.food}
        waterPercent={state.water}
      />

      {/* 5. Lazy Modals */}
      <React.Suspense fallback={null}>
        {/* Màn hình Tạo Tài Khoản / Đăng Nhập (Hiện lên trước khi vào game) */}
        {isAuthModalOpen && (
          <AuthModal
            currentUser={currentUser}
            onClose={() => setIsAuthModalOpen(false)}
            onSyncNow={(overrideUser) => syncToCloud(overrideUser)}
            onLoginSuccess={loadUserDataFromCloud}
            initialTab="register"
            gameState={state}
            level={levelInfo.level}
            rankBadge={levelInfo.rankTier.badge}
            rankTierName={levelInfo.rankTier.name}
            onLogout={logoutGame}
          />
        )}

        {/* Settings Modal (Bật lên từ Nút Bánh Răng ⚙️ trên header) */}
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={state.settings}
            onUpdateSettings={updateSettings}
            onSaveNow={saveNow}
            saveStatus={saveStatus}
            onResetGame={resetGame}
            onExportSave={exportSave}
            onImportSave={importSave}
            currentUser={currentUser}
            onLogout={logoutGame}
            onOpenAuth={() => {
              setIsSettingsModalOpen(false);
              setIsAuthModalOpen(true);
            }}
            onUpdateCatName={updateCatName}
          />
        )}

        {/* Avatar Picker Modal (Bật lên khi click vào Avatar Mèo / Level trên header) */}
        {isAvatarPickerOpen && (
          <AvatarPickerModal
            isOpen={isAvatarPickerOpen}
            onClose={() => setIsAvatarPickerOpen(false)}
            currentAvatar={currentUser?.photoURL}
            currentLevel={levelInfo.level}
            displayName={state.catName || currentUser?.displayName || 'Sen Nuôi Mèo'}
            rankBadge={levelInfo.rankTier.badge}
            rankTierName={levelInfo.rankTier.name}
            isLoggedIn={Boolean(currentUser && !currentUser.isAnonymous)}
            onSelectAvatar={(avatarUrl) => updateUserAvatar(avatarUrl)}
            onOpenAuth={() => {
              setIsAvatarPickerOpen(false);
              setIsAuthModalOpen(true);
            }}
          />
        )}
      </React.Suspense>
    </div>
  );
};

export default App;
