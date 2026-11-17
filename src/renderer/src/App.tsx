import { useEffect, useRef, useState } from 'react'

type Tab = 'all' | 'favorites' | 'recent'

type Sticker = {
  id: number | string
  name: string
  image: string
}

const stickers: Sticker[] = []

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [allStickers, setAllStickers] = useState<Sticker[]>(stickers)
  const [favoriteIds, setFavoriteIds] = useState<(number | string)[]>([])
  const [recentIds, setRecentIds] = useState<(number | string)[]>([])
  const [copyStatus, setCopyStatus] = useState('')
  const copyRequestId = useRef(0)
  const [importStatus, setImportStatus] = useState('')
  const importStatusTimeout = useRef<number | null>(null)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== '/') return

    const target = event.target

    if (
      target instanceof HTMLElement &&
      (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      )
    ) {
      return
    }

    event.preventDefault()
    searchInputRef.current?.focus()
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}, [])

  const sectionTitles: Record<Tab, string> = {
    all: 'My stickers',
    favorites: 'Favorites',
    recent: 'Recently used'
  }

  useEffect(() => {
    let cancelled = false

    const loadStickers = async (): Promise<void> => {
      try {
        const importedStickers = await window.api.listStickers()

        if (!cancelled) {
          setAllStickers([...stickers, ...importedStickers])
          const preferences = await window.api.loadPreferences()

          if (!cancelled) {
            setFavoriteIds(preferences.favoriteIds)
            setRecentIds(preferences.recentIds)
            setPreferencesLoaded(true)
          }
        }
      } catch (error) {
        console.error('Failed to load imported stickers:', error)
      }
    }

    void loadStickers()

    return () => {
      cancelled = true

      if (importStatusTimeout.current !== null) {
        window.clearTimeout(importStatusTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!preferencesLoaded) return

    const savePreferences = async (): Promise<void> => {
      try {
        await window.api.savePreferences({
          favoriteIds,
          recentIds
        })
      } catch (error) {
        console.error('Failed to save preferences:', error)
      }
    }

    void savePreferences()
  }, [favoriteIds, recentIds, preferencesLoaded])

  const toggleFavorite = (stickerId: number | string): void => {
    setFavoriteIds((currentIds) =>
      currentIds.includes(stickerId)
        ? currentIds.filter((id) => id !== stickerId)
        : [...currentIds, stickerId]
    )
  }

  const markAsRecent = (stickerId: number | string): void => {
    setRecentIds((currentIds) => [stickerId, ...currentIds.filter((id) => id !== stickerId)])
  }


  const handleStickerClick = async (sticker: Sticker): Promise<void> => {
    const requestId = ++copyRequestId.current

    try {
      setCopyStatus('Copying...')

      let blob: Blob

      if (sticker.image.startsWith('data:image/')) {
        const parts = sticker.image.split(',')
        const mimeType = parts[0].match(/:(.*?);/)?.[1]

        if (!mimeType) {
          throw new Error('Invalid image format')
        }

        const binary = atob(parts[1])
        const bytes = new Uint8Array(binary.length)

        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }

        blob = new Blob([bytes], { type: mimeType })
      } else {
        const response = await fetch(sticker.image)

        if (!response.ok) {
          throw new Error('Could not load sticker image')
        }

        blob = await response.blob()
      }

      if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) {
        throw new Error('Unsupported image format')
      }

      const bitmap = await createImageBitmap(blob)

      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height

      const context = canvas.getContext('2d')

      if (!context) {
        bitmap.close()
        throw new Error('Could not process sticker image')
      }

      context.drawImage(bitmap, 0, 0)
      bitmap.close()

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Could not convert image to PNG'))
          }
        }, 'image/png')
      })

      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Could not convert image'))
          }
        }

        reader.onerror = () => reject(new Error('Could not read image'))
        reader.readAsDataURL(pngBlob)
      })

      const copied = await window.api.copySticker(imageDataUrl)

      if (!copied) {
        throw new Error('Could not copy sticker')
      }

      markAsRecent(sticker.id)

      if (requestId === copyRequestId.current) {
        setCopyStatus(`${sticker.name} copied!`)

        window.setTimeout(() => {
          if (requestId === copyRequestId.current) {
            setCopyStatus('')
          }
        }, 2500)
      }
    } catch (error) {
      console.error('Sticker copy failed:', error)

      if (requestId === copyRequestId.current) {
        setCopyStatus('Could not copy sticker.')

        window.setTimeout(() => {
          if (requestId === copyRequestId.current) {
            setCopyStatus('')
          }
        }, 2500)
      }
    }
  }

  const handleImportStickers = async (): Promise<void> => {
    try {
      if (importStatusTimeout.current !== null) {
        window.clearTimeout(importStatusTimeout.current)
        importStatusTimeout.current = null
      }

      setImportStatus('Selecting files...')

      const result = await window.api.selectStickerFiles()

      if (result.importedPaths.length === 0 && result.rejectedFiles.length === 0) {
        showImportStatus('No files selected.')
        return
      }

      if (result.importedPaths.length > 0) {
        const importedStickers = await window.api.listStickers()

        setAllStickers([...stickers, ...importedStickers])
      }

      const importedCount = result.importedPaths.length
      const rejectedCount = result.rejectedFiles.length

      if (rejectedCount > 0 && importedCount > 0) {
        showImportStatus(
          `${importedCount} file(s) imported. ${rejectedCount} rejected (over 5 MB).`
        )
      } else if (rejectedCount > 0) {
        showImportStatus(
          `${rejectedCount} file(s) rejected. Maximum size: 5 MB.`
        )
      } else {
        showImportStatus(`${importedCount} file(s) imported.`)
      }
    } catch (error) {
      console.error('Sticker import failed:', error)
      showImportStatus('Could not import stickers.')
    }
  }

  const showImportStatus = (message: string): void => {
    if (importStatusTimeout.current !== null) {
      window.clearTimeout(importStatusTimeout.current)
    }

    setImportStatus(message)

    importStatusTimeout.current = window.setTimeout(() => {
      setImportStatus('')
      importStatusTimeout.current = null
    }, 1500)
  }

  const handleDeleteSticker = async (sticker: Sticker): Promise<void> => {
    if (typeof sticker.id !== 'string') {
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${sticker.name}" permanently?`
    )

    if (!confirmed) {
      return
    }

    try {
      const deleted = await window.api.deleteSticker(sticker.id)

      if (!deleted) {
        throw new Error('Could not delete sticker file')
      }

      setAllStickers((current) => current.filter((item) => item.id !== sticker.id))

      setFavoriteIds((current) => current.filter((id) => id !== sticker.id))

      setRecentIds((current) => current.filter((id) => id !== sticker.id))

      setCopyStatus(`${sticker.name} deleted.`)

      window.setTimeout(() => {
        setCopyStatus('')
      }, 2500)
    } catch (error) {
      console.error('Sticker deletion failed:', error)
      setCopyStatus('Could not delete sticker.')
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const visibleStickers = allStickers.filter((sticker) => {
    const matchesSearch = sticker.name.toLowerCase().includes(normalizedSearch)

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'favorites' && favoriteIds.includes(sticker.id)) ||
      (activeTab === 'recent' && recentIds.includes(sticker.id))

    return matchesSearch && matchesTab
  })

  const orderedStickers =
    activeTab === 'recent'
      ? recentIds
          .map((id) => allStickers.find((sticker) => sticker.id === id))
          .filter((sticker) => sticker !== undefined)
          .filter((sticker) => sticker.name.toLowerCase().includes(normalizedSearch))
      : visibleStickers

  return (
    <main className="sticker-app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">S</div>

          <div className="brand-text">
            <h1>StickerIndex</h1>
            <p>Your personal sticker library</p>
          </div>
        </div>
      </header>

      <section className="search-section">
        <label className="search-box">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search stickers..."
            aria-label="Search stickers"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <span className="search-shortcut">/</span>
        </label>
      </section>

      <button type="button" className="import-button" onClick={() => void handleImportStickers()}>
        + Import sticker
      </button>

      {importStatus && (
        <p className="import-status" role="status" aria-live="polite">
          {importStatus}
        </p>
      )}

      <nav className="tabs" aria-label="Sticker sections">
        <button
          className={activeTab === 'all' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>

        <button
          className={activeTab === 'favorites' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites
        </button>

        <button
          className={activeTab === 'recent' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
      </nav>

      {copyStatus && (
        <p className="copy-status" role="status" aria-live="polite">
          {copyStatus}
        </p>
      )}

      <section className="gallery-section">
        <div className="section-heading">
          <h2>{sectionTitles[activeTab]}</h2>
          <span className="sticker-count">
            {orderedStickers.length} {orderedStickers.length === 1 ? 'sticker' : 'stickers'}
          </span>
        </div>

        {orderedStickers.length > 0 ? (
          <div className="sticker-grid">
            {orderedStickers.map((sticker) => (
              <div className="sticker-card" key={sticker.id}>
                <button
                  className="favorite-button"
                  type="button"
                  aria-label={
                    favoriteIds.includes(sticker.id)
                      ? `Remove ${sticker.name} from favorites`
                      : `Add ${sticker.name} to favorites`
                  }
                  title={
                    favoriteIds.includes(sticker.id) ? 'Remove from favorites' : 'Add to favorites'
                  }
                  onClick={() => toggleFavorite(sticker.id)}
                >
                  {favoriteIds.includes(sticker.id) ? '★' : '☆'}
                </button>

                <button
                  className="sticker-image-button"
                  type="button"
                  title={`Use ${sticker.name}`}
                  onClick={() => void handleStickerClick(sticker)}
                >
                  <img src={sticker.image} alt={sticker.name} draggable={false} />
                </button>

                {typeof sticker.id === 'string' && (
                  <button
                    type="button"
                    className="delete-sticker-button"
                    title="Delete sticker"
                    aria-label={`Delete ${sticker.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteSticker(sticker)
                    }}
                  >
                    🗑
                  </button>
                )}

                <span>{sticker.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-gallery">
            <div className="empty-icon" aria-hidden="true">
              ✦
            </div>

            <h3>
              {normalizedSearch
                ? 'No stickers found'
                : activeTab === 'all'
                  ? 'Your collection starts here'
                  : activeTab === 'favorites'
                    ? 'No favorite stickers yet'
                    : 'No recently used stickers'}
            </h3>

            <p>
              {normalizedSearch
                ? 'Try another search term.'
                : activeTab === 'all'
                  ? 'Add stickers to see them in your collection.'
                  : activeTab === 'favorites'
                    ? 'Your favorite stickers will appear here.'
                    : 'Stickers you use will appear here.'}
            </p>
          </div>
        )}
      </section>

      <footer className="app-footer">
        <span>StickerIndex</span>
        <span>Personal sticker library</span>
      </footer>
    </main>
  )
}

export default App
