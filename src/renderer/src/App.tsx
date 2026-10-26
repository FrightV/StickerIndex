import { useRef, useState } from 'react'

type Tab = 'all' | 'favorites' | 'recent'

type Sticker = {
  id: number
  name: string
  image: string
}

const stickers: Sticker[] = [
  {
    id: 1,
    name: 'Happy',
    image: '/stickers/happy.png'
  },
  {
    id: 2,
    name: 'Surprised',
    image: '/stickers/surprised.jpg'
  },
  {
    id: 3,
    name: 'Love',
    image: '/stickers/love.jpg'
  }
]

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [recentIds, setRecentIds] = useState<number[]>([])
  const [copyStatus, setCopyStatus] = useState('')
  const copyRequestId = useRef(0)
  const [importStatus, setImportStatus] = useState('')

  const sectionTitles: Record<Tab, string> = {
    all: 'My stickers',
    favorites: 'Favorites',
    recent: 'Recently used'
  }

  const toggleFavorite = (stickerId: number) => {
  setFavoriteIds((currentIds) =>
    currentIds.includes(stickerId)
      ? currentIds.filter((id) => id !== stickerId)
      : [...currentIds, stickerId]
    )
  }

  const markAsRecent = (stickerId: number) => {
    setRecentIds((currentIds) => [
      stickerId,
      ...currentIds.filter((id) => id !== stickerId)
    ])
  }

  const handleStickerClick = async (sticker: Sticker) => {
    const requestId = ++copyRequestId.current
    try {
      setCopyStatus('Copying...')

      const response = await fetch(sticker.image)

      if (!response.ok) {
        throw new Error('Could not load sticker image')
      }

      const blob = await response.blob()

      if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) {
        throw new Error('Unsupported image format')
      }

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
        reader.readAsDataURL(blob)
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

  const handleImportStickers = async () => {
  try {
    setImportStatus('Selecting files...')

    const filePaths = await window.api.selectStickerFiles()

    if (filePaths.length === 0) {
      setImportStatus('No files selected.')
      return
    }

    setImportStatus(`${filePaths.length} file(s) selected.`)
    console.log('Selected sticker files:', filePaths)
  } catch (error) {
    console.error('Sticker selection failed:', error)
    setImportStatus('Could not select files.')
  }
}

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const visibleStickers = stickers.filter((sticker) => {
    const matchesSearch = sticker.name
      .toLowerCase()
      .includes(normalizedSearch)

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'favorites' &&
        favoriteIds.includes(sticker.id)) ||
      (activeTab === 'recent' &&
        recentIds.includes(sticker.id))

    return matchesSearch && matchesTab
  })

  const orderedStickers =
  activeTab === 'recent'
    ? recentIds
        .map((id) => stickers.find((sticker) => sticker.id === id))
        .filter((sticker) => sticker !== undefined)
        .filter((sticker) =>
          sticker.name.toLowerCase().includes(normalizedSearch)
        )
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
            type="search"
            placeholder="Search stickers..."
            aria-label="Search stickers"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <span className="search-shortcut">/</span>
        </label>
      </section>

      <button
        type="button"
        className="import-button"
        onClick={() => void handleImportStickers()}
      >
        + Import sticker
      </button>

      {importStatus && (
        <p role="status" aria-live="polite">
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
          className={
            activeTab === 'favorites' ? 'tab active' : 'tab'
          }
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
            {orderedStickers.length}{' '}
            {orderedStickers.length === 1 ? 'sticker' : 'stickers'}
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
                    favoriteIds.includes(sticker.id)
                      ? 'Remove from favorites'
                      : 'Add to favorites'
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
                  <img
                    src={sticker.image}
                    alt={sticker.name}
                    draggable={false}
                  />
                </button>

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
                :activeTab === 'all'
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
