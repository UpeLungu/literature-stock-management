'use client';

import { FormEvent, useEffect, useState } from 'react';

type Category={id:string;name:string;active:boolean};
type Publication={id:string;categoryId:string;code:string;title:string;opening:number;active:boolean};
type Congregation={id:string;name:string;status:'Submitted'|'In progress';active:boolean};
type Data={categories:Category[];publications:Publication[];congregations:Congregation[]};
type Dialog=
 |{kind:'category';mode:'add'|'edit';item?:Category;name:string}
 |{kind:'publication';mode:'add'|'edit';item?:Publication;categoryId:string;title:string;code:string}
 |{kind:'congregation';mode:'add'|'edit';item?:Congregation;name:string}
 |{kind:'delete-publication';item:Publication}
 |{kind:'delete-congregation';item:Congregation}
 |null;

const KEY='lms-admin-v3';
const read=():Data|null=>{try{const value=localStorage.getItem(KEY);return value?JSON.parse(value):null}catch{return null}};
const save=(data:Data)=>{localStorage.setItem(KEY,JSON.stringify(data));location.reload()};
const heading=()=>document.querySelector<HTMLElement>('.topbar h1')?.textContent?.trim()||'';
const singular=(name:string)=>({Bibles:'Bible',Books:'book','Brochures and Booklets':'brochure or booklet',Tracts:'tract','Public Magazines':'public magazine','Study Watchtower':'Study Watchtower','Meeting Workbooks':'meeting workbook','Examining the Scriptures Daily':'daily text','Forms and Supplies':'form or supply'} as Record<string,string>)[name]||name.replace(/s$/i,'')||'publication';

export default function AdminDialogControllerV2(){
 const [dialog,setDialog]=useState<Dialog>(null);const [error,setError]=useState('');
 useEffect(()=>{
  const renameAddButton=()=>{
   if(heading()!=='Publications')return;
   const data=read();if(!data)return;
   const select=document.querySelector<HTMLSelectElement>('.publicationTools select');
   const panel=select?.closest('.panel');if(!select||!panel)return;
   const button=[...panel.querySelectorAll<HTMLButtonElement>('button')].find(b=>/^Add (publication|Bible|book|brochure|tract|public magazine|Study Watchtower|meeting workbook|daily text|form)/i.test(b.textContent?.trim()||''));
   if(!button)return;
   const category=data.categories.find(c=>c.id===select.value);
   const next=category?`Add ${singular(category.name)}`:'Add publication';
   if(button.textContent!==next)button.textContent=next;
  };
  renameAddButton();const timer=window.setInterval(renameAddButton,500);
  const click=(event:MouseEvent)=>{
   const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
   const label=button.textContent?.trim()||'',page=heading(),data=read();if(!data)return;
   const stop=()=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setError('')};
   if(page==='Publications'&&label==='Add category'){stop();setDialog({kind:'category',mode:'add',name:''});return}
   if(page==='Publications'&&/^Add (?!category)/i.test(label)){stop();const select=document.querySelector<HTMLSelectElement>('.publicationTools select');const categoryId=select?.value&&select.value!=='all'?select.value:data.categories.find(c=>c.active)?.id||'';setDialog({kind:'publication',mode:'add',categoryId,title:'',code:''});return}
   if(page==='Congregations'&&label==='Add congregation'){stop();setDialog({kind:'congregation',mode:'add',name:''});return}
   const article=button.closest('article'),text=article?.querySelector('strong')?.textContent?.trim()||'';
   if(label==='Edit'&&page==='Congregations'){const item=data.congregations.find(c=>c.name===text);if(item){stop();setDialog({kind:'congregation',mode:'edit',item,name:item.name})}return}
   if(label==='Edit'&&page==='Publications'){
    const pub=data.publications.find(p=>text.includes(p.title));if(pub){stop();setDialog({kind:'publication',mode:'edit',item:pub,categoryId:pub.categoryId,title:pub.title,code:pub.code});return}
    const cat=data.categories.find(c=>c.name===text);if(cat){stop();setDialog({kind:'category',mode:'edit',item:cat,name:cat.name})}return
   }
   if(label==='Delete'&&page==='Congregations'){const item=data.congregations.find(c=>c.name===text);if(item){stop();setDialog({kind:'delete-congregation',item})}return}
   if(label==='Delete'&&page==='Publications'){const item=data.publications.find(p=>text.includes(p.title));if(item){stop();setDialog({kind:'delete-publication',item})}}
  };
  document.addEventListener('click',click,true);return()=>{clearInterval(timer);document.removeEventListener('click',click,true)};
 },[]);
 const close=()=>{setDialog(null);setError('')};
 const submit=(event:FormEvent)=>{event.preventDefault();if(!dialog)return;const data=read();if(!data)return setError('Administration data could not be loaded. Refresh and try again.');
  if(dialog.kind==='category'){const name=dialog.name.trim();if(!name)return setError('Enter a category name.');if(dialog.mode==='add')data.categories.push({id:crypto.randomUUID(),name,active:true});else data.categories=data.categories.map(x=>x.id===dialog.item?.id?{...x,name}:x)}
  if(dialog.kind==='congregation'){const name=dialog.name.trim();if(!name)return setError('Enter a congregation name.');if(dialog.mode==='add')data.congregations.push({id:crypto.randomUUID(),name,status:'In progress',active:true});else data.congregations=data.congregations.map(x=>x.id===dialog.item?.id?{...x,name}:x)}
  if(dialog.kind==='publication'){const title=dialog.title.trim();if(!title)return setError('Enter a publication title.');if(!dialog.categoryId)return setError('Select a category.');if(dialog.mode==='add')data.publications.push({id:crypto.randomUUID(),categoryId:dialog.categoryId,code:dialog.code.trim(),title,opening:0,active:true});else data.publications=data.publications.map(x=>x.id===dialog.item?.id?{...x,categoryId:dialog.categoryId,code:dialog.code.trim(),title}:x)}
  if(dialog.kind==='delete-publication')data.publications=data.publications.filter(x=>x.id!==dialog.item.id);
  if(dialog.kind==='delete-congregation')data.congregations=data.congregations.filter(x=>x.id!==dialog.item.id);
  save(data)
 };
 if(!dialog)return null;const data=read(),categories=data?.categories||[];const cat=dialog.kind==='publication'?categories.find(c=>c.id===dialog.categoryId):undefined;
 const title=dialog.kind==='publication'?`${dialog.mode==='add'?'Add':'Edit'} ${singular(cat?.name||'publication')}`:dialog.kind==='category'?`${dialog.mode==='add'?'Add':'Edit'} category`:dialog.kind==='congregation'?`${dialog.mode==='add'?'Add':'Edit'} congregation`:'Confirm deletion';
 return <div className="adminDialogBackdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><form className="adminDialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><header><div><span>Administration</span><h2 id="admin-dialog-title">{title}</h2></div><button type="button" className="adminDialogClose" onClick={close} aria-label="Close">×</button></header>
 {dialog.kind==='category'&&<label><span>Category name</span><input autoFocus value={dialog.name} onChange={e=>setDialog({...dialog,name:e.target.value})} placeholder="Enter category name"/></label>}
 {dialog.kind==='congregation'&&<label><span>Congregation name</span><input autoFocus value={dialog.name} onChange={e=>setDialog({...dialog,name:e.target.value})} placeholder="Enter congregation name"/></label>}
 {dialog.kind==='publication'&&<><label><span>Category</span><select value={dialog.categoryId} onChange={e=>setDialog({...dialog,categoryId:e.target.value})}>{categories.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span>Publication title</span><input autoFocus value={dialog.title} onChange={e=>setDialog({...dialog,title:e.target.value})} placeholder={`Enter ${singular(cat?.name||'publication')} title`}/></label><label><span>Publication code <small>Optional</small></span><input value={dialog.code} onChange={e=>setDialog({...dialog,code:e.target.value})} placeholder="For example: od, T-30 or wp25.1"/></label></>}
 {dialog.kind==='delete-publication'&&<p className="adminDialogWarning">Delete <strong>{dialog.item.title}</strong>? This removes it from the publication list.</p>}{dialog.kind==='delete-congregation'&&<p className="adminDialogWarning">Delete <strong>{dialog.item.name}</strong>? Existing historical counts remain archived.</p>}{error&&<p className="adminDialogError">{error}</p>}<footer><button type="button" className="secondary" onClick={close}>Cancel</button><button type="submit" className={dialog.kind.startsWith('delete')?'danger':''}>{dialog.kind.startsWith('delete')?'Delete':dialog.kind==='publication'&&dialog.mode==='add'?`Add ${singular(cat?.name||'publication')}`:'Save'}</button></footer></form></div>
}
