
const LOGO_PO="img/logo-pesantren-online.png";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ARX=/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+(?:[\s،؛؟ـ()«»:]*[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+)*/g;
const rich=s=>esc(s).replace(ARX,m=>`<span class="ar" dir="rtl">${m}</span>`).replace(/﴿[^﴾]{1,600}﴾/g,m=>`<span class="ayat">${m}</span>`).replace(/«[^»]{1,600}»/g,m=>`<span class="kutip">${m}</span>`);
const para=s=>String(s||"").split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>{const ls=p.split("\n");
 if(ls.length>1&&ls.slice(1).every(l=>/^\d+[.)]\s/.test(l.trim()))){return `<p>${rich(ls[0])}</p><ol class="pts">${ls.slice(1).map(l=>`<li>${rich(l.trim().replace(/^\d+[.)]\s/,""))}</li>`).join("")}</ol>`}
 if(ls.every(l=>/^\d+[.)]\s/.test(l.trim()))){return `<ol class="pts">${ls.map(l=>`<li>${rich(l.trim().replace(/^\d+[.)]\s/,""))}</li>`).join("")}</ol>`}
 return `<p>${rich(p).replace(/\n/g,"<br>")}</p>`}).join("");
const LS={get(k,d){try{const v=localStorage.getItem("mm_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("mm_"+k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem("mm_"+k)}catch(e){}}};
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>p+"-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const dayKey=(d=new Date())=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2800)}

let DATA=null, isAdmin=false, offline=false;
const S={tab:"beranda",prog:null,meet:null,q:"",mur:null,quiz:null,qs:{prog:"",bab:"all",mode:"latihan",n:"10"},adm:null};
let EDIT=null, dirty=false;
/* ---------- online (Supabase) ---------- */
const CFG=window.MAJELIS_CONFIG||{};
const SB=(CFG.supabaseUrl&&CFG.supabaseAnonKey&&!/GANTI/.test(CFG.supabaseUrl)&&window.supabase)?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
let ME=null, SESSION=null, PROFIL=null;
const LIVE={papan:[],tanya:[],rekap:[],papanAt:0,tanyaAt:0};
S.jw={};S.tanya="";
function summary(){
 const sc=LS.get("scores",[]), d=LS.get("done",{}), st=srs();
 const hafal=Object.values(st).filter(r=>r.box>=3).length, benar=sc.reduce((a,x)=>a+x.b,0), selesai=Object.keys(d).length;
 const prog={};progs().forEach(p=>{const x=progDone(p);prog[p.id]={selesai:x.n,total:x.t}});
 return {poin:benar+selesai*5+hafal*2,selesai,latihan:sc.length,rata:avgScore(),hafal,beruntun:streak(),program:prog};
}
let syncT;
function syncMe(){if(!SB||!ME||!PROFIL)return;clearTimeout(syncT);syncT=setTimeout(async()=>{const s=summary();const nama=LS.get("nama","")||PROFIL.nama;
 if(JSON.stringify(s)===JSON.stringify(PROFIL.ringkasan)&&nama===PROFIL.nama)return;
 const {error}=await SB.from("peserta").update({ringkasan:s,nama,aktif:new Date().toISOString()}).eq("id",ME);if(!error){PROFIL.ringkasan=s;PROFIL.nama=nama}},1500)}
async function loadPapan(force){if(!SB||(!force&&Date.now()-LIVE.papanAt<60e3))return;LIVE.papanAt=Date.now();const {data}=await SB.rpc("papan_semangat");if(data){LIVE.papan=data;if(S.tab==="beranda")render()}}
async function loadTanya(force){if(!SB||(!force&&Date.now()-LIVE.tanyaAt<20e3))return;LIVE.tanyaAt=Date.now();const {data}=await SB.from("tanya").select("*").order("created_at",{ascending:false}).limit(500);if(data){LIVE.tanya=data;if(S.tab==="materi"||S.tab==="kelola")render()}}
async function loadRekap(){if(!SB||!isAdmin)return;const {data}=await SB.from("peserta").select("*").order("aktif",{ascending:false});if(data){LIVE.rekap=data;if(S.tab==="kelola")render()}}
const fmtAgo=t=>{t=typeof t==="string"?Date.parse(t):t;const m=Math.round((Date.now()-t)/6e4);return m<1?"baru saja":m<60?m+" menit lalu":m<1440?Math.round(m/60)+" jam lalu":new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"short"})};
function leaderboard(n){
 if(!SB||DATA.papanPeringkat===false)return "";loadPapan();
 const rows=LIVE.papan.slice(0,n);if(!rows.length)return "";
 return `<section class="stack"><div class="sec-h"><h2>Papan semangat</h2><span class="small muted">poin dari latihan, materi & hafalan</span></div><div class="card flat" style="padding:2px 16px">${rows.map((p,i)=>`<div class="lb r${i+1} ${p.id===ME?"me":""}"><span class="rk">${i+1}</span><span class="nm">${esc(p.nama)}${p.id===ME?" <span class=\"pill good\">antum</span>":""}</span><span class="small muted">${p.beruntun||0} hari</span><b>${p.poin}</b></div>`).join("")}</div></section>`;
}
function viewTanya(p,m){
 if(!SB)return "";loadTanya();
 const list=LIVE.tanya.filter(q=>q.mid===m.id);
 return `<section class="card stack"><div class="sec-h"><h2>Tanya ustadz</h2><span class="pill">${list.length}</span></div>
  ${list.map(q=>`<div class="qa"><div class="who">${esc(q.nama||"Peserta")}${q.user_id===ME?" (antum)":""} · ${fmtAgo(q.created_at)}</div><div>${rich(q.teks)}</div>
   ${q.jawaban?`<div class="ans"><div class="who">Jawaban ustadz</div><div class="prose">${para(q.jawaban)}</div></div>`:`<span class="small muted">Menunggu jawaban</span>`}
   ${isAdmin?`<div class="field"><label for="jw-${q.id}">${q.jawaban?"Ubah jawaban":"Jawab pertanyaan ini"}</label><textarea id="jw-${q.id}" data-jw="${q.id}" rows="3">${esc(S.jw[q.id]??(q.jawaban||""))}</textarea></div><div class="row"><button class="btn sm pri" data-act="jawab" data-v="${q.id}">Kirim jawaban</button><button class="btn sm danger" data-act="hapus-tanya" data-v="${q.id}">Hapus</button></div>`:q.user_id===ME&&!q.jawaban?`<div><button class="btn sm ghost" data-act="hapus-tanya" data-v="${q.id}">Tarik pertanyaan</button></div>`:""}
  </div>`).join("")||`<div class="small muted">Belum ada pertanyaan untuk pertemuan ini.</div>`}
  ${ME?`<div class="field"><label for="in-tanya">Ada yang belum jelas? Tanyakan di sini</label><textarea id="in-tanya" rows="3" placeholder="Tulis pertanyaan antum…">${esc(S.tanya)}</textarea></div><div><button class="btn sm pri" data-act="kirim-tanya" data-p="${p.id}" data-v="${m.id}">Kirim pertanyaan</button></div>`
   :`<div class="small muted">Masuk terlebih dahulu untuk bertanya.</div>`}
 </section>`;
}
async function kirimTanya(pid,mid){const teks=S.tanya.trim();if(teks.length<5){toast("Pertanyaan terlalu pendek");return}
 const {error}=await SB.from("tanya").insert({pid,mid,teks:teks.slice(0,2000),nama:LS.get("nama","")||(PROFIL&&PROFIL.nama)||"Peserta"});
 if(error){toast("Pertanyaan belum terkirim. Coba lagi.");return}S.tanya="";toast("Pertanyaan terkirim");loadTanya(true)}
async function hapusTanya(id){const {error}=await SB.from("tanya").delete().eq("id",id);toast(error?"Gagal menghapus":"Pertanyaan dihapus");loadTanya(true)}
async function kirimJawab(id){const q=LIVE.tanya.find(x=>x.id===id);const teks=(S.jw[id]??(q&&q.jawaban)??"").trim();if(!teks){toast("Tulis jawabannya dulu");return}
 const {error}=await SB.from("tanya").update({jawaban:teks.slice(0,5000),dijawab_at:new Date().toISOString()}).eq("id",id);
 if(error){toast("Jawaban gagal dikirim");return}delete S.jw[id];toast("Jawaban terkirim");loadTanya(true)}

/* ---------- masuk ---------- */
function viewMasuk(){
 return `<section class="greet fade" style="text-align:center"><img class="hero-emblem" src="img/logo-emblem.png" alt="Logo Majelis Mudzakaroh"><div class="salam" dir="rtl">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div><h1>Ahlan wa sahlan di Majelis Mudzakaroh</h1><div class="dates">Tempat belajar, murojaah, dan latihan soal peserta kajian Rumah Dakwah Malang.</div></section>
 ${S.adminLogin?`<form class="card stack" data-form="admin"><b>Masuk sebagai pengelola</b><div class="field"><label for="ad-email">Email</label><input id="ad-email" type="email" autocomplete="username" required></div><div class="field"><label for="ad-pass">Kata sandi</label><input id="ad-pass" type="password" autocomplete="current-password" required></div><button class="btn pri block" type="submit">Masuk</button><button class="btn ghost block" type="button" data-act="adm-toggle">Kembali ke masuk peserta</button></form>`
 :`<form class="card stack" data-form="masuk"><b>Masuk sebagai peserta</b><div class="field"><label for="ms-nama">Nama lengkap</label><input id="ms-nama" required maxlength="60" autocomplete="name" placeholder="Contoh: Ahmad Fauzan" value="${esc(LS.get("nama",""))}"></div><div class="field"><label for="ms-wa">Nomor WhatsApp</label><input id="ms-wa" required inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" value="${esc(LS.get("wa",""))}"></div><button class="btn pri block" type="submit">Masuk</button><div class="small muted">Nomor WA hanya dilihat pengelola untuk rekap kehadiran dan nilai.</div></form>
 <button class="btn ghost block" data-act="adm-toggle">Saya pengelola majelis</button>`}
 ${doa()}`;
}
async function masukPeserta(nama,wa){
 wa=wa.replace(/[^\d+]/g,"");if(nama.length<3||wa.length<9){toast("Isi nama dan nomor WA dengan benar");return}
 let {data:{session}}=await SB.auth.getSession();
 if(!session){const r=await SB.auth.signInAnonymously();if(r.error){toast("Belum bisa masuk: "+r.error.message);return}session=r.data.session}
 ME=session.user.id;SESSION=session;
 const row={id:ME,nama,wa,ringkasan:summary(),aktif:new Date().toISOString()};
 const {data,error}=await SB.from("peserta").upsert(row).select().maybeSingle();
 if(error){toast("Data peserta belum tersimpan: "+error.message);return}
 PROFIL=data||row;LS.set("nama",nama);LS.set("wa",wa);S.tab="beranda";toast("Ahlan wa sahlan, "+nama);render(true);
}
async function masukAdmin(email,pass){
 const {data,error}=await SB.auth.signInWithPassword({email,password:pass});
 if(error){toast("Email atau kata sandi salah");return}
 SESSION=data.session;ME=data.user.id;const r=await SB.rpc("is_admin");isAdmin=!!r.data;
 if(!isAdmin){toast("Akun ini belum terdaftar sebagai pengelola");return}
 S.adminLogin=false;S.tab="kelola";toast("Masuk sebagai pengelola");loadRekap();render(true);
}
async function keluar(){if(SB)await SB.auth.signOut();ME=null;SESSION=null;PROFIL=null;isAdmin=false;EDIT=null;S.tab="masuk";render(true)}

/* ---------- sertifikat ---------- */
const loadImg=src=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=src});
async function makeCert(p){
 const nama=LS.get("nama","").trim();const W=1600,H=1131;const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
 try{await Promise.all(['800 64px "Plus Jakarta Sans"','600 28px "Plus Jakarta Sans"','700 80px Amiri','400 40px Amiri'].map(f=>document.fonts.load(f,"Aaشهادة")))}catch(e){}
 const J='"Plus Jakarta Sans",system-ui,sans-serif',A='Amiri,"Traditional Arabic",serif';
 g.fillStyle="#FBFCF7";g.fillRect(0,0,W,H);
 g.fillStyle="#0C3A24";g.fillRect(0,0,W,190);
 g.save();g.globalAlpha=.08;g.strokeStyle="#fff";g.lineWidth=2;for(let x=28;x<W;x+=56)for(let y=28;y<190;y+=56){g.strokeRect(x-12,y-12,24,24);g.save();g.translate(x,y);g.rotate(Math.PI/4);g.strokeRect(-12,-12,24,24);g.restore()}g.restore();
 const full=await loadImg("img/logo-rumah-dakwah.png"), em=await loadImg("img/logo-emblem.png"), po=await loadImg(LOGO_PO);
 const lh=110,lw=full.width*lh/full.height;g.drawImage(full,80,40,lw,lh);
 g.fillStyle="#F5C400";g.font=`700 22px ${J}`;g.textAlign="right";g.fillText("MAJELIS MUDZAKAROH",W-80,90);g.fillStyle="#CFE3BE";g.font=`500 20px ${J}`;g.fillText("Pesantren Online Rumah Dakwah Malang",W-80,124);
 g.strokeStyle="#6A9E2F";g.lineWidth=4;g.strokeRect(40,220,W-80,H-260);g.strokeStyle="#F5C400";g.lineWidth=1.5;g.strokeRect(54,234,W-108,H-288);
 g.textAlign="center";g.fillStyle="#006F3C";g.font=`700 76px ${A}`;g.fillText("شَهَادَةُ إِتْمَامٍ",W/2,340);
 g.fillStyle="#13261A";g.font=`800 30px ${J}`;g.fillText("S E R T I F I K A T   P E N Y E L E S A I A N",W/2,395);
 g.fillStyle="#5A6B5D";g.font=`500 28px ${J}`;g.fillText("Dengan memohon taufik dari Allah, diberikan kepada",W/2,470);
 g.fillStyle="#0C3A24";let fs=78;g.font=`800 ${fs}px ${J}`;while(g.measureText(nama).width>W-300&&fs>40){fs-=4;g.font=`800 ${fs}px ${J}`}g.fillText(nama,W/2,570);
 g.strokeStyle="#F5C400";g.lineWidth=3;g.beginPath();g.moveTo(W/2-260,600);g.lineTo(W/2+260,600);g.stroke();
 g.fillStyle="#5A6B5D";g.font=`500 28px ${J}`;g.fillText("yang telah menyelesaikan seluruh pertemuan program kajian",W/2,660);
 g.fillStyle="#006F3C";g.font=`800 54px ${J}`;g.fillText(p.nama,W/2,735);
 if(p.arab){g.font=`700 50px ${A}`;g.fillStyle="#6A9E2F";g.fillText(p.arab,W/2,800)}
 const avg=avgScore();const tgl=new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});const hj=hijri();
 g.fillStyle="#5A6B5D";g.font=`500 24px ${J}`;g.fillText(`${(p.pertemuan||[]).length} pertemuan${p.kitab?" · "+p.kitab.replace(/^Contoh:\s*/,""):""}`.slice(0,110),W/2,860);
 g.textAlign="left";g.fillStyle="#13261A";g.font=`700 24px ${J}`;g.fillText("Malang, "+tgl,120,980);g.fillStyle="#5A6B5D";g.font=`500 22px ${J}`;g.fillText(hj?hj:"",120,1014);
 if(avg!=null){g.fillText("Rata-rata nilai latihan: "+avg+"%",120,1046)}
 g.fillStyle="#fff";g.beginPath();g.arc(W/2-90,1000,72,0,7);g.fill();g.drawImage(em,W/2-90-52,1000-52,104,104*em.height/em.width);g.drawImage(po,W/2+20,935,130,130);
 g.textAlign="right";g.fillStyle="#13261A";g.font=`700 24px ${J}`;g.fillText(p.pengajar&&!/silakan/i.test(p.pengajar)?p.pengajar:"Pengampu kajian",W-120,1014);g.strokeStyle="#13261A";g.lineWidth=1.5;g.beginPath();g.moveTo(W-420,980);g.lineTo(W-120,980);g.stroke();g.fillStyle="#5A6B5D";g.font=`500 20px ${J}`;g.fillText("Pengajar",W-120,1046);
 return c;
}
function viewCert(){const p=findProg(S.cert);if(!p){S.cert=null;return viewMateri()}const nama=LS.get("nama","").trim();
 return `<button class="back" data-act="cert-close">← ${esc(p.nama)}</button>
 <section class="phead"><div class="eyebrow">Sertifikat penyelesaian</div><h1>Maa syaa Allah, antum telah menyelesaikan ${esc(p.nama)}</h1></section>
 ${nama?`<img class="cert-img" id="cert-img" alt="Sertifikat ${esc(p.nama)} atas nama ${esc(nama)}" src="${S.certUrl||""}" ${S.certUrl?"":"hidden"}><div class="empty" id="cert-wait" ${S.certUrl?"hidden":""}>Menyiapkan sertifikat…</div>
  <button class="btn gold block" data-act="cert-dl" ${S.certUrl?"":"disabled"}>Unduh sertifikat (PNG)</button><div class="small muted">Nama di sertifikat diambil dari Profil. Ubah di sana bila perlu.</div>`
 :`<form class="card stack" data-form="nama"><b>Tulis nama lengkap antum untuk sertifikat</b><input id="in-nama3" class="search" placeholder="Nama lengkap"><button class="btn pri" type="submit">Simpan & buat sertifikat</button></form>`}`}
async function buildCert(){const p=findProg(S.cert);if(!p||!LS.get("nama",""))return;try{const c=await makeCert(p);S.certUrl=c.toDataURL("image/png");S.certCanvas=c}catch(e){toast("Sertifikat gagal dibuat")}render()}

/* ---------- data helpers ---------- */
const progs=()=>(DATA&&DATA.program)||[];
const findProg=id=>progs().find(p=>p.id===id);
const findMeet=(pid,mid)=>{const p=findProg(pid);return p&&(p.pertemuan||[]).find(m=>m.id===mid)};
function allCards(filter){const out=[];progs().forEach(p=>(p.pertemuan||[]).forEach(m=>(m.kartu||[]).forEach(k=>{if(!filter||filter(p,m))out.push({...k,pid:p.id,mid:m.id,bab:m.judul,prog:p.nama})})));return out}
function allSoal(filter){const out=[];progs().forEach(p=>(p.pertemuan||[]).forEach(m=>(m.soal||[]).forEach(s=>{if(!filter||filter(p,m))out.push({...s,pid:p.id,mid:m.id,bab:m.judul})})));return out}
const srs=()=>LS.get("srs",{});
const isDue=(id,st)=>{const r=st[id];return !r||r.due<=Date.now()};
function dueCards(){const st=srs();return allCards().filter(c=>isDue(c.id,st))}
function streak(){const s=LS.get("streak",{last:"",n:0});const y=new Date();y.setDate(y.getDate()-1);if(s.last===dayKey()||s.last===dayKey(y))return s.n;return 0}
function bumpStreak(){const s=LS.get("streak",{last:"",n:0});const t=dayKey();if(s.last===t)return;const y=new Date();y.setDate(y.getDate()-1);s.n=s.last===dayKey(y)?s.n+1:1;s.last=t;LS.set("streak",s)}
function avgScore(){const h=LS.get("scores",[]);if(!h.length)return null;return Math.round(h.reduce((a,x)=>a+x.b/x.t,0)/h.length*100)}
function progDone(p){const d=LS.get("done",{});const ms=p.pertemuan||[];const n=ms.filter(m=>d[m.id]).length;return{n,t:ms.length,pct:ms.length?Math.round(n/ms.length*100):0}}

/* ---------- icons ---------- */
const IC={
 home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
 book:'<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/>',
 cards:'<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
 quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 yt:'<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>',
 drive:'<path d="M8 3h8l6 10-4 7H6l-4-7z"/><path d="M8 3l6 10H2M16 3 10 13M22 13H10l-4 7"/>',
 file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 check:'<path d="m5 12 5 5 9-10"/>'
};
const svg=(k,s="currentColor")=>`<svg viewBox="0 0 24 24" fill="none" stroke="${s}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

/* ---------- nav ---------- */
const TABS=[["beranda","Beranda","home"],["materi","Materi","book"],["murojaah","Murojaah","cards"],["latihan","Latihan","quiz"],["profil","Profil","user"]];
function renderNav(){$(".nav").hidden=S.tab==="masuk";const due=DATA?dueCards().length:0;$("#nav").innerHTML=TABS.map(([k,l,i])=>`<button data-act="tab" data-v="${k}" class="${S.tab===k?"on":""}" aria-current="${S.tab===k?"page":"false"}"><span class="dot" ${k==="murojaah"&&due?`data-n="${due>99?"99+":due}"`:""}>${svg(i)}</span>${l}</button>`).join("");
 $("#toptag").innerHTML=isAdmin&&S.tab!=="kelola"?`<button class="kelola-btn" data-act="tab" data-v="kelola">Kelola</button>`:``}

/* ---------- beranda ---------- */
function salamWaktu(){const h=new Date().getHours();return h<11?"Selamat pagi":h<15?"Selamat siang":h<18?"Selamat sore":"Selamat malam"}
const BULAN_H=["Muharram","Shafar","Rabi'ul Awwal","Rabi'ul Akhir","Jumadil Ula","Jumadil Akhirah","Rajab","Sya'ban","Ramadhan","Syawwal","Dzulqa'dah","Dzulhijjah"];
function hijriParts(dt){
 try{const f=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura",{day:"numeric",month:"numeric",year:"numeric"});
  if(/islamic/.test(f.resolvedOptions().calendar)){const p={};f.formatToParts(dt).forEach(x=>p[x.type]=parseInt(x.value,10));if(p.day&&p.month&&p.year&&p.year>1300&&p.year<1600)return [p.day,p.month,p.year]}}catch(e){}
 // Tabel Umm al-Qura (awal bulan Hijriah 1439/5 dst.; 1 = 30 hari, 0 = 29 hari)
 const UQ="101010010101110101001010110110100101010110101010101010110101100101010111010010010111011001001011101010100101101101010010101101101010010101101110010011011011001001011011010100101011011010100101101011010010101011101001001011110100100101110110010010110110101001010110101011001010110101100101010111010100100111011010010011011101000101101101100101010";
 const day=Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/864e5);
 let start=17549,hy=1439,hm=5;
 if(day>=start){for(let k=0;k<UQ.length;k++){const len=UQ[k]==="1"?30:29;if(day<start+len)return [day-start+1,hm,hy];start+=len;hm++;if(hm>12){hm=1;hy++}}}
 const y=dt.getFullYear(),m=dt.getMonth()+1,d=dt.getDate();
 const jd=Math.floor((1461*(y+4800+Math.floor((m-14)/12)))/4)+Math.floor((367*(m-2-12*Math.floor((m-14)/12)))/12)-Math.floor((3*Math.floor((y+4900+Math.floor((m-14)/12))/100))/4)+d-32075;
 let l=jd-1948440+10632;const n=Math.floor((l-1)/10631);l=l-10631*n+354;
 const j=Math.floor((10985-l)/5316)*Math.floor((50*l)/17719)+Math.floor(l/5670)*Math.floor((43*l)/15238);
 l=l-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;
 const tm=Math.floor((24*l)/709),td=l-Math.floor((709*tm)/24),ty=30*n+j-30;return [td,tm,ty];
}
function hijri(dt=new Date()){try{const [d,m,y]=hijriParts(dt);return `${d} ${BULAN_H[m-1]} ${y} H`}catch(e){return ""}}
function fmtWaktu(iso){try{const d=new Date(iso);return d.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"})+" · "+d.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}catch(e){return iso}}
function viewBeranda(){
 const nama=LS.get("nama",""), due=dueCards().length, avg=avgScore();
 const totalM=progs().reduce((a,p)=>a+(p.pertemuan||[]).length,0), doneN=Object.keys(LS.get("done",{})).length;
 const last=LS.get("last",null), lm=last&&findMeet(last.pid,last.mid), lp=last&&findProg(last.pid);
 const up=(DATA.jadwal||[]).filter(j=>new Date(j.waktu).getTime()>Date.now()-3*36e5).sort((a,b)=>a.waktu.localeCompare(b.waktu));
 const masehi=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 return `
 <section class="greet fade">
  <div class="salam" dir="rtl">السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ</div>
  <h1>${salamWaktu()}${nama?", "+esc(nama):""}</h1>
  <div class="dates">${esc(masehi)}${hijri()?" · "+esc(hijri()):""}</div>
  ${nama?"":`<form class="namebox" data-form="nama"><input id="in-nama" placeholder="Tulis nama antum" aria-label="Nama"><button class="btn gold sm" type="submit">Simpan</button></form>`}
 </section>
 <section class="stats">
  <div class="stat"><b>${streak()}</b><span>hari beruntun</span></div>
  <div class="stat"><b>${due}</b><span>kartu murojaah</span></div>
  <div class="stat"><b>${avg==null?"–":avg+"%"}</b><span>rata-rata nilai</span></div>
  <div class="stat"><b>${doneN}/${totalM}</b><span>materi selesai</span></div>
 </section>
 ${lm?`<section class="card tap" data-act="open" data-p="${lp.id}" data-m="${lm.id}" tabindex="0"><div class="eyebrow">Lanjutkan belajar</div><div class="meet" style="margin-top:8px"><div class="no">${(lp.pertemuan.indexOf(lm))+1}</div><div class="t"><h3>${rich(lm.judul)}</h3><div class="small muted">${esc(lp.nama)}</div></div></div></section>`:""}
 ${due?`<section class="card flat" style="background:var(--warn-bg);border-color:var(--gold)"><div class="row" style="justify-content:space-between"><div><b>Murojaah hari ini</b><div class="small muted">${due} kartu menunggu diulang. Cukup 5 menit.</div></div><button class="btn gold sm" data-act="mur-start" data-v="quick">Mulai</button></div></section>`:""}
 ${up.length?`<section class="stack"><div class="sec-h"><h2>Jadwal kajian</h2></div>${up.slice(0,3).map(j=>`<div class="card flat row" style="flex-wrap:nowrap"><div class="lcard" style="border:0;padding:0;background:none"><span class="ic" style="background:var(--surface-2);color:var(--forest)">${svg("cal")}</span></div><div style="flex:1;min-width:0"><b>${rich(j.judul)}</b><div class="small muted">${esc(fmtWaktu(j.waktu))}${j.tempat?" · "+esc(j.tempat):""}</div>${j.link?`<a class="small" href="${esc(j.link)}" target="_blank" rel="noopener">Buka tautan kajian</a>`:""}</div></div>`).join("")}</section>`:""}
 ${(DATA.pengumuman||[]).length?`<section class="stack"><div class="sec-h"><h2>Pengumuman</h2></div>${DATA.pengumuman.slice(0,3).map(a=>`<div class="card flat"><div class="row" style="justify-content:space-between"><b>${rich(a.judul)}</b><span class="pill">${esc(a.tanggal||"")}</span></div><div class="small prose" style="margin-top:6px">${para(a.isi)}</div></div>`).join("")}</section>`:""}
 ${leaderboard(5)}
 <section class="stack"><div class="sec-h"><h2>Program kajian</h2><button class="lnk" data-act="tab" data-v="materi">Semua materi</button></div>
  ${progs().map(progCard).join("")||`<div class="empty">Belum ada program kajian.</div>`}
 </section>
 ${doa()}`;
}
function progCard(p){const d=progDone(p);return `<div class="card tap prog" data-act="prog" data-v="${p.id}" tabindex="0"><div class="badge" style="background:${esc(p.warna||"#6A9E2F")}">${esc((p.arab||p.nama).split(" ")[0])}</div><div class="t"><h3>${esc(p.nama)} ${p.arab?`<span class="ar" dir="rtl" style="color:var(--muted);font-weight:400">${esc(p.arab)}</span>`:""}</h3><div class="small muted">${d.t} pertemuan${p.pengajar?" · "+esc(p.pengajar):""}</div><div class="bar"><i style="width:${d.pct}%"></i></div></div></div>`}
function doa(){return `<section class="doa"><div class="ar" dir="rtl">رَبِّ زِدْنِي عِلْمًا</div><div class="small muted">“Ya Rabbku, tambahkanlah kepadaku ilmu.” (Thaha: 114)</div><div class="mitra-cap">Diselenggarakan oleh</div><div class="mitra"><img class="m-rd" src="img/logo-rumah-dakwah-gelap.png" alt="Rumah Dakwah Malang"><span class="m-sep"></span><img class="m-po" src="${LOGO_PO}" alt="Pesantren Online Rumah Dakwah Malang"></div></section>`}

/* ---------- materi ---------- */
function viewMateri(){
 if(S.cert)return viewCert();
 if(S.meet)return viewMeet();
 const ps=progs(); if(!ps.length)return `<div class="empty">Belum ada program kajian.</div>`;
 if(!S.prog||!findProg(S.prog))S.prog=ps[0].id;
 const p=findProg(S.prog), done=LS.get("done",{}), q=S.q.trim().toLowerCase();
 let list=(p.pertemuan||[]).map((m,i)=>({m,i}));
 if(q)list=list.filter(({m})=>(m.judul+" "+(m.arab||"")+" "+(m.ringkasan||"")).toLowerCase().includes(q));
 const d=progDone(p);
 return `
 ${ps.length>1?`<div class="chips">${ps.map(x=>`<button class="chip ${x.id===p.id?"on":""}" data-act="prog" data-v="${x.id}">${esc(x.nama)}</button>`).join("")}</div>`:""}
 <section class="phead fade">
  ${p.arab?`<div class="arbig">${esc(p.arab)}</div>`:""}
  <h1>${esc(p.nama)}</h1>
  ${p.deskripsi?`<p class="muted just" style="margin:6px 0 0">${rich(p.deskripsi)}</p>`:""}
  <div class="stack small" style="margin-top:12px;gap:4px">
   ${p.kitab?`<div><span class="muted">Kitab:</span> ${rich(p.kitab)}</div>`:""}
   ${p.kitabPdf?`<div style="margin-top:8px"><a class="btn sm" href="${esc(p.kitabPdf)}" target="_blank" rel="noopener">${svg("file").replace('<svg','<svg width="16" height="16"')} Buka kitab (PDF)</a></div>`:""}
   ${p.pengajar?`<div><span class="muted">Pengajar:</span> ${esc(p.pengajar)}</div>`:""}
  </div>
  <div class="bar"><i style="width:${d.pct}%"></i></div><div class="small muted" style="margin-top:4px">${d.n} dari ${d.t} pertemuan selesai</div>
  ${d.t&&d.pct===100?`<button class="btn gold block" style="margin-top:12px" data-act="cert" data-v="${p.id}">Lihat sertifikat penyelesaian</button>`:d.t?`<div class="small muted" style="margin-top:4px">Selesaikan semua pertemuan untuk mendapat sertifikat.</div>`:""}
 </section>
 <input class="search" id="in-cari" type="search" placeholder="Cari materi…" value="${esc(S.q)}" aria-label="Cari materi">
 <section class="stack">
  ${list.map(({m,i})=>`<div class="card tap meet ${done[m.id]?"done":""}" data-act="open" data-p="${p.id}" data-m="${m.id}" tabindex="0"><div class="no">${done[m.id]?svg("check","#fff").replace('<svg','<svg width="16" height="16"'):i+1}</div><div class="t"><h3>${rich(m.judul)}</h3>${m.arab?`<div class="ar" dir="rtl" style="color:var(--muted);font-size:1.1em">${esc(m.arab)}</div>`:""}<div class="row small muted" style="gap:6px;margin-top:4px">${m.hal?`<span class="pill gold">Hal. ${esc(String(m.hal).replace(/\s*\(.*\)/,""))}</span>`:""}${m.youtube?`<span class="pill">Video</span>`:""}${m.drive?`<span class="pill">Drive</span>`:""}${(m.berkas||[]).length?`<span class="pill">${m.berkas.length} berkas</span>`:""}${(m.kartu||[]).length?`<span class="pill">${m.kartu.length} kartu</span>`:""}${(m.soal||[]).length?`<span class="pill">${m.soal.length} soal</span>`:""}</div></div></div>`).join("")||`<div class="empty">Tidak ada materi yang cocok.</div>`}
 </section>`;
}
function viewMeet(){
 const p=findProg(S.meet.pid), m=findMeet(S.meet.pid,S.meet.mid); if(!m){S.meet=null;return viewMateri()}
 const i=p.pertemuan.indexOf(m), done=LS.get("done",{})[m.id], note=LS.get("notes",{})[m.id]||"";
 const prev=p.pertemuan[i-1], next=p.pertemuan[i+1];
 return `
 <button class="back" data-act="back">← ${esc(p.nama)}</button>
 <section class="phead fade">
  <div class="eyebrow">Pertemuan ${i+1}${m.hal?" · Hal. "+esc(m.hal):""}</div>
  ${m.arab?`<div class="arbig">${esc(m.arab)}</div>`:""}
  <h1>${rich(m.judul)}</h1>
 </section>
 <section class="linkrow">
  ${m.youtube?`<a class="lcard" href="${esc(m.youtube)}" target="_blank" rel="noopener"><span class="ic" style="background:#FDE3E0;color:#C4302B">${svg("yt")}</span><span style="min-width:0">Tonton video<small>YouTube</small></span></a>`:""}
  ${m.drive?`<a class="lcard" href="${esc(m.drive)}" target="_blank" rel="noopener"><span class="ic" style="background:#E3EEFB;color:#1E64C8">${svg("drive")}</span><span style="min-width:0">Buka materi<small>Google Drive</small></span></a>`:""}
  ${p.kitabPdf?`<a class="lcard" href="${esc(p.kitabPdf)}${m.hal&&parseInt(m.hal)?"#page="+(parseInt(m.hal)+(+p.kitabOffset||0)):""}" target="_blank" rel="noopener"><span class="ic" style="background:var(--warn-bg);color:var(--orange)">${svg("book")}</span><span style="min-width:0">Buka kitab<small>${m.hal?"Hal. "+esc(String(m.hal).replace(/\s*\(.*\)/,"")):"PDF"}</small></span></a>`:""}
  ${(m.berkas||[]).map(b=>`<a class="lcard" href="${esc(b.url)}" target="_blank" rel="noopener"><span class="ic" style="background:var(--surface-2);color:var(--forest)">${svg("file")}</span><span style="min-width:0">${esc(b.nama)}<small>Berkas materi</small></span></a>`).join("")}
 </section>
 ${m.ringkasan?`<section class="card ringkas"><div class="eyebrow" style="margin-bottom:12px">Ringkasan materi</div><div class="prose">${para(m.ringkasan)}</div></section>`:""}
 <section class="grid2">
  <button class="btn" data-act="mur-start" data-v="${p.id}:${m.id}" ${(m.kartu||[]).length?"":"disabled"}>${svg("cards").replace('<svg','<svg width="18" height="18"')} Murojaah bab ini</button>
  <button class="btn" data-act="quiz-bab" data-p="${p.id}" data-m="${m.id}" ${(m.soal||[]).length?"":"disabled"}>${svg("quiz").replace('<svg','<svg width="18" height="18"')} Latihan bab ini</button>
 </section>
 <button class="btn block ${done?"":"pri"}" data-act="done" data-v="${m.id}">${done?"✓ Sudah dipelajari — tandai belum":"Tandai sudah dipelajari"}</button>
 ${viewTanya(p,m)}
 <section class="field"><label for="in-note">Catatan pribadi (tersimpan di HP antum)</label><textarea class="note" id="in-note" data-mid="${m.id}" placeholder="Tulis faedah yang antum dapat…">${esc(note)}</textarea></section>
 <section class="grid2">
  ${prev?`<button class="btn ghost" data-act="open" data-p="${p.id}" data-m="${prev.id}">← Sebelumnya</button>`:"<span></span>"}
  ${next?`<button class="btn ghost" data-act="open" data-p="${p.id}" data-m="${next.id}">Berikutnya →</button>`:""}
 </section>`;
}

/* ---------- murojaah ---------- */
function startMur(scope){
 let cards;
 if(scope==="quick")cards=dueCards().slice(0,15);
 else if(scope==="today")cards=dueCards();
 else if(scope==="all")cards=allCards();
 else{const [pid,mid]=scope.split(":");cards=allCards((p,m)=>p.id===pid&&m.id===mid)}
 if(!cards.length){toast("Tidak ada kartu untuk diulang sekarang");return}
 S.mur={queue:shuffle(cards),total:cards.length,done:0,flip:false,res:[0,0,0]};S.tab="murojaah";S.meet=null;render(true);
}
function rateCard(r){
 const m=S.mur, c=m.queue.shift(), st=srs(), cur=st[c.id]||{box:0};
 const DAYS=[0,1,3,7,14,30,60];
 if(r===0){cur.box=0;cur.due=Date.now();m.queue.splice(Math.min(3,m.queue.length),0,c)}
 else if(r===1){cur.box=Math.max(1,cur.box);cur.due=Date.now()+864e5;m.done++}
 else{cur.box=Math.min(6,cur.box+1);cur.due=Date.now()+DAYS[cur.box]*864e5;m.done++}
 m.res[r]++;st[c.id]=cur;LS.set("srs",st);m.flip=false;
 if(!m.queue.length){bumpStreak();m.finished=true;syncMe()}
 render();
}
function viewMurojaah(){
 const m=S.mur;
 if(m&&!m.finished){const c=m.queue[0];return `
  <div class="row" style="justify-content:space-between"><button class="back" data-act="mur-exit">← Selesai dulu</button><span class="small muted">${m.done} / ${m.total} hafal</span></div>
  <div class="prog-line"><i style="width:${m.done/m.total*100}%"></i></div>
  <div class="flash ${m.flip?"flip":""}" data-act="flip" tabindex="0" role="button" aria-label="Balik kartu">
   <div class="in">
    <div class="face front"><span class="pill">${esc(c.bab)}</span><div class="q">${rich(c.depan)}</div><div class="small muted">Ketuk untuk melihat jawaban</div></div>
    <div class="face backf"><div>${rich(c.belakang)}</div></div>
   </div>
  </div>
  ${m.flip?`<div class="rate"><button class="r0" data-act="rate" data-v="0">Belum hafal<small>ulang sebentar lagi</small></button><button class="r1" data-act="rate" data-v="1">Ragu<small>besok</small></button><button class="r2" data-act="rate" data-v="2">Hafal<small>beberapa hari lagi</small></button></div>`:`<button class="btn pri block" data-act="flip">Lihat jawaban</button>`}`}
 if(m&&m.finished){return `<section class="card" style="text-align:center"><div class="ar" dir="rtl" style="font-size:30px;color:var(--forest)">بَارَكَ اللهُ فِيكُمْ</div><h2 style="margin-top:6px">Murojaah selesai</h2><p class="muted">${m.total} kartu diulang · ${m.res[2]} hafal · ${m.res[1]} ragu · ${m.res[0]}× belum hafal</p><p class="small">Beruntun: <b>${streak()} hari</b></p><button class="btn pri" data-act="mur-exit">Kembali</button></section>`}
 const st=srs(), due=dueCards().length;
 const babs=[];progs().forEach(p=>(p.pertemuan||[]).forEach(mm=>{const ks=mm.kartu||[];if(ks.length)babs.push({p,m:mm,n:ks.length,h:ks.filter(k=>st[k.id]&&st[k.id].box>=3).length})}));
 const glos=allCards(), q=(S.gq||"").toLowerCase();
 return `
 <section class="greet"><div class="eyebrow" style="color:#CFE3BE">Ruang murojaah</div><h1>${due?due+" kartu menunggu":"Semua kartu sudah diulang"}</h1><div class="dates">Kartu diulang kembali tepat sebelum terlupa: yang belum hafal muncul lebih sering.</div>
  <div class="row" style="margin-top:14px"><button class="btn gold" data-act="mur-start" data-v="quick" ${due?"":"disabled"}>Murojaah cepat 5 menit</button>${due>15?`<button class="btn sm" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.4)" data-act="mur-start" data-v="today">Semua (${due})</button>`:""}</div></section>
 <section class="stack"><div class="sec-h"><h2>Per bab</h2><button class="lnk" data-act="mur-start" data-v="all">Ulang semua kartu</button></div>
  ${babs.map(b=>`<div class="card tap" data-act="mur-start" data-v="${b.p.id}:${b.m.id}" tabindex="0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><b>${rich(b.m.judul)}</b><div class="small muted">${esc(b.p.nama)} · ${b.n} kartu</div></div><span class="pill ${b.h===b.n?"good":""}">${b.h}/${b.n} hafal</span></div><div class="bar"><i style="width:${b.h/b.n*100}%"></i></div></div>`).join("")||`<div class="empty">Belum ada kartu murojaah.</div>`}
 </section>
 <section class="stack"><div class="sec-h"><h2>Daftar istilah & kaidah</h2></div>
  <input class="search" id="in-glos" type="search" placeholder="Cari istilah…" value="${esc(S.gq||"")}" aria-label="Cari istilah">
  <div class="card flat" style="padding:4px 16px">${glos.filter(k=>!q||(k.depan+" "+k.belakang).toLowerCase().includes(q)).map(k=>`<div class="hist" style="flex-direction:column;gap:2px"><b>${rich(k.depan)}</b><span class="muted">${rich(k.belakang)}</span></div>`).join("")||`<div class="empty">Tidak ditemukan.</div>`}</div>
 </section>`;
}

/* ---------- latihan ---------- */
function startQuiz(){
 const qs=S.qs; let pool;
 if(qs.bab==="wrong"){const w=LS.get("wrong",{});pool=allSoal().filter(s=>w[s.id])}
 else pool=allSoal((p,m)=>(!qs.prog||p.id===qs.prog)&&(qs.bab==="all"||m.id===qs.bab));
 if(!pool.length){toast("Belum ada soal untuk pilihan ini");return}
 pool=shuffle(pool); if(qs.n!=="all")pool=pool.slice(0,+qs.n);
 const items=pool.map(s=>({s,order:s.tipe==="pg"?shuffle(s.opsi.map((_,i)=>i)):[0,1],ans:null}));
 S.quiz={items,i:0,mode:qs.mode,end:qs.mode==="ujian"?Date.now()+items.length*45e3:0,label:qs.bab==="wrong"?"Soal yang pernah salah":qs.bab==="all"?(findProg(qs.prog)?.nama||"Semua program"):(allSoal().find(x=>x.mid===qs.bab)?.bab||"Latihan"),finished:false};
 S.tab="latihan";S.meet=null;render(true);startTimer();
}
function startTimer(){clearInterval(startTimer.t);if(!S.quiz||!S.quiz.end)return;startTimer.t=setInterval(()=>{const el=$("#timer");const left=S.quiz?Math.max(0,S.quiz.end-Date.now()):0;if(el){el.textContent=String(Math.floor(left/6e4)).padStart(2,"0")+":"+String(Math.floor(left/1e3)%60).padStart(2,"0")}if(!S.quiz||S.quiz.finished){clearInterval(startTimer.t)}else if(left<=0){finishQuiz()}},500)}
const correctOf=s=>s.tipe==="bs"?(s.jawab?0:1):s.jawab;
function finishQuiz(){const q=S.quiz;clearInterval(startTimer.t);q.finished=true;const b=q.items.filter(it=>it.ans===correctOf(it.s)).length;q.b=b;
 const h=LS.get("scores",[]);h.unshift({d:dayKey(),l:q.label,b,t:q.items.length,m:q.mode});LS.set("scores",h.slice(0,40));
 const w=LS.get("wrong",{});q.items.forEach(it=>{if(it.ans===correctOf(it.s))delete w[it.s.id];else w[it.s.id]=(w[it.s.id]||0)+1});LS.set("wrong",w);bumpStreak();syncMe();render(true)}
function optHtml(it,reveal){const s=it.s;const labels=s.tipe==="bs"?["Benar","Salah"]:s.opsi;const keys="ABCDEF";return it.order.map((oi,k)=>{let cls="";if(reveal){if(oi===correctOf(s))cls="ok";else if(it.ans===oi)cls="no"}else if(it.ans===oi)cls="sel";return `<button class="opt ${cls}" data-act="ans" data-v="${oi}" ${reveal?"disabled":""}><span class="k">${keys[k]}</span><span>${rich(labels[oi])}</span></button>`}).join("")}
function viewLatihan(){
 const q=S.quiz;
 if(q&&!q.finished){const it=q.items[q.i], reveal=q.mode==="latihan"&&it.ans!=null;return `
  <div class="row" style="justify-content:space-between"><button class="back" data-act="quiz-exit">← Keluar</button><span class="small muted">Soal ${q.i+1} / ${q.items.length}${q.end?` · <span class="timer" id="timer">--:--</span>`:""}</span></div>
  <div class="prog-line"><i style="width:${(q.i)/q.items.length*100}%"></i></div>
  <section class="card fade"><div class="row" style="gap:6px;margin-bottom:10px"><span class="pill">${esc(it.s.bab)}</span><span class="pill gold">${it.s.tipe==="bs"?"Benar / Salah":"Pilihan ganda"}</span></div><div class="qtext">${rich(it.s.tanya)}</div></section>
  <section class="stack">${optHtml(it,reveal)}</section>
  ${reveal?`<div class="explain fade"><b style="color:${it.ans===correctOf(it.s)?"var(--good)":"var(--bad)"}">${it.ans===correctOf(it.s)?"Benar, maa syaa Allah!":"Belum tepat."}</b> ${rich(it.s.bahas||"")}</div>`:""}
  ${(q.mode==="ujian"?it.ans!=null:reveal)?`<button class="btn pri block" data-act="qnext">${q.i+1<q.items.length?"Soal berikutnya":"Lihat hasil"}</button>`:""}`}
 if(q&&q.finished){const pct=Math.round(q.b/q.items.length*100), C=2*Math.PI*46;return `
  <section class="card score fade"><svg class="ring" viewBox="0 0 110 110"><circle cx="55" cy="55" r="46" fill="none" stroke="var(--surface-2)" stroke-width="10"/><circle cx="55" cy="55" r="46" fill="none" stroke="${pct>=70?"var(--leaf)":"var(--orange)"}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C*pct/100} ${C}" transform="rotate(-90 55 55)"/><text x="55" y="62" text-anchor="middle" font-size="24" font-weight="800" fill="var(--ink)" font-family="Plus Jakarta Sans,sans-serif">${pct}%</text></svg>
   <div style="min-width:0"><div class="eyebrow">${esc(q.label)}</div><h2 style="margin-top:4px">${pct>=85?"Maa syaa Allah, sangat baik!":pct>=70?"Baarakallahu fiikum, bagus!":"Semangat, ulangi lagi materinya"}</h2><p class="muted" style="margin:4px 0 0">${q.b} dari ${q.items.length} jawaban benar</p></div></section>
  <div class="grid2"><button class="btn pri" data-act="quiz-again">Ulangi latihan</button><button class="btn" data-act="quiz-exit">Kembali</button></div>
  <section class="stack"><div class="sec-h"><h2>Pembahasan</h2></div>${q.items.map((it,n)=>`<div class="card flat stack" style="gap:8px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${n+1}. ${rich(it.s.tanya)}</b><span class="pill ${it.ans===correctOf(it.s)?"good":""}" style="${it.ans===correctOf(it.s)?"":"background:var(--bad-bg);color:var(--bad)"}">${it.ans===correctOf(it.s)?"Benar":"Salah"}</span></div><div class="small">Jawaban: <b>${rich(it.s.tipe==="bs"?(it.s.jawab?"Benar":"Salah"):it.s.opsi[it.s.jawab])}</b></div>${it.s.bahas?`<div class="explain">${rich(it.s.bahas)}</div>`:""}</div>`).join("")}</section>`}
 const qs=S.qs, ps=progs(); if(qs.prog&&!findProg(qs.prog))qs.prog="";
 const p=findProg(qs.prog), wrongN=Object.keys(LS.get("wrong",{})).length, hist=LS.get("scores",[]);
 const babs=p?(p.pertemuan||[]):[];
 const count=(qs.bab==="wrong")?wrongN:allSoal((pp,m)=>(!qs.prog||pp.id===qs.prog)&&(qs.bab==="all"||m.id===qs.bab)).length;
 return `
 <section class="greet"><div class="eyebrow" style="color:#CFE3BE">Ruang latihan</div><h1>Uji pemahaman antum</h1><div class="dates">Soal disusun dari materi setiap pertemuan, lengkap dengan pembahasan.</div></section>
 <section class="card stack" style="gap:14px">
  <div class="grid2">
   <div class="field"><label for="q-prog">Program</label><select id="q-prog" data-qs="prog"><option value="">Semua program</option>${ps.map(x=>`<option value="${x.id}" ${x.id===qs.prog?"selected":""}>${esc(x.nama)}</option>`).join("")}</select></div>
   <div class="field"><label for="q-bab">Bab</label><select id="q-bab" data-qs="bab"><option value="all">Semua bab</option>${babs.map(m=>`<option value="${m.id}" ${m.id===qs.bab?"selected":""}>${esc(m.judul)}</option>`).join("")}${wrongN?`<option value="wrong" ${qs.bab==="wrong"?"selected":""}>Soal yang pernah salah (${wrongN})</option>`:""}</select></div>
  </div>
  <div class="field"><label>Mode</label><div class="seg"><button data-act="qmode" data-v="latihan" class="${qs.mode==="latihan"?"on":""}">Latihan</button><button data-act="qmode" data-v="ujian" class="${qs.mode==="ujian"?"on":""}">Ujian · berwaktu</button></div><span class="small muted">${qs.mode==="latihan"?"Jawaban dan pembahasan langsung tampil setelah menjawab.":"45 detik per soal. Pembahasan tampil di akhir."}</span></div>
  <div class="field"><label for="q-n">Jumlah soal</label><select id="q-n" data-qs="n">${["5","10","20","all"].map(v=>`<option value="${v}" ${qs.n===v?"selected":""}>${v==="all"?"Semua":v+" soal"}</option>`).join("")}</select></div>
  <button class="btn pri block" data-act="quiz-start" ${count?"":"disabled"}>Mulai · ${qs.n==="all"?count:Math.min(count,+qs.n)} soal tersedia</button>
 </section>
 ${hist.length?`<section class="stack"><div class="sec-h"><h2>Riwayat nilai</h2></div><div class="card flat" style="padding:4px 16px">${hist.slice(0,8).map(h=>`<div class="hist"><span style="min-width:0">${esc(h.l)} <span class="muted small">· ${esc(h.d)} · ${h.m==="ujian"?"ujian":"latihan"}</span></span><b>${h.b}/${h.t}</b></div>`).join("")}</div></section>`:""}`;
}

/* ---------- profil ---------- */
/* ---------- admin ---------- */
function getPath(o,p){return p.split(".").reduce((a,k)=>a==null?a:a[k],o)}
function setPath(o,p,v){const ks=p.split(".");const last=ks.pop();const t=ks.reduce((a,k)=>a[k],o);t[last]=v}
function markDirty(){dirty=true;LS.set("draft",{at:Date.now(),data:EDIT});const b=$("#abar-t");if(b)b.textContent="Ada perubahan yang belum diterbitkan"}
function fIn(path,label,opt={}){const v=getPath(EDIT,path)??"";const id="f-"+path.replace(/\./g,"-");
 if(opt.area)return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" data-bind="${path}" ${opt.rows?`rows="${opt.rows}"`:""} placeholder="${esc(opt.ph||"")}">${esc(v)}</textarea></div>`;
 return `<div class="field"><label for="${id}">${label}</label><input id="${id}" data-bind="${path}" type="${opt.type||"text"}" value="${esc(v)}" placeholder="${esc(opt.ph||"")}"></div>`}
function viewKelola(){
 if(!isAdmin)return `<div class="empty">Halaman ini khusus pengelola.</div>`;
 if(!EDIT){const dr=LS.get("draft",null);EDIT=clone(DATA);dirty=false;if(dr&&JSON.stringify(dr.data)!==JSON.stringify(DATA))S.draftOffer=dr}
 const bar=`<div class="abar"><span class="t" id="abar-t">${dirty?"Ada perubahan yang belum diterbitkan":"Semua perubahan sudah diterbitkan"}</span><button class="btn sm" data-act="a-copy">Salin data</button><button class="btn sm pri" data-act="a-publish">Terbitkan</button></div>`;
 const offer=S.draftOffer?`<div class="card flat row" style="background:var(--warn-bg);border-color:var(--gold)"><span style="flex:1;min-width:160px" class="small">Ada draf dari ${new Date(S.draftOffer.at).toLocaleString("id-ID")} yang belum diterbitkan.</span><button class="btn sm gold" data-act="a-restore">Lanjutkan draf</button><button class="btn sm" data-act="a-discard">Buang</button></div>`:"";
 if(S.adm)return bar+viewEditMeet();
 const E=EDIT;
 return `${bar}${offer}
 <section class="phead"><div class="eyebrow">Mode pengelola</div><h1>Kelola majelis</h1><p class="small muted" style="margin:6px 0 0">Ubah program, materi, kartu, dan soal di sini, lalu ketuk <b>Terbitkan</b> agar semua peserta melihat versi terbaru.</p></section>
 <section class="stack"><div class="sec-h"><h2>Program & pertemuan</h2><button class="btn sm" data-act="a-add-prog">+ Program baru</button></div>
 ${E.program.map((p,pi)=>`<details class="card adm" ${S.openProg===p.id?"open":""} data-prog="${p.id}"><summary>${esc(p.nama||"Program tanpa nama")} <span class="pill">${(p.pertemuan||[]).length} pertemuan</span></summary>
  <div class="stack" style="margin-top:12px">
   <div class="grid2">${fIn(`program.${pi}.nama`,"Nama program")}${fIn(`program.${pi}.arab`,"Nama Arab",{ph:"أصول الفقه"})}</div>
   <div class="grid2">${fIn(`program.${pi}.pengajar`,"Pengajar")}${fIn(`program.${pi}.warna`,"Warna",{type:"color"})}</div>
   ${fIn(`program.${pi}.kitab`,"Kitab rujukan")}
   <div class="grid2">${fIn(`program.${pi}.kitabPdf`,"Tautan PDF kitab",{type:"url",ph:"https://"})}${fIn(`program.${pi}.kitabOffset`,"Selisih halaman PDF (hal. PDF − hal. kitab)",{type:"number",ph:"0"})}</div>
   ${SB?`<div><label class="btn sm">Unggah PDF kitab<input type="file" class="up-kitab" data-p="${pi}" accept="application/pdf" hidden></label></div>`:""}
   ${fIn(`program.${pi}.deskripsi`,"Deskripsi",{area:1})}
   <div class="eyebrow" style="margin-top:6px">Pertemuan</div>
   ${(p.pertemuan||[]).map((m,mi)=>`<div class="aitem" style="flex-direction:row;align-items:center"><span class="pill">${mi+1}</span><b style="flex:1;min-width:0">${esc(m.judul||"Tanpa judul")}</b><span class="small muted">${(m.kartu||[]).length}k · ${(m.soal||[]).length}s</span><button class="btn sm" data-act="a-edit-meet" data-p="${pi}" data-m="${mi}">Edit</button></div>`).join("")}
   <div class="row"><button class="btn sm pri" data-act="a-add-meet" data-p="${pi}">+ Pertemuan</button><span class="sp" style="flex:1"></span><button class="btn sm danger" data-act="a-del" data-path="program.${pi}">Hapus program</button></div>
  </div></details>`).join("")}
 </section>
 ${viewRekap()}
 <section class="card stack"><div class="sec-h"><h2>Pengumuman</h2><button class="btn sm" data-act="a-add-ann">+ Tambah</button></div>
  ${(E.pengumuman||[]).map((a,i)=>`<div class="aitem">${fIn(`pengumuman.${i}.judul`,"Judul")}${fIn(`pengumuman.${i}.isi`,"Isi",{area:1})}<div class="row"><div style="flex:1">${fIn(`pengumuman.${i}.tanggal`,"Tanggal",{type:"date"})}</div><button class="btn sm danger" data-act="a-del" data-path="pengumuman.${i}">Hapus</button></div></div>`).join("")||`<div class="small muted">Belum ada pengumuman.</div>`}
 </section>
 <section class="card stack"><div class="sec-h"><h2>Jadwal kajian</h2><button class="btn sm" data-act="a-add-jad">+ Tambah</button></div>
  ${(E.jadwal||[]).map((j,i)=>`<div class="aitem">${fIn(`jadwal.${i}.judul`,"Judul")}<div class="grid2">${fIn(`jadwal.${i}.waktu`,"Waktu",{type:"datetime-local"})}${fIn(`jadwal.${i}.tempat`,"Tempat")}</div>${fIn(`jadwal.${i}.link`,"Tautan Zoom / YouTube Live",{type:"url",ph:"https://"})}<div><button class="btn sm danger" data-act="a-del" data-path="jadwal.${i}">Hapus</button></div></div>`).join("")||`<div class="small muted">Belum ada jadwal.</div>`}
 </section>`;
}
function viewEditMeet(){
 const {pi,mi}=S.adm, p=EDIT.program[pi], m=p&&p.pertemuan[mi]; if(!m){S.adm=null;return viewKelola()}
 const base=`program.${pi}.pertemuan.${mi}`;
 m.kartu=m.kartu||[];m.soal=m.soal||[];m.berkas=m.berkas||[];
 return `
 <button class="back" data-act="a-close">← ${esc(p.nama)}</button>
 <section class="card stack"><div class="eyebrow">Pertemuan ${mi+1}</div>
  ${fIn(base+".judul","Judul")}<div class="grid2">${fIn(base+".arab","Judul Arab (opsional)")}${fIn(base+".hal","Halaman kitab",{ph:"15–17"})}</div>
  <div class="grid2">${fIn(base+".youtube","Tautan YouTube",{type:"url",ph:"https://youtu.be/…"})}${fIn(base+".drive","Tautan Google Drive",{type:"url",ph:"https://drive.google.com/…"})}</div>
  ${fIn(base+".ringkasan","Ringkasan materi (tampil untuk peserta)",{area:1,rows:8})}
  ${fIn(base+".transkrip","Transkrip kajian (hanya untuk AI, tidak ditampilkan)",{area:1,rows:5,ph:"Di YouTube: ketuk ⋯ di bawah video → Tampilkan transkrip → salin dan tempel di sini."})}
 </section>
 <section class="card stack"><div class="sec-h"><h2>Berkas materi</h2></div>
  ${m.berkas.map((b,i)=>`<div class="aitem" style="flex-direction:row;align-items:center"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(b.nama)}</span><button class="btn sm danger" data-act="a-del" data-path="${base}.berkas.${i}">Hapus</button></div>`).join("")}
  <div class="grid2"><div class="field"><label for="nb-nama">Nama berkas</label><input id="nb-nama" placeholder="Slide pertemuan 1"></div><div class="field"><label for="nb-url">Tautan</label><input id="nb-url" type="url" placeholder="https://"></div></div>
  <div class="row"><button class="btn sm" data-act="a-add-link">+ Tambah tautan</button><label class="btn sm pri" id="up-lbl" ${SB&&isAdmin?"":"hidden"}>Unggah berkas (PDF, gambar, audio)<input type="file" id="up-file" hidden accept=".pdf,image/*,audio/*,video/*,.txt,.md,.csv"></label></div>
 </section>
 <section class="card stack"><div class="sec-h"><h2>Kartu murojaah</h2><span class="pill">${m.kartu.length}</span></div>
  ${m.kartu.map((k,i)=>`<div class="aitem ${k.ai?"ai":""}">${k.ai?`<span class="pill gold">Dibuat AI · periksa dulu</span>`:""}<div class="grid2">${fIn(`${base}.kartu.${i}.depan`,"Depan (istilah/kaidah)")}${fIn(`${base}.kartu.${i}.belakang`,"Belakang (makna)",{area:1})}</div><div><button class="btn sm danger" data-act="a-del" data-path="${base}.kartu.${i}">Hapus kartu</button></div></div>`).join("")}
  <div class="row"><button class="btn sm" data-act="a-add-card">+ Kartu</button><button class="btn sm gold" data-act="a-ai" data-v="kartu">✦ Buat kartu dengan AI</button></div>
 </section>
 <section class="card stack"><div class="sec-h"><h2>Soal latihan</h2><span class="pill">${m.soal.length}</span></div>
  ${m.soal.map((s,i)=>{const sp=`${base}.soal.${i}`;return `<div class="aitem ${s.ai?"ai":""}">${s.ai?`<span class="pill gold">Dibuat AI · periksa dulu</span>`:""}
   <div class="field"><label for="f-${sp.replace(/\./g,"-")}-tipe">Jenis soal</label><select id="f-${sp.replace(/\./g,"-")}-tipe" data-act-change="a-tipe" data-path="${sp}"><option value="pg" ${s.tipe==="pg"?"selected":""}>Pilihan ganda</option><option value="bs" ${s.tipe==="bs"?"selected":""}>Benar / Salah</option></select></div>
   ${fIn(sp+".tanya","Pertanyaan",{area:1,rows:2})}
   ${s.tipe==="pg"?`<div class="grid2">${(s.opsi||[]).map((o,oi)=>fIn(`${sp}.opsi.${oi}`,"Opsi "+"ABCD"[oi]+(oi===s.jawab?" ✓":""))).join("")}</div>
    <div class="field"><label for="f-${sp.replace(/\./g,"-")}-jawab">Jawaban benar</label><select id="f-${sp.replace(/\./g,"-")}-jawab" data-bind="${sp}.jawab" data-type="num">${(s.opsi||[]).map((o,oi)=>`<option value="${oi}" ${oi===s.jawab?"selected":""}>Opsi ${"ABCD"[oi]}</option>`).join("")}</select></div>`
   :`<div class="field"><label for="f-${sp.replace(/\./g,"-")}-jawab">Jawaban benar</label><select id="f-${sp.replace(/\./g,"-")}-jawab" data-bind="${sp}.jawab" data-type="bool"><option value="true" ${s.jawab===true?"selected":""}>Benar</option><option value="false" ${s.jawab===false?"selected":""}>Salah</option></select></div>`}
   ${fIn(sp+".bahas","Pembahasan",{area:1,rows:2})}
   <div><button class="btn sm danger" data-act="a-del" data-path="${sp}">Hapus soal</button></div></div>`}).join("")}
  <div class="row"><button class="btn sm" data-act="a-add-soal">+ Soal</button><button class="btn sm gold" data-act="a-ai" data-v="soal">✦ Buat 8 soal dengan AI</button></div>
  <div class="small muted">AI menyusun soal dari ringkasan, transkrip, dan video YouTube di atas. Periksa setiap soal sebelum diterbitkan.</div>
 </section>
 <button class="btn danger block" data-act="a-del" data-path="${base}">Hapus pertemuan ini</button>`;
}
async function gemini(prompt,yt){
 const key=LS.get("gkey",""),model=LS.get("gmodel","")||"gemini-2.5-flash";
 const parts=[];if(yt)parts.push({file_data:{file_uri:yt}});parts.push({text:prompt});
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:"application/json",temperature:.4}})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j.error&&j.error.message)||("HTTP "+r.status));
 const t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[]).map(p=>p.text||"").join("");
 return JSON.parse(t.replace(/^\s*```(?:json)?/,"").replace(/```\s*$/,""));
}
const isYT=u=>/youtu\.?be/.test(u||"");
async function aiGen(kind){
 const {pi,mi}=S.adm, p=EDIT.program[pi], m=p.pertemuan[mi];
 if(!LS.get("gkey","")){toast("Isi kunci Gemini dulu di bagian Pengaturan AI");return}
 const src=[m.ringkasan,m.transkrip].filter(Boolean).join("\n\n");const yt=isYT(m.youtube)?m.youtube:"";
 if(src.trim().length<80&&!yt){toast("Isi ringkasan, transkrip, atau link YouTube dulu");return}
 const btn=document.querySelector(`[data-act="a-ai"][data-v="${kind}"]`);if(btn){btn.disabled=true;btn.textContent="AI sedang menyusun…"}
 const fmt=kind==="soal"
  ?`Buat 8 soal latihan. Campurkan sekitar 6 pilihan ganda dan 2 benar/salah. Kembalikan HANYA JSON array dengan bentuk: [{"tipe":"pg","tanya":"...","opsi":["...","...","...","..."],"jawab":0,"bahas":"..."},{"tipe":"bs","tanya":"...","jawab":true,"bahas":"..."}]. "jawab" untuk pg adalah indeks 0-3 opsi yang benar; acak posisi jawaban benar. "bahas" menjelaskan singkat mengapa jawaban itu benar.`
  :`Buat 6 kartu hafalan (flashcard) berisi istilah, definisi, atau kaidah penting. Kembalikan HANYA JSON array: [{"depan":"istilah atau kaidah (boleh teks Arab)","belakang":"makna dan penjelasan singkat dalam bahasa Indonesia"}].`;
 const prompt=`Kamu membantu ustadz menyusun bahan belajar untuk peserta kajian "${p.nama}" di Majelis Mudzakaroh Rumah Dakwah Malang.\nGunakan HANYA isi materi${yt?" (video kajian terlampir dan teks di bawah)":" di bawah"}. Jangan menambahkan dalil, nukilan, atau pendapat yang tidak ada di materi. Tulis dalam bahasa Indonesia yang jelas; teks Arab boleh dipakai bila ada di materi.\n${fmt}\n\nJUDUL: ${m.judul}\n\nMATERI:\n${src.slice(0,24000)||"(lihat video)"}`;
 try{
  const out=await gemini(prompt,yt);
  const arr=Array.isArray(out)?out:(out&&(out.soal||out.kartu||out.items))||[];
  let n=0;
  if(kind==="soal"){arr.forEach(s=>{if(!s||!s.tanya)return;if(s.tipe==="bs"&&typeof s.jawab==="boolean"){m.soal.push({id:uid("s"),tipe:"bs",tanya:String(s.tanya),jawab:s.jawab,bahas:String(s.bahas||""),ai:true});n++}else if(Array.isArray(s.opsi)&&s.opsi.length>=2&&Number.isInteger(s.jawab)&&s.jawab<s.opsi.length){m.soal.push({id:uid("s"),tipe:"pg",tanya:String(s.tanya),opsi:s.opsi.slice(0,4).map(String),jawab:Math.min(s.jawab,3),bahas:String(s.bahas||""),ai:true});n++}})}
  else arr.forEach(k=>{if(k&&k.depan&&k.belakang){m.kartu.push({id:uid("k"),depan:String(k.depan),belakang:String(k.belakang),ai:true});n++}});
  if(n){markDirty();toast(n+" "+(kind==="soal"?"soal":"kartu")+" ditambahkan. Periksa lalu terbitkan.")}else toast("AI belum menghasilkan "+kind+" yang valid. Coba lagi.");
 }catch(e){toast("Gagal membuat "+kind+": "+String(e.message||e).slice(0,120))}
 render();
}
async function publishData(){
 if(!SB||!isAdmin){toast("Masuk sebagai pengelola untuk menerbitkan");return}
 const out=clone(EDIT);out.diperbarui=dayKey();
 const b=document.querySelector('[data-act="a-publish"]');if(b){b.disabled=true;b.textContent="Menerbitkan…"}
 const {error}=await SB.from("konten").upsert({id:1,data:out,updated_at:new Date().toISOString()});
 if(error)toast("Gagal menerbitkan: "+error.message+". Draf tetap tersimpan.");
 else{DATA=clone(out);EDIT=clone(out);dirty=false;LS.del("draft");LS.set("cache",DATA);S.draftOffer=null;S.impMsg=null;toast("Diterbitkan. Peserta kini melihat versi terbaru.")}
 render();
}
function importData(txt){
 let inc;try{inc=JSON.parse(String(txt||"").replace(/^\uFEFF/,""))}catch(e){S.impMsg={ok:false,t:"Berkas atau teks bukan JSON yang valid. Pastikan memilih berkas materi-qawaid-al-ushul.json."};toast("Isi bukan JSON yang valid");render();return}
 const add=Array.isArray(inc)?{program:inc}:inc.program?inc:inc.pertemuan?{program:[inc]}:null;
 if(!add){S.impMsg={ok:false,t:"Format tidak dikenali. Harus berisi daftar program."};toast("Format tidak dikenali");render();return}
 let n=0;(add.program||[]).forEach(p=>{if(!p||!p.id)return;const i=EDIT.program.findIndex(x=>x.id===p.id);if(i>=0)EDIT.program[i]=p;else EDIT.program.push(p);n++});
 ["pengumuman","jadwal"].forEach(k=>{if(Array.isArray(add[k])){EDIT[k]=EDIT[k]||[];add[k].forEach(x=>{const i=EDIT[k].findIndex(y=>y.id===x.id);if(i>=0)EDIT[k][i]=x;else EDIT[k].push(x)})}});
 markDirty();const nm=(add.program||[]).map(p=>p.nama+" ("+((p.pertemuan||[]).length)+" pertemuan)").join(", ");S.impMsg={ok:true,t:`Berhasil diimpor: ${nm}. Belum tampil untuk peserta sampai antum ketuk Terbitkan.`};toast(n+" program diimpor");render();
}
function viewRekap(){
 const ps=LIVE.rekap, open=LIVE.tanya.filter(q=>!q.jawaban);
 const tot=progs().reduce((a,p)=>a+(p.pertemuan||[]).length,0);
 return `<section class="card stack"><div class="sec-h"><h2>Rekap peserta</h2><div class="row" style="gap:6px"><span class="pill">${ps.length} peserta</span><button class="btn sm" data-act="rekap-refresh">Muat ulang</button></div></div>
 ${ps.length?`<div class="tbl"><table><thead><tr><th>Nama</th><th>WA</th><th>Materi</th><th>Latihan</th><th>Rata-rata</th><th>Hafal</th><th>Beruntun</th><th>Aktif</th></tr></thead><tbody>${ps.map(p=>{const r=p.ringkasan||{};return `<tr><td>${esc(p.nama)}</td><td>${esc(p.wa||"")}</td><td class="n">${r.selesai||0}/${tot}</td><td class="n">${r.latihan||0}</td><td class="n">${r.rata==null?"–":r.rata+"%"}</td><td class="n">${r.hafal||0}</td><td class="n">${r.beruntun||0}</td><td>${p.aktif?fmtAgo(p.aktif):"–"}</td></tr>`}).join("")}</tbody></table></div>
  <div><button class="btn sm" data-act="rekap-csv">Salin rekap (untuk Excel)</button></div>`:`<div class="small muted">Belum ada peserta yang masuk.</div>`}
 <label class="row small" style="gap:8px"><input type="checkbox" id="f-papan" data-bind="papanPeringkat" data-type="check" ${EDIT.papanPeringkat===false?"":"checked"}> Tampilkan papan semangat (peringkat poin) di beranda peserta</label>
 </section>
 <section class="card stack"><div class="sec-h"><h2>Pertanyaan belum dijawab</h2><span class="pill ${open.length?"gold":""}">${open.length}</span></div>
 ${open.map(q=>{const m=findMeet(q.pid,q.mid);return `<div class="aitem"><div class="small muted">${esc(q.nama||"Peserta")} · ${esc(m?m.judul:"")} · ${fmtAgo(q.created_at)}</div><div>${rich(q.teks)}</div><div><button class="btn sm" data-act="open" data-p="${q.pid}" data-m="${q.mid}">Buka & jawab</button></div></div>`}).join("")||`<div class="small muted">Tidak ada pertanyaan yang menunggu.</div>`}
 </section>
 <section class="card stack"><div class="sec-h"><h2>Pengaturan AI</h2><span class="pill ${LS.get("gkey","")?"good":""}">${LS.get("gkey","")?"aktif":"belum aktif"}</span></div>
  <div class="small muted">AI (Google Gemini) menyusun soal dan kartu dari ringkasan, transkrip, dan langsung dari video YouTube. Kunci gratis dibuat di aistudio.google.com → Get API key. Kunci hanya disimpan di perangkat ini.</div>
  <div class="grid2"><div class="field"><label for="g-key">Kunci API Gemini</label><input id="g-key" type="password" value="${esc(LS.get("gkey",""))}" placeholder="AIza…"></div><div class="field"><label for="g-model">Model</label><input id="g-model" value="${esc(LS.get("gmodel","")||"gemini-2.5-flash")}"></div></div>
 </section>
 <section class="card stack"><div class="sec-h"><h2>Impor materi</h2></div>
  <div class="small muted">Tempel data program (JSON) yang disiapkan Claude, atau pilih berkas .json. Program dengan id yang sama akan diganti.</div>
  <div class="field"><label for="imp-txt">Data JSON</label><textarea id="imp-txt" rows="4" placeholder='{"program":[…]}'></textarea></div>
  <div class="row"><button class="btn sm pri" data-act="a-import">Impor</button><label class="btn sm">Pilih berkas .json<input type="file" id="imp-file" hidden></label></div>
  ${S.impMsg?`<div class="card flat small" style="background:${S.impMsg.ok?"var(--good-bg)":"var(--bad-bg)"};border-color:${S.impMsg.ok?"var(--good)":"var(--bad)"}"><b>${esc(S.impMsg.t)}</b>${S.impMsg.ok?`<div style="margin-top:8px"><button class="btn sm pri" data-act="a-publish">Terbitkan sekarang</button></div>`:""}</div>`:""}
 </section>`}
async function uploadFile(e){const f=e.target.files&&e.target.files[0];if(!f)return;const lbl=$("#up-lbl");if(lbl)lbl.firstChild.textContent="Mengunggah…";
 if(f.size>50*1024*1024){toast("Berkas terlalu besar (maks 50 MB). Simpan di Drive lalu tempel tautannya.");render();return}
 const path=`${dayKey()}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g,"_")}`;
 const {error}=await SB.storage.from("materi").upload(path,f,{contentType:f.type||undefined,upsert:false});
 if(error){toast("Gagal mengunggah: "+error.message);render();return}
 const url=SB.storage.from("materi").getPublicUrl(path).data.publicUrl;
 const m=EDIT.program[S.adm.pi].pertemuan[S.adm.mi];m.berkas.push({nama:f.name,url});markDirty();toast("Berkas diunggah");render()}
async function uploadKitab(e){const f=e.target.files&&e.target.files[0];if(!f)return;const pi=+e.target.dataset.p;
 if(f.size>50*1024*1024){toast("PDF terlalu besar (maks 50 MB). Simpan di Drive lalu tempel tautannya.");return}
 toast("Mengunggah PDF kitab… mohon tunggu");
 const path=`kitab/${Date.now()}-${f.name.replace(/[^\w.\-]+/g,"_")}`;
 const {error}=await SB.storage.from("materi").upload(path,f,{contentType:"application/pdf",upsert:false});
 if(error){toast("Gagal mengunggah: "+error.message);return}
 EDIT.program[pi].kitabPdf=SB.storage.from("materi").getPublicUrl(path).data.publicUrl;markDirty();toast("PDF kitab diunggah. Ketuk Terbitkan.");render()}
async function downloadCert(){const p=findProg(S.cert);if(!S.certUrl)return;const a=document.createElement("a");a.href=S.certUrl;a.download=`Sertifikat ${p.nama} - ${LS.get("nama","")}.png`;document.body.appendChild(a);a.click();a.remove()}

/* ---------- render ---------- */
function render(top){
 if(!DATA)return;
 const v={beranda:viewBeranda,materi:viewMateri,murojaah:viewMurojaah,latihan:viewLatihan,profil:viewProfil,kelola:viewKelola,masuk:viewMasuk}[S.tab]||viewBeranda;
 const ae=document.activeElement, aid=ae&&ae.id, pos=ae&&ae.selectionStart;
 $("#main").innerHTML=(S.dbErr&&isAdmin?`<div class="card flat small" style="background:var(--warn-bg);border-color:var(--gold)">Database belum siap: ${esc(S.dbErr)}. Pastikan supabase.sql sudah dijalankan.</div>`:"")+(offline?`<div class="card flat small" style="background:var(--warn-bg);border-color:var(--gold)">Sedang luring: menampilkan materi yang terakhir tersimpan.</div>`:"")+v();
 renderNav();
 if(top)window.scrollTo({top:0});
 if(aid){const el=document.getElementById(aid);if(el&&el.tagName!=="BUTTON"){el.focus();try{if(pos!=null)el.setSelectionRange(pos,pos)}catch(e){}}}
 if(S.quiz&&!S.quiz.finished&&S.quiz.end)startTimer();
 const up=$("#up-file");if(up)up.onchange=uploadFile;
 document.querySelectorAll(".up-kitab").forEach(el=>el.onchange=uploadKitab);
 if(S.tab==="materi"&&S.cert&&!S.certUrl&&!S.certBusy&&LS.get("nama","")){S.certBusy=true;buildCert().finally(()=>S.certBusy=false)}
}
/* ---------- events ---------- */
document.addEventListener("click",e=>{
 const t=e.target.closest("[data-act]");if(!t)return;
 const a=t.dataset.act, v=t.dataset.v;
 switch(a){
  case "tab": if(S.tab==="kelola"&&v!=="kelola"){S.adm=null} S.tab=v; if(v==="materi"&&S.tab!==v)S.meet=null; if(v!=="materi")S.meet=null; try{history.replaceState(null,"","#"+v)}catch(_){} render(true); break;
  case "prog": S.prog=v;S.meet=null;S.cert=null;S.q="";S.tab="materi";render(true);break;
  case "open": S.meet={pid:t.dataset.p,mid:t.dataset.m};S.tab="materi";LS.set("last",S.meet);render(true);break;
  case "back": S.meet=null;render(true);break;
  case "done":{const d=LS.get("done",{});if(d[v])delete d[v];else{d[v]=1;bumpStreak()}LS.set("done",d);syncMe();render();break}
  case "mur-start": startMur(v);break;
  case "flip": if(S.mur&&!S.mur.flip){S.mur.flip=true;render()}else if(S.mur&&t.classList.contains("flash")){S.mur.flip=false;render()}break;
  case "rate": rateCard(+v);break;
  case "mur-exit": S.mur=null;render(true);break;
  case "quiz-bab": S.qs={prog:t.dataset.p,bab:t.dataset.m,mode:"latihan",n:"all"};S.meet=null;startQuiz();break;
  case "qmode": S.qs.mode=v;render();break;
  case "quiz-start": startQuiz();break;
  case "quiz-again": startQuiz();break;
  case "quiz-exit": clearInterval(startTimer.t);S.quiz=null;render(true);break;
  case "ans":{const q=S.quiz,it=q.items[q.i];if(q.mode==="latihan"&&it.ans!=null)return;it.ans=+v;render();break}
  case "qnext":{const q=S.quiz;if(q.i+1<q.items.length){q.i++;render(true)}else finishQuiz();break}
  case "cert": S.cert=v;S.certUrl=null;S.certCanvas=null;render(true);break;
  case "cert-close": S.cert=null;S.certUrl=null;render(true);break;
  case "cert-dl": downloadCert();break;
  case "kirim-tanya": kirimTanya(t.dataset.p,v);break;
  case "hapus-tanya": if(!t.dataset.armed){t.dataset.armed=1;t.textContent="Yakin? Ketuk lagi";return}hapusTanya(v);break;
  case "adm-toggle": S.adminLogin=!S.adminLogin;render();break;
  case "keluar": keluar();break;
  case "install": S.installEvt.prompt();S.installEvt=null;break;
  case "rekap-refresh": loadRekap();loadTanya(true);break;
  case "rekap-csv":{const tot=progs().reduce((a,p)=>a+(p.pertemuan||[]).length,0);const rows=[["Nama","WA","Materi selesai","Latihan","Rata-rata","Hafal","Beruntun","Aktif terakhir"]].concat(LIVE.rekap.map(p=>{const r=p.ringkasan||{};return [p.nama,p.wa||"",(r.selesai||0)+"/"+tot,r.latihan||0,r.rata==null?"":r.rata,r.hafal||0,r.beruntun||0,p.aktif?new Date(p.aktif).toLocaleString("id-ID"):""]}));const txt=rows.map(r=>r.join("\t")).join("\n");navigator.clipboard.writeText(txt).then(()=>toast("Rekap disalin. Tempel di Excel atau Google Sheets."),()=>toast("Tidak bisa menyalin otomatis"));break}
  case "a-import": importData($("#imp-txt").value);break;
  case "jawab": kirimJawab(v);break;
  case "reset": if(t.dataset.armed){["srs","streak","scores","wrong","done","notes","last"].forEach(k=>LS.del(k));toast("Progres dihapus");render(true)}else{t.dataset.armed=1;t.textContent="Yakin? Ketuk sekali lagi"}break;
  /* admin */
  case "a-add-prog": EDIT.program.push({id:uid("prog"),nama:"Program baru",arab:"",kitab:"",pengajar:"",deskripsi:"",warna:"#006F3C",pertemuan:[]});S.openProg=EDIT.program.at(-1).id;markDirty();render();break;
  case "a-add-meet":{const p=EDIT.program[+t.dataset.p];p.pertemuan=p.pertemuan||[];p.pertemuan.push({id:uid("m"),judul:"Pertemuan "+(p.pertemuan.length+1),arab:"",youtube:"",drive:"",berkas:[],ringkasan:"",transkrip:"",kartu:[],soal:[]});markDirty();S.adm={pi:+t.dataset.p,mi:p.pertemuan.length-1};render(true);break}
  case "a-edit-meet": S.adm={pi:+t.dataset.p,mi:+t.dataset.m};S.openProg=EDIT.program[+t.dataset.p].id;render(true);break;
  case "a-close": S.adm=null;render(true);break;
  case "a-add-card": EDIT.program[S.adm.pi].pertemuan[S.adm.mi].kartu.push({id:uid("k"),depan:"",belakang:""});markDirty();render();break;
  case "a-add-soal": EDIT.program[S.adm.pi].pertemuan[S.adm.mi].soal.push({id:uid("s"),tipe:"pg",tanya:"",opsi:["","","",""],jawab:0,bahas:""});markDirty();render();break;
  case "a-add-link":{const n=$("#nb-nama").value.trim(),u=$("#nb-url").value.trim();if(!/^https?:\/\//.test(u)){toast("Tautan harus diawali https://");return}EDIT.program[S.adm.pi].pertemuan[S.adm.mi].berkas.push({nama:n||u,url:u});markDirty();render();break}
  case "a-ai": aiGen(v);break;
  case "a-add-ann": (EDIT.pengumuman=EDIT.pengumuman||[]).unshift({id:uid("p"),judul:"",isi:"",tanggal:dayKey()});markDirty();render();break;
  case "a-add-jad": (EDIT.jadwal=EDIT.jadwal||[]).push({id:uid("j"),judul:"",program:"",waktu:dayKey()+"T19:30",tempat:"",link:""});markDirty();render();break;
  case "a-del": if(!t.dataset.armed){t.dataset.armed=1;t.textContent="Yakin hapus? Ketuk lagi";return}{const ks=t.dataset.path.split(".");const idx=+ks.pop();const arr=getPath(EDIT,ks.join("."));arr.splice(idx,1);if(ks.length===3&&ks[2]==="pertemuan"&&S.adm)S.adm=null;if(ks.length===1&&ks[0]==="program")S.adm=null;markDirty();render();}break;
  case "a-publish": publishData();break;
  case "a-copy":{const txt=JSON.stringify(EDIT,null,1);const done=()=>toast("Data disalin. Tempel ke Claude untuk diterbitkan.");try{navigator.clipboard.writeText(txt).then(done,()=>toast("Tidak bisa menyalin otomatis di tampilan ini"))}catch(_){toast("Tidak bisa menyalin otomatis di tampilan ini")}break}
  case "a-restore": EDIT=clone(S.draftOffer.data);S.draftOffer=null;dirty=true;render();break;
  case "a-discard": LS.del("draft");S.draftOffer=null;render();break;
 }
});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches(".tap,.flash")){e.preventDefault();e.target.click()}});
document.addEventListener("submit",e=>{const f=e.target.closest("[data-form]");if(!f)return;e.preventDefault();
 if(f.dataset.form==="masuk"){masukPeserta($("#ms-nama").value.trim(),$("#ms-wa").value.trim());return}
 if(f.dataset.form==="admin"){masukAdmin($("#ad-email").value.trim(),$("#ad-pass").value);return}const v=(f.querySelector("input").value||"").trim();LS.set("nama",v);S.certUrl=null;syncMe();toast(v?"Ahlan wa sahlan, "+v:"Nama dihapus");render()});
let noteT;
document.addEventListener("input",e=>{const t=e.target;
 if(t.id==="in-cari"){S.q=t.value;render();return}
 if(t.id==="in-glos"){S.gq=t.value;render();return}
 if(t.id==="in-tanya"){S.tanya=t.value;return}
 if(t.id==="g-key"){LS.set("gkey",t.value.trim());return}
 if(t.id==="g-model"){LS.set("gmodel",t.value.trim());return}
 if(t.dataset.jw){S.jw[t.dataset.jw]=t.value;return}
 if(t.id==="in-note"){clearTimeout(noteT);noteT=setTimeout(()=>{const n=LS.get("notes",{});n[t.dataset.mid]=t.value;LS.set("notes",n)},400);return}
 if(t.dataset.bind&&EDIT){let v=t.value;if(t.dataset.type==="num")v=+v;if(t.dataset.type==="bool")v=v==="true";if(t.dataset.type==="check")v=t.checked;if(t.type==="number")v=v===""?0:+v;setPath(EDIT,t.dataset.bind,v);markDirty();if(t.tagName==="SELECT")render()}
});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="imp-file"&&t.files[0]){const f=t.files[0];t.value="";f.text().then(importData,()=>toast("Berkas tidak bisa dibaca"));return}
 if(t.dataset.qs){S.qs[t.dataset.qs]=t.value;if(t.dataset.qs==="prog")S.qs.bab="all";render();return}
 if(t.dataset.actChange==="a-tipe"){const s=getPath(EDIT,t.dataset.path);s.tipe=t.value;if(s.tipe==="bs"){s.jawab=true;delete s.opsi}else{s.opsi=s.opsi||["","","",""];s.jawab=0}markDirty();render()}
});
document.addEventListener("toggle",e=>{const d=e.target;if(d.matches&&d.matches("details.adm")&&d.open)S.openProg=d.dataset.prog},true);

function viewProfil(){
 const nama=LS.get("nama",""), hist=LS.get("scores",[]), avg=avgScore();
 return `
 <section class="card" style="display:flex;gap:16px;align-items:center"><img src="img/logo-emblem.png" alt="" style="width:64px;height:auto;flex:none"><div style="flex:1;min-width:0"><div class="eyebrow">${isAdmin?"Pengelola":"Peserta"}${PROFIL&&PROFIL.wa?" · "+esc(PROFIL.wa):""}</div><form class="row" data-form="nama" style="margin-top:6px;flex-wrap:nowrap"><input id="in-nama2" class="search" value="${esc(nama)}" placeholder="Nama antum" aria-label="Nama"><button class="btn sm pri" type="submit">Simpan</button></form></div></section>
 <section class="stats"><div class="stat"><b>${streak()}</b><span>hari beruntun</span></div><div class="stat"><b>${Object.keys(srs()).length}</b><span>kartu dipelajari</span></div><div class="stat"><b>${hist.length}</b><span>latihan dikerjakan</span></div><div class="stat"><b>${avg==null?"–":avg+"%"}</b><span>rata-rata</span></div></section>
 <section class="stack"><div class="sec-h"><h2>Progres per program</h2></div>${progs().map(progCard).join("")}</section>
 <section class="card flat stack"><b>Pasang aplikasi di HP</b>${S.installEvt?`<button class="btn gold" data-act="install">Pasang Majelis Mudzakaroh</button>`:""}<div class="small muted"><b>Android (Chrome):</b> ketuk menu ⋮ lalu “Instal aplikasi” atau “Tambahkan ke layar utama”.<br><b>iPhone (Safari):</b> ketuk tombol Bagikan lalu “Tambahkan ke Layar Utama”.</div></section>
 <section class="card flat stack"><b>Tentang data antum</b><div class="small muted">${SB&&ME?"Ringkasan progres antum (poin, materi selesai, nilai rata-rata) tercatat di majelis agar ustadz bisa memantau. Detail hafalan dan catatan pribadi tetap di HP ini.":"Progres, nilai, catatan, dan hafalan tersimpan di HP ini."}</div><div class="row"><button class="btn sm danger" data-act="reset">Hapus progres di HP ini</button>${SB&&ME?`<button class="btn sm" data-act="keluar">Keluar</button>`:""}</div></section>
 ${isAdmin?`<button class="btn gold block" data-act="tab" data-v="kelola">Buka mode pengelola</button>`:""}
 ${doa()}`;
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();S.installEvt=e;if(S.tab==="profil")render()});
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});

/* ---------- boot ---------- */
(async function boot(){
 const h=(location.hash||"").slice(1);if(TABS.some(t=>t[0]===h)||h==="kelola")S.tab=h;
 try{
  if(SB){try{const {data,error}=await SB.from("konten").select("data").eq("id",1).maybeSingle();if(error)throw error;DATA=data&&data.data}catch(err){S.dbErr=(err&&err.message)||"tidak terhubung";console.warn("konten:",err)}}
  if(!DATA){const r=await fetch("data.json",{cache:"no-store"});if(!r.ok)throw 0;DATA=await r.json()}
  LS.set("cache",DATA);
 }catch(e){DATA=LS.get("cache",null);offline=!!DATA}
 if(!DATA){$("#main").innerHTML=`<div class="empty">Materi belum bisa dimuat. Periksa koneksi internet lalu buka ulang halaman.</div>`;return}
 DATA.program=DATA.program||[];
 if(SB){
  const {data:{session}}=await SB.auth.getSession();
  if(session){SESSION=session;ME=session.user.id;
   if(!session.user.is_anonymous){const r=await SB.rpc("is_admin");isAdmin=!!r.data}
   const {data:pr}=await SB.from("peserta").select("*").eq("id",ME).maybeSingle();PROFIL=pr||null;
   if(PROFIL&&!LS.get("nama",""))LS.set("nama",PROFIL.nama);
  }
  if(!PROFIL&&!isAdmin)S.tab="masuk";
  else if(S.tab==="kelola"&&!isAdmin)S.tab="beranda";
  if(isAdmin)loadRekap();
  loadTanya(true);loadPapan(true);
 }else if(S.tab==="kelola")S.tab="beranda";
 render();
 if(PROFIL)syncMe();
})();
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
