import { useEffect, useRef, useState, useCallback } from 'react';
import { saveGame, type GameSaveData } from '../utils/saveGame';
import type { UserProfileInfo } from '../services/authService';

export function useLocalSave(state: GameSaveData, currentUser?: UserProfileInfo | null) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const stateRef = useRef(state);
  stateRef.current = state;
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  const triggerSave = useCallback(() => {
    if (userRef.current && !userRef.current.isAnonymous) {
      saveGame(stateRef.current);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 1500);
    }
  }, []);

  // Periodic autosave every 4 seconds (chỉ lưu khi có user đăng nhập)
  useEffect(() => {
    const timer = setInterval(() => {
      if (userRef.current && !userRef.current.isAnonymous) {
        saveGame(stateRef.current);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Save on tab close or mobile switch app (chỉ khi có user)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userRef.current && !userRef.current.isAnonymous) {
        saveGame(stateRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && userRef.current && !userRef.current.isAnonymous) {
        saveGame(stateRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    saveStatus,
    saveNow: triggerSave,
  };
}
