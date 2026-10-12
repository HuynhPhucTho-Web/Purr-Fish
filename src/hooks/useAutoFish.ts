import { useEffect, useRef } from 'react';

interface UseAutoFishOptions {
  autoFishRate: number; // Fish per second
  onAddFish: (amount: number) => void;
}

export function useAutoFish({ autoFishRate, onAddFish }: UseAutoFishOptions) {
  const accumulatedRef = useRef<number>(0);
  const onAddFishRef = useRef(onAddFish);
  onAddFishRef.current = onAddFish;

  useEffect(() => {
    if (autoFishRate <= 0) return;

    // Tick every 200ms (5 times per second) for smooth idle progress
    const tickIntervalMs = 200;
    const fishPerTick = autoFishRate * (tickIntervalMs / 1000);

    const intervalId = setInterval(() => {
      accumulatedRef.current += fishPerTick;

      // When accumulated reaches 1 or more, flush integer amount to state
      if (accumulatedRef.current >= 1) {
        const toAdd = Math.floor(accumulatedRef.current);
        accumulatedRef.current -= toAdd;
        onAddFishRef.current(toAdd);
      }
    }, tickIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoFishRate]);
}
