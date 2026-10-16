
function App(): React.JSX.Element {
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

      <section className="gallery-section">
        <div className="section-heading">
          <h2>My stickers</h2>
          <span className="sticker-count">0 stickers</span>
        </div>

        <div className="empty-gallery">
          <div className="empty-icon" aria-hidden="true">
            ✦
          </div>

          <h3>Your collection starts here</h3>

          <p>
            Import your favorite stickers to
            <br />
            see them in your collection.
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
