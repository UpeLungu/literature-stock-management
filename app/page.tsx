'use client';

import { useEffect, useMemo, useState } from 'react';

type Page = 'dashboard' | 'stock' | 'reports' | 'congregations' | 'publications' | 'users';
type Count = { physical: number; verified: boolean };

const categories = [
  ['bibles', 'Bibles'], ['books', 'Books'], ['brochures', 'Brochures & Booklets'],
  ['tracts', 'Tracts'], ['magazines', 'Public Magazines'], ['watchtower', 'Study Watchtower'],
  ['workbooks', 'Meeting Workbooks'], ['daily', 'Examining the Scriptures Daily'], ['forms', 'Forms & Supplies'],
] as const;

const publications = [
  ['bibles','New World Translation (Standard)',10], ['bibles','New World Translation (Pocket Size)',8],
  ['books','Walk Courageously',31], ['books','Song Books',9], ['books','Love People',23],
  ['books','Apply Yourself to Reading',53], ['books',"Organised to Do Jehovah's Will",16],
  ['books','Scriptures for Christian Living',31], ['books','Sing Out Joyfully',16],
  ['brochures','Listen to God',26], ['brochures','Listen and Live',68], ['brochures','Enjoy Life Forever!',0],
  ['tracts','View the Bible (T-30)',698], ['tracts','View the Future (T-31)',332],
  ['tracts','Happy Family Life (T-32)',89], ['tracts','Who Controls the World? (T-33)',8],
  ['tracts','Will Suffering End? (T-34)',361], ['tracts','Live Again (T-35)',526], ['tracts','Kingdom (T-36)',461],
  ['magazines','Awake! (g18.2)',48], ['magazines','Watchtower Public (wp20.3)',112],
  ['watchtower','Watchtower — April 2026',103], ['watchtower','Watchtower — May 2026',90],
  ['watchtower','Watchtower — June 2026',260], ['watchtower','Watchtower — July 2026',300],
  ['workbooks','January–February 2026',40], ['workbooks','March–April 2026',3],
  ['workbooks','July–August 2026',16], ['workbooks','September–October 2026',271],
  ['daily','Examining the Scriptures Daily — 2026',2], ['daily','Examining the Scriptures Daily — 2020',1],
  ['forms','Contact card for jw.org',7], ['forms','Contact card for free Bible course',7],
  ['forms','Field Service Report (S-4)',0], ['forms','Transaction Record (S-24)',500],
] as const;

const congregations = ['Long Ridge / Mapepe & Chilanga Central', 'Long Ridge / Mapepe', 'Chilanga Central', 'Kabulonga', 'Matero'];
const nav: [Page,string][] = [['dashboard','Dashboard'],['stock','Stock Count'],['reports','Reports'],['congregations','Congregations'],['publications','Publications'],['users','Users']];

export default function HomePage() {
  const [page,setPage] = useState<Page>('dashboard');
  const [congregation,setCongregation] = useState(congregations[0]);
  const [category,setCategory] = useState('all');
  const [search,setSearch] = useState('');
  const [counts,setCounts] = useState<Record<string,Count>>({});

  useEffect(() => {
    const saved = localStorage.getItem('lms-counts');
    if (saved) setCounts(JSON.parse(saved));
  }, []);
  useEffect(() => { if (Object.keys(counts).length) localStorage.setItem('lms-counts', JSON.stringify(counts)); }, [counts]);

  const getCount = (name:string, opening:number) => counts[`${congregation}|${name}`] || { physical: opening, verified: opening > 0 };
  const update = (name:string, opening:number, patch:Partial<Count>) => setCounts(prev => ({...prev,[`${congregation}|${name}`]:{...getCount(name,opening),...patch}}));
  const visible = publications.filter(([cat,name]) => (category==='all'||cat===category) && name.toLowerCase().includes(search.toLowerCase()));
  const stats = useMemo(() => {
    const values = publications.map(([,name,opening]) => getCount(name,opening));
    return { total: values.reduce((a,b)=>a+b.physical,0), verified: values.filter(v=>v.verified).length };
  }, [counts, congregation]);

  return <div className="appShell">
    <aside className="sidebar">
      <div className="brand"><span>LMS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div>
      <nav>{nav.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}>{label}</button>)}</nav>
      <small className="version">July 2026 · Prototype</small>
    </aside>

    <main className="workspace">
      <header className="topbar"><div><p>July 2026</p><h1>{nav.find(n=>n[0]===page)?.[1]}</h1></div><select value={congregation} onChange={e=>setCongregation(e.target.value)}>{congregations.map(c=><option key={c}>{c}</option>)}</select></header>

      {page==='dashboard' && <>
        <section className="stats"><article><span>Total publications</span><strong>{publications.length}</strong></article><article><span>Physical stock</span><strong>{stats.total.toLocaleString()}</strong></article><article><span>Items verified</span><strong>{stats.verified}/{publications.length}</strong></article><article><span>Congregations</span><strong>{congregations.length}</strong></article></section>
        <section className="panel"><div className="panelHead"><div><h2>Literature categories</h2><p>Open a category to capture stock quantities.</p></div><button onClick={()=>setPage('stock')}>Start stock count</button></div><div className="categoryGrid">{categories.map(([id,name])=>{const items=publications.filter(p=>p[0]===id);const done=items.filter(([,n,o])=>getCount(n,o).verified).length;return <button key={id} onClick={()=>{setCategory(id);setPage('stock')}}><strong>{name}</strong><span>{done} of {items.length} verified</span></button>})}</div></section>
      </>}

      {page==='stock' && <section className="panel"><div className="panelHead"><div><h2>Monthly stock count</h2><p>Enter quantities and mark each item as verified.</p></div><button onClick={()=>visible.forEach(([,n,o])=>update(n,o,{verified:true}))}>Mark visible done</button></div><div className="toolbar"><input placeholder="Search publications" value={search} onChange={e=>setSearch(e.target.value)}/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div><div className="stockList">{visible.map(([cat,name,opening])=>{const c=getCount(name,opening);return <article key={name}><div><strong>{name}</strong><span>{categories.find(x=>x[0]===cat)?.[1]} · Previous {opening}</span></div><input type="number" min="0" value={c.physical} onChange={e=>update(name,opening,{physical:Number(e.target.value),verified:false})}/><label><input type="checkbox" checked={c.verified} onChange={e=>update(name,opening,{verified:e.target.checked})}/> Done</label></article>})}</div></section>}

      {page==='reports' && <section className="panel"><div className="panelHead"><div><h2>July stock report</h2><p>{congregation}</p></div></div><table><thead><tr><th>Category</th><th>Items</th><th>Total stock</th></tr></thead><tbody>{categories.map(([id,name])=>{const items=publications.filter(p=>p[0]===id);return <tr key={id}><td>{name}</td><td>{items.length}</td><td>{items.reduce((s,[,n,o])=>s+getCount(n,o).physical,0).toLocaleString()}</td></tr>})}</tbody></table></section>}

      {page==='congregations' && <section className="panel"><div className="panelHead"><div><h2>Congregations</h2><p>Participating locations</p></div></div><div className="simpleList">{congregations.map((c,i)=><article key={c}><strong>{c}</strong><span>{i===0?'Submitted':'In progress'}</span></article>)}</div></section>}
      {page==='publications' && <section className="panel"><div className="panelHead"><div><h2>Publication catalogue</h2><p>{publications.length} active publications</p></div></div><div className="simpleList">{publications.map(([cat,name])=><article key={name}><strong>{name}</strong><span>{categories.find(x=>x[0]===cat)?.[1]}</span></article>)}</div></section>}
      {page==='users' && <section className="panel"><div className="panelHead"><div><h2>Users</h2><p>User management will connect to Supabase authentication.</p></div></div><div className="emptyState">No users have been configured yet.</div></section>}
    </main>
  </div>;
}
