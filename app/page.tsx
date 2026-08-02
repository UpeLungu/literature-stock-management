const categories = [
  'Bibles',
  'Books',
  'Brochures & Booklets',
  'Tracts',
  'Public Magazines',
  'Study Watchtower',
  'Meeting Workbooks',
  'Examining the Scriptures Daily',
  'Forms & Supplies',
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="logo">LMS</div>
        <div>
          <p className="eyebrow">Literature Management System</p>
          <h1>Responsive web application</h1>
          <p className="subtext">The clean Next.js foundation is live and ready for Supabase authentication and inventory modules.</p>
        </div>
      </section>

      <section className="statusGrid">
        <article><span>Application</span><strong>Online</strong></article>
        <article><span>Framework</span><strong>Next.js</strong></article>
        <article><span>Database</span><strong>Supabase</strong></article>
        <article><span>Current phase</span><strong>Foundation</strong></article>
      </section>

      <section className="catalogue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Initial catalogue</p>
            <h2>Literature categories</h2>
          </div>
          <button type="button">Start stock count</button>
        </div>
        <div className="categoryGrid">
          {categories.map((category) => (
            <article key={category}>
              <h3>{category}</h3>
              <p>Ready for publication setup</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
