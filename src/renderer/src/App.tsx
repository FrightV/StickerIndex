
import { useState } from 'react'

type Tab = 'all' | 'favorites' | 'recent'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const sectionTitles: Record<Tab, string> = {
    all: 'My stickers',
    favorites: 'Favorites',
    recent: 'Recently used'
  }

  const emptyMessages: Record<Tab, string> = {
    all: 'Your collection starts here',
    favorites: 'No favorite stickers yet',
    recent: 'No recently used stickers'
  }

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

      <section className="gallery-section">
        <div className="section-heading">
          <h2>{sectionTitles[activeTab]}</h2>
          <span className="sticker-count">0 stickers</span>
        </div>

        <div className="empty-gallery">
          <div className="empty-icon" aria-hidden="true">
            ✦
          </div>

          <h3>{emptyMessages[activeTab]}</h3>

          <p>
            {activeTab === 'all'
              ? 'Import your favorite stickers to see them here.'
              : activeTab === 'favorites'
                ? 'Stickers you mark as favorites will appear here.'
                : 'Stickers you use will appear here.'}
          </p>
        </div>
      </section>

      <footer className="app-footer">
        <span>StickerIndex</span>
        <span>Personal sticker library</span>
      </footer>
    </main>
  )
}

export default App