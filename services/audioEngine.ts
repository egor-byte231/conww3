
class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private panner: PannerNode | null = null;
  private audio: HTMLAudioElement | null = null;
  
  private is8DActive: boolean = false;
  private angle8D: number = 0;

  init(element: HTMLAudioElement) {
    if (this.ctx) return;
    this.audio = element;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.source = this.ctx.createMediaElementSource(element);

    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 150;
    this.bassFilter.gain.value = 0;

    this.panner = this.ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';

    this.source.connect(this.bassFilter);
    this.bassFilter.connect(this.panner);
    this.panner.connect(this.ctx.destination);

    this.start8DLoop();
  }

  setSpeed(rate: number) {
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  setNightcore(active: boolean) {
    if (this.audio) {
      this.audio.playbackRate = active ? 1.3 : 1.0;
      (this.audio as any).preservesPitch = !active;
    }
  }

  toggle8D(active: boolean) {
    this.is8DActive = active;
    if (!active && this.panner) {
      this.panner.positionX.value = 0;
      this.panner.positionZ.value = 0;
    }
  }

  private start8DLoop() {
    const loop = () => {
      if (this.is8DActive && this.panner && this.ctx) {
        this.angle8D += 0.015; // Плавна швидкість обертання
        const x = Math.sin(this.angle8D) * 3.5;
        const z = Math.cos(this.angle8D) * 3.5;
        this.panner.positionX.value = x;
        this.panner.positionZ.value = z;
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
