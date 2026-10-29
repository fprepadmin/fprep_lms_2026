// =========================================================================
// HỆ THỐNG ÂM THANH THIỀN TỊNH & VĂN HÓA GIA TIÊN VIỆT NAM (WEB AUDIO API)
// 100% Thuần Web Audio API - 0KB tải ngoài, không phụ thuộc mạng, không lỗi 404
// =========================================================================

class ZenAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmIntervalId: any = null;
  private bgmGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopZenBGM();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.startZenBGM();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // =========================================================================
  // 1. NHẠC NỀN THIỀN ĐỊNH BGM TỰ ĐỘNG SINH (PENTATONIC AMBIENT CHORD)
  // Giai điệu ngũ cung thư thái, tiếng suối thiền, tạo không gian trang nghiêm
  // =========================================================================
  public startZenBGM() {
    if (this.isMuted || this.bgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.bgmPlaying = true;

    // Âm nền Drone ấm áp trầm bổng (D2 / A2)
    try {
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(110, ctx.currentTime); // A2

      droneGain.gain.setValueAtTime(0.001, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3);

      droneOsc.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(ctx.destination);
      droneOsc.start();
      (this as any).droneOsc = droneOsc;
      (this as any).droneGain = droneGain;
    } catch {}

    // Giai điệu sáo trúc / đàn tranh ngũ cung ngẫu nhiên mỗi 3.5 - 5s
    const pentatonicFrequencies = [
      261.63, 293.66, 349.23, 392.00, 440.00, // C4, D4, F4, G4, A4
      523.25, 587.33, 698.46, 783.99, 880.00  // C5, D5, F5, G5, A5
    ];

    const playAmbientNote = () => {
      if (!this.bgmPlaying || this.isMuted) return;
      const c = this.getContext();
      if (!c) return;

      try {
        const now = c.currentTime;
        const freq = pentatonicFrequencies[Math.floor(Math.random() * pentatonicFrequencies.length)];
        const osc = c.createOscillator();
        const noteGain = c.createGain();
        const panner = c.createStereoPanner ? c.createStereoPanner() : null;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        if (panner) {
          panner.pan.setValueAtTime((Math.random() - 0.5) * 0.8, now);
        }

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.045, now + 0.4);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        if (panner) {
          osc.connect(noteGain);
          noteGain.connect(panner);
          panner.connect(c.destination);
        } else {
          osc.connect(noteGain);
          noteGain.connect(c.destination);
        }

        osc.start(now);
        osc.stop(now + 3.4);
      } catch {}

      const nextInterval = 2800 + Math.random() * 2200;
      if (this.bgmPlaying) {
        this.bgmIntervalId = setTimeout(playAmbientNote, nextInterval);
      }
    };

    this.bgmIntervalId = setTimeout(playAmbientNote, 1500);
  }

  public stopZenBGM() {
    this.bgmPlaying = false;
    if (this.bgmIntervalId) {
      clearTimeout(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    try {
      if ((this as any).droneOsc) {
        (this as any).droneOsc.stop();
        (this as any).droneOsc.disconnect();
        (this as any).droneOsc = null;
      }
    } catch {}
  }

  // =========================================================================
  // 2. TIẾNG CHÂM LỬA / THẮP HƯƠNG (IGNITE & FLAME BURST)
  // =========================================================================
  public playIgniteSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // White noise quẹt diêm
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);

      // Âm nở lửa bùng nhẹ
      const flameOsc = ctx.createOscillator();
      const flameGain = ctx.createGain();
      flameOsc.type = 'sine';
      flameOsc.frequency.setValueAtTime(180, now + 0.05);
      flameOsc.frequency.exponentialRampToValueAtTime(80, now + 0.5);

      flameGain.gain.setValueAtTime(0.15, now + 0.05);
      flameGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      flameOsc.connect(flameGain);
      flameGain.connect(ctx.destination);
      flameOsc.start(now + 0.05);
      flameOsc.stop(now + 0.6);
    } catch {}
  }

  // =========================================================================
  // 3. TIẾNG CUỘN SỚ MỞ RA / CUỘN LẠI (PARCHMENT SCROLL UNROLL)
  // Tiếng giấy lụa cọ xát với trục gỗ cổ kính
  // =========================================================================
  public playScrollUnrollSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.linearRampToValueAtTime(1800, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.45);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {}
  }

  // =========================================================================
  // 4. TIẾNG ĐÓNG DẤU ẤN TRIỆN ĐỎ (SEAL STAMP IMPACT)
  // =========================================================================
  public playStampSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  // =========================================================================
  // 5. TIẾNG ĐẠI HỒNG CHUNG / CHUÔNG ĐỒNG TRẦM HÙNG (DEEP TEMPLE GONG)
  // =========================================================================
  public playDeepGong() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const fundamentals = [180, 290, 420, 680];

      fundamentals.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = 0.25 / (idx + 1);
        gain.gain.setValueAtTime(initialGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 4.6);
      });
    } catch {}
  }

  // Chuông xoay Tây Tạng / chuông đồng thanh
  public playSingingBowl(freq = 432) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.76, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 4);
      osc2.stop(now + 4);
    } catch {}
  }

  // Tiếng gõ mõ gỗ
  public playWoodenBlock() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // Tiếng chuông gió / ánh sáng thiêng liêng
  public playChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C E G C E
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.9);
      });
    } catch {}
  }
}

export const zenAudio = new ZenAudioService();
