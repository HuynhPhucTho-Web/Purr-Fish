export type BgmTrack = 'room' | 'pond';

// High Quality Web Audio API sound generator for cute game sound effects & real MP3 background music
class SoundController {
  private ctx: AudioContext | null = null;
  private _enabled: boolean = true;
  private _musicEnabled: boolean = true;
  private _sfxVolume: number = 0.8;
  private _musicVolume: number = 0.5;
  private castWhooshAudio: HTMLAudioElement | null = null;
  private reelingAudio: HTMLAudioElement | null = null;
  private catAudioPool: Map<string, HTMLAudioElement> = new Map();

  // Real MP3 Background Music Tracks
  // - 'room': Nhạc nền chính ngoài phòng mèo (/sounds/music/music-layout.mp3)
  // - 'pond': Nhạc nền khi vào hồ câu cá (/sounds/music/fish-chill.mp3)
  private roomBgmAudio: HTMLAudioElement | null = null;
  private pondBgmAudio: HTMLAudioElement | null = null;
  private currentBgmTrack: BgmTrack = 'room';
  private isBgmPlaying: boolean = false;
  private fadeIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupUserInteractionListener();
  }

  /**
   * Unlock browser autoplay on first user interaction (click / touch / keydown)
   */
  private setupUserInteractionListener() {
    if (typeof window === 'undefined') return;

    const unlockAudio = () => {
      // Resume AudioContext for SFX if suspended
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      // If BGM should be playing, start the active track
      if (this._musicEnabled && this.isBgmPlaying) {
        const audio = this.getAudioTrack(this.currentBgmTrack);
        if (audio && audio.paused) {
          audio.volume = this._musicVolume;
          audio.play().catch(() => {});
        }
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
  }

  private getAudioTrack(track: BgmTrack): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;

    if (track === 'pond') {
      if (!this.pondBgmAudio) {
        this.pondBgmAudio = new Audio('/sounds/music/fish-chill.mp3');
        this.pondBgmAudio.loop = true;
        this.pondBgmAudio.preload = 'auto';
      }
      return this.pondBgmAudio;
    } else {
      if (!this.roomBgmAudio) {
        this.roomBgmAudio = new Audio('/sounds/music/music-layout.mp3');
        this.roomBgmAudio.loop = true;
        this.roomBgmAudio.preload = 'auto';
      }
      return this.roomBgmAudio;
    }
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      this.stopReelingSound();
    }
  }

  public get musicEnabled(): boolean {
    return this._musicEnabled;
  }

  public set musicEnabled(val: boolean) {
    const wasEnabled = this._musicEnabled;
    this._musicEnabled = val;
    if (val) {
      if (!wasEnabled || !this.isBgmPlaying) {
        this.startBgm(this.currentBgmTrack);
      }
    } else {
      this.stopBgm();
    }
  }

  public get sfxVolume(): number {
    return this._sfxVolume;
  }

  public set sfxVolume(val: number) {
    this._sfxVolume = Math.max(0, Math.min(1, val));
  }

  public get musicVolume(): number {
    return this._musicVolume;
  }

  public set musicVolume(val: number) {
    this._musicVolume = Math.max(0, Math.min(1, val));
    if (!this.fadeIntervalId) {
      const activeAudio = this.getAudioTrack(this.currentBgmTrack);
      if (activeAudio) {
        activeAudio.volume = this._musicVolume;
      }
    }
  }

  public get currentTrack(): BgmTrack {
    return this.currentBgmTrack;
  }

  /**
   * Start BGM with specified or current track
   */
  public startBgm(track?: BgmTrack) {
    const targetTrack = track || this.currentBgmTrack;
    this.currentBgmTrack = targetTrack;
    this.isBgmPlaying = true;

    if (!this._musicEnabled) return;

    const currentAudio = this.getAudioTrack(targetTrack);
    const otherTrack: BgmTrack = targetTrack === 'pond' ? 'room' : 'pond';
    const otherAudio = this.getAudioTrack(otherTrack);

    // Stop the other audio track if playing
    if (otherAudio && !otherAudio.paused) {
      otherAudio.pause();
      otherAudio.currentTime = 0;
    }

    if (currentAudio) {
      currentAudio.volume = this._musicVolume;
      if (currentAudio.paused) {
        const playPromise = currentAudio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Browser autoplay restricted; will unlock on first user gesture
          });
        }
      }
    }
  }

  /**
   * Smoothly crossfade to a specific BGM track ('room' or 'pond')
   */
  public setBgmTrack(newTrack: BgmTrack) {
    if (this.currentBgmTrack === newTrack && this.isBgmPlaying) {
      const audio = this.getAudioTrack(newTrack);
      if (audio && audio.paused && this._musicEnabled) {
        audio.volume = this._musicVolume;
        audio.play().catch(() => {});
      }
      return;
    }

    const prevTrack = this.currentBgmTrack;
    this.currentBgmTrack = newTrack;

    if (!this._musicEnabled) {
      this.stopBgm();
      return;
    }

    const prevAudio = this.getAudioTrack(prevTrack);
    const nextAudio = this.getAudioTrack(newTrack);

    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }

    if (!nextAudio) return;

    this.isBgmPlaying = true;

    // Start playing the incoming track from beginning or current position
    if (nextAudio.paused) {
      nextAudio.currentTime = 0;
      nextAudio.volume = 0;
      const playPromise = nextAudio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay restricted; will unlock on first gesture
        });
      }
    }

    const targetVolume = this._musicVolume;
    const prevInitialVolume = prevAudio ? prevAudio.volume : 0;
    const nextInitialVolume = nextAudio.volume;

    let step = 0;
    const totalSteps = 10; // 300ms total smooth crossfade

    this.fadeIntervalId = setInterval(() => {
      step++;
      const progress = Math.min(1, step / totalSteps);

      if (prevAudio && !prevAudio.paused && prevAudio !== nextAudio) {
        prevAudio.volume = Math.max(0, prevInitialVolume * (1 - progress));
      }
      if (nextAudio) {
        nextAudio.volume = Math.min(
          targetVolume,
          Math.max(0, nextInitialVolume + (targetVolume - nextInitialVolume) * progress)
        );
      }

      if (progress >= 1) {
        if (this.fadeIntervalId) {
          clearInterval(this.fadeIntervalId);
          this.fadeIntervalId = null;
        }
        if (prevAudio && prevAudio !== nextAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
        if (nextAudio) {
          nextAudio.volume = targetVolume;
        }
      }
    }, 30);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }
    if (this.roomBgmAudio) {
      this.roomBgmAudio.pause();
    }
    if (this.pondBgmAudio) {
      this.pondBgmAudio.pause();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Classic Pop sound (Popcat style)
   * Pitch can be slightly randomized or elevated with combo streak!
   */
  playPop(pitchMultiplier: number = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Suction sound followed by round pop
      const startFreq = 220 * pitchMultiplier;
      const peakFreq = 720 * pitchMultiplier;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(260 * pitchMultiplier, now + 0.12);

      gain.gain.setValueAtTime(0.35 * this._sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio playback failed silently
    }
  }

  /**
   * Phát âm thanh tiếng mèo kêu thực tế theo từng loài mèo (cat_01.mp3 -> cat_15.mp3)
   */
  playCatMeow(soundUrl: string = '/sounds/cat/cat_01.mp3') {
    if (!this.enabled) return;

    try {
      if (typeof Audio !== 'undefined') {
        let audio = this.catAudioPool.get(soundUrl);
        if (!audio) {
          audio = new Audio(soundUrl);
          audio.preload = 'auto';
          this.catAudioPool.set(soundUrl, audio);
        }
        audio.currentTime = 0;
        audio.volume = Math.max(0, Math.min(1, this._sfxVolume));
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            this.playSynthMeow();
          });
        }
        return;
      }
    } catch {
      // Audio error
    }

    this.playSynthMeow();
  }

  /**
   * Phát tiếng mèo kêu (tự động dùng file mp3 của mèo hiện tại hoặc truyền soundUrl)
   */
  playMeow(soundUrl?: string) {
    if (soundUrl) {
      this.playCatMeow(soundUrl);
    } else {
      this.playCatMeow('/sounds/cat/cat_01.mp3');
    }
  }

  /**
   * Cute synthesized meow fallback using Web Audio API
   */
  playSynthMeow() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc2.type = 'sine';

      // "Me-o-w" formant trajectory
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.35);

      osc2.frequency.setValueAtTime(1000, now);
      osc2.frequency.linearRampToValueAtTime(1600, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(900, now + 0.35);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2 * this._sfxVolume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {
      // Audio error
    }
  }

  /**
   * Happy purchase / upgrade sound (Ascending chime)
   */
  playUpgrade() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.06;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Unlocking skin / achievement fanfare
   */
  playUnlock() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major fanfare

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.08;
        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Golden fish sparkling capture sound
   */
  playGoldenFish() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [880, 1046.5, 1318.51, 1567.98, 2093.0];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.05;
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Cute cat eating / munching sound ("nom nom")
   */
  playEat() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.09, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now + offset);
        osc.frequency.exponentialRampToValueAtTime(180, now + offset + 0.06);

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Refreshing drinking water sound ("glug glug / slurp")
   */
  playDrink() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.1, 0.2].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const baseFreq = 600 + idx * 120;
        osc.frequency.setValueAtTime(baseFreq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 240, now + offset + 0.07);

        gain.gain.setValueAtTime(0.22, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Water splash sound when cat paw hits the pond
   */
  playWaterSplash() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // White noise buffer for splash
      const bufferSize = ctx.sampleRate * 0.18;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.16);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.18);

      // Low plop sine
      const plop = ctx.createOscillator();
      const plopGain = ctx.createGain();
      plop.frequency.setValueAtTime(320, now);
      plop.frequency.exponentialRampToValueAtTime(120, now + 0.1);
      plopGain.gain.setValueAtTime(0.3, now);
      plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      plop.connect(plopGain);
      plopGain.connect(ctx.destination);
      plop.start(now);
      plop.stop(now + 0.13);
    } catch {
      // Audio error
    }
  }

  /**
   * Joyful fish catch sound when paw grabs a fish
   */
  playCatchFish() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.22, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.25);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Fishing Reel Ratchet Gear Click (Âm thanh quay cước máy câu kịch tính)
   */
  playReelClick(pitch: number = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 2 quick sharp ratchet clicks
      [0, 0.035].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        const startFreq = 1200 * pitch + Math.random() * 200;
        osc.frequency.setValueAtTime(startFreq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(350 * pitch, now + offset + 0.025);

        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.028);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.03);
      });
    } catch {
      // Audio error
    }
  }

  /**
   * Sound of hooked fish thrashing & splashing violently in the water
   */
  playFishStruggleSplash() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(280, now + 0.2);
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.22);
    } catch {
      // Audio error
    }
  }

  /**
   * Sound of line tension straining under heavy fish fight ("twinggg")
   */
  playLineTension() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.linearRampToValueAtTime(540, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Audio error
    }
  }

  /**
   * Whoosh sound when line is cast flying into the pond (using spinopel-fishing-rod-whoosh.mp3)
   */
  playCastWhoosh() {
    if (!this.enabled) return;

    try {
      if (typeof Audio !== 'undefined') {
        if (!this.castWhooshAudio) {
          this.castWhooshAudio = new Audio('/sounds/fishing/spinopel-fishing-rod-whoosh.mp3');
          this.castWhooshAudio.preload = 'auto';
        }
        this.castWhooshAudio.currentTime = 0;
        this.castWhooshAudio.volume = 0.85;
        const playPromise = this.castWhooshAudio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Fallback to synthesized whoosh if browser blocks audio autoplay
            this.playSynthCastWhoosh();
          });
        }
        return;
      }
    } catch {
      // Audio error fallback
    }

    this.playSynthCastWhoosh();
  }

  /**
   * Synthesized whoosh fallback when audio element is unavailable
   */
  playSynthCastWhoosh() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.07);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.16);
    } catch {
      // Audio error
    }
  }

  /**
   * Start looping the reeling / line pulling sound (using audiopapkin-fishing.mp3)
   */
  startReelingSound() {
    if (!this.enabled) return;

    try {
      if (typeof Audio !== 'undefined') {
        if (!this.reelingAudio) {
          this.reelingAudio = new Audio('/sounds/fishing/audiopapkin-fishing.mp3');
          this.reelingAudio.preload = 'auto';
          this.reelingAudio.loop = true;
        }
        this.reelingAudio.volume = 0.8;
        if (this.reelingAudio.paused) {
          this.reelingAudio.currentTime = 0;
        }
        const playPromise = this.reelingAudio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Autoplay might need user gesture
          });
        }
      }
    } catch {
      // Audio error
    }
  }

  /**
   * Adjust reeling sound tempo and volume based on fish struggle (raging vs tired)
   */
  setReelingFishState(isRaging: boolean) {
    if (!this.reelingAudio) return;
    try {
      this.reelingAudio.playbackRate = isRaging ? 1.15 : 0.95;
      this.reelingAudio.volume = isRaging ? 0.95 : 0.75;
    } catch {
      // Audio error
    }
  }

  /**
   * Stop the reeling sound when catch succeeds, fish escapes, or leaving pond
   */
  stopReelingSound() {
    try {
      if (this.reelingAudio) {
        this.reelingAudio.pause();
        this.reelingAudio.currentTime = 0;
      }
    } catch {
      // Audio error
    }
  }

  /**
   * Light haptic feedback vibration for mobile
   */
  triggerHaptic(duration: number = 20) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignored
      }
    }
  }
}

export const soundManager = new SoundController();

