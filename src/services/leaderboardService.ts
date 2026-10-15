import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  catName?: string;
  username?: string;
  photoURL?: string;
  level: number;
  xp: number;
  rankTierKey: string;
  rankTierName: string;
  rankBadge: string;
  coins: number;
  biggestFishKg: number;
  equippedSkin: string;
  catStageLabel: string;
  updatedAt: number;
}

export const leaderboardService = {
  /**
   * Cập nhật thông tin điểm người chơi lên bảng xếp hạng Firestore (/leaderboards/{uid})
   */
  async updateMyEntry(entry: LeaderboardEntry): Promise<void> {
    try {
      if (!entry.uid) return;
      const ref = doc(db, 'leaderboards', entry.uid);
      await setDoc(ref, {
        ...entry,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.warn('Lỗi cập nhật leaderboard Firestore (đang offline hoặc chưa cấp quyền):', err);
    }
  },

  /**
   * Lấy danh sách toàn bộ người chơi THẬT từ Firestore (không dùng dữ liệu ảo)
   */
  async getTopLeaderboard(maxLimit = 100): Promise<LeaderboardEntry[]> {
    try {
      const q = query(collection(db, 'leaderboards'), limit(maxLimit));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return [];
      }

      const list: LeaderboardEntry[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as LeaderboardEntry;
        if (item) {
          list.push({
            ...item,
            uid: item.uid || d.id,
            displayName: item.displayName || item.catName || item.username || 'Ngư Thủ Boss Mèo',
            level: Number(item.level) || 1,
            xp: Number(item.xp) || 0,
            coins: Number(item.coins) || 0,
            photoURL: item.photoURL || '/images/cat_avatars_webp/avatar_01.webp',
            biggestFishKg: Number(item.biggestFishKg) || 0,
            updatedAt: Number(item.updatedAt) || Date.now(),
          });
        }
      });

      return list;
    } catch (err) {
      console.warn('Lỗi đọc bảng xếp hạng thật từ Firestore:', err);
      return [];
    }
  },
};

