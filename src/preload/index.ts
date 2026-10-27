import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  copySticker: (imageDataUrl: string): Promise<boolean> =>
    ipcRenderer.invoke('stickers:copy', imageDataUrl),

  selectStickerFiles: (): Promise<string[]> => ipcRenderer.invoke('stickers:select-files'),

  listStickers: (): Promise<Array<{ id: string; name: string; image: string }>> =>
    ipcRenderer.invoke('stickers:list'),

  deleteSticker: (stickerId: string): Promise<boolean> =>
    ipcRenderer.invoke('stickers:delete', stickerId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
