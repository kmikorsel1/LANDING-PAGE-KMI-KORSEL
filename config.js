// ============================================================
//  KONFIGURASI SITUS KMI KORSEL  (satu-satunya file yang perlu diubah)
//  Salin dari Supabase -> Project Settings:
//    - Data API  -> Project URL
//    - API Keys  -> Publishable key (sb_publishable_...) atau
//                   Legacy API Keys -> anon public (eyJ...)
//  JANGAN PERNAH menaruh service_role / secret key di sini.
// ============================================================
window.APP_KONFIG = {
  IS_PREVIEW: false,   // true = mode uji coba dengan data contoh
  SUPABASE_URL: "URL_SUPABASE_ANDA",
  SUPABASE_ANON_KEY: "ANON_KEY_ANDA"
};
