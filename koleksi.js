/* =====================================================================
   KOLEKSIKU — ruang belajar pribadi peserta
   Peserta menambah materi sendiri (teks, PDF, audio, YouTube), lalu AI
   meringkas dan membuat kartu murojaah + soal. Peserta juga bisa menambah
   kaidah dan soal sendiri. Semua masuk ke Murojaah dan Latihan.
   ===================================================================== */
const KATEGORI=["Tafsir","Fiqih","Aqidah","Tazkiyatun Nafs","Hadits","Sirah","Bahasa Arab","Lainnya"];
const JENIS={teks:{l:"Teks",i:"text"},pdf:{l:"Buku PDF",i:"file"},audio:{l:"Audio",i:"mic"},youtube:{l:"YouTube",i:"yt"}};
const KOL={items:[],loaded:false,busy:{},teks:{},url:{}};
const BAHASA={otomatis:{l:"Ikuti materi",d:"Kitab berbahasa Arab → hasil berbahasa Arab; materi Indonesia → bahasa Indonesia."},arab:{l:"العربية",d:"Seluruh ringkasan, kartu, dan soal dalam bahasa Arab dengan ibarat asli kitab."},dua:{l:"Arab + Indonesia",d:"Ibarat Arab asli disertai terjemah dan penjelasan bahasa Indonesia."},indonesia:{l:"Indonesia",d:"Penjelasan bahasa Indonesia; dalil dan kaidah tetap dikutip lafazh Arabnya."}};
const kolBhs=x=>(x&&x.bahasa)||(LS.get("kolbhs",{})[x&&x.id])||"otomatis";
let KOL_HAS_BHS=true;
S.kFilter="Semua";S.kSel=null;S.kForm=null;S.kNew={depan:"",belakang:""};S.kSoal={tipe:"pg",tanya:"",opsi:["","","",""],jawab:0,bahas:""};S.kEditRing=null;

function kolProg(){if(!KOL.items.length)return[];return[{id:"koleksi",nama:"Koleksiku",pertemuan:KOL.items.map(x=>({id:x.id,judul:x.judul,kartu:x.kartu||[],soal:x.soal||[]}))}]}
const kolGet=id=>KOL.items.find(x=>x.id===id);
const KOLS0="id,judul,kategori,jenis,sumber_url,sumber_path,mime,ukuran,ringkasan,kartu,soal,status,galat,created_at,updated_at";
const kolCols=()=>KOL_HAS_BHS?KOLS0+",bahasa":KOLS0;

async function loadKol(){
 if(!SB||!ME)return;
 if(!KOL.loaded){const c=LS.get("kol_"+ME,null);if(c){KOL.items=c;}}
 let {data,error}=await SB.from("materi_pribadi").select(kolCols()).order("created_at",{ascending:false});
 if(error&&/bahasa/.test(error.message||"")){KOL_HAS_BHS=false;({data,error}=await SB.from("materi_pribadi").select(kolCols()).order("created_at",{ascending:false}))}
 if(error){KOL.err=error.message;if(S.tab==="koleksi")render();return}
 KOL.items=data||[];KOL.loaded=true;KOL.err=null;LS.set("kol_"+ME,KOL.items);
 if(["koleksi","beranda","murojaah","latihan"].includes(S.tab))render();
}
function kolCache(){if(ME)LS.set("kol_"+ME,KOL.items)}
async function kolSave(id,patch){
 const it=kolGet(id);if(it)Object.assign(it,patch);kolCache();
 const {error}=await SB.from("materi_pribadi").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)toast("Belum tersimpan: "+error.message);
 return !error;
}

/* ---------- beranda teaser ---------- */
function kolTeaser(){
 if(!SB||!ME)return "";
 const n=KOL.items.length,k=KOL.items.reduce((a,x)=>a+(x.kartu||[]).length,0),s=KOL.items.reduce((a,x)=>a+(x.soal||[]).length,0);
 return `<section class="kol-teaser tap" data-act="tab" data-v="koleksi" tabindex="0">
  <div class="kt-ic">${svg("spark")}</div>
  <div style="flex:1;min-width:0"><div class="eyebrow">Ruang belajarku</div><b>${n?`${n} materi · ${k} kaidah · ${s} soal`:"Simpan kajian favorit antum"}</b><div class="small muted">${n?"Lanjutkan murojaah dari koleksi pribadi antum.":"Tafsir, fiqih, aqidah, tazkiyatun nafs — AI meringkas dan membuat kartu serta soal."}</div></div>
  <span class="kt-go">›</span></section>`;
}

/* ---------- daftar ---------- */
function viewKoleksi(){
 if(!SB)return `<div class="empty">Koleksiku aktif setelah website tersambung ke database.</div>`;
 if(!ME)return `<section class="card stack"><b>Masuk dulu untuk memakai Koleksiku</b><div class="small muted">Koleksi pribadi disimpan atas nama antum.</div><button class="btn pri" data-act="keluar">Masuk</button></section>`;
 if(S.kForm)return viewKolForm();
 if(S.kSel&&kolGet(S.kSel))return viewKolDetail(kolGet(S.kSel));
 if(!KOL.loaded&&!KOL.items.length)loadKol();
 const items=KOL.items, f=S.kFilter;
 const cats=["Semua",...new Set([...KATEGORI.filter(c=>items.some(x=>x.kategori===c)),...items.map(x=>x.kategori)])];
 const list=f==="Semua"?items:items.filter(x=>x.kategori===f);
 const nk=items.reduce((a,x)=>a+(x.kartu||[]).length,0), ns=items.reduce((a,x)=>a+(x.soal||[]).length,0);
 const st=srs(), due=allCards((p)=>p.id==="koleksi").filter(c=>isDue(c.id,st)).length;
 return `
 <section class="greet kol-hero fade">
  <div class="eyebrow" style="color:#CFE3BE">Ruang belajarku</div>
  <h1>Koleksi ilmu pribadi antum</h1>
  <div class="dates just">Simpan kajian yang antum pelajari sendiri — tulisan, buku PDF, rekaman audio, atau video YouTube. AI membantu meringkas dan menyiapkan kartu murojaah serta soal latihan.</div>
  <div class="row" style="margin-top:14px"><button class="btn gold" data-act="k-new">＋ Tambah materi</button>${due?`<button class="btn sm" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.45)" data-act="mur-start" data-v="koleksi-all">Murojaah koleksi (${due})</button>`:""}</div>
 </section>
 ${items.length?`<section class="stats"><div class="stat"><b>${items.length}</b><span>materi</span></div><div class="stat"><b>${nk}</b><span>kaidah & kartu</span></div><div class="stat"><b>${ns}</b><span>soal latihan</span></div><div class="stat"><b>${new Set(items.map(x=>x.kategori)).size}</b><span>kategori</span></div></section>
 <div class="chips">${cats.map(c=>`<button class="chip ${c===f?"on":""}" data-act="k-filter" data-v="${esc(c)}">${esc(c)}${c!=="Semua"?` <span class="cnt">${items.filter(x=>x.kategori===c).length}</span>`:""}</button>`).join("")}</div>
 <section class="stack">${list.map(kolCard).join("")}</section>`
 :`<section class="card stack kol-empty"><div class="sec-h"><h2>Mulai dalam tiga langkah</h2></div>
   <div class="kol-step"><span>1</span><div><b>Tambahkan materi</b><div class="small muted">Tempel teks, unggah buku PDF atau rekaman audio, atau tempel tautan YouTube.</div></div></div>
   <div class="kol-step"><span>2</span><div><b>AI meringkas</b><div class="small muted">Ringkasan, kartu kaidah, dan soal latihan disiapkan otomatis dari materi itu.</div></div></div>
   <div class="kol-step"><span>3</span><div><b>Murojaah setiap hari</b><div class="small muted">Tambah kaidah dan soal sendiri, lalu ulangi lewat Murojaah dan Latihan.</div></div></div>
   <button class="btn pri block" data-act="k-new">＋ Tambah materi pertama</button></section>`}
 ${KOL.err?`<div class="card flat small" style="background:var(--warn-bg);border-color:var(--gold)">Koleksi belum bisa dimuat: ${esc(KOL.err)}. Pastikan pengelola sudah menjalankan supabase-koleksi.sql.</div>`:""}`;
}
function kolStatus(x){
 if(KOL.busy[x.id])return `<span class="pill gold"><span class="spin"></span> ${esc(KOL.busy[x.id])}</span>`;
 return x.status==="siap"?`<span class="pill good">✦ Siap</span>`:x.status==="gagal"?`<span class="pill" style="background:var(--bad-bg);color:var(--bad)">Gagal diproses</span>`:x.status==="diproses"?`<span class="pill gold">Belum selesai</span>`:`<span class="pill">Manual</span>`;
}
function kolCard(x){
 const j=JENIS[x.jenis]||JENIS.teks;
 return `<div class="card tap kol-card" data-act="k-open" data-v="${x.id}" tabindex="0">
  <div class="kc-ic k-${x.jenis}">${svg(j.i)}</div>
  <div class="t"><div class="row" style="gap:6px"><span class="pill">${esc(x.kategori)}</span>${kolStatus(x)}</div>
   <h3>${rich(x.judul)}</h3>
   <div class="small muted">${j.l} · ${(x.kartu||[]).length} kartu · ${(x.soal||[]).length} soal · ${fmtAgo(x.created_at)}</div></div></div>`;
}

/* ---------- form tambah ---------- */
function viewKolForm(){
 const F=S.kForm, j=F.jenis;
 const isPreset=KATEGORI.includes(F.kategori);
 return `<button class="back" data-act="k-cancel">← Koleksiku</button>
 <section class="phead"><div class="eyebrow">Materi baru</div><h1>Tambah ke koleksi</h1></section>
 <section class="card stack" style="gap:16px">
  <div class="field"><label>Jenis materi</label><div class="kseg">${Object.entries(JENIS).map(([k,v])=>`<button data-act="k-jenis" data-v="${k}" class="${j===k?"on":""}">${svg(v.i)}<span>${v.l}</span></button>`).join("")}</div></div>
  <div class="field"><label for="kf-judul">Judul</label><input dir="auto" id="kf-judul" data-kf="judul" value="${esc(F.judul)}" placeholder="${j==="youtube"?"Boleh dikosongkan, AI akan menyarankan judul":"Contoh: Tafsir Surat Al-Fatihah ayat 1–4"}"></div>
  <div class="field"><label>Kategori</label><div class="chips wrap">${KATEGORI.map(c=>`<button class="chip ${F.kategori===c?"on":""}" data-act="k-kat" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>
   <input id="kf-kat" data-kf="kategori" value="${isPreset?"":esc(F.kategori)}" placeholder="Atau tulis kategori sendiri, misalnya Ushul Fiqh" style="margin-top:6px"></div>
  ${j==="teks"?`<div class="field"><label for="kf-teks">Isi materi</label><textarea dir="auto" id="kf-teks" data-kf="teks" rows="10" placeholder="Tempel catatan kajian, terjemahan kitab, atau tulisan antum di sini. Panjang tidak dibatasi.">${esc(F.teks)}</textarea><span class="small muted">${F.teks.length.toLocaleString("id-ID")} karakter</span></div>`:""}
  ${j==="youtube"?`<div class="field"><label for="kf-yt">Tautan video YouTube</label><input id="kf-yt" data-kf="youtube" type="url" value="${esc(F.youtube)}" placeholder="https://youtu.be/…"><span class="small muted">AI menyimak isi video (video publik atau tidak publik).</span></div>`:""}
  ${j==="pdf"||j==="audio"?`<div class="field"><label>${j==="pdf"?"Berkas buku PDF":"Berkas audio (MP3, M4A, WAV, OGG)"}</label>
   <label class="kdrop" for="kf-file">${svg(j==="pdf"?"file":"mic")}<b>${F.file?esc(F.file.name):"Pilih berkas"}</b><span class="small muted">${F.file?(F.file.size/1048576).toFixed(1)+" MB":"Maksimal 50 MB per berkas"}</span></label>
   <input id="kf-file" type="file" hidden accept="${j==="pdf"?"application/pdf,.pdf":"audio/*,.mp3,.m4a,.wav,.ogg,.aac"}"></div>`:""}
  <div class="field"><label>Bahasa ringkasan, kartu & soal</label><div class="kbhs">${Object.entries(BAHASA).map(([k,v])=>`<button data-act="k-bhs" data-v="${k}" class="${(F.bahasa||"otomatis")===k?"on":""}"><b ${k==="arab"?'class="ar"':""}>${v.l}</b></button>`).join("")}</div><span class="small muted">${BAHASA[F.bahasa||"otomatis"].d}</span></div>
  <label class="kai"><input type="checkbox" id="kf-ai" ${F.ai?"checked":""}><span><b>${svg("spark")} Ringkas otomatis dengan AI</b><span class="small muted">Membuat ringkasan, kartu kaidah, dan soal latihan. Bisa 1–3 menit untuk buku dan rekaman panjang.</span></span></label>
  <button class="btn pri block" data-act="k-submit">${F.ai?"Simpan & ringkas":"Simpan"}</button>
 </section>`;
}
async function kolSubmit(){
 const F=S.kForm;const kat=(F.kategori||"").trim()||"Lainnya";
 if(F.jenis==="teks"&&F.teks.trim().length<30){toast("Isi materi minimal 30 karakter");return}
 if(F.jenis==="youtube"&&!/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(F.youtube.trim())){toast("Tautan YouTube belum benar");return}
 if((F.jenis==="pdf"||F.jenis==="audio")&&!F.file){toast("Pilih berkasnya dulu");return}
 if(F.file&&F.file.size>50*1048576){toast("Berkas lebih dari 50 MB. Perkecil dulu atau bagi menjadi beberapa bagian.");return}
 const b=document.querySelector('[data-act="k-submit"]');if(b){b.disabled=true;b.textContent="Menyimpan…"}
 const row={judul:F.judul.trim()||(F.file?F.file.name.replace(/\.[^.]+$/,""):"(tanpa judul)"),kategori:kat,jenis:F.jenis,status:F.ai?"diproses":"manual",kartu:[],soal:[]};
 const bhs=F.bahasa||"otomatis";if(KOL_HAS_BHS)row.bahasa=bhs;
 if(F.jenis==="teks")row.teks=F.teks;
 if(F.jenis==="youtube")row.sumber_url=F.youtube.trim();
 let {data,error}=await SB.from("materi_pribadi").insert(row).select(kolCols()).single();
 if(error&&/bahasa/.test(error.message||"")){KOL_HAS_BHS=false;delete row.bahasa;({data,error}=await SB.from("materi_pribadi").insert(row).select(kolCols()).single())}
 if(data){const m=LS.get("kolbhs",{});m[data.id]=bhs;LS.set("kolbhs",m);data.bahasa=bhs}
 if(error){toast("Belum tersimpan: "+error.message);if(b){b.disabled=false;b.textContent="Simpan"}return}
 KOL.items.unshift(data);if(F.jenis==="teks")KOL.teks[data.id]=F.teks;
 const file=F.file,ai=F.ai;S.kForm=null;S.kSel=data.id;kolCache();render(true);
 if(file){
  KOL.busy[data.id]="Mengunggah berkas…";render();
  const path=`${ME}/${data.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g,"_")}`;
  const up=await SB.storage.from("pribadi").upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(up.error){delete KOL.busy[data.id];await kolSave(data.id,{status:"gagal",galat:"Unggah gagal: "+up.error.message});render();return}
  await kolSave(data.id,{sumber_path:path,mime:file.type||"",ukuran:file.size});delete KOL.busy[data.id];
 }
 if(ai)kolProses(data.id);else render();
}

/* ---------- proses AI ---------- */
async function kolProses(id){
 const x=kolGet(id);if(!x||KOL.busy[id])return;
 KOL.busy[id]="Menyiapkan…";render();
 try{
  const body={mode:"materi",jenis:x.jenis,judul:x.judul,kategori:x.kategori,bahasa:kolBhs(x)};
  if(x.jenis==="teks"){let t=KOL.teks[id];if(t==null){const r=await SB.from("materi_pribadi").select("teks").eq("id",id).single();t=(r.data&&r.data.teks)||"";KOL.teks[id]=t}body.teks=t;}
  if(x.jenis==="youtube")body.youtube=x.sumber_url;
  if(x.jenis==="pdf"||x.jenis==="audio"){if(!x.sumber_path)throw new Error("Berkas belum terunggah");const s=await SB.storage.from("pribadi").createSignedUrl(x.sumber_path,1800);if(s.error)throw new Error(s.error.message);body.url=s.data.signedUrl;body.mime=x.mime}
  KOL.busy[id]=x.jenis==="youtube"?"AI sedang menyimak video…":x.jenis==="audio"?"AI sedang mendengarkan…":"AI sedang membaca…";render();
  await kolSave(id,{status:"diproses",galat:null});
  const {data:{session}}=await SB.auth.getSession();
  const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(session&&session.access_token)},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({error:"Layanan AI tidak menjawab ("+r.status+")"}));
  if(!r.ok||!j.ok)throw new Error(j.error||("Kode "+r.status));
  const h=j.hasil||{};
  const kartu=(Array.isArray(h.kartu)?h.kartu:[]).filter(k=>k&&k.depan&&k.belakang).map(k=>({id:uid("kk"),depan:String(k.depan),belakang:String(k.belakang),ai:true}));
  const soal=[];(Array.isArray(h.soal)?h.soal:[]).forEach(s=>{if(!s||!s.tanya)return;
   if(s.tipe==="bs"&&typeof s.jawab==="boolean")soal.push({id:uid("ks"),tipe:"bs",tanya:String(s.tanya),jawab:s.jawab,bahas:String(s.bahas||""),ai:true});
   else if(Array.isArray(s.opsi)&&s.opsi.length>=2&&Number.isInteger(s.jawab)&&s.jawab>=0&&s.jawab<s.opsi.length)soal.push({id:uid("ks"),tipe:"pg",tanya:String(s.tanya),opsi:s.opsi.slice(0,4).map(String),jawab:Math.min(s.jawab,3),bahas:String(s.bahas||""),ai:true})});
  const cur=kolGet(id);
  const patch={ringkasan:String(h.ringkasan||"").trim()||cur.ringkasan||"",kartu:(cur.kartu||[]).filter(k=>!k.ai||k.minta).concat(kartu),soal:(cur.soal||[]).filter(s=>!s.ai||s.minta).concat(soal),status:"siap",galat:null};
  if((!cur.judul||cur.judul==="(tanpa judul)"||cur.jenis==="youtube"&&/^https?:/.test(cur.judul))&&h.judul_saran)patch.judul=String(h.judul_saran).slice(0,140);
  delete KOL.busy[id];await kolSave(id,patch);toast(`Selesai: ${kartu.length} kartu dan ${soal.length} soal disiapkan`+(j.sisa!=null?` · sisa ${j.sisa} proses hari ini`:""));
 }catch(e){delete KOL.busy[id];await kolSave(id,{status:"gagal",galat:String(e.message||e).slice(0,300)});toast("AI belum berhasil memproses materi ini")}
 render();
}

/* ---------- detail ---------- */
function viewKolDetail(x){
 const j=JENIS[x.jenis]||JENIS.teks, busy=KOL.busy[x.id];
 if((x.jenis==="pdf"||x.jenis==="audio")&&x.sumber_path&&!KOL.url[x.id]){KOL.url[x.id]="…";SB.storage.from("pribadi").createSignedUrl(x.sumber_path,3600).then(r=>{if(r.data){KOL.url[x.id]=r.data.signedUrl;if(S.kSel===x.id)render()}})}
 const url=KOL.url[x.id]&&KOL.url[x.id]!=="…"?KOL.url[x.id]:null;
 const N=S.kNew,Q=S.kSoal;
 return `<button class="back" data-act="k-back">← Koleksiku</button>
 <section class="phead fade"><div class="row" style="gap:6px"><span class="pill">${esc(x.kategori)}</span><span class="pill">${j.l}</span>${kolStatus(x)}</div>
  <h1 style="margin-top:8px">${rich(x.judul)}</h1><div class="small muted" style="margin-top:4px">Ditambahkan ${fmtAgo(x.created_at)}${x.ukuran?` · ${(x.ukuran/1048576).toFixed(1)} MB`:""}</div></section>
 ${x.jenis==="youtube"||x.jenis==="pdf"?`<section class="linkrow">`:""}
  ${x.jenis==="youtube"?`<a class="lcard" href="${esc(x.sumber_url)}" target="_blank" rel="noopener"><span class="ic" style="background:#FDE3E0;color:#C4302B">${svg("yt")}</span><span style="min-width:0">Tonton video<small>YouTube</small></span></a>`:""}
  ${x.jenis==="pdf"?`<a class="lcard ${url?"":"off"}" href="${esc(url||"#")}" target="_blank" rel="noopener"><span class="ic" style="background:var(--warn-bg);color:var(--orange)">${svg("file")}</span><span style="min-width:0">Buka buku<small>PDF</small></span></a>`:""}
 ${x.jenis==="youtube"||x.jenis==="pdf"?`</section>`:""}
 ${x.jenis==="audio"&&url?`<audio class="kaudio" controls preload="none" src="${esc(url)}"></audio>`:""}
 ${x.jenis==="teks"?`<details class="card ksrc" data-v="${x.id}" ${S.kTeksOpen===x.id?"open":""}><summary><b>Teks sumber</b><span class="small muted">ketuk untuk membuka</span></summary>
  <div class="row" style="margin-top:10px;gap:8px"><button class="btn sm pri" data-act="k-salin" data-v="${x.id}">${svg("copy").replace('<svg','<svg width="16" height="16"')} Salin seluruh teks</button>${KOL.teks[x.id]!=null?`<span class="small muted">${KOL.teks[x.id].length.toLocaleString("id-ID")} karakter</span>`:""}</div>
  <div class="prose" style="margin-top:10px">${KOL.teks[x.id]!=null?para(KOL.teks[x.id]):"Memuat…"}</div></details>`:""}
 ${busy?`<section class="card kbusy"><div class="kb-dots"><i></i><i></i><i></i></div><b>${esc(busy)}</b><div class="small muted">Biarkan halaman ini terbuka. Untuk buku dan rekaman panjang bisa 1–3 menit.</div></section>`:""}
 ${!busy&&x.status==="gagal"?`<section class="card flat stack" style="background:var(--bad-bg);border-color:var(--bad)"><b>AI belum berhasil memproses materi ini</b><div class="small">${esc(x.galat||"")}</div><div><button class="btn sm pri" data-act="k-proses" data-v="${x.id}">Coba lagi</button></div></section>`:""}
 ${!busy&&x.status==="diproses"?`<section class="card flat stack" style="background:var(--warn-bg);border-color:var(--gold)"><b>Proses AI terhenti sebelum selesai</b><div><button class="btn sm pri" data-act="k-proses" data-v="${x.id}">Lanjutkan proses</button></div></section>`:""}
 <section class="grid2">
  <button class="btn" data-act="mur-start" data-v="koleksi:${x.id}" ${(x.kartu||[]).length?"":"disabled"}>${svg("cards").replace('<svg','<svg width="18" height="18"')} Murojaah (${(x.kartu||[]).length})</button>
  <button class="btn" data-act="k-latihan" data-v="${x.id}" ${(x.soal||[]).length?"":"disabled"}>${svg("quiz").replace('<svg','<svg width="18" height="18"')} Latihan (${(x.soal||[]).length})</button>
 </section>
 <section class="card ringkas"><div class="eyebrow" style="margin-bottom:12px">Ringkasan</div>
  ${S.kEditRing===x.id?`<div class="field"><textarea dir="auto" id="k-ring" rows="10">${esc(x.ringkasan||"")}</textarea></div><div class="row" style="margin-top:8px"><button class="btn sm pri" data-act="k-ring-save" data-v="${x.id}">Simpan ringkasan</button><button class="btn sm" data-act="k-ring-cancel">Batal</button></div>`
  :x.ringkasan?`<div class="prose">${para(x.ringkasan)}</div><div class="row" style="margin-top:10px;gap:8px"><button class="btn sm ghost" data-act="k-ring-edit" data-v="${x.id}">Ubah ringkasan</button><button class="btn sm ghost" data-act="k-salin-ring" data-v="${x.id}">Salin ringkasan</button></div>`
  :`<div class="small muted">${busy?"Ringkasan sedang disiapkan…":"Belum ada ringkasan."}</div><div class="row" style="margin-top:10px">${!busy?`<button class="btn sm gold" data-act="k-proses" data-v="${x.id}">${svg("spark").replace('<svg','<svg width="16" height="16"')} Ringkas dengan AI</button>`:""}<button class="btn sm ghost" data-act="k-ring-edit" data-v="${x.id}">Tulis sendiri</button></div>`}
 </section>
 <section class="card stack"><div class="sec-h"><h2>Kaidah & kartu murojaah</h2><span class="pill">${(x.kartu||[]).length}</span></div>
  ${(x.kartu||[]).map(k=>`<div class="kitem"><div style="flex:1;min-width:0"><b>${rich(k.depan)}</b><div class="small muted just">${rich(k.belakang)}</div></div>${k.minta?`<span class="pill good" title="Disusun AI dari teks antum">AI·Saya</span>`:k.ai?`<span class="pill gold" title="Dibuat AI">AI</span>`:`<span class="pill good">Saya</span>`}<button class="kdel" data-act="k-del-kartu" data-v="${k.id}" aria-label="Hapus kartu">${svg("trash")}</button></div>`).join("")||`<div class="small muted">Belum ada kartu.</div>`}
  ${kolSusunBox(x,"kartu")}
  <div class="kadd"><div class="eyebrow">Tambah kaidah sendiri</div>
   <div class="field"><label for="kn-depan">Kaidah / istilah</label><input dir="auto" id="kn-depan" data-kn="depan" value="${esc(N.depan)}" placeholder="Contoh: الأصل في الأشياء الإباحة"></div>
   <div class="field"><label for="kn-belakang">Makna / penjelasan</label><textarea dir="auto" id="kn-belakang" data-kn="belakang" rows="3" placeholder="Hukum asal segala sesuatu adalah mubah…">${esc(N.belakang)}</textarea></div>
   <div><button class="btn sm pri" data-act="k-add-kartu" data-v="${x.id}">＋ Tambah kaidah</button></div></div>
 </section>
 <section class="card stack"><div class="sec-h"><h2>Soal latihan</h2><span class="pill">${(x.soal||[]).length}</span></div>
  ${(x.soal||[]).map((s,n)=>`<div class="kitem"><div style="flex:1;min-width:0"><b>${n+1}. ${rich(s.tanya)}</b><div class="small muted">Jawaban: ${rich(s.tipe==="bs"?(s.jawab?"Benar":"Salah"):(s.opsi||[])[s.jawab]||"")}</div></div>${s.minta?`<span class="pill good">AI·Saya</span>`:s.ai?`<span class="pill gold">AI</span>`:`<span class="pill good">Saya</span>`}<button class="kdel" data-act="k-del-soal" data-v="${s.id}" aria-label="Hapus soal">${svg("trash")}</button></div>`).join("")||`<div class="small muted">Belum ada soal.</div>`}
  ${kolSusunBox(x,"soal")}
  <div class="kadd"><div class="eyebrow">Tambah soal sendiri</div>
   <div class="seg"><button data-act="k-soal-tipe" data-v="pg" class="${Q.tipe==="pg"?"on":""}">Pilihan ganda</button><button data-act="k-soal-tipe" data-v="bs" class="${Q.tipe==="bs"?"on":""}">Benar / Salah</button></div>
   <div class="field"><label for="ks-tanya">Pertanyaan</label><textarea dir="auto" id="ks-tanya" data-ks="tanya" rows="2">${esc(Q.tanya)}</textarea></div>
   ${Q.tipe==="pg"?`<div class="grid2">${Q.opsi.map((o,i)=>`<div class="field"><label for="ks-o${i}">Opsi ${"ABCD"[i]}</label><input dir="auto" id="ks-o${i}" data-ks="opsi.${i}" value="${esc(o)}"></div>`).join("")}</div>
    <div class="field"><label for="ks-jawab">Jawaban benar</label><select id="ks-jawab" data-ks="jawab">${[0,1,2,3].map(i=>`<option value="${i}" ${Q.jawab===i?"selected":""}>Opsi ${"ABCD"[i]}</option>`).join("")}</select></div>`
   :`<div class="field"><label for="ks-jawab">Jawaban benar</label><select id="ks-jawab" data-ks="jawab"><option value="true" ${Q.jawab===true?"selected":""}>Benar</option><option value="false" ${Q.jawab===false?"selected":""}>Salah</option></select></div>`}
   <div class="field"><label for="ks-bahas">Pembahasan (opsional)</label><textarea dir="auto" id="ks-bahas" data-ks="bahas" rows="2">${esc(Q.bahas)}</textarea></div>
   <div><button class="btn sm pri" data-act="k-add-soal" data-v="${x.id}">＋ Tambah soal</button></div></div>
 </section>
 <section class="card stack"><div class="eyebrow">Bahasa hasil AI</div><div class="kbhs">${Object.entries(BAHASA).map(([k,v])=>`<button data-act="k-bhs-ubah" data-v="${k}" class="${kolBhs(x)===k?"on":""}"><b ${k==="arab"?'class="ar"':""}>${v.l}</b></button>`).join("")}</div><span class="small muted">Pilih bahasa lalu ketuk “Proses ulang dengan AI”. Kaidah dan soal buatan antum sendiri tidak terhapus.</span></section>
 <section class="row" style="justify-content:space-between">
  ${!busy&&(x.jenis!=="teks"||true)?`<button class="btn sm" data-act="k-proses" data-v="${x.id}">${svg("spark").replace('<svg','<svg width="16" height="16"')} Proses ulang dengan AI</button>`:"<span></span>"}
  <button class="btn sm danger" data-act="k-hapus" data-v="${x.id}">Hapus materi</button>
 </section>`;
}

/* ---------- salin & susun dengan AI ---------- */
function kolCopy(t,ok){if(!t){toast("Teks masih kosong");return}
 const fb=()=>{const ta=document.createElement("textarea");ta.value=t;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:0;left:0;opacity:0";document.body.appendChild(ta);ta.select();let done=false;try{done=document.execCommand("copy")}catch(e){}ta.remove();toast(done?ok:"Tidak bisa menyalin otomatis. Tekan lama teks lalu pilih Salin.")};
 try{navigator.clipboard.writeText(t).then(()=>toast(ok),fb)}catch(e){fb()}}
S.kSusun={kartu:{teks:"",instruksi:""},soal:{teks:"",instruksi:""}};
function kolSusunBox(x,h){const D=S.kSusun[h],busy=KOL.busy["susun-"+h+x.id];
 return `<div class="ksusun"><div class="eyebrow">${svg("spark").replace('<svg','<svg width="14" height="14"')} ${h==="kartu"?"Susun kaidah dengan AI":"Susun soal dengan AI"}</div>
  <div class="small muted just">${h==="kartu"?"Tempel atau ketik teks (satu kaidah, satu paragraf, atau satu bab). AI merapikannya menjadi kartu kaidah sesuai permintaan antum.":"Tempel teks materi, lalu AI membuatkan soal latihan sesuai permintaan antum."}</div>
  <div class="field"><label for="ksu-${h}">Teks</label><textarea dir="auto" id="ksu-${h}" data-ksu="${h}.teks" rows="4" placeholder="${h==="kartu"?"Contoh: الأمر بعد النهي يفيد الإباحة …":"Tempel paragraf atau bab dari kitab…"}">${esc(D.teks)}</textarea></div>
  <div class="field"><label for="ksi-${h}">Permintaan (opsional)</label><input dir="auto" id="ksi-${h}" data-ksu="${h}.instruksi" value="${esc(D.instruksi)}" placeholder="${h==="kartu"?"Misal: jadikan 3 kartu, depan kaidah Arab, belakang makna dan contoh":"Misal: 5 soal pilihan ganda tentang definisi"}"></div>
  <div class="chips wrap">${(h==="kartu"?["1 kartu per kaidah","Depan Arab, belakang terjemah","Tambahkan contoh dari teks","Pecah per poin"]:["5 soal pilihan ganda","Benar/salah saja","Soal tentang definisi","Soal tentang dalil"]).map(c=>`<button class="chip" data-act="k-susun-chip" data-h="${h}" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>
  <div><button class="btn sm gold" data-act="k-susun" data-v="${x.id}" data-h="${h}" ${busy?"disabled":""}>${busy?`<span class="spin"></span> AI sedang menyusun…`:(h==="kartu"?"Jadikan kartu kaidah":"Jadikan soal latihan")}</button></div></div>`}
async function kolSusun(id,h){const x=kolGet(id),D=S.kSusun[h];if(!x)return;
 if(D.teks.trim().length<5){toast("Tulis atau tempel teksnya dulu");return}
 const key="susun-"+h+id;if(KOL.busy[key])return;KOL.busy[key]=1;render();
 try{const {data:{session}}=await SB.auth.getSession();
  const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(session&&session.access_token)},body:JSON.stringify({mode:"susun",hasil:h,teks:D.teks,instruksi:D.instruksi,bahasa:kolBhs(x)})});
  const j=await r.json().catch(()=>({error:"Layanan AI tidak menjawab ("+r.status+")"}));if(!r.ok||!j.ok)throw new Error(j.error||("Kode "+r.status));
  const hs=j.hasil||{};let n=0;const cur=kolGet(id);
  if(h==="kartu"){const add=(Array.isArray(hs.kartu)?hs.kartu:Array.isArray(hs)?hs:[]).filter(k=>k&&k.depan&&k.belakang).map(k=>({id:uid("kk"),depan:String(k.depan),belakang:String(k.belakang),ai:true,minta:true}));n=add.length;if(n)await kolSave(id,{kartu:(cur.kartu||[]).concat(add)})}
  else{const add=[];(Array.isArray(hs.soal)?hs.soal:Array.isArray(hs)?hs:[]).forEach(s=>{if(!s||!s.tanya)return;if(s.tipe==="bs"&&typeof s.jawab==="boolean")add.push({id:uid("ks"),tipe:"bs",tanya:String(s.tanya),jawab:s.jawab,bahas:String(s.bahas||""),ai:true,minta:true});else if(Array.isArray(s.opsi)&&s.opsi.length>=2&&Number.isInteger(s.jawab)&&s.jawab>=0&&s.jawab<s.opsi.length)add.push({id:uid("ks"),tipe:"pg",tanya:String(s.tanya),opsi:s.opsi.slice(0,4).map(String),jawab:Math.min(s.jawab,3),bahas:String(s.bahas||""),ai:true,minta:true})});n=add.length;if(n)await kolSave(id,{soal:(cur.soal||[]).concat(add)})}
  if(n){S.kSusun[h]={teks:"",instruksi:""};toast(`${n} ${h==="kartu"?"kartu kaidah":"soal"} ditambahkan`)}else toast("AI belum menghasilkan "+(h==="kartu"?"kartu":"soal")+". Coba perjelas teksnya.");
 }catch(e){toast("Belum berhasil: "+String(e.message||e).slice(0,140))}
 delete KOL.busy[key];render();}

/* ---------- events ---------- */
document.addEventListener("click",async e=>{
 const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act,v=t.dataset.v;
 if(!a.startsWith("k-"))return;
 const x=S.kSel&&kolGet(S.kSel);
 switch(a){
  case "k-new": S.kForm={jenis:"teks",judul:"",kategori:S.kFilter!=="Semua"?S.kFilter:"Tafsir",teks:"",youtube:"",file:null,ai:true,bahasa:"otomatis"};render(true);break;
  case "k-cancel": S.kForm=null;render(true);break;
  case "k-jenis": S.kForm.jenis=v;S.kForm.file=null;render();break;
  case "k-bhs": S.kForm.bahasa=v;render();break;
  case "k-bhs-ubah":{const it=kolGet(S.kSel);const m=LS.get("kolbhs",{});m[it.id]=v;LS.set("kolbhs",m);it.bahasa=v;if(KOL_HAS_BHS)await kolSave(it.id,{bahasa:v});else render();render();break}
  case "k-kat": S.kForm.kategori=v;render();break;
  case "k-submit": kolSubmit();break;
  case "k-filter": S.kFilter=v;render();break;
  case "k-open": S.kSel=v;S.kNew={depan:"",belakang:""};S.kSoal={tipe:"pg",tanya:"",opsi:["","","",""],jawab:0,bahas:""};S.kEditRing=null;render(true);break;
  case "k-back": S.kSel=null;render(true);break;
  case "k-proses": kolProses(v);break;
  case "k-latihan": S.qs={prog:"koleksi",bab:v,mode:"latihan",n:"all"};startQuiz();break;
  case "k-ring-edit": S.kEditRing=v;render();break;
  case "k-ring-cancel": S.kEditRing=null;render();break;
  case "k-ring-save": await kolSave(v,{ringkasan:$("#k-ring").value});S.kEditRing=null;toast("Ringkasan disimpan");render();break;
  case "k-add-kartu":{const N=S.kNew;if(!N.depan.trim()||!N.belakang.trim()){toast("Isi kaidah dan maknanya");return}
   const kartu=(x.kartu||[]).concat([{id:uid("kk"),depan:N.depan.trim(),belakang:N.belakang.trim()}]);S.kNew={depan:"",belakang:""};await kolSave(x.id,{kartu});toast("Kaidah ditambahkan ke murojaah");render();break}
  case "k-del-kartu": if(!t.dataset.armed){t.dataset.armed=1;t.classList.add("armed");return}await kolSave(x.id,{kartu:(x.kartu||[]).filter(k=>k.id!==v)});render();break;
  case "k-soal-tipe": S.kSoal.tipe=v;S.kSoal.jawab=v==="bs"?true:0;render();break;
  case "k-add-soal":{const Q=S.kSoal;if(!Q.tanya.trim()){toast("Tulis pertanyaannya");return}
   let s;if(Q.tipe==="pg"){const op=Q.opsi.map(o=>o.trim());if(op.filter(Boolean).length<2||!op[Q.jawab]){toast("Isi minimal dua opsi, termasuk opsi yang benar");return}
    const keep=op.map((o,i)=>({o,i})).filter(z=>z.o);s={id:uid("ks"),tipe:"pg",tanya:Q.tanya.trim(),opsi:keep.map(z=>z.o),jawab:keep.findIndex(z=>z.i===Q.jawab),bahas:Q.bahas.trim()}}
   else s={id:uid("ks"),tipe:"bs",tanya:Q.tanya.trim(),jawab:Q.jawab===true,bahas:Q.bahas.trim()};
   S.kSoal={tipe:Q.tipe,tanya:"",opsi:["","","",""],jawab:Q.tipe==="bs"?true:0,bahas:""};await kolSave(x.id,{soal:(x.soal||[]).concat([s])});toast("Soal ditambahkan ke latihan");render();break}
  case "k-del-soal": if(!t.dataset.armed){t.dataset.armed=1;t.classList.add("armed");return}await kolSave(x.id,{soal:(x.soal||[]).filter(s=>s.id!==v)});render();break;
  case "k-salin":{let t=KOL.teks[v];if(t==null){const r=await SB.from("materi_pribadi").select("teks").eq("id",v).single();t=(r.data&&r.data.teks)||"";KOL.teks[v]=t}
   kolCopy(t,"Seluruh teks sumber disalin");break}
  case "k-salin-ring": kolCopy((kolGet(v)||{}).ringkasan||"","Ringkasan disalin");break;
  case "k-susun": kolSusun(v,t.dataset.h);break;
  case "k-susun-chip":{const D=S.kSusun[t.dataset.h];D.instruksi=D.instruksi?D.instruksi+"; "+v:v;render();break}
  case "k-hapus": if(!t.dataset.armed){t.dataset.armed=1;t.textContent="Yakin hapus? Ketuk lagi";return}
   {const it=kolGet(v);if(it&&it.sumber_path)await SB.storage.from("pribadi").remove([it.sumber_path]);
    const {error}=await SB.from("materi_pribadi").delete().eq("id",v);if(error){toast("Gagal menghapus: "+error.message);return}
    KOL.items=KOL.items.filter(z=>z.id!==v);kolCache();S.kSel=null;toast("Materi dihapus");render(true)}break;
 }
});
document.addEventListener("input",e=>{const t=e.target;
 if(t.dataset.ksu){const [h,k]=t.dataset.ksu.split(".");S.kSusun[h][k]=t.value;return}
 if(t.dataset.kf&&S.kForm){S.kForm[t.dataset.kf]=t.value;if(t.dataset.kf==="kategori"){document.querySelectorAll('[data-act="k-kat"]').forEach(c=>c.classList.toggle("on",c.dataset.v===t.value))}if(t.dataset.kf==="teks"){const s=t.parentElement.querySelector(".small");if(s)s.textContent=t.value.length.toLocaleString("id-ID")+" karakter"}return}
 if(t.dataset.kn){S.kNew[t.dataset.kn]=t.value;return}
 if(t.dataset.ks){const k=t.dataset.ks;if(k.startsWith("opsi.")){S.kSoal.opsi[+k.slice(5)]=t.value}else if(k==="jawab"){S.kSoal.jawab=S.kSoal.tipe==="bs"?t.value==="true":+t.value}else S.kSoal[k]=t.value}
});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="kf-file"&&S.kForm){S.kForm.file=t.files[0]||null;if(S.kForm.file&&!S.kForm.judul)S.kForm.judul=S.kForm.file.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");render()}
 if(t.id==="kf-ai"&&S.kForm){S.kForm.ai=t.checked;render()}
});
document.addEventListener("toggle",e=>{const d=e.target;if(d.matches&&d.matches("details.ksrc")){S.kTeksOpen=d.open?d.dataset.v:null}if(d.matches&&d.matches("details.ksrc")&&d.open){const id=d.dataset.v;if(KOL.teks[id]==null){SB.from("materi_pribadi").select("teks").eq("id",id).single().then(r=>{KOL.teks[id]=(r.data&&r.data.teks)||"";render()})}}},true);
window.addEventListener("beforeunload",e=>{if(Object.keys(KOL.busy).length){e.preventDefault();e.returnValue=""}});

/* muat koleksi setelah masuk */
(function waitLogin(last){const now=(typeof ME!=="undefined"&&SB)?ME:null;if(now&&now!==last){KOL.items=[];KOL.loaded=false;loadKol()}if(!now&&last){KOL.items=[];KOL.loaded=false}setTimeout(()=>waitLogin(now),1500)})(null);
