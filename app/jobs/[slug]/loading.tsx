export default function JobDetailLoading() {
  return (
    <main className="page-loading">
      <div className="loader-card">
        <span className="loader-dot" />
        <strong>Načítám detail inzerátu...</strong>
        <p>Detail nabídky se připravuje, kontakty a podobné pozice doběhnou hned vzápětí.</p>
      </div>
    </main>
  );
}
