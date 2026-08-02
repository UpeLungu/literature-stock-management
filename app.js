const categories = [
  {id:'bibles',name:'Bibles',icon:'📖'},
  {id:'books',name:'Books',icon:'📚'},
  {id:'brochures',name:'Brochures & Booklets',icon:'📘'},
  {id:'tracts',name:'Tracts',icon:'📄'},
  {id:'public-magazines',name:'Public Magazines',icon:'📰'},
  {id:'study-watchtower',name:'Study Watchtower',icon:'📙'},
  {id:'meeting-workbooks',name:'Meeting Workbooks',icon:'📗'},
  {id:'daily-text',name:'Examining the Scriptures Daily',icon:'📅'},
  {id:'forms',name:'Forms & Supplies',icon:'📝'}
];

const publications = [
  ['bibles','New World Translation (Standard)',10],
  ['bibles','New World Translation (Pocket Size)',8],
  ['books','Walk Courageously',31],
  ['books','Song Books',9],
  ['books','Love People',23],
  ['books','Apply Yourself to Reading',53],
  ['books',"Organised to Do Jehovah's Will",9],
  ['books','Listen to God',68],
  ['books','Listen to God and Live Forever',26],
  ['tracts','How Do You View the Future?',332],
  ['tracts','What Is the Key to Happy Family Life?',89],
  ['tracts','How Do You View the Bible?',690],
  ['tracts',"What Is God's Kingdom?",461],
  ['tracts','Can the Dead Really Live Again?',526],
  ['tracts','Will Suffering Ever End?',361],
  ['tracts','Who Really Controls the World?',8],
  ['study-watchtower','Watchtower — April 2026',103],
  ['study-watchtower','Watchtower — May 2026',90],
  ['study-watchtower','Watchtower — June 2026',260],
  ['study-watchtower','Watchtower — July 2026',300],
  ['meeting-workbooks','January–February 2026',40],
  ['meeting-workbooks','March–April 2025',1],
  ['meeting-workbooks','March–April 2026',3],
  ['meeting-workbooks','July–August 2026',16],
  ['meeting-workbooks','September–October 2026',271],
  ['daily-text','Examining the Scriptures Daily — 2026',2],
  ['daily-text','Examining the Scriptures Daily — 2020',1],
  ['forms','Invitation — Eternal Happiness',570],
  ['brochures','Enjoy Life Forever!',0],
  ['brochures','Return to Jehovah',0],
  ['public-magazines','Awake! No. 1 2026',0],
  ['public-magazines','Watchtower Public No. 1 2026',0],
];

const congregations = [
  {id:'combined',name:'Long Ridge / Mapepe & Chilanga Central',circuit:'Lusaka South'},
  {id:'longridge',name:'Long Ridge / Mapepe',circuit:'Lusaka South'},
  {id:'chilanga',name:'Chilanga Central',circuit:'Lusaka South'},
  {id:'kabulonga',name:'Kabulonga',circuit:'Lusaka East'},
  {id:'matero',name:'Matero',circuit:'Lusaka North'}
];

const key='literature-stock-v1';
const defaultState={
  activePage:'dashboard',
  congregationId:'combined',
  period:'2026-07',
  counts:{},
  submitted:{combined:true,longridge:false,chilanga:false,kabulonga:false,matero:false}
};
let state=load();

function load(){
  try{return {...defaultState,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return structuredClone(defaultState)}
}
function save(){localStorage.setItem(key,JSON.stringify(state))}
function countKey(cong,pub){return `${cong}|${state.period}|${pub}`}
function getCount(pub,opening){
  const k=countKey(state.congregationId,pub);
  const saved=state.counts[k];
  if(saved) return saved;
  return {expected: opening,physical: opening,verified: opening>0,remarks:''};
}
function setCount(pub,data){state.counts[countKey(state.congregationId,pub)]={...getCount(pub,0),...data};save()}

const navItems=[
  ['dashboard','⌂','Dashboard'],['stock','▣','Stock Count'],['reports','▤','Reports'],['congregations','♙','Congregations'],['publications','☷','Publications'],['users','♙','Users']
];

function init(){
  document.getElementById('nav').innerHTML=navItems.map(([id,icon,label])=>`<button class="nav-btn" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join('');
  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
  const select=document.getElementById('congregationSelect');
  select.innerHTML=congregations.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  select.value=state.congregationId;
  select.onchange=e=>{state.congregationId=e.target.value;save();render()};
  document.getElementById('menuBtn').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
  render();
}

function navigate(page){state.activePage=page;save();document.querySelector('.sidebar').classList.remove('open');render()}
function setHeader(title,subtitle){document.getElementById('pageTitle').textContent=title;document.getElementById('pageSubtitle').textContent=subtitle}
function render(){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===state.activePage));
  const pages={dashboard:renderDashboard,stock:renderStock,reports:renderReports,congregations:renderCongregations,publications:renderPublications,users:renderUsers};
  (pages[state.activePage]||renderDashboard)();
}

function stats(){
  const all=publications.map(([cat,name,opening])=>getCount(name,opening));
  const verified=all.filter(x=>x.verified).length;
  return {totalPubs:publications.length,totalStock:all.reduce((a,b)=>a+Number(b.physical||0),0),verified,completion:Math.round(verified/all.length*100)};
}

function renderDashboard(){
  setHeader('Dashboard','Track literature stock across congregations');
  const s=stats();
  const completed=Object.values(state.submitted).filter(Boolean).length;
  document.getElementById('content').innerHTML=`
    <div class="grid stats">
      ${statCard('Total publications',s.totalPubs,'Active catalogue','good')}
      ${statCard('Physical stock',s.totalStock.toLocaleString(),'Current selected congregation','good')}
      ${statCard('Items verified',`${s.verified}/${s.totalPubs}`,`${s.completion}% complete`,s.completion===100?'good':'warn')}
      ${statCard('Congregations submitted',`${completed}/${congregations.length}`,'July 2026','warn')}
    </div>
    <div class="grid two-col">
      <div class="card">
        <div class="section-head"><div><h2>Literature categories</h2><p>Open a category to capture and verify quantities.</p></div><button class="btn primary" onclick="navigate('stock')">Start stock count</button></div>
        <div class="grid category-grid">${categories.map(categoryCard).join('')}</div>
      </div>
      <div class="card">
        <div class="section-head"><div><h2>Submission status</h2><p>Congregations for the selected period.</p></div></div>
        <div class="summary-list">${congregations.map(c=>`<div class="summary-item"><div><strong>${c.name}</strong><div style="color:var(--muted);font-size:12px;margin-top:3px">${c.circuit}</div></div><span class="badge ${state.submitted[c.id]?'green':'amber'}">${state.submitted[c.id]?'Submitted':'In progress'}</span></div>`).join('')}</div>
      </div>
    </div>`;
}
function statCard(label,value,trend,cls){return `<div class="stat"><small>${label}</small><strong>${value}</strong><span class="trend ${cls}">${trend}</span></div>`}
function categoryCard(c){
  const pubs=publications.filter(p=>p[0]===c.id);const done=pubs.filter(p=>getCount(p[1],p[2]).verified).length;const pct=pubs.length?Math.round(done/pubs.length*100):0;
  return `<button class="category-card" onclick="openCategory('${c.id}')"><div style="text-align:left"><h3>${c.name}</h3><p>${done} of ${pubs.length} verified</p><div class="progress"><span style="width:${pct}%"></span></div></div><div class="category-icon">${c.icon}</div></button>`
}

function renderStock(categoryId='all'){
  setHeader('Stock Count','Enter physical quantities and verify each publication');
  const catOptions=`<option value="all">All categories</option>`+categories.map(c=>`<option value="${c.id}" ${categoryId===c.id?'selected':''}>${c.name}</option>`).join('');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="section-head"><div><h2>July 2026 stock count</h2><p>${congregations.find(c=>c.id===state.congregationId)?.name}</p></div><div><button class="btn ghost" onclick="markAllDone('${categoryId}')">Mark visible items done</button> <button class="btn primary" onclick="submitInventory()">Review & submit</button></div></div>
      <div class="toolbar"><input id="stockSearch" class="search" placeholder="Search publications..."><select id="categoryFilter">${catOptions}</select></div>
      <div id="stockRows" class="stock-list"></div>
    </div>`;
  document.getElementById('categoryFilter').onchange=e=>renderStock(e.target.value);
  document.getElementById('stockSearch').oninput=e=>drawStockRows(categoryId,e.target.value);
  drawStockRows(categoryId,'');
}
function drawStockRows(categoryId,search){
  const filtered=publications.filter(([cat,name])=>(categoryId==='all'||cat===categoryId)&&name.toLowerCase().includes(search.toLowerCase()));
  const el=document.getElementById('stockRows');
  if(!filtered.length){el.innerHTML='<div class="empty">No publications found.</div>';return}
  el.innerHTML=filtered.map(([cat,name,opening])=>{
    const x=getCount(name,opening),diff=Number(x.physical||0)-Number(x.expected||0);
    return `<div class="stock-row">
      <div><h3>${name}</h3><p>${categories.find(c=>c.id===cat)?.name} · Expected ${x.expected}</p></div>
      <input class="qty" type="number" min="0" value="${x.physical}" aria-label="Physical count for ${name}" onchange="updateQty('${esc(name)}',this.value,'${categoryId}')">
      <div class="difference ${diff<0?'neg':diff>0?'pos':''}">${diff>0?'+':''}${diff}</div>
      <label class="verify"><input type="checkbox" ${x.verified?'checked':''} onchange="updateVerified('${esc(name)}',this.checked,'${categoryId}')"> Verified</label>
    </div>`
  }).join('');
}
function esc(s){return s.replaceAll("'","\\'")}
function updateQty(name,value,cat){const current=getCount(name,0);setCount(name,{...current,physical:Number(value),verified:false});drawStockRows(cat,document.getElementById('stockSearch').value)}
function updateVerified(name,checked,cat){const current=getCount(name,0);setCount(name,{...current,verified:checked});drawStockRows(cat,document.getElementById('stockSearch').value)}
function openCategory(id){state.activePage='stock';save();renderStock(id)}
function markAllDone(cat){publications.filter(p=>cat==='all'||p[0]===cat).forEach(p=>{const c=getCount(p[1],p[2]);setCount(p[1],{...c,verified:true})});renderStock(cat);toast('Visible items marked as verified')}
function submitInventory(){
  const s=stats();
  if(s.verified<s.totalPubs){modal('Inventory not complete',`You have verified ${s.verified} of ${s.totalPubs} publications. You can continue counting or submit the current progress.`,`<button class="btn ghost" onclick="closeModal()">Continue counting</button><button class="btn primary" onclick="confirmSubmit()">Submit anyway</button>`)}
  else confirmSubmit();
}
function confirmSubmit(){state.submitted[state.congregationId]=true;save();closeModal();toast('Inventory submitted successfully');navigate('dashboard')}

function renderReports(){
  setHeader('Reports','Review monthly stock and congregation progress');
  const s=stats();
  const byCat=categories.map(c=>{const ps=publications.filter(p=>p[0]===c.id);return {name:c.name,total:ps.reduce((a,p)=>a+Number(getCount(p[1],p[2]).physical||0),0)}}).filter(x=>x.total>0);
  document.getElementById('content').innerHTML=`
  <div class="grid stats">${statCard('Total stock',s.totalStock.toLocaleString(),'July 2026','good')}${statCard('Verified',`${s.completion}%`,'Selected congregation',s.completion===100?'good':'warn')}${statCard('Categories',categories.length,'Active catalogue','good')}${statCard('Submitted',state.submitted[state.congregationId]?'Yes':'No','Current period',state.submitted[state.congregationId]?'good':'warn')}</div>
  <div class="grid two-col">
    <div class="card"><div class="section-head"><div><h2>Category totals</h2><p>Physical quantity by category.</p></div><button class="btn primary" onclick="exportCsv()">Export CSV</button></div><div class="table-wrap"><table><thead><tr><th>Category</th><th>Physical stock</th></tr></thead><tbody>${byCat.map(x=>`<tr><td>${x.name}</td><td>${x.total.toLocaleString()}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="section-head"><div><h2>Congregation progress</h2><p>Current reporting month.</p></div></div><div class="summary-list">${congregations.map(c=>`<div class="summary-item"><strong>${c.name}</strong><span class="badge ${state.submitted[c.id]?'green':'amber'}">${state.submitted[c.id]?'Submitted':'Pending'}</span></div>`).join('')}</div></div>
  </div>`;
}
function exportCsv(){
  const rows=[['Category','Publication','Expected','Physical','Difference','Verified']];
  publications.forEach(([cat,name,opening])=>{const x=getCount(name,opening);rows.push([categories.find(c=>c.id===cat)?.name,name,x.expected,x.physical,Number(x.physical)-Number(x.expected),x.verified?'Yes':'No'])});
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`literature-stock-${state.congregationId}-${state.period}.csv`;a.click();URL.revokeObjectURL(a.href);toast('CSV report downloaded');
}

function renderCongregations(){
  setHeader('Congregations','Manage participating congregations');
  document.getElementById('content').innerHTML=`<div class="card"><div class="section-head"><div><h2>Congregations</h2><p>${congregations.length} configured locations</p></div><button class="btn primary" onclick="showAddCongregation()">Add congregation</button></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Circuit</th><th>July status</th></tr></thead><tbody>${congregations.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.circuit}</td><td><span class="badge ${state.submitted[c.id]?'green':'amber'}">${state.submitted[c.id]?'Submitted':'In progress'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}
function showAddCongregation(){modal('Add congregation','Prototype mode: this demonstrates the administration flow.',`<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="toast('Congregation form is ready for Supabase connection');closeModal()">Save</button>`,`<div class="form-grid"><label>Congregation name<input placeholder="e.g. Chelstone Central"></label><label>Circuit<input placeholder="e.g. Lusaka East"></label></div>`)}

function renderPublications(){
  setHeader('Publications','Manage the master literature catalogue');
  document.getElementById('content').innerHTML=`<div class="card"><div class="section-head"><div><h2>Publication catalogue</h2><p>${publications.length} publications</p></div><button class="btn primary" onclick="toast('Publication creation will save to Supabase in the connected version')">Add publication</button></div><div class="toolbar"><input class="search" id="pubSearch" placeholder="Search catalogue..."></div><div class="table-wrap"><table><thead><tr><th>Publication</th><th>Category</th><th>Status</th></tr></thead><tbody id="pubRows"></tbody></table></div></div>`;
  const draw=(q='')=>document.getElementById('pubRows').innerHTML=publications.filter(p=>p[1].toLowerCase().includes(q.toLowerCase())).map(p=>`<tr><td><strong>${p[1]}</strong></td><td>${categories.find(c=>c.id===p[0])?.name}</td><td><span class="badge green">Active</span></td></tr>`).join('');
  draw();document.getElementById('pubSearch').oninput=e=>draw(e.target.value);
}
function renderUsers(){
  setHeader('Users','Manage roles and congregation access');
  const users=[['Upe Lungu','System administrator','All congregations'],['Literature Servant','Stock counter','Long Ridge / Mapepe'],['Circuit Viewer','Circuit viewer','Lusaka South']];
  document.getElementById('content').innerHTML=`<div class="card"><div class="section-head"><div><h2>Users and roles</h2><p>Access is scoped by role and congregation.</p></div><button class="btn primary" onclick="toast('User invitations will use Supabase Authentication')">Invite user</button></div><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Access</th><th>Status</th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${u[0]}</strong></td><td>${u[1]}</td><td>${u[2]}</td><td><span class="badge green">Active</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

function modal(title,text,actions,body=''){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.id='modal';wrap.innerHTML=`<div class="modal"><h2>${title}</h2><p style="color:var(--muted)">${text}</p>${body}<div class="modal-actions">${actions}</div></div>`;document.body.appendChild(wrap)}
function closeModal(){document.getElementById('modal')?.remove()}
function toast(message){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2800)}

init();
