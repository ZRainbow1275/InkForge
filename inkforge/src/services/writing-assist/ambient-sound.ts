export type AmbientSoundType =
  | 'rain'
  | 'cafe'
  | 'whitenoise'
  | 'nature'
  | 'thunderstorm'
  | 'keyboard'
  | 'fireplace'
  | 'birdsong'

type AudioContextConstructor = typeof AudioContext

type BrowserAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: AudioContextConstructor
}

interface AmbientProfile {
  label: string
  filterType: BiquadFilterType
  frequency: number
  gain: number
}

const AMBIENT_PROFILES: Record<AmbientSoundType, AmbientProfile> = {
  rain: { label: '雨声', filterType: 'bandpass', frequency: 950, gain: 0.18 },
  cafe: { label: '咖啡馆', filterType: 'lowpass', frequency: 680, gain: 0.12 },
  whitenoise: { label: '白噪声', filterType: 'highpass', frequency: 120, gain: 0.1 },
  nature: { label: '自然声', filterType: 'bandpass', frequency: 420, gain: 0.14 },
  thunderstorm: { label: '雷暴', filterType: 'lowpass', frequency: 180, gain: 0.22 },
  keyboard: { label: '键盘', filterType: 'bandpass', frequency: 4200, gain: 0.14 },
  fireplace: { label: '壁炉', filterType: 'lowpass', frequency: 520, gain: 0.18 },
  birdsong: { label: '鸟鸣', filterType: 'bandpass', frequency: 3200, gain: 0.1 },
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  const audioWindow = window as BrowserAudioWindow
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null
}

function createNoiseBuffer(context: AudioContext, type: AmbientSoundType): AudioBuffer {
  const frameCount = context.sampleRate * 3
  const buffer = context.createBuffer(1, frameCount, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let brown = 0

  for (let index = 0; index < frameCount; index += 1) {
    const white = Math.random() * 2 - 1

    if (type === 'rain') {
      brown = (brown + 0.02 * white) / 1.02
      channel[index] = brown * 3.5
      continue
    }

    if (type === 'cafe') {
      brown = (brown + 0.01 * white) / 1.01
      channel[index] = brown * 2.8 + Math.sin(index / 900) * 0.03
      continue
    }

    if (type === 'nature') {
      brown = (brown + 0.015 * white) / 1.015
      channel[index] = brown * 3 + Math.sin(index / 1400) * 0.04
      continue
    }

    if (type === 'thunderstorm') {
      brown = (brown + 0.025 * white) / 1.025
      const rumble = Math.sin(index / 4800) * 0.05
      const thunderBurst = Math.random() < 0.00008 ? (Math.random() * 1.2 + 0.6) : 0
      channel[index] = brown * 4 + rumble + thunderBurst
      continue
    }

    if (type === 'keyboard') {
      const clickIntervalFrames = 1800 + Math.floor(Math.random() * 6400)
      const phase = index % clickIntervalFrames
      if (phase < 220) {
        const envelope = 1 - phase / 220
        channel[index] = white * envelope * 0.8
      } else {
        channel[index] = white * 0.02
      }
      continue
    }

    if (type === 'fireplace') {
      brown = (brown + 0.018 * white) / 1.018
      const baseCrackle = brown * 3.2
      const pop = Math.random() < 0.0006 ? (Math.random() * 0.9 + 0.3) * (Math.random() > 0.5 ? 1 : -1) : 0
      channel[index] = baseCrackle + pop
      continue
    }

    if (type === 'birdsong') {
      const chirpPeriod = 18_000
      const chirpPhase = index % chirpPeriod
      if (chirpPhase < 1400) {
        const sweep = 2000 + (chirpPhase / 1400) * 4000
        const envelope = Math.sin((chirpPhase / 1400) * Math.PI)
        channel[index] = Math.sin((index / context.sampleRate) * sweep * 2 * Math.PI) * envelope * 0.35
      } else {
        channel[index] = white * 0.015
      }
      continue
    }

    channel[index] = white * 0.55
  }

  return buffer
}

interface ActiveSoundNode {
  source: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
}

export class AmbientSoundService {
  private context: AudioContext | null = null
  private nodes: Map<AmbientSoundType, ActiveSoundNode> = new Map()
  private masterVolume = 0.5

  async play(type: AmbientSoundType, volume: number): Promise<void> {
    const AudioContextCtor = getAudioContextConstructor()
    if (!AudioContextCtor) {
      throw new Error('当前运行环境不支持 Web Audio API')
    }

    this.masterVolume = Math.max(0, Math.min(1, volume))

    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContextCtor()
    }

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    const existing = this.nodes.get(type)
    if (existing) {
      const profile = AMBIENT_PROFILES[type]
      existing.gain.gain.value = this.masterVolume * profile.gain
      return
    }

    const context = this.context
    const profile = AMBIENT_PROFILES[type]
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()

    source.buffer = createNoiseBuffer(context, type)
    source.loop = true
    filter.type = profile.filterType
    filter.frequency.value = profile.frequency
    gain.gain.value = this.masterVolume * profile.gain

    source.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    source.start()

    this.nodes.set(type, { source, filter, gain })
  }

  async stopType(type: AmbientSoundType): Promise<void> {
    const node = this.nodes.get(type)
    if (!node) {
      return
    }

    try {
      node.source.stop()
    } catch {
      // Source nodes may already be stopped by the browser; stopping is idempotent for callers.
    }
    node.source.disconnect()
    node.filter.disconnect()
    node.gain.disconnect()
    this.nodes.delete(type)

    if (this.nodes.size === 0 && this.context && this.context.state !== 'closed') {
      await this.context.close()
      this.context = null
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    for (const [type, node] of this.nodes) {
      const profile = AMBIENT_PROFILES[type]
      node.gain.gain.value = this.masterVolume * profile.gain
    }
  }

  isActive(type: AmbientSoundType): boolean {
    return this.nodes.has(type)
  }

  activeTypes(): AmbientSoundType[] {
    return Array.from(this.nodes.keys())
  }

  async stop(): Promise<void> {
    for (const node of this.nodes.values()) {
      try {
        node.source.stop()
      } catch {
        // ignore
      }
      node.source.disconnect()
      node.filter.disconnect()
      node.gain.disconnect()
    }
    this.nodes.clear()

    if (this.context && this.context.state !== 'closed') {
      await this.context.close()
    }
    this.context = null
  }
}

export const ambientSoundService = new AmbientSoundService()
export const ambientSoundLabels = Object.freeze(
  Object.fromEntries(Object.entries(AMBIENT_PROFILES).map(([type, profile]) => [type, profile.label])) as Record<AmbientSoundType, string>,
)
export const ambientSoundTypes = Object.freeze(Object.keys(AMBIENT_PROFILES) as AmbientSoundType[])
