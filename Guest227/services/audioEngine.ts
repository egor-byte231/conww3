
class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private panner: PannerNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
  }

  init(element: HTMLAudioElement) {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.source = this.ctx.createMediaElementSource(element);

    // Bass Boost
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 200;

    // 3D Surround Simulation
    this.panner = this.ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';

    // EQ
    const frequencies = [60, 230, 910, 3600, 14000];
    this.eqFilters = frequencies.map(f => {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = f;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });

    // Connect nodes
    let lastNode: AudioNode = this.source;
    lastNode.connect(this.bassFilter);
    lastNode = this.bassFilter;

    this.eqFilters.forEach(f => {
      lastNode.connect(f);
      lastNode = f;
    });

    lastNode.connect(this.panner);
    this.panner.connect(this.ctx.destination);
  }

  setBassBoost(value: number) {
    if (this.bassFilter) this.bassFilter.gain.value = value;
  }

  setSurround(value: number) {
    if (this.panner) {
      // Simple 3D depth simulation using Z-axis
      this.panner.positionZ.value = value / 10;
    }
  }

  setEQBand(index: number, value: number) {
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.value = value;
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
