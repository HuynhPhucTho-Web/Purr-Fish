import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { type GameSaveData, sanitizeSaveData } from '../utils/saveGame';
import { calculateLevelFromTotalXp } from '../data/rankTiers';

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, v) => (v === undefined ? null : v)));
}

export const cloudSaveService = {
  /**
   * Lưu dữ liệu người chơi lên Firestore (/users/{uid})
   */
  async saveToCloud(uid: string, data: GameSaveData): Promise<boolean> {
    try {
      if (!uid) return false;
      if (!auth.currentUser) {
        console.warn('Không thể lưu lên Cloud: Người dùng chưa đăng nhập hoặc phiên đã kết thúc.');
        return false;
      }

      const totalXp = Math.max(0, Number(data.xp) || 0);
      const calculatedLevel = calculateLevelFromTotalXp(totalXp).level;
      const coinAmount = Math.max(0, Number(data.fish ?? data.coins) || 0);

      const userCatName = (data.catName && data.catName !== 'Mèo Cưng')
        ? data.catName
        : (auth.currentUser?.displayName || data.catName || 'Mèo Cưng');

      const ref = doc(db, 'users', uid);
      const cleanData = sanitizeForFirestore({
        ...data,
        level: Math.max(calculatedLevel, Number(data.level) || 1),
        xp: totalXp,
        fish: coinAmount,
        coins: coinAmount,
        catName: userCatName,
        displayName: userCatName,
        username: data.username || auth.currentUser?.email?.replace('@purrfish.com', '') || '',
        catAvatar: data.catAvatar || auth.currentUser?.photoURL || '/images/cat_avatars_webp/avatar_01.webp',
        photoURL: data.catAvatar || auth.currentUser?.photoURL || '/images/cat_avatars_webp/avatar_01.webp',
        lastSaved: Date.now(),
      });

      await setDoc(ref, cleanData, { merge: true });
      return true;
    } catch (err) {
      console.error('Lỗi lưu cloud Firestore (/users):', err);
      return false;
    }
  },

  /**
   * Tải dữ liệu người chơi từ Firestore (/users/{uid})
   */
  async loadFromCloud(uid: string): Promise<GameSaveData | null> {
    try {
      if (!uid) return null;
      const ref = doc(db, 'users', uid);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as Partial<GameSaveData>;
        const sanitized = sanitizeSaveData(cloudData);
        return sanitized;
      }
      return null;
    } catch (err) {
      console.error('Lỗi tải cloud Firestore (/users):', err);
      return null;
    }
  },
};

export default cloudSaveService;
