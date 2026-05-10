export type AmbientSoundType = 'rain' | 'cafe' | 'whitenoise' | 'nature'

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

    channel[index] = white * 0.55
  }

  return buffer
}

export class AmbientSoundService {
  private context: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private filter: BiquadFilterNode | null = null
  private gain: GainNode | null = null
  private currentType: AmbientSoundType | null = null

  async play(type: AmbientSoundType, volume: number): Promise<void> {
    const AudioContextCtor = getAudioContextConstructor()
    if (!AudioContextCtor) {
      throw new Error('当前运行环境不支持 Web Audio API')
    }

    if (this.currentType === type && this.context && this.context.state !== 'closed') {
      this.setVolume(volume)
      if (this.context.state === 'suspended') {
        await this.context.resume()
      }
      return
    }

    await this.stop()

    const context = new AudioContextCtor()
    const profile = AMBIENT_PROFILES[type]
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()

    source.buffer = createNoiseBuffer(context, type)
    source.loop = true
    filter.type = profile.filterType
    filter.frequency.value = profile.frequency
    gain.gain.value = Math.max(0, Math.min(1, volume)) * profile.gain

    source.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    source.start()

    this.context = context
    this.source = source
    this.filter = filter
    this.gain = gain
    this.currentType = type
  }

  setVolume(volume: number): void {
    if (!this.gain || !this.currentType) {
      return
    }

    const profile = AMBIENT_PROFILES[this.currentType]
    this.gain.gain.value = Math.max(0, Math.min(1, volume)) * profile.gain
  }

  async stop(): Promise<void> {
    if (this.source) {
      try {
        this.source.stop()
      } catch {
        // Source nodes may already be stopped by the browser; stopping is idempotent for callers.
      }
      this.source.disconnect()
    }

    this.filter?.disconnect()
    this.gain?.disconnect()

    if (this.context && this.context.state !== 'closed') {
      await this.context.close()
    }

    this.context = null
    this.source = null
    this.filter = null
    this.gain = null
    this.currentType = null
  }
}

export const ambientSoundService = new AmbientSoundService()
export const ambientSoundLabels = Object.freeze(
  Object.fromEntries(Object.entries(AMBIENT_PROFILES).map(([type, profile]) => [type, profile.label])) as Record<AmbientSoundType, string>,
)
