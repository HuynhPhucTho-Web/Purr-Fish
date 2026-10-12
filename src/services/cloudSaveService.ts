import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_SAVE_DATA, type GameSaveData } from '../utils/saveGame';

export const cloudSaveService = {
  /**
   * Lưu dữ liệu người chơi lên Firestore
   */
  async saveToCloud(uid: string, data: GameSaveData): Promise<boolean> {
    try {
      if (!uid) return false;
      const ref = doc(db, 'users', uid);
      await setDoc(ref, {
        ...data,
        lastSaved: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Lỗi lưu cloud Firestore (offline hoặc quy tắc rules):', err);
      return false;
    }
  },

  /**
   * Tải dữ liệu người chơi từ Firestore
   */
  async loadFromCloud(uid: string): Promise<GameSaveData | null> {
    try {
      if (!uid) return null;
      const ref = doc(db, 'users', uid);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as Partial<GameSaveData>;
        const coinAmount = Math.max(0, Number(cloudData.fish ?? cloudData.coins) || 0);

        return {
          ...DEFAULT_SAVE_DATA,
          ...cloudData,
          fish: coinAmount,
          coins: coinAmount,
          xp: Math.max(0, Number(cloudData.xp) || 0),
          level: Math.max(1, Number(cloudData.level) || 1),
          fishBasket: Array.isArray(cloudData.fishBasket) ? cloudData.fishBasket : [],
          upgrades: { ...DEFAULT_SAVE_DATA.upgrades, ...(cloudData.upgrades || {}) },
          settings: { ...DEFAULT_SAVE_DATA.settings, ...(cloudData.settings || {}) },
          unlockedSkins: Array.isArray(cloudData.unlockedSkins) && cloudData.unlockedSkins.length > 0
            ? cloudData.unlockedSkins
            : ['orange_tabby'],
        };
      }
      return null;
    } catch (err) {
      console.warn('Lỗi tải cloud Firestore (offline hoặc chưa có dữ liệu):', err);
      return null;
    }
  },
};
