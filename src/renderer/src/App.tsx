
import { useState } from 'react'

type Tab = 'all' | 'favorites' | 'recent'

type Sticker = {
  id: number
  name: string
  image: string
}

const stickers: Sticker[] = [

]

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const sectionTitles: Record<Tab, string> = {
    all: 'My stickers',
    favorites: 'Favorites',
    recent: 'Recently used'
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const visibleStickers = stickers.filter((sticker) => {
    const matchesSearch = sticker.name
      .toLowerCase()
      .includes(normalizedSearch)

    const matchesTab = activeTab === 'all'

    return matchesSearch && matchesTab
  })

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

      <section className="gallery-section">
        <div className="section-heading">
          <h2>{sectionTitles[activeTab]}</h2>
          <span className="sticker-count">
            {visibleStickers.length}{' '}
            {visibleStickers.length === 1 ? 'sticker' : 'stickers'}
          </span>
        </div>

        {visibleStickers.length > 0 ? (
          <div className="sticker-grid">
            {visibleStickers.map((sticker) => (
              <button
                className="sticker-card"
                key={sticker.id}
                title={sticker.name}
                aria-label={sticker.name}
              >
                <img
                  src={sticker.image}
                  alt={sticker.name}
                  draggable={false}
                />

                <span>{sticker.name}</span>
              </button>
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
