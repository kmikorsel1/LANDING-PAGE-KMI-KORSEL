// Data publik situs KMI Korsel lewat cache CDN Vercel.
// Ribuan pengunjung sekaligus = database Supabase hanya dipanggil ±1x per 30 detik per wilayah,
// jadi situs tetap cepat dan database tidak kewalahan saat diserbu.
// Alamat & anon key dibaca dari config.js situs ini (tidak perlu pengaturan tambahan di Vercel).
let konfig = null;
// Baca alamat & anon key dari config.js situs ini sendiri (tanpa pengaturan tambahan di Vercel)
async function bacaKonfig(req) {
  if (konfig) return konfig;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) throw new Error("host tidak valid");
  const r = await fetch("https://" + host + "/config.js", { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error("config.js tidak terbaca");
  const teks = await r.text();
  const ambil = k => (teks.match(new RegExp(k + "\\s*:\\s*[\"']([^\"']+)[\"']")) || [])[1] || "";
  const k = { url: ambil("SUPABASE_URL").replace(/\/+$/, ""), key: ambil("SUPABASE_ANON_KEY") };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(k.url) || !k.key) throw new Error("config.js belum diisi");
  konfig = k; return konfig;
}

let simpan = { data: null, waktu: 0 };   // cache cadangan di memori fungsi

module.exports = async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && req.method !== "HEAD") { res.setHeader("Allow", "GET, HEAD"); return res.status(405).end(); }
  // Tolak alamat dengan tambahan ?… agar penyerang tidak bisa menembus cache
  if ((req.url || "").includes("?")) { res.setHeader("Cache-Control", "public, s-maxage=3600"); return res.status(400).json({ error: "Tidak didukung." }); }
  try {
    const now = Date.now();
    if (!simpan.data || now - simpan.waktu > 20000) {
      const { url, key } = await bacaKonfig(req);
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(url + "/rest/v1/rpc/get_data_publik", {
        method: "POST", signal: ctl.signal,
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: "{}"
      }).finally(() => clearTimeout(t));
      if (!r.ok) throw new Error("Supabase " + r.status);
      simpan = { data: await r.text(), waktu: now };
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=300");
    return res.status(200).send(simpan.data);
  } catch (e) {
    if (simpan.data) {   // database sedang lambat/gangguan: tetap tampilkan data terakhir
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=10");
      return res.status(200).send(simpan.data);
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "Data belum tersedia." });
  }
};
