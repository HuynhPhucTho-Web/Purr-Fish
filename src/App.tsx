import React, { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAutoFish } from './hooks/useAutoFish';
import { useLocalSave } from './hooks/useLocalSave';
import { ScoreDisplay } from './components/ScoreDisplay';
import { CatCharacter } from './components/CatCharacter';
import { BottomNavBar, type AppPage } from './components/BottomNavBar';
import { FishPond } from './components/FishPond';
import { BackpackView } from './components/BackpackView';
import { FashionShopView } from './components/FashionShopView';
import { FoodShopMealPlanView } from './components/FoodShopMealPlanView';
import { UpgradeSkinView } from './components/UpgradeSkinView';
import { LeaderboardView } from './components/LeaderboardView';
import { AccountSettingsView } from './components/AccountSettingsView';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { FloatingReward } from './components/FloatingReward';
import { authService } from './services/authService';
import './styles/game.css';

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
    importSave,
    exportSave,
    syncToCloud,
  } = useGameState();

  // Automatic idle fish catching
  useAutoFish({
    autoFishRate,
    onAddFish: addAutoFishAmount,
  });

  // Local storage auto-saving
  const { saveStatus, saveNow } = useLocalSave(state);

  // Active Main Navigation Page ('cat' | 'pond' | 'basket' | 'food' | 'shop' | 'leaderboard' | 'account')
  const [activePage, setActivePage] = useState<AppPage>('cat');

  // Subtab memory for quick-jump transitions
  const [shopSubTab] = useState<'upgrades' | 'skins'>('upgrades');
  const [accountSubTab, setAccountSubTab] = useState<'account' | 'settings'>('account');

  // Màn hình Tạo Tài Khoản / Đăng Nhập: Hiển thị lên trước tiên khi vào game nếu chưa có tài khoản chính thức
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const cur = authService.getCurrentUser();
    return !cur || cur.isAnonymous;
  });

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
            : activePage === 'fashion'
            ? '• Shop Thời Trang'
            : activePage === 'food'
            ? '• Ăn Uống'
            : activePage === 'shop'
            ? '• Nâng Cấp'
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
      />

      {/* 2. DEDICATED VIEW PAGES */}
      <main className="game-main-content-area pt-20 pb-24 min-h-screen bg-surface">
        {/* PAGE 1: PHÒNG MÈO (COZY SANCTUARY CAT ROOM) */}
        {activePage === 'cat' && (
          <div className="cat-page-view">
            <CatCharacter
              currentSkin={currentSkin}
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
              coins={state.fish}
              foodInventory={foodInventory}
              ownedHats={ownedHats}
              equippedHat={equippedHat}
              ownedClothes={ownedClothes}
              equippedClothes={equippedClothes}
              ownedRoomDecor={ownedRoomDecor}
              equippedDecor={equippedDecor}
              lastWaterGiftClaimedAt={lastWaterGiftClaimedAt}
              levelInfo={levelInfo}
              catStage={catStage}
              onOpenPond={() => setActivePage('pond')}
              onOpenFoodShop={() => setActivePage('food')}
              onOpenFashionShop={() => setActivePage('fashion')}
              onOpenBasket={() => setActivePage('basket')}
              onFeedFromInventory={feedCatFromInventory}
              onGiveWater={giveWater}
              onClaimFreeWater={claimFreeWaterGift}
              onBuyFashionItem={buyFashionDecorItem}
              onEquipFashionItem={equipFashionDecorItem}
              onCatClick={(x, y) => handleClick(x, y)}
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
            onCatchFish={catchPondFish}
            onBuyRod={buyOrEquipRod}
            onUseRodDurability={useRodDurability}
            onOpenBasket={() => setActivePage('basket')}
            onClose={() => setActivePage('cat')}
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
            onOpenFashionShop={() => setActivePage('fashion')}
            onFeedFromInventory={feedCatFromInventory}
            onOpenPond={() => setActivePage('pond')}
            onOpenFoodShop={() => setActivePage('food')}
            onBackToCat={() => setActivePage('cat')}
          />
        )}

        {/* PAGE 4: SHOP THỜI TRANG & TRANG TRÍ PHÒNG (DEDICATED FULL VIEW) */}
        {activePage === 'fashion' && (
          <FashionShopView
            coins={state.fish}
            currentSkin={currentSkin}
            ownedHats={ownedHats}
            equippedHat={equippedHat}
            ownedClothes={ownedClothes}
            equippedClothes={equippedClothes}
            ownedRoomDecor={ownedRoomDecor}
            equippedDecor={equippedDecor}
            onBuyItem={buyFashionDecorItem}
            onEquipItem={equipFashionDecorItem}
            onBackToCat={() => setActivePage('cat')}
          />
        )}

        {/* PAGE 4: CỬA HÀNG THỨC ĂN & KẾ HOẠCH DINH DƯỠNG (FOOD & MEAL PLANS) */}
        {activePage === 'food' && (
          <FoodShopMealPlanView
            coins={state.fish}
            currentFood={state.food}
            currentWater={state.water}
            foodInventory={foodInventory}
            activeMealPlan={state.activeMealPlan}
            onBuyFoodToInventory={buyFoodToInventory}
            onFeedFromInventory={feedCatFromInventory}
            onBuyMealPlan={buyMealPlan}
            onBackToCat={() => setActivePage('cat')}
          />
        )}

        {/* PAGE 5: NÂNG CẤP & SKIN (UPGRADES & SKINS) */}
        {activePage === 'shop' && (
          <UpgradeSkinView
            fish={state.fish}
            upgrades={state.upgrades}
            unlockedSkins={state.unlockedSkins}
            equippedSkin={state.equippedSkin}
            defaultSubTab={shopSubTab}
            onBuyUpgrade={buyUpgrade}
            onEquipSkin={equipSkin}
            onUnlockSkin={unlockSkin}
            onBackToCat={() => setActivePage('cat')}
          />
        )}

        {/* PAGE 6: BẢNG XẾP HẠNG TOÀN CẦU (LEADERBOARD) */}
        {activePage === 'leaderboard' && (
          <LeaderboardView
            myLevel={levelInfo.level}
            myXp={state.xp}
            myRankTier={levelInfo.rankTier}
            myDisplayName={currentUser?.displayName || 'Bạn (Ngư Thủ Cá Bự)'}
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
          />
        )}

        {/* PAGE 7: TÀI KHOẢN & CÀI ĐẶT (ACCOUNT & SETTINGS) */}
        {activePage === 'account' && (
          <AccountSettingsView
            currentUser={currentUser}
            settings={state.settings}
            saveStatus={saveStatus}
            defaultSubTab={accountSubTab}
            onUpdateSettings={updateSettings}
            onSaveNow={saveNow}
            onResetGame={resetGame}
            onExportSave={exportSave}
            onImportSave={importSave}
            onSyncCloudNow={syncToCloud}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onBackToCat={() => setActivePage('cat')}
          />
        )}
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
      />

      {/* 4. Bottom Navigation Bar */}
      <BottomNavBar
        activePage={activePage}
        onChangePage={setActivePage}
        basketCount={basketCount}
        foodPercent={state.food}
        waterPercent={state.water}
      />

      {/* 5. Màn hình Tạo Tài Khoản / Đăng Nhập (Hiện lên trước khi vào game) */}
      {isAuthModalOpen && (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setIsAuthModalOpen(false)}
          onSyncNow={syncToCloud}
          initialTab="register"
        />
      )}

      {/* 6. Settings Modal (Bật lên từ Nút Bánh Răng ⚙️ trên header) */}
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
      />
    </div>
  );
};

export default App;
