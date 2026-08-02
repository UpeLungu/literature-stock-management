'use client';

import { useEffect, useMemo, useState } from 'react';

type Page = 'dashboard'|'stock'|'reports'|'congregations'|'publications'|'users'|'settings';
type Count = { physical:number; verified:boolean };
type Category = { id:string; name:string; active:boolean };
type Publication = { id:string; categoryId:string; title:string; opening:number; active:boolean };
type Congregation = { id:string; name:string; active:boolean };

const defaultCategories:Category[] = [
  {id:'bibles',name:'Bibles',active:true},{id:'books',name:'Books',active:true},{id:'brochures',name:'Brochures & Booklets',active:true},
  {id:'tracts',name:'Tracts',active:true},{id:'magazines',name:'Public Magazines',active:true},{id:'watchtower',name:'Study Watchtower',active:true},
  {id:'workbooks',name:'Meeting Workbooks',active:true},{id:'daily',name:'Examining the Scriptures Daily',active:true},{id:'forms',name:'Forms & Supplies',active:true}
];
const defaultPublications:Publication[] = [
  {id:'b1',categoryId:'bibles',title:'New World Translation (Standard)',opening:10,active:true},{id:'b2',categoryId:'bibles',title:'New World Translation (Pocket Size)',opening:8,active:true},
  {id:'bk1',categoryId:'books',title:'Walk Courageously',opening:31,active:true},{id:'bk2',categoryId:'books',title:'Love People',opening:23,active:true},{id:'bk3',categoryId:'books',title:'Apply Yourself to Reading',opening:53,active:true},
  {id:'t30',categoryId:'tracts',title:'View the Bible (T-30)',opening:698,active:true},{id:'t31',categoryId:'tracts',title:'View the Future (T-31)',opening:332,active:true},{id:'t32',categoryId:'tracts',title:'Happy Family Life (T-32)',opening:89,active:true},
  {id:'wt1',categoryId:'watchtower',title:'Watchtower — July 2026',opening:300,active:true},{id:'mw1',categoryId:'workbooks',title:'July–August 2026',opening:16,active:true},
  {id:'d1',categoryId:'daily',title:'Examining the Scriptures Daily — 2026',opening:2,active:true},{id:'f1',categoryId:'forms',title:'Contact card for jw.org',opening:7,active:true}
];
const defaultCongregations:Congregation[] = [
  {id:'combined',name:'Long Ridge / Mapepe & Chilanga Central',active:true},{id:'kabulonga',name:'Kabulonga',active:true},{id:'matero',name:'Matero',active:true}
];
const nav:[Page,string][] = [['dashboard','Dashboard'],['stock','Stock Count'],['reports','Reports'],['congregations','Congregations'],['publications','Publications'],['users','Users'],['settings','Settings']];

export default function HomePage(){
  const [page,setPage]=useState<Page>('dashboard');
  const [categories,setCategories]=useState<Category[]>(defaultCategories);
  const [publications,setPublications]=useState<Publication[]>(defaultPublications);
  const [congregations,setCongregations]=useState<Congregation[]>(defaultCongregations);
  const [congregationId,setCongregationId]=useState('combined');
  const [categoryId,setCategoryId]=useState('all');
  const [search,setSearch]=useState('');
  const [counts,setCounts]=useState<Record<string,Count>>({});

  useEffect(()=>{
    const saved=localStorage.getItem('lms-admin-data');
    if(saved){const x=JSON.parse(saved);setCategories(x.categories||defaultCategories);setPublications(x.publications||defaultPublications);setCongregations(x.congregations||defaultCongregations)}
    const savedCounts=localStorage.getItem('lms-counts'); if(savedCounts) setCounts(JSON.parse(savedCounts));
  },[]);
  useEffect(()=>{localStorage.setItem('lms-admin-data',JSON.stringify({categories,publications,congregations}))},[categories,publications,congregations]);
  useEffect(()=>{localStorage.setItem('lms-counts',JSON.stringify(counts))},[counts]);

  const activeCategories=categories.filter(x=>x.active);
  const activePublications=publications.filter(x=>x.active&&categories.find(c=>c.id===x.categoryId)?.active);
  const activeCongregations=congregations.filter(x=>x.active);
  const congregation=activeCongregations.find(x=>x.id===congregationId)||activeCongregations[0];
  const getCount=(p:Publication)=>counts[`${congregation?.id}|${p.id}`]||{physical:p.opening,verified:p.opening>0};
  const updateCount=(p:Publication,patch:Partial<Count>)=>setCounts(v=>({...v,[`${congregation?.id}|${p.id}`]:{...getCount(p),...patch}}));
  const visible=activePublications.filter(p=>(categoryId==='all'||p.categoryId===categoryId)&&p.title.toLowerCase().includes(search.toLowerCase()));
  const stats=useMemo(()=>{const values=activePublications.map(getCount);return{total:values.reduce((a,b)=>a+b.physical,0),verified:values.filter(x=>x.verified).length}},[counts,congregationId,publications,categories]);

  const addCongregation=()=>{const name=prompt('Congregation name');if(name?.trim())setCongregations(v=>[...v,{id:crypto.randomUUID(),name:name.trim(),active:true}])};
  const renameCongregation=(c:Congregation)=>{const name=prompt('Edit congregation name',c.name);if(name?.trim())setCongregations(v=>v.map(x=>x.id===c.id?{...x,name:name.trim()}:x))};
  const toggleCongregation=(c:Congregation)=>setCongregations(v=>v.map(x=>x.id===c.id?{...x,active:!x.active}:x));
  const addCategory=()=>{const name=prompt('Category name');if(name?.trim())setCategories(v=>[...v,{id:crypto.randomUUID(),name:name.trim(),active:true}])};
  const renameCategory=(c:Category)=>{const name=prompt('Edit category name',c.name);if(name?.trim())setCategories(v=>v.map(x=>x.id===c.id?{...x,name:name.trim()}:x))};
  const toggleCategory=(c:Category)=>setCategories(v=>v.map(x=>x.id===c.id?{...x,active:!x.active}:x));
  const addPublication=()=>{if(!activeCategories.length)return;const title=prompt('Publication title');if(!title?.trim())return;const cat=prompt(`Category ID:\n${activeCategories.map(x=>`${x.id} = ${x.name}`).join('\n')}`,activeCategories[0].id);if(!cat||!activeCategories.some(x=>x.id===cat))return alert('Invalid category ID');setPublications(v=>[...v,{id:crypto.randomUUID(),categoryId:cat,title:title.trim(),opening:0,active:true}])};
  const renamePublication=(p:Publication)=>{const title=prompt('Edit publication title',p.title);if(title?.trim())setPublications(v=>v.map(x=>x.id===p.id?{...x,title:title.trim()}:x))};
  const togglePublication=(p:Publication)=>setPublications(v=>v.map(x=>x.id===p.id?{...x,active:!x.active}:x));

  return <div className="appShell">
    <aside className="sidebar"><div className="brand"><span>LMS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div><nav>{nav.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}>{label}</button>)}</nav><small className="version">July 2026</small></aside>
    <main className="workspace">
      <header className="topbar"><div><p>July 2026</p><h1>{nav.find(x=>x[0]===page)?.[1]}</h1></div><select value={congregation?.id||''} onChange={e=>setCongregationId(e.target.value)}>{activeCongregations.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></header>

      {page==='dashboard'&&<><section className="stats"><article><span>Total publications</span><strong>{activePublications.length}</strong></article><article><span>Physical stock</span><strong>{stats.total.toLocaleString()}</strong></article><article><span>Items verified</span><strong>{stats.verified}/{activePublications.length}</strong></article><article><span>Congregations</span><strong>{activeCongregations.length}</strong></article></section><section className="panel"><div className="panelHead"><div><h2>Literature categories</h2><p>Open a category to capture stock quantities.</p></div><button onClick={()=>setPage('stock')}>Start stock count</button></div><div className="categoryGrid">{activeCategories.map(c=>{const items=activePublications.filter(p=>p.categoryId===c.id);const done=items.filter(p=>getCount(p).verified).length;return <button key={c.id} onClick={()=>{setCategoryId(c.id);setPage('stock')}}><strong>{c.name}</strong><span>{done} of {items.length} verified</span><i style={{width:`${items.length?Math.round(done/items.length*100):0}%`}}/></button>})}</div></section></>}

      {page==='stock'&&<section className="panel"><div className="panelHead"><div><h2>Monthly stock count</h2><p>{congregation?.name}</p></div><button onClick={()=>visible.forEach(p=>updateCount(p,{verified:true}))}>Mark visible done</button></div><div className="toolbar"><input placeholder="Search publications" value={search} onChange={e=>setSearch(e.target.value)}/><select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="all">All categories</option>{activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="stockList">{visible.map(p=>{const c=getCount(p);return <article key={p.id}><div><strong>{p.title}</strong><span>{categories.find(x=>x.id===p.categoryId)?.name} · Previous {p.opening}</span></div><input type="number" min="0" value={c.physical} onChange={e=>updateCount(p,{physical:Number(e.target.value),verified:false})}/><label><input type="checkbox" checked={c.verified} onChange={e=>updateCount(p,{verified:e.target.checked})}/> Done</label></article>})}</div></section>}

      {page==='reports'&&<section className="panel"><div className="panelHead"><div><h2>July stock report</h2><p>{congregation?.name}</p></div></div><table><thead><tr><th>Category</th><th>Items</th><th>Total stock</th></tr></thead><tbody>{activeCategories.map(c=>{const items=activePublications.filter(p=>p.categoryId===c.id);return <tr key={c.id}><td>{c.name}</td><td>{items.length}</td><td>{items.reduce((s,p)=>s+getCount(p).physical,0).toLocaleString()}</td></tr>})}</tbody></table></section>}

      {page==='congregations'&&<section className="panel"><div className="panelHead"><div><h2>Congregations</h2><p>Add, edit or deactivate congregations.</p></div><button onClick={addCongregation}>Add congregation</button></div><div className="simpleList">{congregations.map(c=><article key={c.id}><div><strong>{c.name}</strong><span>{c.active?'Active':'Inactive'}</span></div><div className="rowActions"><button onClick={()=>renameCongregation(c)}>Edit</button><button onClick={()=>toggleCongregation(c)}>{c.active?'Deactivate':'Activate'}</button></div></article>)}</div></section>}

      {page==='publications'&&<section className="panel"><div className="panelHead"><div><h2>Categories and publications</h2><p>Books and other literature are publications under a category.</p></div><div className="headerActions"><button onClick={addCategory}>Add category</button><button onClick={addPublication}>Add publication</button></div></div><h3>Categories</h3><div className="simpleList compact">{categories.map(c=><article key={c.id}><div><strong>{c.name}</strong><span>{c.active?'Active':'Inactive'} · {publications.filter(p=>p.categoryId===c.id&&p.active).length} publications</span></div><div className="rowActions"><button onClick={()=>renameCategory(c)}>Edit</button><button onClick={()=>toggleCategory(c)}>{c.active?'Deactivate':'Activate'}</button></div></article>)}</div><h3 className="sectionGap">Publications</h3><div className="simpleList">{publications.map(p=><article key={p.id}><div><strong>{p.title}</strong><span>{categories.find(c=>c.id===p.categoryId)?.name} · {p.active?'Active':'Inactive'}</span></div><div className="rowActions"><button onClick={()=>renamePublication(p)}>Edit</button><button onClick={()=>togglePublication(p)}>{p.active?'Deactivate':'Activate'}</button></div></article>)}</div></section>}

      {page==='users'&&<section className="panel"><div className="panelHead"><div><h2>Users</h2><p>System Administrator, Congregation Administrator, Literature Servant and Viewer.</p></div></div><div className="emptyState">User invitation and role assignment will activate with Supabase Authentication.</div></section>}
      {page==='settings'&&<section className="panel"><div className="panelHead"><div><h2>Settings</h2><p>Only approved LMS configuration is shown.</p></div></div><div className="simpleList"><article><strong>Current period</strong><span>July 2026</span></article><article><strong>Storage</strong><span>Browser prototype; Supabase connection next</span></article></div></section>}
    </main>
  </div>
}
