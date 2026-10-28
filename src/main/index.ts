import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  clipboard,
  nativeImage,
  ClipboardItem,
  dialog,
  Menu,
  Tray,
  globalShortcut
} from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { copyFile, mkdir, readdir, readFile, unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createTray(): void {
  if (tray) return

  tray = new Tray(icon)
  tray.setToolTip('StickerIndex')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open StickerIndex',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createWindow()
    }
  })
}

function showMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
}

function createWindow(): void {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return
  }

  const window = new BrowserWindow({
    width: 420,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      window.hide()
    }
  })

  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('stickers:copy', async (_event, imageDataUrl: unknown) => {
  if (typeof imageDataUrl !== 'string') {
    return false
  }

  if (imageDataUrl.length > 12_000_000) {
    return false
  }

  const validDataUrl = /^data:image\/(png|jpeg|webp|jpg);base64,[A-Za-z0-9+/]*={0,2}$/

  if (!validDataUrl.test(imageDataUrl)) {
    return false
  }

  try {
    const image = nativeImage.createFromDataURL(imageDataUrl)

    if (image.isEmpty()) {
      return false
    }

    const pngData = new Uint8Array(image.toPNG())
    const pngBlob = new Blob([pngData], {
      type: 'image/png'
    })

    await clipboard.write([
      new ClipboardItem({
        'image/png': pngBlob
      })
    ])

    return true
  } catch (error) {
    console.error('Failed to copy sticker:', error)
    return false
  }
})

ipcMain.handle('stickers:select-files', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import stickers',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Image files',
        extensions: ['png', 'jpg', 'jpeg', 'webp']
      }
    ]
  })

  if (result.canceled) {
    return []
  }

  try {
    const stickersDirectory = join(app.getPath('userData'), 'stickers')

    await mkdir(stickersDirectory, { recursive: true })

    const importedPaths: string[] = []

    for (const sourcePath of result.filePaths) {
      const extension = extname(sourcePath).toLowerCase()

      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp']

      if (!allowedExtensions.includes(extension)) {
        continue
      }

      const originalName = basename(sourcePath, extension)

      const safeName =
        originalName
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
          .trim()
          .replace(/[. ]+$/, '') || 'sticker'

      const destinationPath = join(stickersDirectory, `${safeName}-${randomUUID()}${extension}`)

      await copyFile(sourcePath, destinationPath)

      importedPaths.push(destinationPath)
    }

    return importedPaths
  } catch (error) {
    console.error('Failed to import stickers:', error)
    throw error
  }
})

ipcMain.handle('stickers:list', async () => {
  const stickersDirectory = join(app.getPath('userData'), 'stickers')

  await mkdir(stickersDirectory, { recursive: true })

  const files = await readdir(stickersDirectory, {
    withFileTypes: true
  })

  const imageFiles = files.filter((file) => file.isFile() && /\.(png|jpe?g|webp)$/i.test(file.name))

  const stickers = await Promise.all(
    imageFiles.map(async (file) => {
      const extension = extname(file.name).toLowerCase()
      const filePath = join(stickersDirectory, file.name)
      const imageBuffer = await readFile(filePath)

      const mimeType =
        extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg'

      const originalName = basename(file.name, extension)
      const name =
        originalName
          .replace(/-[0-9a-f-]{36}$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim() || 'Sticker'

      return {
        id: file.name,
        name,
        image: `data:${mimeType};base64,${imageBuffer.toString('base64')}`
      }
    })
  )

  return stickers
})

ipcMain.handle('stickers:delete', async (_event, stickerId: unknown) => {
  if (typeof stickerId !== 'string' || stickerId.trim() === '') {
    return false
  }

  if (stickerId !== basename(stickerId) || stickerId === '.' || stickerId === '..') {
    return false
  }

  const extension = extname(stickerId).toLowerCase()

  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    return false
  }

  try {
    const stickersDirectory = join(app.getPath('userData'), 'stickers')
    const filePath = join(stickersDirectory, stickerId)

    await unlink(filePath)

    return true
  } catch (error) {
    console.error('Failed to delete sticker:', error)
    return false
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createTray()
  createWindow()

  const registered = globalShortcut.register('CommandOrControl+Shift+S', () => {
    showMainWindow()
  })

  if (!registered) {
    console.error('Could not register the StickerIndex shortcut.')
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {})
