import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  clipboard,
  nativeImage,
  ClipboardItem,
  dialog
} from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
