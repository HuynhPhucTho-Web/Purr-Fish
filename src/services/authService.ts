import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_SAVE_DATA, type GameSaveData, saveUserGame, loadUserGame } from '../utils/saveGame';
import { calculateLevelFromTotalXp, getCatGrowthStage } from '../data/rankTiers';

export function toSafeEmailUser(username: string): string {
  const ascii = username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
  return ascii || `user_${Date.now()}`;
}

export interface UserProfileInfo {
  uid: string;
  email: string | null;
  displayName: string;
  isAnonymous: boolean;
  photoURL?: string | null;
  username?: string;
  catName?: string;
}

export const CAT_AVATARS: string[] = [
  '/images/cat_avatars_webp/avatar_01.webp',
  '/images/cat_avatars_webp/avatar_02.webp',
  '/images/cat_avatars_webp/avatar_03.webp',
  '/images/cat_avatars_webp/avatar_04.webp',
  '/images/cat_avatars_webp/avatar_05.webp',
  '/images/cat_avatars_webp/avatar_06.webp',
  '/images/cat_avatars_webp/avatar_07.webp',
  '/images/cat_avatars_webp/avatar_08.webp',
];

export interface SimpleLocalUser {
  username: string;
  displayName: string;
  catName?: string;
  pass: string;
  uid: string;
  photoURL?: string;
  createdAt: number;
}

const LOCAL_USERS_KEY = 'MEOW_FISH_LOCAL_USERS_V1';
const CURRENT_LOCAL_USER_KEY = 'MEOW_FISH_CURRENT_LOCAL_USER';

function getLocalUsers(): Record<string, SimpleLocalUser> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUsers(users: Record<string, SimpleLocalUser>): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Lỗi lưu danh sách tài khoản cục bộ:', err);
  }
}

export const authService = {
  /**
   * Lấy danh sách tất cả tài khoản người chơi đã đăng ký trên máy
   */
  getAllLocalUsers(): SimpleLocalUser[] {
    return Object.values(getLocalUsers());
  },

  /**
   * Đăng ký tài khoản đơn giản (Chỉ cần Tên tài khoản & Mật khẩu đơn giản)
   */
  async registerSimpleAccount(
    username: string,
    pass: string,
    catName?: string,
    chosenAvatar?: string,
    initialSaveData?: GameSaveData
  ): Promise<UserProfileInfo> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();
    const finalCatName = (catName && catName.trim()) 
      ? catName.trim() 
      : (cleanUser ? `Mèo ${cleanUser}` : 'Mèo Cưng');
    const photoURL = chosenAvatar || CAT_AVATARS[0];

    if (!cleanUser || cleanUser.length < 3) {
      throw new Error('Tên tài khoản phải có ít nhất 3 ký tự!');
    }
    if (!cleanPass || cleanPass.length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự!');
    }

    const localUsers = getLocalUsers();
    if (localUsers[cleanUser]) {
      throw new Error(`Tên tài khoản "${cleanUser}" đã có trên máy này! Vui lòng chuyển sang tab Đăng Nhập hoặc chọn tên khác.`);
    }

    let uid = '';

    // Đăng ký trực tiếp với Firebase Auth để tài khoản được lưu trên Firebase
    const safeUser = toSafeEmailUser(cleanUser);
    const emailSynthetic = `${safeUser}@purrfish.com`;
    const firebasePass = cleanPass.length >= 6 ? cleanPass : `${cleanPass}000000`.slice(0, 8);

    try {
      const cred = await createUserWithEmailAndPassword(auth, emailSynthetic, firebasePass);
      await updateProfile(cred.user, { displayName: finalCatName, photoURL });
      uid = cred.user.uid;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        // Thử đăng nhập nếu tài khoản đã tồn tại trên Firebase
        let signedIn = false;
        const passCandidates = [
          firebasePass,
          cleanPass,
          `${cleanPass}0000`,
        ].filter((p, i, a) => p.length >= 6 && a.indexOf(p) === i);

        for (const p of passCandidates) {
          try {
            const cred = await signInWithEmailAndPassword(auth, emailSynthetic, p);
            await updateProfile(cred.user, { displayName: finalCatName, photoURL });
            uid = cred.user.uid;
            signedIn = true;
            break;
          } catch (e) {}
        }

        if (!signedIn) {
          throw new Error('Tên tài khoản này đã có người đăng ký trên máy chủ! Vui lòng chọn tên khác hoặc chuyển sang tab Đăng Nhập.');
        }
      } else {
        console.warn('Firebase Auth create error, using local fallback:', err);
        uid = `local_${cleanUser}_${Date.now()}`;
      }
    }

    if (!uid) {
      uid = `local_${cleanUser}_${Date.now()}`;
    }

    const newEntry: SimpleLocalUser = {
      username: cleanUser,
      displayName: finalCatName,
      catName: finalCatName,
      pass: cleanPass,
      uid,
      photoURL,
      createdAt: Date.now(),
    };
    localUsers[cleanUser] = newEntry;
    saveLocalUsers(localUsers);

    // Lưu phiên hiện tại
    localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(newEntry));

    // Đồng bộ hồ sơ người dùng và TOÀN BỘ dữ liệu game vào Firebase Firestore theo rule /users/{userId}
    const fullSaveData = {
      ...(initialSaveData || DEFAULT_SAVE_DATA),
      catName: finalCatName,
      displayName: finalCatName,
      username: cleanUser,
      catAvatar: photoURL,
      photoURL,
    };

    // Luôn sao lưu vào slot lưu cục bộ của tài khoản này
    saveUserGame(cleanUser, fullSaveData);

    try {
      if (auth.currentUser && auth.currentUser.uid === uid) {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
          ...fullSaveData,
          uid,
          username: cleanUser,
          catName: finalCatName,
          displayName: finalCatName,
          catAvatar: photoURL,
          photoURL,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          lastSaved: Date.now(),
        }, { merge: true });

        // Đồng bộ Bảng Xếp Hạng Firestore theo rule /leaderboards/{userId}
        const levelInfo = calculateLevelFromTotalXp(fullSaveData.xp || 0);
        const catStage = getCatGrowthStage(levelInfo.level);
        const lbRef = doc(db, 'leaderboards', uid);
        await setDoc(lbRef, {
          uid,
          displayName: finalCatName,
          catName: finalCatName,
          username: cleanUser,
          photoURL,
          level: Math.max(1, levelInfo.level),
          xp: Math.max(0, fullSaveData.xp || 0),
          rankTierKey: levelInfo.rankTier.key,
          rankTierName: levelInfo.rankTier.name,
          rankBadge: levelInfo.rankTier.badge,
          coins: Math.max(0, Number(fullSaveData.fish ?? fullSaveData.coins) || 0),
          biggestFishKg: Math.max(0, Number(fullSaveData.biggestFishKg) || 0),
          equippedSkin: fullSaveData.equippedSkin || 'orange_tabby',
          catStageLabel: catStage.label,
          updatedAt: Date.now(),
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Lỗi lưu profile và dữ liệu lên Firestore:', e);
    }

    return {
      uid,
      email: `${cleanUser}@purrfish.com`,
      displayName: finalCatName,
      catName: finalCatName,
      username: cleanUser,
      photoURL,
      isAnonymous: false,
    };
  },

  /**
   * Đăng nhập tài khoản đơn giản bằng Tên tài khoản & Mật khẩu
   */
  async loginSimpleAccount(username: string, pass: string): Promise<UserProfileInfo> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanUser) {
      throw new Error('Vui lòng nhập tên tài khoản!');
    }
    if (!cleanPass) {
      throw new Error('Vui lòng nhập mật khẩu!');
    }

    const localUsers = getLocalUsers();
    const target = localUsers[cleanUser];

    // Mật khẩu và email variants để thử đăng nhập Firebase Auth
    const passVariants = [
      cleanPass.length >= 6 ? cleanPass : `${cleanPass}000000`.slice(0, 8),
      cleanPass,
      `${cleanPass}0000`,
      `${cleanPass}000000`,
    ].filter((p, i, arr) => p.length >= 6 && arr.indexOf(p) === i);

    const safeUser = toSafeEmailUser(cleanUser);
    const emailVariants = [
      `${safeUser}@purrfish.com`,
      `${cleanUser}@purrfish.com`,
      `${cleanUser}@purrfish.local`,
      `${cleanUser}@purrfish`,
    ].filter((e, i, a) => a.indexOf(e) === i);

    let firebaseUser: User | null = null;
    let authError: any = null;

    // 1. Thử đăng nhập vào Firebase Auth
    for (const email of emailVariants) {
      for (const p of passVariants) {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, p);
          firebaseUser = cred.user;
          break;
        } catch (err: any) {
          authError = err;
        }
      }
      if (firebaseUser) break;
    }

    // 2. Nếu đăng nhập Firebase Auth thành công:
    if (firebaseUser) {
      const uid = firebaseUser.uid;
      const displayName = firebaseUser.displayName || target?.displayName || target?.catName || cleanUser;
      const catName = target?.catName || firebaseUser.displayName || target?.displayName || 'Mèo Cưng';
      const photoURL = firebaseUser.photoURL || target?.photoURL || CAT_AVATARS[0];

      const updatedEntry: SimpleLocalUser = {
        username: cleanUser,
        displayName,
        catName,
        pass: cleanPass,
        uid,
        photoURL,
        createdAt: target?.createdAt || Date.now(),
      };
      localUsers[cleanUser] = updatedEntry;
      saveLocalUsers(localUsers);
      localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(updatedEntry));

      const savedUserGame = loadUserGame(cleanUser);
      if (savedUserGame) {
        saveUserGame(cleanUser, savedUserGame);
      }

      return {
        uid,
        email: firebaseUser.email || `${safeUser}@purrfish.com`,
        displayName,
        catName,
        username: cleanUser,
        photoURL,
        isAnonymous: false,
      };
    }

    // 3. Nếu Firebase Auth thất bại, nhưng tài khoản ĐÃ TỒN TẠI trên máy (target):
    if (target) {
      // Kiểm tra mật khẩu đã lưu trên máy
      if (target.pass && target.pass !== cleanPass) {
        throw new Error('Mật khẩu không chính xác! Vui lòng thử lại.');
      }

      // Người chơi nhập ĐÚNG mật khẩu đã lưu trên máy:
      // Tự động tạo hoặc phục hồi Firebase Auth để đồng bộ Cloud
      const canonicalEmail = `${safeUser}@purrfish.com`;
      const canonicalPass = cleanPass.length >= 6 ? cleanPass : `${cleanPass}000000`.slice(0, 8);
      let resolvedUid = target.uid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, canonicalEmail, canonicalPass);
        await updateProfile(cred.user, {
          displayName: target.catName || target.displayName || cleanUser,
          photoURL: target.photoURL || CAT_AVATARS[0],
        });
        resolvedUid = cred.user.uid;
        target.uid = resolvedUid;
      } catch (createErr) {
        // Nếu không tạo được Firebase (ví dụ email đã dùng với pass khác trên cloud):
        // Thử anonymous auth để có auth context hợp lệ
        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch {}
      }

      localUsers[cleanUser] = target;
      saveLocalUsers(localUsers);
      localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(target));

      const savedUserGame = loadUserGame(cleanUser);
      if (savedUserGame) {
        saveUserGame(cleanUser, savedUserGame);
      }

      return {
        uid: resolvedUid,
        email: canonicalEmail,
        displayName: target.displayName || target.catName || cleanUser,
        catName: target.catName || target.displayName || 'Mèo Cưng',
        username: cleanUser,
        photoURL: target.photoURL || CAT_AVATARS[0],
        isAnonymous: false,
      };
    }

    // 4. Nếu không có tài khoản trên máy VÀ Firebase Auth cũng không đăng nhập được:
    if (authError?.code === 'auth/user-not-found') {
      throw new Error(`Tài khoản "${cleanUser}" chưa tồn tại! Vui lòng chọn Tạo Mới để bắt đầu.`);
    }

    throw new Error('Tài khoản hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.');
  },

  /**
   * Đổi ảnh đại diện Avatar người chơi
   */
  async updateUserAvatar(photoURL: string): Promise<void> {
    try {
      localStorage.setItem('PURR_FISH_AVATAR', photoURL);
    } catch {}

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { photoURL }, { merge: true });
        const lbRef = doc(db, 'leaderboards', auth.currentUser.uid);
        await setDoc(lbRef, { photoURL, updatedAt: Date.now() }, { merge: true });
      }
    } catch {}

    try {
      const raw = localStorage.getItem(CURRENT_LOCAL_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SimpleLocalUser;
        parsed.photoURL = photoURL;
        localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(parsed));

        const localUsers = getLocalUsers();
        if (localUsers[parsed.username]) {
          localUsers[parsed.username].photoURL = photoURL;
          saveLocalUsers(localUsers);
        }
      }
    } catch {}
  },

  /**
   * Đổi tên Mèo Cưng / Tên hiển thị người chơi
   */
  async updateCatName(newName: string): Promise<string> {
    const cleanName = newName.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Tên mèo phải có ít nhất 2 ký tự!');
    }
    if (cleanName.length > 30) {
      throw new Error('Tên mèo không được vượt quá 30 ký tự!');
    }

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: cleanName });
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          catName: cleanName,
          displayName: cleanName,
          lastSaved: Date.now(),
        }, { merge: true });

        const lbRef = doc(db, 'leaderboards', auth.currentUser.uid);
        await setDoc(lbRef, {
          displayName: cleanName,
          catName: cleanName,
          updatedAt: Date.now(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Lỗi cập nhật tên trên Firestore:', err);
    }

    try {
      const raw = localStorage.getItem(CURRENT_LOCAL_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SimpleLocalUser;
        parsed.displayName = cleanName;
        parsed.catName = cleanName;
        localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(parsed));

        const localUsers = getLocalUsers();
        if (localUsers[parsed.username]) {
          localUsers[parsed.username].displayName = cleanName;
          localUsers[parsed.username].catName = cleanName;
          saveLocalUsers(localUsers);
        }
      }
    } catch {}

    return cleanName;
  },

  /**
   * Đăng nhập ẩn danh 1 chạm (Dành cho người chơi muốn chơi ngay)
   */
  async signInAsGuest(defaultName = 'Sen Tập Sự'): Promise<UserProfileInfo> {
    try {
      const cred = await signInAnonymously(auth);
      if (!cred.user.displayName) {
        const guestName = `${defaultName} #${Math.floor(1000 + Math.random() * 9000)}`;
        await updateProfile(cred.user, { displayName: guestName });
      }
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || 'Khách Ẩn Danh',
        isAnonymous: cred.user.isAnonymous,
      };
    } catch {
      // Fallback offline guest
      const guestUid = `guest_${Date.now()}`;
      const guestName = `${defaultName} #${Math.floor(1000 + Math.random() * 9000)}`;
      const guestUser: SimpleLocalUser = {
        username: guestUid,
        displayName: guestName,
        pass: 'guest',
        uid: guestUid,
        createdAt: Date.now(),
      };
      localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(guestUser));
      return {
        uid: guestUid,
        email: null,
        displayName: guestName,
        isAnonymous: true,
      };
    }
  },

  /**
   * Đăng ký tài khoản mới bằng Email & Mật khẩu
   */
  async registerWithEmail(email: string, pass: string, displayName: string): Promise<UserProfileInfo> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    await updateProfile(cred.user, { displayName: displayName.trim() || 'Người Nuôi Mèo' });
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || displayName,
      isAnonymous: cred.user.isAnonymous,
    };
  },

  /**
   * Đăng nhập tài khoản Email & Mật khẩu
   */
  async loginWithEmail(email: string, pass: string): Promise<UserProfileInfo> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || 'Người Nuôi Mèo',
      isAnonymous: cred.user.isAnonymous,
    };
  },

  /**
   * Đăng xuất tài khoản
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem(CURRENT_LOCAL_USER_KEY);
  },

  /**
   * Lắng nghe trạng thái đăng nhập
   */
  onAuthStateChanged(callback: (user: UserProfileInfo | null) => void) {
    // 1. Kiểm tra local session trước
    const checkLocal = (): UserProfileInfo | null => {
      const savedAvatar = localStorage.getItem('PURR_FISH_AVATAR');
      try {
        const raw = localStorage.getItem(CURRENT_LOCAL_USER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SimpleLocalUser;
          return {
            uid: parsed.uid,
            email: `${parsed.username}@purrfish.com`,
            displayName: parsed.displayName,
            catName: parsed.catName || parsed.displayName,
            username: parsed.username,
            isAnonymous: parsed.username.startsWith('guest_'),
            photoURL: parsed.photoURL || savedAvatar || CAT_AVATARS[0],
          };
        }
      } catch {
        // ignore
      }
      return null;
    };

    const initial = checkLocal();
    if (initial) {
      callback(initial);
    }

    return onAuthStateChanged(auth, (user: User | null) => {
      const savedAvatar = localStorage.getItem('PURR_FISH_AVATAR');
      if (user) {
        const local = checkLocal();
        const cleanUser = user.email ? user.email.replace('@purrfish.com', '') : (local?.username || '');
        const catName = user.displayName || local?.catName || local?.displayName || 'Mèo Cưng';
        callback({
          uid: user.uid,
          email: user.email,
          displayName: catName,
          catName,
          username: cleanUser,
          isAnonymous: user.isAnonymous,
          photoURL: user.photoURL || savedAvatar || CAT_AVATARS[0],
        });
      } else {
        const local = checkLocal();
        callback(local);
      }
    });
  },

  /**
   * Lấy User hiện tại
   */
  getCurrentUser(): UserProfileInfo | null {
    const savedAvatar = localStorage.getItem('PURR_FISH_AVATAR');
    const user = auth.currentUser;
    const raw = localStorage.getItem(CURRENT_LOCAL_USER_KEY);
    let local: SimpleLocalUser | null = null;
    try {
      if (raw) local = JSON.parse(raw) as SimpleLocalUser;
    } catch {}

    if (user) {
      const cleanUser = user.email ? user.email.replace('@purrfish.com', '') : (local?.username || '');
      const catName = user.displayName || local?.catName || local?.displayName || 'Mèo Cưng';
      return {
        uid: user.uid,
        email: user.email,
        displayName: catName,
        catName,
        username: cleanUser,
        isAnonymous: user.isAnonymous,
        photoURL: user.photoURL || savedAvatar || CAT_AVATARS[0],
      };
    }
    if (local) {
      return {
        uid: local.uid,
        email: `${local.username}@purrfish.com`,
        displayName: local.displayName,
        catName: local.catName || local.displayName,
        username: local.username,
        isAnonymous: local.username.startsWith('guest_'),
        photoURL: local.photoURL || savedAvatar || CAT_AVATARS[0],
      };
    }
    return null;
  },

  /**
   * Lấy danh sách tài khoản đã tạo trên máy
   */
  getSavedAccountsList(): SimpleLocalUser[] {
    const map = getLocalUsers();
    return Object.values(map);
  },
};
