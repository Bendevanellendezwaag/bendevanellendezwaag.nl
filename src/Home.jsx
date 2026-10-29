/** Voorpagina. Inhoud volgt nog — voor nu logo + de weg naar de stemming. */
export default function Home({ onStemmen }) {
  return (
    <div className="site">
      <main className="site-hero">
        <img className="site-logo" src="/logo.png" alt="Bende van Ellende" />
        <h1 className="site-titel">Bende van Ellende</h1>
        <p className="site-tekst">Carnaval komt eraan. Help mee het thema te kiezen.</p>
        <a
          className="site-knop"
          href="/stemmen"
          onClick={(e) => {
            e.preventDefault();
            onStemmen();
          }}
        >
          Naar de stemming
        </a>
      </main>
      <footer className="site-voet">© {new Date().getFullYear()} Bende van Ellende</footer>
    </div>
  );
}
