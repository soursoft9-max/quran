/* ============================================================================
   تِبيان — الإعدادات والأدوات المشتركة لجميع الصفحات
   يجب تحميل مكتبة Supabase قبل هذا الملف:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="tibyan.js"></script>
   ========================================================================== */
(function () {
  "use strict";

  const SUPABASE_URL = "https://tsiacidrfnbfiyyzzhwy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_FX3SdWzHTYOzVdQbDD--Gg_NE-gxG0n";
  const BUCKET = "tibyan-videos";

  const client = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  if (!client) {
    console.error("تعذّر تحميل مكتبة Supabase. تحققي من اتصال الإنترنت.");
  }

  /* التصنيفات الموحّدة: القيمة value هي ما يُحفظ في عمود category */
  const CATEGORIES = [
    { value: "القرآن الكريم",   label: "القرآن الكريم",            page: "quran.html",   icon: "۞" },
    { value: "المصحف المرتل",   label: "المصحف المرتل",            page: "quran.html",   icon: "📖" },
    { value: "المصحف المجود",   label: "المصحف المجود",            page: "quran.html",   icon: "✨" },
    { value: "تلاوات خاشعة",    label: "التلاوات الخاشعة",          page: "khshia.html",  icon: "♡" },
    { value: "تجويد",           label: "التجويد وأحكام التلاوة",    page: "tajweed.html", icon: "◈" },
    { value: "الحفظ والمراجعة", label: "الحفظ والمراجعة",          page: "hifz.html",    icon: "✎" },
    { value: "التفسير والتدبر", label: "التفسير والتدبر",          page: "tafsir.html",  icon: "۩" },
    { value: "أذكار",           label: "أذكار وأدعية",             page: "",             icon: "🤍" },
    { value: "أخرى",            label: "أخرى",                     page: "",             icon: "❋" }
  ];

  const STATUS_LABELS = {
    draft: "مسودة",
    pending: "قيد المراجعة",
    published: "منشورة",
    rejected: "مرفوضة"
  };

  const VIDEO_COLUMNS =
    "id,title,reader_name,category,description,video_url,thumbnail_url," +
    "status,created_at,published_at,user_id";

  /* ---------- أدوات النصوص ---------- */
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFC")
      .toLocaleLowerCase("ar")
      .replace(/[ً-ْٰ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncate(value, max) {
    const text = String(value ?? "").trim();
    return text.length > max ? text.slice(0, max).trim() + "…" : text;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ar", {
      year: "numeric", month: "long", day: "numeric"
    }).format(date);
  }

  function categoryLabel(value) {
    const found = CATEGORIES.find(c => c.value === value);
    return found ? found.label : (value || "أخرى");
  }

  function fillCategorySelect(select, options = {}) {
    if (!select) return;
    const { includeAll = false, allLabel = "جميع التصنيفات", placeholder = "" } = options;
    const current = select.value;
    select.replaceChildren();

    if (placeholder) select.add(new Option(placeholder, ""));
    if (includeAll) select.add(new Option(allLabel, "all"));
    CATEGORIES.forEach(c => select.add(new Option(c.label, c.value)));

    if (current) select.value = current;
  }

  /* ---------- أدوات الروابط والملفات ---------- */
  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  function getYouTubeId(value) {
    if (!value) return "";
    const text = String(value).trim();
    try {
      const url = new URL(text);
      let id = "";
      if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
        id = url.pathname.split("/").filter(Boolean)[0] || "";
      } else if (/(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname)) {
        if (url.pathname === "/watch") {
          id = url.searchParams.get("v") || "";
        } else {
          const parts = url.pathname.split("/").filter(Boolean);
          if (["embed", "shorts", "live"].includes(parts[0])) id = parts[1] || "";
        }
      }
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
    } catch {
      return "";
    }
  }

  /* يحوّل قيمة video_url / thumbnail_url إلى مسار داخل الحاوية، أو "" إن كانت رابطًا خارجيًا */
  function storagePath(value) {
    if (!value) return "";
    const raw = String(value).trim();

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const marker = "/storage/v1/object/";
        const at = url.pathname.indexOf(marker);
        if (at === -1) return "";
        const rest = url.pathname.slice(at + marker.length)
          .replace(/^(public|sign|authenticated)\//, "");
        if (!rest.startsWith(BUCKET + "/")) return "";
        return decodeURIComponent(rest.slice(BUCKET.length + 1));
      } catch {
        return "";
      }
    }

    let path = raw.replace(/^\/+/, "");
    if (path.startsWith(BUCKET + "/")) path = path.slice(BUCKET.length + 1);
    return path;
  }

  /* إنشاء روابط تشغيل مؤقتة لعدة ملفات بطلب واحد */
  async function signedUrls(paths, expiresIn = 3600) {
    const unique = [...new Set(paths.filter(Boolean))];
    const map = new Map();
    if (!unique.length || !client) return map;

    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrls(unique, expiresIn);

    if (error) {
      console.warn("تعذّر إنشاء روابط الملفات:", error.message);
      return map;
    }

    (data || []).forEach(item => {
      if (item && item.signedUrl && !item.error) map.set(item.path, item.signedUrl);
    });
    return map;
  }

  async function signedUrl(path, expiresIn = 3600) {
    const map = await signedUrls([path], expiresIn);
    return map.get(path) || "";
  }

  /* يعيد Map: رقم التلاوة → رابط الصورة المصغرة */
  async function resolveThumbnails(videos) {
    const result = new Map();
    const toSign = [];

    videos.forEach(video => {
      const thumb = video.thumbnail_url || "";
      const path = storagePath(thumb);

      if (path) {
        toSign.push(path);
      } else if (isHttpUrl(thumb)) {
        result.set(String(video.id), thumb);
      } else {
        const yt = getYouTubeId(video.video_url);
        if (yt) result.set(String(video.id), "https://img.youtube.com/vi/" + yt + "/hqdefault.jpg");
      }
    });

    const signed = await signedUrls(toSign, 60 * 60 * 6);
    videos.forEach(video => {
      const path = storagePath(video.thumbnail_url || "");
      if (path && signed.has(path)) result.set(String(video.id), signed.get(path));
    });

    return result;
  }

  /* اسم ملف آمن ومسار رفع داخل مجلد المستخدم */
  function cleanFileName(name) {
    const parts = String(name || "file").split(".");
    const extension = parts.length > 1
      ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, "")
      : "";
    const base = parts.join(".")
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "file";
    return extension ? base + "." + extension : base;
  }

  function randomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function makeUploadPath(userId, folder, file) {
    return userId + "/" + folder + "/" + Date.now() + "-" + randomId() + "-" + cleanFileName(file.name);
  }

  async function uploadFile(userId, folder, file) {
    const path = makeUploadPath(userId, folder, file);
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    });
    if (error) throw error;
    return path;
  }

  async function removeFile(value) {
    const path = storagePath(value);
    if (!path) return;
    const { error } = await client.storage.from(BUCKET).remove([path]);
    if (error) console.warn("تعذّر حذف الملف:", error.message);
  }

  function isAudioPath(path) {
    const ext = (String(path).split("?")[0].split(".").pop() || "").toLowerCase();
    return ["mp3", "m4a", "aac", "ogg", "oga", "wav", "flac", "opus"].includes(ext);
  }

  /* ---------- البيانات ---------- */
  async function fetchPublishedVideos(options = {}) {
    const { categories = null, userId = null, limit = null, excludeId = null } = options;

    let query = client
      .from("videos")
      .select(VIDEO_COLUMNS)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (categories && categories.length) query = query.in("category", categories);
    if (userId) query = query.eq("user_id", userId);
    if (excludeId !== null && excludeId !== undefined) query = query.neq("id", excludeId);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function getUser() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data && data.session ? data.session.user : null;
  }

  async function getMyRoles() {
    const empty = {
      user_id: null, is_admin: false, is_volunteer: false,
      has_channel: false, required_approvals: 1, setupMissing: false
    };
    const user = await getUser();
    if (!user) return empty;

    const { data, error } = await client.rpc("my_roles");
    if (error) {
      console.error("my_roles error:", error);
      return { ...empty, user_id: user.id, setupMissing: true, error };
    }
    return { ...empty, ...data, user };
  }

  function friendlyError(error) {
    const message = error && (error.message || error.error_description) || "";
    if (/my_roles|function .* does not exist|Could not find the function/i.test(message)) {
      return "لم يُشغَّل ملف إعداد قاعدة البيانات supabase-setup.sql بعد.";
    }
    if (/row-level security|violates row-level/i.test(message)) {
      return "لا تملكين صلاحية تنفيذ هذه العملية.";
    }
    if (/Payload too large|exceeded the maximum allowed size|413/i.test(message)) {
      return "حجم الملف أكبر من الحد المسموح في إعدادات التخزين.";
    }
    return message || "حدث خطأ غير متوقع.";
  }

  /* ---------- بطاقة التلاوة الموحّدة ---------- */
  function watchUrl(video) {
    return "watch.html?id=" + encodeURIComponent(video.id);
  }

  function videoCardHTML(video, thumbUrl) {
    const title = escapeHTML(video.title || "تلاوة قرآنية");
    const reader = escapeHTML(video.reader_name || "قارئ القرآن الكريم");
    const category = escapeHTML(categoryLabel(video.category));
    const description = escapeHTML(truncate(video.description || "تلاوة قرآنية من مكتبة تِبيان.", 140));
    const href = escapeHTML(watchUrl(video));

    const image = thumbUrl
      ? `<img src="${escapeHTML(thumbUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
      : `<div class="thumb-placeholder">﴿ تلاوة قرآنية ﴾<br><small>تِبيان</small></div>`;

    return `
      <article class="video-card">
        <a class="video-thumb" href="${href}" aria-label="استمع إلى ${title}">
          ${image}
          <span class="video-tag">${category}</span>
          <span class="play-button" aria-hidden="true">▶</span>
        </a>
        <div class="video-body">
          <div class="video-category">${category}</div>
          <h3 class="video-title"><a href="${href}">${title}</a></h3>
          <p class="video-description">${description}</p>
          <div class="video-meta">
            <div class="reader">
              <span class="reader-avatar" aria-hidden="true">◉</span>
              <span>${reader}</span>
            </div>
            <a class="watch-link" href="${href}">استمع الآن ←</a>
          </div>
        </div>
      </article>`;
  }

  /* زر الحساب في الترويسة: "تسجيل الدخول" للزائر و"حسابي" للمسجّل */
  async function updateHeaderAuthButton() {
    const buttons = document.querySelectorAll("[data-auth-button]");
    if (!buttons.length) return;
    const user = await getUser();
    buttons.forEach(button => {
      if (user) {
        button.textContent = "حسابي";
        button.href = "account.html";
      } else {
        button.textContent = "تسجيل الدخول";
        button.href = "login.html";
      }
    });
  }

  function loginUrl() {
    const next = location.pathname.split("/").pop() + location.search;
    return "login.html?next=" + encodeURIComponent(next || "account.html");
  }

  window.Tibyan = {
    client, BUCKET, CATEGORIES, STATUS_LABELS, VIDEO_COLUMNS,
    escapeHTML, normalizeText, truncate, formatDate, categoryLabel, fillCategorySelect,
    isHttpUrl, getYouTubeId, storagePath, signedUrls, signedUrl, resolveThumbnails,
    cleanFileName, uploadFile, removeFile, isAudioPath,
    fetchPublishedVideos, getUser, getMyRoles, friendlyError,
    watchUrl, videoCardHTML, updateHeaderAuthButton, loginUrl
  };
})();
