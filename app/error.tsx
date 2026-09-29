"use client";

export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <main className="container section-pad">
      <h1>We couldn’t load the catalog.</h1>
      <p>Please try again in a moment.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
