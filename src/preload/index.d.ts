import { ElectronAPI } from '@electron-toolkit/preload'

interface StickerIndexAPI {
  copySticker: (imageDataUrl: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: StickerIndexAPI
  }
}
