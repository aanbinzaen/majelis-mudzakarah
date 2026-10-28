// Majelis Mudzakaroh — layanan AI (Vercel Function)
// Membaca materi (teks, PDF, audio, YouTube) lalu membuat ringkasan, kartu murojaah, dan soal latihan.
// Variabel lingkungan yang dibutuhkan di Vercel (Settings → Environment Variables):
//   GEMINI_API_KEY      kunci dari aistudio.google.com
//   SUPABASE_URL        sama dengan supabaseUrl di config.js
//   SUPABASE_ANON_KEY   sama dengan supabaseAnonKey di config.js
// Opsional: GEMINI_MODEL (bawaan gemini-3.8-flash), AI_LIMIT_HARIAN (bawaan 30 proses per peserta per hari)

const GEM = "https://generativelanguage.googleapis.com";
const INLINE_MAX = 15 * 1024 * 1024;

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function sb(path, token, opts = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/+$/, "");
  return fetch(base + path, {
    ...opts,
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json", ...(opts.headers || {}) }
  });
}

async function uploadToGemini(buf, mime, name, key) {
  const start = await fetch(GEM + "/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": key, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(buf.length), "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ file: { display_name: name || "materi" } })
  });
  const upUrl = start.headers.get("x-goog-upload-url");
  if (!upUrl) throw new Error("Gagal memulai unggahan ke Gemini (" + start.status + ")");
  const up = await fetch(upUrl, {
    method: "POST",
    headers: { "Content-Length": String(buf.length), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: buf
  });
  let file = (await up.json()).file;
  if (!file) throw new Error("Unggahan ke Gemini gagal");
  for (let i = 0; i < 90 && file.state === "PROCESSING"; i++) {
    await sleep(2000);
    file = await (await fetch(GEM + "/v1beta/" + file.name, { headers: { "x-goog-api-key": key } })).json();
  }
  if (file.state && file.state !== "ACTIVE") throw new Error("Gemini belum bisa membaca berkas ini (" + file.state + ")");
  return { file_data: { mime_type: mime, file_uri: file.uri } };
}

const ATURAN_BAHASA = {
  otomatis: `BAHASA HASIL: ikuti bahasa utama materi.
- Bila materi (kitab/dokumen) berbahasa Arab, tulis ringkasan, kartu, soal, dan pembahasan seluruhnya dalam bahasa Arab fusha, dengan mempertahankan ibarat (lafazh) asli kitab sebanyak mungkin.
- Bila materi berbahasa Indonesia, tulis dalam bahasa Indonesia; teks Arab yang ada di materi tetap dikutip apa adanya.`,
  arab: `BAHASA HASIL: bahasa Arab fusha seluruhnya (ringkasan, kartu, soal, opsi, pembahasan, judul).
- Kutip ibarat (lafazh) asli kitab apa adanya, jangan diparafrasekan bila ada lafazh matannya.
- Bila materi aslinya bukan bahasa Arab, terjemahkan maknanya dengan setia ke bahasa Arab yang jelas.`,
  indonesia: `BAHASA HASIL: bahasa Indonesia. Istilah, kaidah, ayat, dan hadits dari materi tetap dikutip dalam lafazh Arab aslinya, lalu dijelaskan dalam bahasa Indonesia.`,
  dua: `BAHASA HASIL: dua bahasa (Arab–Indonesia).
- Ringkasan: setiap paragraf/butir diawali kutipan ibarat Arab asli dari materi, lalu baris berikutnya terjemah dan penjelasan dalam bahasa Indonesia.
- Kartu: "depan" berisi ibarat/kaidah/istilah dalam lafazh Arab asli; "belakang" berisi terjemah dan penjelasan bahasa Indonesia.
- Soal: "tanya" ditulis dalam bahasa Arab lalu terjemah Indonesia di baris baru; opsi dalam bahasa Arab; "bahas" dalam bahasa Indonesia dengan menyebut ibarat Arab yang menjadi dasar jawaban.`
};

const PETUNJUK = (b) => `Kamu adalah asisten belajar untuk peserta kajian Islam di Majelis Mudzakaroh Rumah Dakwah Malang.
Materi terlampir berjudul "${b.judul || "(tanpa judul)"}" dengan kategori "${b.kategori || "Umum"}".

${ATURAN_BAHASA[b.bahasa] || ATURAN_BAHASA.otomatis}

Tugasmu:
1. Buat RINGKASAN yang rapi: beberapa paragraf pendek dipisah baris kosong. Bila ada daftar, tulis tiap butir di baris baru diawali "1. ", "2. ", dst. Kutip ayat dengan tanda ﴿ ﴾ dan hadits/ucapan ulama dengan « » bila memang ada di materi. Ikuti urutan pembahasan materi.
2. Buat 8–15 KARTU MUROJAAH berisi istilah, definisi (ta'rif), kaidah, taqsim (pembagian), dalil, atau faedah penting dari materi. "depan" berisi istilah/kaidah, "belakang" berisi makna dan penjelasannya.
3. Buat 8–12 SOAL LATIHAN: campuran pilihan ganda (4 opsi) dan benar/salah, masing-masing dengan pembahasan singkat. Acak posisi jawaban benar.
4. Sarankan judul singkat bila judul belum jelas.

Aturan penting (amanah ilmiah):
- Gunakan HANYA isi materi. Jangan menambah ayat, hadits, nukilan, pendapat, atau contoh yang tidak ada di materi.
- Utamakan lafazh dan definisi persis seperti dalam materi/kitab. Jangan mengubah makna, jangan menyimpulkan pendapat penulis yang tidak ia tulis.
- Bila nomor halaman kitab terlihat, cantumkan di akhir penjelasan kartu dan pembahasan soal, misalnya (ص ٢٥) atau (hal. 25).
- Bila materi berupa rekaman, tangkap penjelasan pemateri dengan setia.
- Tulis teks Arab dengan ejaan yang benar; beri harakat seperlunya pada lafazh yang rawan salah baca.

Kembalikan HANYA JSON dengan bentuk:
{"judul_saran":"...","ringkasan":"...","kartu":[{"depan":"...","belakang":"..."}],"soal":[{"tipe":"pg","tanya":"...","opsi":["...","...","...","..."],"jawab":0,"bahas":"..."},{"tipe":"bs","tanya":"...","jawab":true,"bahas":"..."}]}`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Gunakan POST" });
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    return send(res, 503, { error: "Layanan AI belum diatur. Pengelola perlu mengisi GEMINI_API_KEY, SUPABASE_URL, dan SUPABASE_ANON_KEY di Vercel." });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return send(res, 401, { error: "Silakan masuk terlebih dahulu" });

  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { error: "Data tidak valid" }); }

  try {
    // 1) Pastikan pengguna sah
    const u = await sb("/auth/v1/user", token);
    if (!u.ok) return send(res, 401, { error: "Sesi berakhir. Silakan masuk lagi." });
    const user = await u.json();

    // 2) Batas pemakaian harian per peserta
    const limit = parseInt(process.env.AI_LIMIT_HARIAN || "30", 10);
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const c = await sb(`/rest/v1/ai_pakai?select=id&user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(since)}`, token, { method: "HEAD", headers: { Prefer: "count=exact" } });
    const used = parseInt(((c.headers.get("content-range") || "").split("/")[1]) || "0", 10);
    if (used >= limit) return send(res, 429, { error: `Batas ${limit} proses AI per 24 jam sudah tercapai. Coba lagi besok, insya Allah.` });
    await sb("/rest/v1/ai_pakai", token, { method: "POST", body: JSON.stringify({ jenis: body.mode || "materi" }) });

    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const parts = [];
    let prompt;
    const gen = { responseMimeType: "application/json", temperature: 0.3 };

    if (body.mode === "susun") {
      // peserta menempelkan teks sendiri -> AI menyusun kartu kaidah atau soal sesuai permintaan
      const t = String(body.teks || "").slice(0, 200000);
      if (t.trim().length < 5) return send(res, 400, { error: "Tulis atau tempel teksnya dulu" });
      const jenisHasil = body.hasil === "soal" ? "soal" : "kartu";
      const minta = String(body.instruksi || "").slice(0, 1000).trim();
      parts.push({ text: "TEKS DARI PESERTA:\n" + t });
      prompt = `Kamu membantu peserta kajian Islam di Majelis Mudzakaroh Rumah Dakwah Malang menyusun bahan murojaah dari teks yang ia kirim.
${ATURAN_BAHASA[body.bahasa] || ATURAN_BAHASA.otomatis}

${jenisHasil === "kartu"
  ? `Susun KARTU KAIDAH/MUROJAAH dari teks itu. Setiap kartu: "depan" berisi kaidah, istilah, ta'rif, atau pertanyaan singkat; "belakang" berisi makna, penjelasan, dalil, atau contoh yang ada di teks.
Bila teks berisi satu kaidah saja, buat satu kartu yang rapi. Bila teks panjang, pecah menjadi beberapa kartu (paling banyak 20).`
  : `Susun SOAL LATIHAN dari teks itu: campuran pilihan ganda (4 opsi) dan benar/salah, masing-masing dengan pembahasan singkat. Acak posisi jawaban benar. Paling banyak 20 soal.`}
${minta ? `Permintaan khusus peserta (utamakan): "${minta}"` : ""}

Aturan amanah ilmiah: gunakan HANYA isi teks; jangan menambah ayat, hadits, nukilan, atau pendapat yang tidak ada di teks; pertahankan lafazh Arab apa adanya; rapikan ejaan tanpa mengubah makna.

Kembalikan HANYA JSON: ${jenisHasil === "kartu"
  ? `{"kartu":[{"depan":"...","belakang":"..."}]}`
  : `{"soal":[{"tipe":"pg","tanya":"...","opsi":["...","...","...","..."],"jawab":0,"bahas":"..."},{"tipe":"bs","tanya":"...","jawab":true,"bahas":"..."}]}`}`;
    } else if (body.mode === "prompt") {
      // dipakai pengelola di menu Kelola
      const adm = await sb("/rest/v1/rpc/is_admin", token, { method: "POST", body: "{}" });
      if (!adm.ok || (await adm.json()) !== true) return send(res, 403, { error: "Khusus pengelola" });
      if (body.youtube) parts.push({ file_data: { file_uri: body.youtube } });
      prompt = String(body.prompt || "").slice(0, 60000);
    } else {
      const jenis = body.jenis;
      if (jenis === "teks") {
        const t = String(body.teks || "");
        if (t.trim().length < 30) return send(res, 400, { error: "Teks materi terlalu pendek" });
        parts.push({ text: "MATERI:\n" + t });
      } else if (jenis === "youtube") {
        if (!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(body.youtube || "")) return send(res, 400, { error: "Tautan YouTube tidak valid" });
        parts.push({ file_data: { file_uri: body.youtube } });
        gen.mediaResolution = "MEDIA_RESOLUTION_LOW";
      } else if (jenis === "pdf" || jenis === "audio") {
        const base = process.env.SUPABASE_URL.replace(/\/+$/, "");
        if (!String(body.url || "").startsWith(base + "/storage/")) return send(res, 400, { error: "Alamat berkas tidak valid" });
        const f = await fetch(body.url);
        if (!f.ok) return send(res, 400, { error: "Berkas tidak bisa diambil dari penyimpanan" });
        const buf = Buffer.from(await f.arrayBuffer());
        const mime = jenis === "pdf" ? "application/pdf" : (body.mime || f.headers.get("content-type") || "audio/mpeg");
        if (buf.length <= INLINE_MAX) parts.push({ inline_data: { mime_type: mime, data: buf.toString("base64") } });
        else parts.push(await uploadToGemini(buf, mime, body.judul, KEY));
      } else return send(res, 400, { error: "Jenis materi tidak dikenal" });
      prompt = PETUNJUK(body);
    }
    parts.push({ text: prompt });

    const call = m => fetch(`${GEM}/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: gen })
    });
    let r = await call(model);
    let j = await r.json().catch(() => ({}));
    // Bila model lama sudah dihentikan, pakai model pengganti yang disarankan Google
    const saran = !r.ok && ((j.error && j.error.message) || "").match(/use (?:models\/)?(gemini-[\w.\-]+)/i);
    if (saran && saran[1] !== model) { r = await call(saran[1]); j = await r.json().catch(() => ({})); }
    if (!r.ok) return send(res, 502, { error: "AI belum berhasil: " + ((j.error && j.error.message) || r.status) });
    const text = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || "").join("") || "";
    let out;
    try { out = JSON.parse(text.replace(/^\s*```(?:json)?/, "").replace(/```\s*$/, "")); }
    catch (e) { return send(res, 502, { error: "Jawaban AI tidak terbaca. Coba proses ulang." }); }
    return send(res, 200, { ok: true, hasil: out, sisa: Math.max(0, limit - used - 1) });
  } catch (e) {
    return send(res, 500, { error: "Terjadi kendala: " + String(e.message || e).slice(0, 200) });
  }
};
