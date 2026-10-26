import { ElectronAPI } from '@electron-toolkit/preload'

interface StickerIndexAPI {
  copySticker: (imageDataUrl: string) => Promise<boolean>
  selectStickerFiles: () => Promise<string[]>
  listStickers: () => Promise<Array<{ id: string; name: string; image: string }>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: StickerIndexAPI
  }
}
