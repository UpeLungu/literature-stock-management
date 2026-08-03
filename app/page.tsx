'use client';

import { useEffect, useMemo, useState } from 'react';

type Page='dashboard'|'stock'|'reports'|'congregations'|'publications'|'users'|'settings';
type Count={physical:number;verified:boolean};
type Category={id:string;name:string;active:boolean};
type Publication={id:string;categoryId:string;code:string;title:string;opening:number;active:boolean};
type Congregation={id:string;name:string;status:'Submitted'|'In progress';active:boolean};

const initialCategories:Category[]=[
{id:'bibles',name:'Bibles',active:true},{id:'books',name:'Books',active:true},{id:'brochures',name:'Brochures and Booklets',active:true},
{id:'tracts',name:'Tracts',active:true},{id:'magazines',name:'Public Magazines',active:true},{id:'watchtower',name:'Study Watchtower',active:true},
{id:'workbooks',name:'Meeting Workbooks',active:true},{id:'daily',name:'Examining the Scriptures Daily',active:true},{id:'forms',name:'Forms and Supplies',active:true}
];

const initialPublications:Publication[]=[
{id:'nwt',categoryId:'bibles',code:'nwt',title:'New World Translation',opening:8,active:true},{id:'nwtpkt',categoryId:'bibles',code:'nwtpkt',title:'New World Translation (pocket-size)',opening:0,active:true},{id:'b-other',categoryId:'bibles',code:'',title:'Others',opening:0,active:true},
{id:'be',categoryId:'books',code:'be',title:'Ministry School',opening:0,active:true},{id:'bhs',categoryId:'books',code:'bhs',title:'Teach Us',opening:0,active:true},{id:'cf',categoryId:'books',code:'cf',title:'My Follower',opening:0,active:true},{id:'cl',categoryId:'books',code:'cl',title:'Close to Jehovah',opening:0,active:true},{id:'ia',categoryId:'books',code:'ia',title:'Imitate',opening:0,active:true},{id:'jy',categoryId:'books',code:'jy',title:'Jesus—The Way',opening:0,active:true},{id:'kr',categoryId:'books',code:'kr',title:"God's Kingdom Rules!",opening:0,active:true},{id:'lfb',categoryId:'books',code:'lfb',title:'Learn From the Bible',opening:1,active:true},{id:'lff',categoryId:'books',code:'lff',title:'Enjoy Life Forever! (Book)',opening:0,active:true},{id:'lr',categoryId:'books',code:'lr',title:'Teacher',opening:0,active:true},{id:'od',categoryId:'books',code:'od',title:'Organized',opening:16,active:true},{id:'rr',categoryId:'books',code:'rr',title:'Pure Worship',opening:0,active:true},{id:'scl',categoryId:'books',code:'scl',title:'Scriptures for Christian Living',opening:31,active:true},{id:'sjj',categoryId:'books',code:'sjj',title:'Sing Out Joyfully',opening:16,active:true},{id:'sjjyls',categoryId:'books',code:'sjjyls',title:'Sing Out Joyfully—Lyrics Only',opening:0,active:true},{id:'yp1',categoryId:'books',code:'yp1',title:'Young People Ask, Volume 1',opening:0,active:true},{id:'yp2',categoryId:'books',code:'yp2',title:'Young People Ask, Volume 2',opening:1,active:true},{id:'book-other',categoryId:'books',code:'',title:'Others',opening:31,active:true},
{id:'ay',categoryId:'brochures',code:'ay',title:'Reading and Writing',opening:0,active:true},{id:'fg',categoryId:'brochures',code:'fg',title:'Good News',opening:0,active:true},{id:'hf',categoryId:'brochures',code:'hf',title:'Happy Family',opening:0,active:true},{id:'lc',categoryId:'brochures',code:'lc',title:'Was Life Created?',opening:0,active:true},{id:'ld',categoryId:'brochures',code:'ld',title:'Listen to God',opening:26,active:true},{id:'lf',categoryId:'brochures',code:'lf',title:'Origin of Life',opening:0,active:true},{id:'lffi',categoryId:'brochures',code:'lffi',title:'Enjoy Life Forever! (Brochure)',opening:0,active:true},{id:'ll',categoryId:'brochures',code:'ll',title:'Listen and Live',opening:68,active:true},{id:'lmd',categoryId:'brochures',code:'lmd',title:'Love People',opening:23,active:true},{id:'mb',categoryId:'brochures',code:'mb',title:'My Bible Lessons',opening:0,active:true},{id:'ol',categoryId:'brochures',code:'ol',title:'Road to Life',opening:0,active:true},{id:'rj',categoryId:'brochures',code:'rj',title:'Return to Jehovah',opening:0,active:true},{id:'sp',categoryId:'brochures',code:'sp',title:'Spirits of the Dead',opening:0,active:true},{id:'th',categoryId:'brochures',code:'th',title:'Teaching',opening:0,active:true},{id:'ypq',categoryId:'brochures',code:'ypq',title:'10 Questions',opening:0,active:true},{id:'bro-other',categoryId:'brochures',code:'',title:'Others',opening:0,active:true},
{id:'inv',categoryId:'tracts',code:'inv',title:'Invitation to Congregation Meetings',opening:0,active:true},{id:'t30',categoryId:'tracts',code:'T-30',title:'View the Bible (T-30)',opening:698,active:true},{id:'t31',categoryId:'tracts',code:'T-31',title:'View the Future (T-31)',opening:332,active:true},{id:'t32',categoryId:'tracts',code:'T-32',title:'Happy Family Life (Tract No. 32)',opening:89,active:true},{id:'t33',categoryId:'tracts',code:'T-33',title:'Who Controls the World? (T-33)',opening:8,active:true},{id:'t34',categoryId:'tracts',code:'T-34',title:'Will Suffering End? (T-34)',opening:361,active:true},{id:'t35',categoryId:'tracts',code:'T-35',title:'Live Again (T-35)',opening:526,active:true},{id:'t36',categoryId:'tracts',code:'T-36',title:'Kingdom (T-36)',opening:461,active:true},{id:'tract-other',categoryId:'tracts',code:'',title:'Others',opening:0,active:true},
...['g18.1','g18.2','g18.3','g19.1','g19.2','g19.3','g20.1','g20.2','g20.3','g21.1','g21.2','g21.3','g22.1','g23.1','g24.1','g25.1'].map(code=>({id:code,categoryId:'magazines',code,title:'Awake!',opening:code==='g18.2'?48:0,active:true})),
...['wp18.1','wp18.2','wp18.3','wp19.1','wp19.2','wp19.3','wp20.1','wp20.2','wp20.3','wp21.1','wp21.2','wp21.3','wp22.1','wp23.1','wp24.1','wp25.1'].map(code=>({id:code,categoryId:'magazines',code,title:'Watchtower (Public)',opening:code==='wp20.3'?112:0,active:true})),
{id:'mag-other',categoryId:'magazines',code:'',title:'Others',opening:0,active:true},
{id:'wt-apr',categoryId:'watchtower',code:'w26.04',title:'Watchtower — April 2026',opening:21,active:true},{id:'wt-may',categoryId:'watchtower',code:'w26.05',title:'Watchtower — May 2026',opening:23,active:true},{id:'wt-jun',categoryId:'watchtower',code:'w26.06',title:'Watchtower — June 2026',opening:260,active:true},{id:'wt-jul',categoryId:'watchtower',code:'w26.07',title:'Watchtower — July 2026',opening:300,active:true},{id:'wt-other',categoryId:'watchtower',code:'',title:'Others',opening:0,active:true},
{id:'mw-janfeb',categoryId:'workbooks',code:'mwb26.01',title:'January–February 2026',opening:40,active:true},{id:'mw-marapr',categoryId:'workbooks',code:'mwb26.03',title:'March–April 2026',opening:3,active:true},{id:'mw-julaug',categoryId:'workbooks',code:'mwb26.07',title:'July–August 2026',opening:16,active:true},{id:'mw-sepoct',categoryId:'workbooks',code:'mwb26.09',title:'September–October 2026',opening:271,active:true},{id:'mw-other',categoryId:'workbooks',code:'',title:'Others',opening:0,active:true},
{id:'esd26',categoryId:'daily',code:'es26',title:'Examining the Scriptures Daily — 2026',opening:2,active:true},{id:'esd20',categoryId:'daily',code:'es20',title:'Examining the Scriptures Daily — 2020',opening:1,active:true},{id:'daily-other',categoryId:'daily',code:'',title:'Others',opening:0,active:true},
{id:'jwcd4',categoryId:'forms',code:'jwcd4',title:'Contact card for jw.org',opening:7,active:true},{id:'jwcd9',categoryId:'forms',code:'jwcd9',title:'Contact card for free Bible course',opening:7,active:true},{id:'s4',categoryId:'forms',code:'S-4',title:'Field Service Report',opening:0,active:true},{id:'s24',categoryId:'forms',code:'S-24',title:'Transaction Record',opening:500,active:true},{id:'forms-other',categoryId:'forms',code:'',title:'Others',opening:0,active:true}
];

const initialCongregations:Congregation[]=[{id:'combined',name:'Long Ridge / Mapepe & Chilanga Central',status:'Submitted',active:true},{id:'kabulonga',name:'Kabulonga',status:'In progress',active:true},{id:'matero',name:'Matero',status:'In progress',active:true}];
const nav:[Page,string][]=[['dashboard','Dashboard'],['stock','Stock Count'],['reports','Reports'],['congregations','Congregations'],['publications','Publications'],['users','Users'],['settings','Settings']];

const keyForMonth=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
const labelForMonth=(key:string)=>{const [year,month]=key.split('-').map(Number);return new Intl.DateTimeFormat('en',{month:'long',year:'numeric'}).format(new Date(year,month-1,1))};
const previousMonthKey=()=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-1);return keyForMonth(date)};
const monthOptions=(due:string)=>{const [year,month]=due.split('-').map(Number);return Array.from({length:12},(_,index)=>keyForMonth(new Date(year,month-1-index,1)))};

export default function HomePage(){
 const duePeriod=useMemo(previousMonthKey,[]);
 const periods=useMemo(()=>monthOptions(duePeriod),[duePeriod]);
 const [period,setPeriod]=useState(duePeriod);
 const [page,setPage]=useState<Page>('dashboard');
 const [congregationId,setCongregationId]=useState('combined');
 const [step,setStep]=useState(0);
 const [review,setReview]=useState(false);
 const [counts,setCounts]=useState<Record<string,Count>>({});
 const [countsReady,setCountsReady]=useState(false);
 const [categories,setCategories]=useState<Category[]>(initialCategories);
 const [publications,setPublications]=useState<Publication[]>(initialPublications);
 const [congregations,setCongregations]=useState<Congregation[]>(initialCongregations);
 const [searchQuery,setSearchQuery]=useState('');
 const [categoryFilter,setCategoryFilter]=useState('all');
 const [stockSearch,setStockSearch]=useState('');

 useEffect(()=>{
  const savedPeriod=localStorage.getItem('lms-selected-period');if(savedPeriod&&periods.includes(savedPeriod))setPeriod(savedPeriod);
  const savedAdmin=localStorage.getItem('lms-admin-v3');if(savedAdmin){const data=JSON.parse(savedAdmin);setCategories(data.categories||initialCategories);setPublications(data.publications||initialPublications);setCongregations(data.congregations||initialCongregations)}
 },[periods]);
 useEffect(()=>{
  setCountsReady(false);
  const monthly=localStorage.getItem(`lms-counts-v3:${period}`);
  const legacy=localStorage.getItem('lms-counts-v3');
  setCounts(monthly?JSON.parse(monthly):period===duePeriod&&legacy?JSON.parse(legacy):{});
  localStorage.setItem('lms-selected-period',period);
  setCountsReady(true);
 },[period,duePeriod]);
 useEffect(()=>{if(countsReady)localStorage.setItem(`lms-counts-v3:${period}`,JSON.stringify(counts))},[counts,countsReady,period]);
 useEffect(()=>{localStorage.setItem('lms-admin-v3',JSON.stringify({categories,publications,congregations}))},[categories,publications,congregations]);

 const periodLabel=labelForMonth(period);
 const activeCategories=categories.filter(c=>c.active);
 const activePublications=publications.filter(p=>p.active&&categories.find(c=>c.id===p.categoryId)?.active);
 const activeCongregations=congregations.filter(c=>c.active);
 const congregation=activeCongregations.find(c=>c.id===congregationId)||activeCongregations[0];
 const currentCategory=activeCategories[step]||activeCategories[0];
 const currentItems=activePublications.filter(p=>p.categoryId===currentCategory?.id);
 const visibleCurrentItems=useMemo(()=>{const query=stockSearch.trim().toLowerCase();return query?currentItems.filter(p=>p.title.toLowerCase().includes(query)||p.code.toLowerCase().includes(query)):currentItems},[currentItems,stockSearch]);
 const getCount=(p:Publication)=>counts[`${congregation?.id}|${p.id}`]||{physical:p.opening,verified:false};
 const setCount=(p:Publication,patch:Partial<Count>)=>setCounts(v=>({...v,[`${congregation?.id}|${p.id}`]:{...getCount(p),...patch}}));
 const stats=useMemo(()=>{const values=activePublications.map(getCount);return{total:values.reduce((a,b)=>a+b.physical,0),verified:values.filter(v=>v.verified).length}},[counts,congregationId,publications,categories]);
 const filteredPublications=useMemo(()=>{const query=searchQuery.trim().toLowerCase();return publications.filter(p=>(categoryFilter==='all'||p.categoryId===categoryFilter)&&(!query||p.title.toLowerCase().includes(query)||p.code.toLowerCase().includes(query)))},[publications,searchQuery,categoryFilter]);
 const startStock=(categoryIndex=0)=>{setPage('stock');setReview(false);setStep(categoryIndex);setStockSearch('')};
 const selectStockCategory=(categoryId:string)=>{const index=activeCategories.findIndex(c=>c.id===categoryId);if(index>=0){setStep(index);setReview(false);setStockSearch('')}};
 const markAll=()=>currentItems.forEach(p=>setCount(p,{verified:true}));
 const next=()=>{setStockSearch('');if(step<activeCategories.length-1)setStep(step+1);else setReview(true)};
 const previous=()=>{setStockSearch('');if(review)setReview(false);else if(step>0)setStep(step-1);else setPage('dashboard')};

 const addCongregation=()=>{const name=prompt('Congregation name');if(name?.trim())setCongregations(v=>[...v,{id:crypto.randomUUID(),name:name.trim(),status:'In progress',active:true}])};
 const editCongregation=(c:Congregation)=>{const name=prompt('Edit congregation name',c.name);if(name?.trim())setCongregations(v=>v.map(x=>x.id===c.id?{...x,name:name.trim()}:x))};
 const deleteCongregation=(c:Congregation)=>{if(confirm(`Delete ${c.name}? Existing browser counts for it will remain archived.`)){setCongregations(v=>v.filter(x=>x.id!==c.id));if(congregationId===c.id)setCongregationId('combined')}};
 const toggleCongregation=(c:Congregation)=>setCongregations(v=>v.map(x=>x.id===c.id?{...x,active:!x.active}:x));
 const addCategory=()=>{const name=prompt('Category name');if(name?.trim())setCategories(v=>[...v,{id:crypto.randomUUID(),name:name.trim(),active:true}])};
 const editCategory=(c:Category)=>{const name=prompt('Edit category name',c.name);if(name?.trim())setCategories(v=>v.map(x=>x.id===c.id?{...x,name:name.trim()}:x))};
 const toggleCategory=(c:Category)=>setCategories(v=>v.map(x=>x.id===c.id?{...x,active:!x.active}:x));
 const addPublication=()=>{const title=prompt('Publication title');if(!title?.trim())return;const code=prompt('Publication code (optional)','')||'';const categoryId=prompt(`Category ID:\n${activeCategories.map(c=>`${c.id} = ${c.name}`).join('\n')}`,activeCategories[0]?.id||'');if(!categoryId||!categories.some(c=>c.id===categoryId))return alert('Invalid category ID');setPublications(v=>[...v,{id:crypto.randomUUID(),categoryId,code:code.trim(),title:title.trim(),opening:0,active:true}])};
 const editPublication=(p:Publication)=>{const title=prompt('Edit publication title',p.title);if(title?.trim())setPublications(v=>v.map(x=>x.id===p.id?{...x,title:title.trim()}:x))};
 const deletePublication=(p:Publication)=>{if(confirm(`Delete ${p.title}?`))setPublications(v=>v.filter(x=>x.id!==p.id))};
 const togglePublication=(p:Publication)=>setPublications(v=>v.map(x=>x.id===p.id?{...x,active:!x.active}:x));

 return <div className="appShell">
  <aside className="sidebar"><div className="brand"><span>LMS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div><nav>{nav.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>{setPage(id);if(id==='stock'){setReview(false);setStep(0);setStockSearch('')}}}>{label}</button>)}</nav><small className="version">{periodLabel}</small></aside>
  <main className="workspace">
   <header className="topbar"><div><p>{periodLabel}</p><h1>{page==='stock'?(review?'Review and Submit':currentCategory?.name):nav.find(x=>x[0]===page)?.[1]}</h1></div><select value={congregation?.id||''} onChange={e=>setCongregationId(e.target.value)}>{activeCongregations.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></header>

   <section className="periodBar"><div><strong>{period===duePeriod?`${periodLabel} stock count is due`:`Viewing ${periodLabel}`}</strong><span>{period===duePeriod?`Because it is now ${labelForMonth(keyForMonth(new Date()))}, count stock for the previous month.`:'Counts are saved separately for this selected month.'}</span></div><label>Count month<select value={period} onChange={e=>setPeriod(e.target.value)}>{periods.map(value=><option key={value} value={value}>{labelForMonth(value)}{value===duePeriod?' — Due':''}</option>)}</select></label></section>

   {page==='dashboard'&&<><section className="stats"><article><span>Total publications</span><strong>{activePublications.length}</strong></article><article><span>Physical stock</span><strong>{stats.total.toLocaleString()}</strong></article><article><span>Items verified</span><strong>{stats.verified}/{activePublications.length}</strong></article><article><span>Congregations submitted</span><strong>{activeCongregations.filter(c=>c.status==='Submitted').length}/{activeCongregations.length}</strong></article></section><section className="dashboardGrid"><section className="panel"><div className="panelHead"><div><h2>Literature categories</h2><p>Open a category to capture stock quantities.</p></div><div className="headerActions"><button onClick={()=>startStock(0)}>Start stock count</button><button onClick={()=>{setPage('stock');setReview(true);setStockSearch('')}}>Review current count</button></div></div><div className="categoryGrid">{activeCategories.map((c,i)=>{const items=activePublications.filter(p=>p.categoryId===c.id);const done=items.filter(p=>getCount(p).verified).length;return <button key={c.id} onClick={()=>startStock(i)}><strong>{c.name}</strong><span>{done} of {items.length} verified</span><i style={{width:`${items.length?Math.round(done/items.length*100):0}%`}}/></button>})}</div></section><aside className="submissionPanel"><h2>Submission status</h2><p>Congregations for the selected period.</p>{activeCongregations.map(c=><article key={c.id}><div><strong>{c.name}</strong><span>{periodLabel}</span></div><em className={c.status==='Submitted'?'submitted':'progress'}>{c.status}</em></article>)}</aside></section></>}

   {page==='stock'&&!review&&<section className="countScreen"><div className="countIntro"><span>{periodLabel.toUpperCase()} | ENGLISH</span><h2>{currentCategory?.name}</h2><p>Select an item to update the quantity. Mark the item as done after it has been updated or verified.</p><button onClick={markAll}>✓ Mark All Items Done</button></div><div className="stockCountTools"><label><span>Search publication</span><input type="search" value={stockSearch} onChange={e=>setStockSearch(e.target.value)} placeholder="Search name or code…"/></label><label><span>Select category</span><select value={currentCategory?.id||''} onChange={e=>selectStockCategory(e.target.value)}>{activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{stockSearch&&<button type="button" className="secondary" onClick={()=>setStockSearch('')}>Clear search</button>}</div><div className="countCards">{visibleCurrentItems.map(p=>{const c=getCount(p);return <article key={p.id}><button className="pubName" onClick={()=>{const value=prompt(`Enter quantity for ${p.title}`,String(c.physical));if(value!==null&&!Number.isNaN(Number(value)))setCount(p,{physical:Math.max(0,Number(value)),verified:false})}}>{p.code?`(${p.code}) `:''}{p.title}</button><div className="countRow"><strong>{c.physical}</strong><label>Done <input type="checkbox" checked={c.verified} onChange={e=>setCount(p,{verified:e.target.checked})}/><span/></label></div></article>})}{visibleCurrentItems.length===0&&<div className="emptyState">No publications match “{stockSearch}” in {currentCategory?.name}.</div>}</div><div className="wizardActions"><button className="secondary" onClick={previous}>Previous</button><button onClick={next}>{step===activeCategories.length-1?'Review':'Next'}</button></div></section>}

   {page==='stock'&&review&&<section className="reviewScreen"><div className="countIntro"><span>{periodLabel.toUpperCase()} | ENGLISH</span><h2>Review and Submit</h2><p>Confirm that the following quantities are correct and submit.</p></div>{activeCategories.map(cat=>{const items=activePublications.filter(p=>p.categoryId===cat.id&&getCount(p).physical>0);if(!items.length)return null;return <section className="reviewGroup" key={cat.id}><h3>{cat.name}</h3>{items.map(p=><div key={p.id}><span>{p.code?`(${p.code}) `:''}{p.title}</span><strong>{getCount(p).physical}</strong></div>)}</section>})}<p className="submitNote">ⓘ The report can be submitted after the end of the month.</p><div className="wizardActions"><button className="secondary" onClick={previous}>Previous</button><button onClick={()=>alert('Stock count submitted successfully.')}>Submit</button></div></section>}

   {page==='reports'&&<section className="panel"><div className="panelHead"><div><h2>{periodLabel} stock report</h2><p>{congregation?.name}</p></div></div><table><thead><tr><th>Category</th><th>Items</th><th>Total stock</th></tr></thead><tbody>{activeCategories.map(cat=>{const items=activePublications.filter(p=>p.categoryId===cat.id);return <tr key={cat.id}><td>{cat.name}</td><td>{items.length}</td><td>{items.reduce((s,p)=>s+getCount(p).physical,0).toLocaleString()}</td></tr>})}</tbody></table></section>}
   {page==='congregations'&&<section className="panel"><div className="panelHead"><div><h2>Congregations</h2><p>Add, edit, deactivate or delete congregations.</p></div><button onClick={addCongregation}>Add congregation</button></div><div className="simpleList">{congregations.map(c=><article key={c.id}><div><strong>{c.name}</strong><span>{c.active?c.status:'Inactive'}</span></div><div className="rowActions"><button onClick={()=>editCongregation(c)}>Edit</button><button onClick={()=>toggleCongregation(c)}>{c.active?'Deactivate':'Activate'}</button><button onClick={()=>deleteCongregation(c)}>Delete</button></div></article>)}</div></section>}
   {page==='publications'&&<section className="panel"><div className="panelHead"><div><h2>Categories and publications</h2><p>Add, edit, deactivate or delete literature without changing the stock-count layout.</p></div><div className="headerActions"><button onClick={addCategory}>Add category</button><button onClick={addPublication}>Add publication</button></div></div><h3>Categories</h3><div className="simpleList">{categories.map(c=><article key={c.id}><div><strong>{c.name}</strong><span>{c.active?'Active':'Inactive'} · {publications.filter(p=>p.categoryId===c.id&&p.active).length} publications</span></div><div className="rowActions"><button onClick={()=>editCategory(c)}>Edit</button><button onClick={()=>toggleCategory(c)}>{c.active?'Deactivate':'Activate'}</button></div></article>)}</div><div className="publicationTools"><input type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search publication name or code…"/><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><h3 className="sectionGap">Publications ({filteredPublications.length})</h3><div className="simpleList">{filteredPublications.map(p=><article key={p.id}><div><strong>{p.code?`(${p.code}) `:''}{p.title}</strong><span>{categories.find(c=>c.id===p.categoryId)?.name} · {p.active?'Active':'Inactive'}</span></div><div className="rowActions"><button onClick={()=>editPublication(p)}>Edit</button><button onClick={()=>togglePublication(p)}>{p.active?'Deactivate':'Activate'}</button><button onClick={()=>deletePublication(p)}>Delete</button></div></article>)}</div></section>}
   {page==='users'&&<section className="panel"><div className="emptyState">User administration will use Supabase Authentication.</div></section>}
   {page==='settings'&&<section className="panel"><div className="simpleList"><article><strong>Current period</strong><span>{periodLabel}</span></article><article><strong>Language</strong><span>English</span></article><article><strong>Database</strong><span>Supabase schema ready; browser persistence remains active for this build.</span></article></div></section>}
  </main>
 </div>
}
