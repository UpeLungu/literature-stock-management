const categories = [
  ['Bibles', 2],
  ['Books', 9],
  ['Brochures & Booklets', 2],
  ['Tracts', 7],
  ['Public Magazines', 2],
  ['Study Watchtower', 4],
  ['Meeting Workbooks', 5],
  ['Examining the Scriptures Daily', 2],
  ['Forms & Supplies', 1],
];

export default function HomePage() {
  const total = categories.reduce((sum, item) => sum + Number(item[1]), 0);
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span>LS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div>
        <nav><p className="active">Dashboard</p><p>Stock Count</p><p>Reports</p><p>Congregations</p><p>Publications</p><p>Users</p></nav>
      </aside>
      <section className="workspace">
        <header className="topbar"><div><p className="eyebrow">July 2026</p><h1>Dashboard</h1><p>Multi-congregation literature inventory.</p></div><button className="profile">UL</button></header>
        <div className="cards">
          <article><span>Total publications</span><strong>{total}</strong><small>Active catalogue</small></article>
          <article><span>Congregations</span><strong>3</strong><small>Initial rollout</small></article>
          <article><span>Submitted</span><strong>1/3</strong><small>July count</small></article>
          <article><span>Database</span><strong>Ready</strong><small>Connection pending</small></article>
        </div>
        <section className="panel">
          <div className="panelHead"><div><h2>Literature categories</h2><p>Select a category to capture stock.</p></div><button>Start stock count</button></div>
          <div className="categoryGrid">{categories.map(([name, count]) => <article className="category" key={String(name)}><div><h3>{name}</h3><p>{count} publications</p></div><span>›</span></article>)}</div>
        </section>
      </section>
    </main>
  );
}
