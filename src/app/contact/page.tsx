import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="page">
      <div className="wrap">
        <header className="site">
          <div className="brand">
            <div className="brand-name">Artificially Intelligent Investor</div>
            <div className="brand-tag">Value investing, verified by machine</div>
          </div>
        </header>
        <Link href="/" className="back-btn">
          ← Back to site
        </Link>
        <section className="screener-section" style={{ marginTop: 24 }}>
          <h1 className="page-title" style={{ margin: '0 0 6px' }}>
            Contact
          </h1>
          <p className="page-desc">
            Questions, feedback, or a stock you&apos;d like us to prioritize? Reach us at{' '}
            <a href="mailto:hello@artificiallyintelligentinvestor.com">hello@artificiallyintelligentinvestor.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
