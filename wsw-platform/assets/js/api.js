/* =========================================================
   api.js — طبقة البيانات
   ---------------------------------------------------------
   الواجهة كلها لا تعرف من أين تأتي البيانات. كل صفحة تستدعي
   دوال WSW.api فقط. الآن هذه الدوال تعمل على بيانات تجريبية
   محفوظة في المتصفح (mock). مطوّر الـBackend يستبدل تنفيذها
   باستدعاءات HTTP حقيقية مع الحفاظ على نفس الأسماء ونفس شكل
   المدخلات والمخرجات (راجع BACKEND_HANDOFF.md، القسم 5).

   ⚠️ كل فحوصات الصلاحيات هنا للمحاكاة فقط. في النظام الحقيقي
   الـBackend هو المرجع الوحيد للصلاحيات، ولا يثق بالواجهة أبدًا.
   ========================================================= */
window.WSW = window.WSW || {};

(function () {
  const DB_KEY = 'wsw_db';
  const SESSION_KEY = 'wsw_session';
  const ROLE_RANK = { student: 1, editor: 2, admin: 3, super_admin: 4 };

  class ApiError extends Error {
    constructor(code, message, fields) {
      super(message);
      this.code = code;        // 'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'closed'
      this.fields = fields;    // { fieldName: 'رسالة' } لأخطاء التحقق
    }
  }

  /* ---------- التخزين ---------- */
  let memoryDb = null;
  function load() {
    if (memoryDb) return memoryDb;
    try {
      const raw = localStorage.getItem(DB_KEY);
      const parsed = raw && JSON.parse(raw);
      const seed = WSW.seed();
      memoryDb = parsed && parsed.version === seed.version ? parsed : seed;
    } catch (e) { memoryDb = WSW.seed(); }
    return memoryDb;
  }
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(memoryDb)); } catch (e) { /* يبقى في الذاكرة */ }
  }
  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) {
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));
  const uid = p => p + '_' + Math.random().toString(36).slice(2, 9);
  const nowIso = () => new Date().toISOString();
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- الهوية والصلاحيات ---------- */
  function me() {
    if (!WSW.config.accountsEnabled) return null;   // الحسابات مغلقة: تجاهل أي جلسة قديمة محفوظة في المتصفح
    const s = session();
    if (!s) return null;
    return load().users.find(u => u.id === s.userId) || null;
  }
  function publicUser(u) {
    if (!u) return null;
    const { _demoPassword, ...rest } = u;
    const db = load();
    const school = db.schools.find(s => s.id === u.schoolId);
    // المحافظة والإقليم مشتقّان من المدرسة — لا يُخزّنان في جدول المستخدمين
    return {
      ...rest,
      schoolName: school ? school.name : null,
      governorate: school ? school.governorate : null,
      region: school ? WSW.geo.regionOf(school.governorate) : null
    };
  }
  function requireUser() {
    const u = me();
    if (!u) throw new ApiError('unauthorized', 'سجّل الدخول أولًا.');
    return u;
  }
  function requireActive() {
    const u = requireUser();
    if (u.status !== 'active') throw new ApiError('forbidden', 'حسابك غير مفعّل بعد.');
    return u;
  }
  function requireRole(minRole) {
    const u = requireActive();
    if (ROLE_RANK[u.role] < ROLE_RANK[minRole]) throw new ApiError('forbidden', 'ليست لديك صلاحية لهذا الإجراء.');
    return u;
  }
  function audit(action, target, detail) {
    const u = me();
    load().auditLog.unshift({ id: uid('log'), at: nowIso(), userId: u && u.id, action, target, detail: detail || null });
    load().auditLog.length = Math.min(load().auditLog.length, 500);
  }
  function hasRole(user, minRole) {
    return !!user && ROLE_RANK[user.role] >= ROLE_RANK[minRole];
  }

  /* ---------- التحقق ---------- */
  const USERNAME_RE = new RegExp(WSW.config.usernamePattern);
  const PHONE_RE = new RegExp(WSW.config.phonePattern);
  const normPhone = p => String(p || '').replace(/[\s-]/g, '').replace(/^\+?962/, '0').replace(/^00962/, '0');
  const normUser = u => String(u || '').trim().toLowerCase();

  function validateStudent(d, { requirePassword }) {
    const f = {};
    const parts = (d.fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length < 4) f.fullName = 'اكتب الاسم الرباعي كاملًا (أربعة مقاطع على الأقل).';
    if (!USERNAME_RE.test(d.username || '')) f.username = 'من 4 إلى 30 خانة: أحرف إنجليزية وأرقام و . _ فقط.';
    if (requirePassword && (d.password || '').length < 8) f.password = 'كلمة المرور 8 أحرف على الأقل.';
    if (!d.schoolId) f.schoolId = 'اختر مدرستك.';
    else if (!load().schools.some(s => s.id === d.schoolId)) f.schoolId = 'المدرسة غير موجودة.';
    if (!d.grade) f.grade = 'اختر الصف.';
    if (!PHONE_RE.test(normPhone(d.guardianPhone))) f.guardianPhone = 'رقم موبايل أردني من 10 أرقام يبدأ بـ 077 أو 078 أو 079.';
    return f;
  }
  function usernameTaken(username, exceptId) {
    return load().users.some(u => u.username.toLowerCase() === normUser(username) && u.id !== exceptId);
  }

  /* =======================================================
     الواجهة البرمجية العامة
     ======================================================= */
  const api = {
    ApiError,
    hasRole,

    /* ----- Auth ----- */
    async getMe() {
      await wait(40);
      if (!WSW.config.accountsEnabled) return null;
      return publicUser(me());
    },

    async login(username, password) {
      await wait();
      if (!WSW.config.accountsEnabled) throw new ApiError('closed', 'تسجيل الدخول غير متاح حاليًا.');
      const u = load().users.find(x => x.username.toLowerCase() === normUser(username));
      if (!u || u._demoPassword !== password) throw new ApiError('unauthorized', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      setSession({ userId: u.id, at: nowIso() });
      return publicUser(u);
    },

    async logout() {
      await wait(40);
      setSession(null);
    },

    async register(data) {
      await wait();
      const db = load();
      if (!WSW.config.accountsEnabled || !db.settings.registrationOpen) throw new ApiError('closed', 'التسجيل مغلق حاليًا.');
      const fields = validateStudent(data, { requirePassword: true });
      if (!data.acceptTerms) fields.acceptTerms = 'يجب الموافقة على الشروط.';
      if (!fields.username && usernameTaken(data.username)) fields.username = 'اسم المستخدم محجوز، اختر غيره.';
      if (Object.keys(fields).length) throw new ApiError('validation', 'راجع الحقول المحددة.', fields);

      const user = {
        id: uid('u'), role: 'student', username: normUser(data.username), _demoPassword: data.password,
        fullName: data.fullName.trim().replace(/\s+/g, ' '), schoolId: data.schoolId,
        grade: data.grade, guardianPhone: normPhone(data.guardianPhone), status: 'pending', createdAt: nowIso()
      };
      db.users.push(user);
      save();
      setSession({ userId: user.id, at: nowIso() });
      return publicUser(user);
    },

    async updateMyProfile(patch) {
      await wait();
      const u = requireActive();
      // الطالب يعدّل رقم ولي الأمر فقط؛ الاسم والمدرسة واسم المستخدم يعدّلها المشرف
      if (patch.guardianPhone !== undefined) {
        if (!PHONE_RE.test(normPhone(patch.guardianPhone))) throw new ApiError('validation', 'رقم غير صحيح.', { guardianPhone: 'رقم موبايل أردني من 10 أرقام يبدأ بـ 077 أو 078 أو 079.' });
        u.guardianPhone = normPhone(patch.guardianPhone);
      }
      save();
      return publicUser(u);
    },

    async changePassword(current, next) {
      await wait();
      const u = requireUser();
      if (u._demoPassword !== current) throw new ApiError('validation', 'كلمة المرور الحالية غير صحيحة.', { current: 'غير صحيحة.' });
      if ((next || '').length < 8) throw new ApiError('validation', 'كلمة المرور 8 أحرف على الأقل.', { next: '8 أحرف على الأقل.' });
      u._demoPassword = next;
      save();
      return true;
    },

    /* ----- Settings ----- */
    async getSettings() {
      await wait(30);
      return clone(load().settings);
    },
    async updateSettings(patch) {
      await wait();
      requireRole('super_admin');
      Object.assign(load().settings, patch);
      audit('settings.update', 'settings', patch);
      save();
      return clone(load().settings);
    },

    /* ----- نصوص الواجهة القابلة للتعديل ----- */
    async getTexts() {
      await wait(20);
      return clone(load().texts || {});
    },
    /* value فارغ = إرجاع النص الأصلي */
    async updateText(key, value) {
      await wait();
      requireRole('super_admin');
      if (!/^[a-z0-9_.-]{2,80}$/i.test(key)) throw new ApiError('validation', 'مفتاح غير صالح.');
      const db = load();
      db.texts = db.texts || {};
      const v = String(value || '').trim();
      if (!v) delete db.texts[key];
      else if (v.length > 500) throw new ApiError('validation', 'النص طويل جدًا.', { value: '500 حرف كحد أقصى.' });
      else db.texts[key] = v;
      audit('text.update', key);
      save();
      return clone(db.texts);
    },

    /* ----- Schools ----- */
    /* region اختياري: يرجع مدارس إقليم واحد فقط (لنموذج التسجيل) */
    async listSchools({ region } = {}) {
      await wait(40);
      return clone(load().schools)
        .filter(s => !region || WSW.geo.regionOf(s.governorate) === region)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    },
    async createSchool(data) {
      await wait();
      requireRole('admin');
      if (!data.name || !data.governorate) throw new ApiError('validation', 'الاسم والمحافظة مطلوبان.');
      const s = { id: uid('sch'), name: data.name.trim(), governorate: data.governorate, type: data.type || 'حكومية' };
      load().schools.push(s);
      audit('school.create', s.id);
      save();
      return clone(s);
    },

    /* ----- Students (Admin) ----- */
    async listStudents(filter = {}) {
      await wait();
      requireRole('admin');
      const db = load();
      const q = (filter.q || '').trim().toLowerCase();
      return db.users
        .filter(u => u.role === 'student')
        .map(publicUser)
        .filter(u => !filter.status || u.status === filter.status)
        .filter(u => !filter.grade || u.grade === filter.grade)
        .filter(u => !filter.governorate || u.governorate === filter.governorate)
        .filter(u => !filter.region || u.region === filter.region)
        .filter(u => !filter.schoolId || u.schoolId === filter.schoolId)
        .filter(u => !q || u.fullName.toLowerCase().includes(q) || u.username.includes(q) || (u.guardianPhone || '').includes(q) || (u.schoolName || '').toLowerCase().includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async setStudentStatus(userId, status) {
      await wait();
      requireRole('admin');
      if (!['active', 'rejected', 'disabled', 'pending'].includes(status)) throw new ApiError('validation', 'حالة غير معروفة.');
      const u = load().users.find(x => x.id === userId && x.role === 'student');
      if (!u) throw new ApiError('not_found', 'الطالب غير موجود.');
      u.status = status;
      audit('student.status', userId, { status });
      save();
      return publicUser(u);
    },

    async updateStudent(userId, patch) {
      await wait();
      requireRole('admin');
      const u = load().users.find(x => x.id === userId && x.role === 'student');
      if (!u) throw new ApiError('not_found', 'الطالب غير موجود.');
      const merged = { ...u, ...patch };
      const fields = validateStudent(merged, { requirePassword: false });
      if (!fields.username && usernameTaken(merged.username, u.id)) fields.username = 'اسم المستخدم محجوز.';
      if (Object.keys(fields).length) throw new ApiError('validation', 'راجع الحقول المحددة.', fields);
      if (patch.fullName !== undefined) u.fullName = patch.fullName.trim().replace(/\s+/g, ' ');
      if (patch.username !== undefined) u.username = normUser(patch.username);
      if (patch.guardianPhone !== undefined) u.guardianPhone = normPhone(patch.guardianPhone);
      ['schoolId', 'grade'].forEach(k => { if (patch[k] !== undefined) u[k] = patch[k]; });
      audit('student.update', userId);
      save();
      return publicUser(u);
    },

    /* لا يوجد بريد لاستعادة كلمة المرور، فالمشرف يعيد تعيينها ويبلغ الطالب بها.
       يرجع كلمة مرور مؤقتة تُعرض للمشرف مرة واحدة. */
    async resetStudentPassword(userId) {
      await wait();
      requireRole('admin');
      const u = load().users.find(x => x.id === userId && x.role === 'student');
      if (!u) throw new ApiError('not_found', 'الطالب غير موجود.');
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      const temp = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      u._demoPassword = temp;
      audit('student.password_reset', userId);
      save();
      return { temporaryPassword: temp };
    },

    /* ----- Pages / Sections / Components ----- */
    async listPages() {
      await wait(40);
      const u = me();
      const pages = load().pages;
      if (hasRole(u, 'editor') && u.status === 'active') return clone(pages);
      return clone(pages.filter(p => p.status === 'published' && (p.visibility === 'public' || (u && u.status === 'active'))));
    },

    /* يعيد الصفحة مع أقسامها ومكوّناتها مرتبة.
       preview=true (للمحرر فقط) يعيد المسودات والمخفي أيضًا. */
    async getPage(slug, { preview = false } = {}) {
      await wait(60);
      const db = load();
      const u = me();
      const canPreview = preview && hasRole(u, 'editor') && u.status === 'active';
      const page = db.pages.find(p => p.slug === slug);
      if (!page || (!canPreview && page.status !== 'published')) throw new ApiError('not_found', 'الصفحة غير موجودة.');
      if (page.visibility === 'students' && !(u && u.status === 'active')) throw new ApiError('unauthorized', 'هذه الصفحة للطلبة المسجّلين.');
      const visible = x => canPreview || x.status === 'published';
      const sections = db.sections
        .filter(s => s.pageId === page.id && visible(s))
        .sort((a, b) => a.order - b.order)
        .map(s => ({
          ...s,
          components: db.components.filter(c => c.sectionId === s.id && visible(c)).sort((a, b) => a.order - b.order)
        }));
      return clone({ page, sections });
    },

    async createPage(data) {
      await wait();
      requireRole('editor');
      const db = load();
      const slug = String(data.slug || '').trim().toLowerCase();
      if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new ApiError('validation', 'المعرّف بالإنجليزية وأرقام وشرطات فقط.', { slug: 'مثال: space-weather' });
      if (db.pages.some(p => p.slug === slug)) throw new ApiError('conflict', 'المعرّف مستخدم.', { slug: 'مستخدم مسبقًا.' });
      if (!data.title) throw new ApiError('validation', 'العنوان مطلوب.', { title: 'مطلوب.' });
      const p = { id: uid('pg'), slug, title: data.title.trim(), visibility: data.visibility || 'public', status: data.status || 'draft', system: false };
      db.pages.push(p);
      audit('page.create', p.id);
      save();
      return clone(p);
    },

    async updatePage(id, patch) {
      await wait();
      requireRole('editor');
      const p = load().pages.find(x => x.id === id);
      if (!p) throw new ApiError('not_found', 'الصفحة غير موجودة.');
      ['title', 'visibility', 'status'].forEach(k => { if (patch[k] !== undefined) p[k] = patch[k]; });
      if (p.slug === 'home') { p.visibility = 'public'; p.status = 'published'; } // الرئيسية عامة ومنشورة دائمًا
      audit('page.update', id);
      save();
      return clone(p);
    },

    async deletePage(id) {
      await wait();
      requireRole('admin');
      const db = load();
      const p = db.pages.find(x => x.id === id);
      if (!p) throw new ApiError('not_found', 'الصفحة غير موجودة.');
      if (p.system) throw new ApiError('forbidden', 'لا يمكن حذف صفحات النظام.');
      const secIds = db.sections.filter(s => s.pageId === id).map(s => s.id);
      db.components = db.components.filter(c => !secIds.includes(c.sectionId));
      db.sections = db.sections.filter(s => s.pageId !== id);
      db.pages = db.pages.filter(x => x.id !== id);
      audit('page.delete', id);
      save();
    },

    async createSection(pageId, data) {
      await wait();
      requireRole('editor');
      const db = load();
      if (!data.title) throw new ApiError('validation', 'العنوان مطلوب.', { title: 'مطلوب.' });
      const siblings = db.sections.filter(s => s.pageId === pageId);
      const s = { id: uid('sec'), pageId, title: data.title.trim(), description: data.description || '',
        order: siblings.length + 1, status: data.status || 'draft' };
      db.sections.push(s);
      audit('section.create', s.id);
      save();
      return clone(s);
    },

    async updateSection(id, patch) {
      await wait();
      requireRole('editor');
      const s = load().sections.find(x => x.id === id);
      if (!s) throw new ApiError('not_found', 'القسم غير موجود.');
      ['title', 'description', 'status'].forEach(k => { if (patch[k] !== undefined) s[k] = patch[k]; });
      audit('section.update', id);
      save();
      return clone(s);
    },

    async deleteSection(id) {
      await wait();
      requireRole('editor');
      const db = load();
      db.components = db.components.filter(c => c.sectionId !== id);
      db.sections = db.sections.filter(s => s.id !== id);
      audit('section.delete', id);
      save();
    },

    /* orderedIds: مصفوفة كاملة بترتيب الأقسام الجديد */
    async reorderSections(pageId, orderedIds) {
      await wait(60);
      requireRole('editor');
      load().sections.filter(s => s.pageId === pageId).forEach(s => { s.order = orderedIds.indexOf(s.id) + 1; });
      audit('section.reorder', pageId);
      save();
    },

    async createComponent(sectionId, type, data, status = 'published') {
      await wait();
      requireRole('editor');
      if (!WSW.components.types[type]) throw new ApiError('validation', 'نوع مكوّن غير معروف.');
      const errors = WSW.components.validate(type, data);
      if (Object.keys(errors).length) throw new ApiError('validation', 'راجع الحقول المحددة.', errors);
      const db = load();
      const siblings = db.components.filter(c => c.sectionId === sectionId);
      const c = { id: uid('cmp'), sectionId, type, order: siblings.length + 1, status, data };
      db.components.push(c);
      audit('component.create', c.id, { type });
      save();
      return clone(c);
    },

    async updateComponent(id, patch) {
      await wait();
      requireRole('editor');
      const c = load().components.find(x => x.id === id);
      if (!c) throw new ApiError('not_found', 'المكوّن غير موجود.');
      if (patch.data) {
        const errors = WSW.components.validate(c.type, patch.data);
        if (Object.keys(errors).length) throw new ApiError('validation', 'راجع الحقول المحددة.', errors);
        c.data = patch.data;
      }
      if (patch.status) c.status = patch.status;
      audit('component.update', id);
      save();
      return clone(c);
    },

    async deleteComponent(id) {
      await wait();
      requireRole('editor');
      load().components = load().components.filter(c => c.id !== id);
      audit('component.delete', id);
      save();
    },

    async reorderComponents(sectionId, orderedIds) {
      await wait(60);
      requireRole('editor');
      load().components.filter(c => c.sectionId === sectionId).forEach(c => { c.order = orderedIds.indexOf(c.id) + 1; });
      save();
    },

    /* ----- Files ----- */
    /* في النظام الحقيقي: رفع multipart إلى الـBackend الذي يتحقق من النوع الفعلي
       للملف (لا الامتداد فقط) والحجم، ويخزّنه في File Storage، ويعيد نفس الشكل. */
    async uploadFile(file) {
      await wait(250);
      requireActive();
      const cfg = WSW.config.uploads;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!cfg.allowedExtensions.includes(ext)) throw new ApiError('validation', `نوع الملف .${ext} غير مسموح.`);
      if (file.size > cfg.maxFileSizeMB * 1024 * 1024) throw new ApiError('validation', `حجم الملف أكبر من ${cfg.maxFileSizeMB} ميغابايت.`);
      return { id: uid('f'), name: file.name, size: file.size, mime: file.type || 'application/octet-stream', url: '#' };
    },

    /* ----- Projects (Student) ----- */
    async listMyProjects() {
      await wait();
      const u = requireActive();
      return clone(load().projects.filter(p => p.studentId === u.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    },

    async getProject(id) {
      await wait();
      const u = requireActive();
      const p = load().projects.find(x => x.id === id);
      if (!p) throw new ApiError('not_found', 'المشروع غير موجود.');
      if (p.studentId !== u.id && !hasRole(u, 'admin')) throw new ApiError('forbidden', 'لا يمكنك عرض هذا المشروع.');
      const student = publicUser(load().users.find(x => x.id === p.studentId));
      return clone({ ...p, student });
    },

    /* ينشئ أو يحدّث مسودة. لا يغيّر الحالة. */
    async saveProject(data) {
      await wait();
      const u = requireActive();
      const db = load();
      if (!db.settings.submissionsOpen) throw new ApiError('closed', 'استقبال المشاريع مغلق حاليًا.');
      const f = {};
      if (!(data.title || '').trim()) f.title = 'العنوان مطلوب.';
      if (!data.type) f.type = 'اختر نوع المشروع.';
      if ((data.files || []).length > WSW.config.uploads.maxFilesPerProject) f.files = 'عدد الملفات أكبر من المسموح.';
      if (Object.keys(f).length) throw new ApiError('validation', 'راجع الحقول المحددة.', f);

      const fields = ['title', 'description', 'type', 'videoUrl', 'notes', 'links', 'files'];
      let p;
      if (data.id) {
        p = db.projects.find(x => x.id === data.id);
        if (!p || p.studentId !== u.id) throw new ApiError('not_found', 'المشروع غير موجود.');
        if (!['draft', 'needs_revision'].includes(p.status)) throw new ApiError('forbidden', 'لا يمكن تعديل المشروع بعد إرساله.');
        fields.forEach(k => { if (data[k] !== undefined) p[k] = data[k]; });
        p.updatedAt = nowIso();
      } else {
        p = { id: uid('p'), studentId: u.id, status: 'draft', reviewerNote: '', submittedAt: null,
          createdAt: nowIso(), updatedAt: nowIso(), history: [{ status: 'draft', at: nowIso(), by: u.id }],
          title: '', description: '', type: '', videoUrl: '', notes: '', links: [], files: [] };
        fields.forEach(k => { if (data[k] !== undefined) p[k] = data[k]; });
        db.projects.push(p);
      }
      save();
      return clone(p);
    },

    async submitProject(id) {
      await wait();
      const u = requireActive();
      const db = load();
      if (!db.settings.submissionsOpen) throw new ApiError('closed', 'استقبال المشاريع مغلق حاليًا.');
      const p = db.projects.find(x => x.id === id);
      if (!p || p.studentId !== u.id) throw new ApiError('not_found', 'المشروع غير موجود.');
      if (!['draft', 'needs_revision'].includes(p.status)) throw new ApiError('conflict', 'المشروع مُرسل مسبقًا.');
      if (!(p.description || '').trim()) throw new ApiError('validation', 'أضف وصفًا للمشروع قبل إرساله.', { description: 'مطلوب قبل الإرسال.' });
      p.status = 'submitted';
      p.submittedAt = nowIso();
      p.updatedAt = nowIso();
      p.history.push({ status: 'submitted', at: nowIso(), by: u.id });
      save();
      return clone(p);
    },

    async deleteProject(id) {
      await wait();
      const u = requireActive();
      const db = load();
      const p = db.projects.find(x => x.id === id);
      if (!p || p.studentId !== u.id) throw new ApiError('not_found', 'المشروع غير موجود.');
      if (p.status !== 'draft') throw new ApiError('forbidden', 'يمكن حذف المسودات فقط.');
      db.projects = db.projects.filter(x => x.id !== id);
      save();
    },

    /* ----- Projects (Admin) ----- */
    async listProjects(filter = {}) {
      await wait();
      requireRole('admin');
      const db = load();
      const q = (filter.q || '').trim().toLowerCase();
      return db.projects
        .filter(p => p.status !== 'draft' || filter.includeDrafts)
        .map(p => ({ ...clone(p), student: publicUser(db.users.find(u => u.id === p.studentId)) }))
        .filter(p => !filter.status || p.status === filter.status)
        .filter(p => !filter.type || p.type === filter.type)
        .filter(p => !filter.region || (p.student && p.student.region === filter.region))
        .filter(p => !q || p.title.toLowerCase().includes(q) || (p.student && p.student.fullName.toLowerCase().includes(q)))
        .sort((a, b) => (b.submittedAt || b.updatedAt).localeCompare(a.submittedAt || a.updatedAt));
    },

    async reviewProject(id, status, note = '') {
      await wait();
      const reviewer = requireRole('admin');
      const p = load().projects.find(x => x.id === id);
      if (!p) throw new ApiError('not_found', 'المشروع غير موجود.');
      const allowed = WSW.projectFlow.reviewTransitions[p.status] || [];
      if (!allowed.includes(status)) throw new ApiError('conflict', 'لا يمكن نقل المشروع إلى هذه الحالة من حالته الحالية.');
      if (status === 'needs_revision' && !note.trim()) throw new ApiError('validation', 'اكتب للطالب ما المطلوب تعديله.', { note: 'مطلوب عند طلب التعديل.' });
      p.status = status;
      if (note.trim()) p.reviewerNote = note.trim();
      p.updatedAt = nowIso();
      p.history.push({ status, at: nowIso(), by: reviewer.id, note: note.trim() || undefined });
      audit('project.review', id, { status });
      save();
      return clone(p);
    },

    /* ----- Announcements ----- */
    async listAnnouncements({ includeDrafts = false } = {}) {
      await wait(40);
      const u = me();
      const isEditor = hasRole(u, 'editor') && u.status === 'active';
      const isStudent = u && u.status === 'active';
      return clone(load().announcements
        .filter(a => (includeDrafts && isEditor) || a.status === 'published')
        .filter(a => isEditor || a.audience === 'public' || isStudent)
        .sort((a, b) => (b.pinned - a.pinned) || b.publishedAt.localeCompare(a.publishedAt)));
    },

    async saveAnnouncement(data) {
      await wait();
      requireRole('editor');
      const db = load();
      if (!(data.title || '').trim()) throw new ApiError('validation', 'العنوان مطلوب.', { title: 'مطلوب.' });
      let a;
      if (data.id) {
        a = db.announcements.find(x => x.id === data.id);
        if (!a) throw new ApiError('not_found', 'الإعلان غير موجود.');
        Object.assign(a, { title: data.title, body: data.body, audience: data.audience, pinned: !!data.pinned, status: data.status });
      } else {
        a = { id: uid('a'), title: data.title, body: data.body || '', audience: data.audience || 'students',
          pinned: !!data.pinned, status: data.status || 'published', publishedAt: nowIso() };
        db.announcements.push(a);
      }
      audit('announcement.save', a.id);
      save();
      return clone(a);
    },

    async deleteAnnouncement(id) {
      await wait();
      requireRole('editor');
      load().announcements = load().announcements.filter(a => a.id !== id);
      audit('announcement.delete', id);
      save();
    },

    /* ----- Stats ----- */
    async getStats() {
      await wait();
      requireRole('editor');
      const db = load();
      const students = db.users.filter(u => u.role === 'student');
      const active = students.filter(u => u.status === 'active');
      const byRegion = {};
      Object.keys(WSW.config.regions).forEach(r => { byRegion[r] = 0; });
      active.forEach(u => { const r = publicUser(u).region; if (r) byRegion[r]++; });
      const byStatus = {};
      db.projects.forEach(p => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });
      return {
        studentsTotal: students.length,
        studentsActive: active.length,
        studentsPending: students.filter(u => u.status === 'pending').length,
        schoolsParticipating: new Set(active.map(u => u.schoolId)).size,
        schoolsTotal: db.schools.length,
        projectsTotal: db.projects.filter(p => p.status !== 'draft').length,
        projectsAwaiting: (byStatus.submitted || 0) + (byStatus.under_review || 0),
        projectsByStatus: byStatus,
        activeByRegion: byRegion,
        pages: db.pages.length,
        components: db.components.length
      };
    },

    async listAuditLog() {
      await wait();
      requireRole('super_admin');
      const db = load();
      return clone(db.auditLog.slice(0, 100)).map(l => ({ ...l, userName: (db.users.find(u => u.id === l.userId) || {}).fullName }));
    },

    /* للـPrototype فقط */
    async resetDemo() {
      memoryDb = WSW.seed();
      save();
      setSession(null);
    }
  };

  /* حالات المشروع — مشتركة بين الواجهة والـBackend */
  WSW.projectFlow = {
    labels: {
      draft: 'مسودة', submitted: 'مُرسل', under_review: 'قيد المراجعة',
      approved: 'مقبول', needs_revision: 'بحاجة لتعديل', rejected: 'مرفوض'
    },
    studentHints: {
      draft: 'مشروعك محفوظ ولم يُرسل بعد. أرسله عندما يكتمل.',
      submitted: 'وصل مشروعك، وسيبدأ فريق التحكيم مراجعته.',
      under_review: 'مشروعك قيد المراجعة الآن.',
      approved: 'تم قبول مشروعك في المسابقة.',
      needs_revision: 'اطّلع على ملاحظات المراجِع، عدّل مشروعك ثم أعد إرساله.',
      rejected: 'لم يُقبل المشروع. اطّلع على ملاحظة المراجِع.'
    },
    // من أي حالة إلى أي حالة يستطيع المشرف نقل المشروع
    reviewTransitions: {
      submitted: ['under_review', 'approved', 'needs_revision', 'rejected'],
      under_review: ['approved', 'needs_revision', 'rejected'],
      approved: ['under_review'],
      rejected: ['under_review'],
      needs_revision: [],
      draft: []
    }
  };

  WSW.accountStatus = {
    pending: 'بانتظار التفعيل', active: 'مفعّل', rejected: 'مرفوض', disabled: 'معطّل'
  };
  WSW.roleLabels = { student: 'طالب', editor: 'محرر محتوى', admin: 'مشرف', super_admin: 'مشرف عام' };

  WSW.api = api;
})();
