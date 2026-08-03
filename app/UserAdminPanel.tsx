'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type Role = 'admin' | 'literature_servant' | 'read_only';
type Profile = { id:string; full_name:string|null; role:Role; congregation_key:string|null; active:boolean; created_at:string };
type CongregationOption = { id:string; name:string; active:boolean };
const labels:Record<Role,string>={admin:'Administrator',literature_servant:'Literature Servant',read_only:'Read-only'};

export default function UserAdminPanel({congregations}:{congregations:CongregationOption[]}){
 const [profiles,setProfiles]=useState<Profile[]>([]);const [loading,setLoading]=useState(true);const [message,setMessage]=useState('');
 const load=async()=>{const supabase=getSupabaseBrowserClient();if(!supabase){setMessage('Supabase is not configured.');setLoading(false);return}setLoading(true);const{data,error}=await supabase.schema('public').from('profiles').select('id,full_name,role,congregation_key,active,created_at').order('created_at',{ascending:true});if(error)setMessage(error.message);else{setProfiles((data||[]) as Profile[]);setMessage('')}setLoading(false)};
 useEffect(()=>{void load()},[]);
 const save=async(profile:Profile,patch:Partial<Profile>)=>{const next={...profile,...patch};const admins=profiles.filter(p=>p.role==='admin'&&p.active);if(profile.role==='admin'&&profile.active&&(next.role!=='admin'||!next.active)&&admins.length===1){setMessage('You cannot remove or deactivate the only active administrator.');return}const supabase=getSupabaseBrowserClient();if(!supabase)return;setProfiles(v=>v.map(p=>p.id===profile.id?next:p));const{error}=await supabase.schema('public').from('profiles').update({role:next.role,congregation_key:next.role==='admin'?null:next.congregation_key,active:next.active,updated_at:new Date().toISOString()}).eq('id',profile.id);if(error){setMessage(error.message);await load()}else setMessage('User updated successfully.')};
 if(loading)return <section className="panel"><div className="emptyState">Loading users…</div></section>;
 return <section className="panel"><div className="panelHead"><div><h2>User administration</h2><p>Assign roles, congregations and account access.</p></div><button onClick={()=>void load()}>Refresh</button></div>{message&&<div className="emptyState">{message}</div>}<div className="simpleList">{profiles.map(p=><article key={p.id}><div><strong>{p.full_name||'Unnamed user'}</strong><span>{labels[p.role]} · {p.active?'Active':'Inactive'}{p.congregation_key?` · ${congregations.find(c=>c.id===p.congregation_key)?.name||p.congregation_key}`:''}</span></div><div className="rowActions"><select value={p.role} onChange={e=>void save(p,{role:e.target.value as Role})}><option value="admin">Administrator</option><option value="literature_servant">Literature Servant</option><option value="read_only">Read-only</option></select>{p.role!=='admin'&&<select value={p.congregation_key||''} onChange={e=>void save(p,{congregation_key:e.target.value||null})}><option value="">Assign congregation</option>{congregations.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}<button onClick={()=>void save(p,{active:!p.active})}>{p.active?'Deactivate':'Activate'}</button></div></article>)}{profiles.length===0&&<div className="emptyState">No user profiles found.</div>}</div></section>
}
