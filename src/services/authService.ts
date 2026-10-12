import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export interface UserProfileInfo {
  uid: string;
  email: string | null;
  displayName: string;
  isAnonymous: boolean;
  photoURL?: string | null;
}

export interface SimpleLocalUser {
  username: string;
  displayName: string;
  pass: string;
  uid: string;
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
   * Đăng ký tài khoản đơn giản (Chỉ cần Tên tài khoản & Mật khẩu đơn giản)
   */
  async registerSimpleAccount(username: string, pass: string, catName?: string): Promise<UserProfileInfo> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();
    const displayName = (catName && catName.trim()) ? catName.trim() : username.trim();

    if (!cleanUser || cleanUser.length < 3) {
      throw new Error('Tên tài khoản phải có ít nhất 3 ký tự!');
    }
    if (!cleanPass || cleanPass.length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự!');
    }

    const localUsers = getLocalUsers();
    if (localUsers[cleanUser]) {
      throw new Error('Tên tài khoản này đã tồn tại! Vui lòng chọn tên khác.');
    }

    const uid = `usr_${cleanUser}_${Date.now().toString(36)}`;
    const newEntry: SimpleLocalUser = {
      username: cleanUser,
      displayName,
      pass: cleanPass,
      uid,
      createdAt: Date.now(),
    };
    localUsers[cleanUser] = newEntry;
    saveLocalUsers(localUsers);

    // Lưu phiên hiện tại
    localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(newEntry));

    // Thử đồng bộ ngầm với Firebase Auth nếu khả dụng
    try {
      const emailSynthetic = `${cleanUser}@purrfish.local`;
      const cred = await createUserWithEmailAndPassword(auth, emailSynthetic, cleanPass.length >= 6 ? cleanPass : `${cleanPass}0000`);
      await updateProfile(cred.user, { displayName });
    } catch {
      // Offline hoặc Firebase đã có email ảo tương tự, vẫn dùng tài khoản nội bộ mượt mà
    }

    return {
      uid,
      email: `${cleanUser}@purrfish`,
      displayName,
      isAnonymous: false,
    };
  },

  /**
   * Đăng nhập tài khoản đơn giản bằng Tên tài khoản & Mật khẩu
   */
  async loginSimpleAccount(username: string, pass: string): Promise<UserProfileInfo> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    const localUsers = getLocalUsers();
    const target = localUsers[cleanUser];

    if (!target) {
      // Thử đăng nhập Firebase nếu là tài khoản tạo trước đó
      try {
        const emailSynthetic = `${cleanUser}@purrfish.local`;
        const cred = await signInWithEmailAndPassword(auth, emailSynthetic, cleanPass.length >= 6 ? cleanPass : `${cleanPass}0000`);
        return {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || cleanUser,
          isAnonymous: false,
        };
      } catch {
        throw new Error('Tài khoản không tồn tại! Hãy kiểm tra lại hoặc Đăng Ký Mới.');
      }
    }

    if (target.pass !== cleanPass) {
      throw new Error('Mật khẩu không chính xác!');
    }

    localStorage.setItem(CURRENT_LOCAL_USER_KEY, JSON.stringify(target));

    // Thử đồng bộ phiên Firebase
    try {
      const emailSynthetic = `${cleanUser}@purrfish.local`;
      await signInWithEmailAndPassword(auth, emailSynthetic, cleanPass.length >= 6 ? cleanPass : `${cleanPass}0000`);
    } catch {
      // Tiếp tục với tài khoản local
    }

    return {
      uid: target.uid,
      email: `${cleanUser}@purrfish`,
      displayName: target.displayName,
      isAnonymous: false,
    };
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
    const checkLocal = () => {
      try {
        const raw = localStorage.getItem(CURRENT_LOCAL_USER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SimpleLocalUser;
          return {
            uid: parsed.uid,
            email: `${parsed.username}@purrfish`,
            displayName: parsed.displayName,
            isAnonymous: parsed.username.startsWith('guest_'),
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
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Sen Nuôi Mèo',
          isAnonymous: user.isAnonymous,
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
    const user = auth.currentUser;
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Sen Nuôi Mèo',
        isAnonymous: user.isAnonymous,
      };
    }
    try {
      const raw = localStorage.getItem(CURRENT_LOCAL_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SimpleLocalUser;
        return {
          uid: parsed.uid,
          email: `${parsed.username}@purrfish`,
          displayName: parsed.displayName,
          isAnonymous: parsed.username.startsWith('guest_'),
        };
      }
    } catch {
      // ignore
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
