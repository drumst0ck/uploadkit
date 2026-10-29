import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="uk-standalone">
      <h1 className="uk-display">Page not found.</h1>
      <p className="uk-lead">That page does not exist or has moved.</p>
      <p>
        <Link className="uk-pill" href="/docs">
          Back to the docs
        </Link>
      </p>
    </main>
  );
}
