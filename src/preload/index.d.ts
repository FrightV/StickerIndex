import { ElectronAPI } from '@electron-toolkit/preload'

interface StickerIndexAPI {
  copySticker: (imageDataUrl: string) => Promise<boolean>
  selectStickerFiles: () => Promise<string[]>
  listStickers: () => Promise<Array<{ id: string; name: string; image: string }>>
  deleteSticker: (stickerId: string) => Promise<boolean>

  loadPreferences(): Promise<{
    favoriteIds: (number | string)[]
    recentIds: (number | string)[]
  }>

  savePreferences(preferences: {
    favoriteIds: (number | string)[]
    recentIds: (number | string)[]
  }): Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: StickerIndexAPI
  }
}
