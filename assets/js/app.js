/* =========================================================
   app.js — التوجيه (Router) والقوالب العامة والحماية
   المسارات تعتمد على # حتى يعمل الموقع كملفات ثابتة على أي
   استضافة دون إعدادات سيرفر.
   ========================================================= */
window.WSW = window.WSW || {};

(function () {
  const { esc } = WSW.ui;
  const T = (k, d) => WSW.T(k, d);
  const state = WSW.state = { user: null, settings: null };
  const routes = [];

  /* layout: 'public' | 'auth' | 'student' | 'admin'
     role: أدنى دور مطلوب؛ active: يتطلب حسابًا مفعّلًا */
  WSW.route = (pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ re, keys, handler, opts });
  };

  WSW.go = path => { if (location.hash !== '#' + path) location.hash = path; else render(); };

  WSW.refreshUser = async () => { state.user = await WSW.api.getMe(); return state.user; };

  /* ---------- Layouts ---------- */
  // الشعاران: أسبوع الفضاء (نسخة ملونة للخلفيات الفاتحة وبيضاء للغامقة) + شعار الجمعية
  const wswLogo = () => `
      <img class="brand__logo brand__logo--color" src="assets/img/logo-color.png" alt="World Space Week Jordan" width="816" height="200">
      <img class="brand__logo brand__logo--white" src="assets/img/logo-white.png" alt="World Space Week Jordan" width="816" height="200">`;
  const jasLogo = () => `<img class="brand__logo brand__logo--jas" src="assets/img/jas-logo.png" alt="${esc(WSW.config.orgName)}" width="320" height="320">`;
  const brand = () => `
    <div class="brands">
      <a class="brand" href="#/" aria-label="${esc(state.settings.siteTitle)} — الرئيسية">${wswLogo()}</a>
      <span class="brand__divider" aria-hidden="true"></span>
      <a class="brand" href="${esc(WSW.config.orgUrl)}" target="_blank" rel="noopener">${jasLogo()}</a>
    </div>`;

  const linkIcon = `<svg class="footer__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const mailIcon = `<svg class="footer__icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const footer = () => `
      <footer class="footer">
        <div class="wrap footer__inner">
          <div class="footer__logos">
            <a class="brand" href="#/" aria-label="${esc(state.settings.siteTitle)}">${wswLogo()}</a>
            <span class="brand__divider" aria-hidden="true"></span>
            <a class="brand" href="${esc(WSW.config.orgUrl)}" target="_blank" rel="noopener">${jasLogo()}</a>
          </div>
          <div class="footer__contact">
            <p class="footer__title">${T('footer.contactTitle', 'تواصل معنا')}</p>
            <a class="footer__mail" href="mailto:${esc(WSW.config.contactEmail)}">${mailIcon}<span dir="ltr">${esc(WSW.config.contactEmail)}</span></a>
            <ul class="footer__social" aria-label="حسابات الجمعية">
              ${WSW.config.socialLinks.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span dir="ltr">${esc(l.label)}</span>${linkIcon}</a></li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="wrap footer__bottom">
          <p>${T('footer.org', 'الجمعية الفلكية الأردنية — تأسست عام 1987')}</p>
          <p dir="ltr">${esc(WSW.config.orgNameEn)}</p>
        </div>
      </footer>`;

  async function publicShell() {
    const pages = (await WSW.api.listPages()).filter(p => p.visibility === 'public' && p.status === 'published' && p.slug !== 'home');
    const u = state.user;
    const home = u ? (WSW.api.hasRole(u, 'editor') ? '#/admin' : '#/student') : null;
    return `
      <header class="topbar">
        <div class="wrap topbar__inner">
          ${brand()}
          <nav class="topnav" aria-label="القائمة الرئيسية">
            <a href="#/">${T('nav.home', 'الرئيسية')}</a>
            ${pages.map(p => `<a href="#/p/${esc(p.slug)}">${esc(p.title)}</a>`).join('')}
            ${!WSW.config.accountsEnabled ? ''
                : u ? `<a class="btn btn--small btn--primary" href="${home}">${T('nav.dashboard', 'لوحتي')}</a>`
                : `<a href="#/login">${T('nav.login', 'تسجيل الدخول')}</a><a class="btn btn--small btn--primary" href="#/register">${T('nav.register', 'إنشاء حساب')}</a>`}
          </nav>
        </div>
      </header>
      <main id="main" tabindex="-1"></main>
      ${footer()}`;
  }

  /* قائمة الطالب: الرئيسية، ثم كل الصفحات المنشورة (العامة والخاصة بالطلبة) بالترتيب، ثم مشاريعه */
  function appShell(kind, pages = []) {
    const u = state.user;
    const nav = kind === 'admin' ? adminNav(u) : [
      ['#/student', 'student.nav.home', 'الرئيسية'],
      ...pages.filter(p => p.slug !== 'home' && p.status === 'published').map(p => ['#/student/p/' + p.slug, null, p.title]),
      ['#/student/projects', 'student.nav.projects', 'مشاريعي'],
      ['#/student/announcements', 'student.nav.news', 'الإعلانات'],
      ['#/student/profile', 'student.nav.profile', 'ملفي']
    ];
    return `
      <div class="app app--${kind}">
        <aside class="sidebar">
          ${brand()}
          <nav class="sidenav" aria-label="قائمة ${kind === 'admin' ? 'الإدارة' : 'الطالب'}">
            ${nav.map(([h, k, l]) => `<a href="${h}" data-nav="${h}">${k ? T(k, l) : esc(l)}</a>`).join('')}
          </nav>
          <div class="sidebar__user">
            <span class="sidebar__name">${esc(u.fullName)}</span>
            <span class="sidebar__role">${esc(WSW.roleLabels[u.role])}</span>
            <div class="sidebar__links">
              <a href="#/">${T('nav.publicSite', 'الموقع العام')}</a>
              <button class="linklike" data-action="logout">${T('nav.logout', 'تسجيل الخروج')}</button>
            </div>
          </div>
        </aside>
        <main id="main" class="app__main" tabindex="-1"></main>
      </div>`;
  }

  function adminNav(u) {
    const items = [['#/admin', 'admin.nav.overview', 'نظرة عامة']];
    if (WSW.api.hasRole(u, 'admin')) items.push(['#/admin/students', 'admin.nav.students', 'الطلبة'], ['#/admin/projects', 'admin.nav.projects', 'المشاريع'], ['#/admin/schools', 'admin.nav.schools', 'المدارس']);
    items.push(['#/admin/content', 'admin.nav.content', 'الصفحات والمحتوى'], ['#/admin/components', 'admin.nav.library', 'مكتبة المكوّنات'], ['#/admin/announcements', 'admin.nav.news', 'الإعلانات']);
    if (WSW.api.hasRole(u, 'super_admin')) items.push(['#/admin/settings', 'admin.nav.settings', 'الإعدادات']);
    return items;
  }

  function markActiveNav(path) {
    let best = null;
    document.querySelectorAll('[data-nav]').forEach(a => {
      const h = a.dataset.nav.slice(1);
      a.removeAttribute('aria-current');
      if (path === h || path.startsWith(h + '/')) { if (!best || h.length > best.dataset.nav.length - 1) best = a; }
    });
    if (best) best.setAttribute('aria-current', 'page');
  }

  /* ---------- Render ---------- */
  let currentLayout = null;
  let renderId = 0;

  async function render() {
    const id = ++renderId;
    const path = (location.hash.slice(1) || '/').split('?')[0];
    const root = document.getElementById('app');
    let match = null, params = {};
    for (const r of routes) {
      const m = path.match(r.re);
      if (m) { match = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; }
    }
    if (!match) match = routes.find(r => r.opts.notFound);

    const { layout = 'public', role, active } = match.opts;
    const u = state.user;

    // الحماية (في النظام الحقيقي: الـBackend يرفض الطلب أيضًا)
    if (role || active) {
      if (!WSW.config.accountsEnabled) return WSW.go('/');
      if (!u) return WSW.go('/login?next=' + encodeURIComponent(path));
      if (u.status !== 'active') return WSW.go('/account-status');
      if (role && !WSW.api.hasRole(u, role)) return WSW.go(WSW.api.hasRole(u, 'editor') ? '/admin' : '/student');
      if (layout === 'student' && u.role !== 'student') return WSW.go('/admin');
    }

    const studentPages = layout === 'student' ? await WSW.api.listPages() : [];
    if (id !== renderId) return;
    const layoutKey = layout + ':' + (u ? u.id + u.role : 'anon') + ':' + studentPages.map(p => p.slug + p.title).join(',');
    if (currentLayout !== layoutKey) {
      root.innerHTML = (layout === 'student' || layout === 'admin') ? appShell(layout, studentPages) : await publicShell();
      if (id !== renderId) return;
      currentLayout = layoutKey;
    }
    // عنصر main جديد في كل تنقّل حتى لا تتراكم مستمعات الأحداث
    const old = document.getElementById('main');
    const main = old.cloneNode(false);
    old.replaceWith(main);
    main.innerHTML = WSW.ui.loading();
    markActiveNav(path);
    try {
      await match.handler(main, params);
      if (id !== renderId) return;
      document.title = (main.querySelector('h1') ? main.querySelector('h1').textContent + ' — ' : '') + state.settings.siteTitle;
      WSW.renderEditBar();
    } catch (err) {
      if (id !== renderId) return;
      console.error(err);
      if (err.code === 'unauthorized') return WSW.go('/login?next=' + encodeURIComponent(path));
      main.innerHTML = `<div class="wrap page-pad">${WSW.ui.empty(err.code === 'not_found' ? 'غير موجود' : 'تعذّر عرض الصفحة', err.message || '', '<a class="btn btn--ghost" href="#/">العودة للرئيسية</a>')}</div>`;
    }
    window.scrollTo(0, 0);
  }

  WSW.rerenderShell = () => { currentLayout = null; return render(); };
  WSW.reload = () => render();

  /* ---------- Global events ---------- */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action="logout"]');
    if (!btn) return;
    await WSW.api.logout();
    state.user = null;
    currentLayout = null;
    WSW.go('/');
  });

  window.addEventListener('hashchange', render);

  WSW.start = async () => {
    [state.settings, state.texts] = await Promise.all([WSW.api.getSettings(), WSW.api.getTexts()]);
    await WSW.refreshUser();
    render();
  };
})();
