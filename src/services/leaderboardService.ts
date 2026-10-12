import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
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

// Bảng xếp hạng khởi tạo mẫu để hiển thị ngay khi vừa tạo game hoặc khi offline
export const MOCK_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    uid: 'mock_1',
    displayName: '👑 Mèo Hoàng Gia Chonky',
    level: 105,
    xp: 485000,
    rankTierKey: 'legend',
    rankTierName: 'Huyền Thoại (Legend)',
    rankBadge: '🔥',
    coins: 1450000,
    biggestFishKg: 34.6,
    equippedSkin: 'royal_cat',
    catStageLabel: 'Mèo Đại Gia Béo Múp',
    updatedAt: Date.now() - 3600000,
  },
  {
    uid: 'mock_2',
    displayName: '💎 Boss Mèo Tuxedo',
    level: 88,
    xp: 340000,
    rankTierKey: 'diamond',
    rankTierName: 'Kim Cương (Diamond)',
    rankBadge: '💎',
    coins: 890000,
    biggestFishKg: 28.2,
    equippedSkin: 'tuxedo',
    catStageLabel: 'Mèo Đại Gia Béo Múp',
    updatedAt: Date.now() - 7200000,
  },
  {
    uid: 'mock_3',
    displayName: '🥇 Thợ Câu Đại Dương',
    level: 68,
    xp: 195000,
    rankTierKey: 'gold',
    rankTierName: 'Vàng (Gold)',
    rankBadge: '🥇',
    coins: 430000,
    biggestFishKg: 22.8,
    equippedSkin: 'gray_cat',
    catStageLabel: 'Mèo Đại Gia Béo Múp',
    updatedAt: Date.now() - 10800000,
  },
  {
    uid: 'mock_4',
    displayName: '🥈 Mèo Mướp Tinh Nhuệ',
    level: 42,
    xp: 70000,
    rankTierKey: 'silver',
    rankTierName: 'Bạc (Silver)',
    rankBadge: '🥈',
    coins: 185000,
    biggestFishKg: 16.5,
    equippedSkin: 'cream_cat',
    catStageLabel: 'Mèo Đại Gia Béo Múp',
    updatedAt: Date.now() - 14400000,
  },
  {
    uid: 'mock_5',
    displayName: '🥉 Cào Móng Bất Bại',
    level: 22,
    xp: 19000,
    rankTierKey: 'bronze',
    rankTierName: 'Đồng (Bronze)',
    rankBadge: '🥉',
    coins: 62000,
    biggestFishKg: 9.4,
    equippedSkin: 'orange_tabby',
    catStageLabel: 'Mèo Trưởng Thành',
    updatedAt: Date.now() - 18000000,
  },
];

export const leaderboardService = {
  /**
   * Cập nhật điểm của người chơi lên bảng xếp hạng Firestore
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
   * Lấy Top 50 người chơi trên Bảng Xếp Hạng Firestore
   */
  async getTopLeaderboard(maxLimit = 50): Promise<LeaderboardEntry[]> {
    try {
      const q = query(
        collection(db, 'leaderboards'),
        orderBy('level', 'desc'),
        orderBy('xp', 'desc'),
        limit(maxLimit)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return MOCK_LEADERBOARD_ENTRIES;
      }

      const list: LeaderboardEntry[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as LeaderboardEntry);
      });

      return list;
    } catch (err) {
      console.warn('Lỗi đọc bảng xếp hạng từ Firestore (dùng dữ liệu mẫu):', err);
      return MOCK_LEADERBOARD_ENTRIES;
    }
  },
};
