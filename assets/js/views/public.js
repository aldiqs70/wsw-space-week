/* =========================================================
   views/public.js — الصفحات العامة والدخول والتسجيل
   ========================================================= */
(function () {
  const { esc, fmtDate, daysUntil, formData, showErrors, withBusy, options } = WSW.ui;
  const api = WSW.api;
  const T = (k, d) => WSW.T(k, d);

  WSW.query = () => Object.fromEntries(new URLSearchParams((location.hash.split('?')[1] || '')));

  const pubPill = st => st !== 'published' ? WSW.ui.publishPill(st) : '';
  const renderSections = (sections, { editable = false } = {}) => sections.map((s, i) => `
    <section class="cms-section ${editable ? 'ed-section' : ''} ${editable && s.status !== 'published' ? 'is-muted' : ''}" id="s-${esc(s.id)}" ${editable ? `data-sec="${esc(s.id)}"` : ''}>
      ${editable ? `<div class="ed-tools ed-tools--section">
        <span class="ed-tools__label">قسم</span>${pubPill(s.status)}
        <button class="ed-btn" data-sec-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="نقل القسم للأعلى">↑</button>
        <button class="ed-btn" data-sec-move="1" ${i === sections.length - 1 ? 'disabled' : ''} aria-label="نقل القسم للأسفل">↓</button>
        <button class="ed-btn" data-sec-edit>تعديل القسم</button>
        <button class="ed-btn ed-btn--danger" data-sec-del>حذف</button>
      </div>` : ''}
      <div class="cms-section__head">
        <h2>${esc(s.title)}</h2>
        ${s.description ? `<p class="lede">${esc(s.description)}</p>` : ''}
      </div>
      <div class="cms-section__body">${WSW.components.renderList(s.components, { editable })}</div>
      ${editable ? '<button class="add-cmp" data-add-cmp>+ إضافة مكوّن في هذا القسم</button>' : ''}
    </section>`).join('');
  WSW.renderSections = renderSections;

  /* يعرض محتوى صفحة CMS. في "وضع تحرير المحتوى" يعرض المسودات مع أدوات التحرير على الصفحة نفسها. */
  async function cmsBlock(slug, { emptyTitle, emptyText } = {}) {
    const editing = WSW.editMode.content();
    const { page, sections } = await api.getPage(slug, { preview: editing });
    const html = `
      <div class="wrap cms" ${editing ? 'data-editable-page' : ''}>
        ${editing ? `<div class="ed-banner">أنت في وضع تحرير المحتوى — التعديلات تُحفظ مباشرة. العناصر الباهتة مسودات لا يراها الطلبة.</div>` : ''}
        ${sections.length ? renderSections(sections, { editable: editing })
          : editing ? '' : WSW.ui.empty(emptyTitle || 'لا يوجد محتوى بعد', emptyText || 'ستُضاف محتويات هذه الصفحة قريبًا.')}
        ${editing ? '<button class="add-section" data-add-section>+ إضافة قسم جديد</button>' : ''}
      </div>`;
    return {
      page, sections, html,
      bind(main) { if (editing) WSW.editor.bindPage(main.querySelector('[data-editable-page]'), page, sections); }
    };
  }

  const announcementList = list => list.map(a => `
    <article class="announce ${a.pinned ? 'announce--pinned' : ''}">
      <header><h3>${esc(a.title)}</h3><time datetime="${esc(a.publishedAt)}">${esc(fmtDate(a.publishedAt))}</time></header>
      ${WSW.ui.paragraphs(a.body)}
    </article>`).join('');
  WSW.announcementList = announcementList;

  /* ---------- الرئيسية ---------- */
  WSW.route('/', async main => {
    const s = WSW.state.settings;
    const [cms, news] = await Promise.all([cmsBlock('home'), api.listAnnouncements()]);
    const u = WSW.state.user;
    const left = daysUntil(s.submissionDeadline);

    main.innerHTML = `
      <section class="hero">
        <div class="hero__sky" aria-hidden="true"></div>
        <svg class="hero__orbit" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs><radialGradient id="planet" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#E6CCFF"/><stop offset=".5" stop-color="#9327E0"/><stop offset="1" stop-color="#3E0E66"/></radialGradient></defs>
          <g transform="rotate(-9 600 310)">
            <ellipse class="orbit-path orbit-path--faint" cx="600" cy="310" rx="400" ry="116"/>
            <ellipse class="orbit-path" cx="600" cy="310" rx="560" ry="170"/>
            <circle class="orbit-planet" cx="600" cy="310" r="30" fill="url(#planet)"/>
            <circle class="orbit-sat" r="6"/>
          </g>
        </svg>
        <div class="wrap hero__content">
          <p class="hero__org">${esc(WSW.config.orgName)}</p>
          <h1 class="hero__title">${WSW.S('siteTitle')}</h1>
          <p class="hero__tagline">${WSW.S('tagline')}</p>
          <div class="hero__actions">
            ${u ? `<a class="btn btn--primary btn--large" href="${api.hasRole(u, 'editor') ? '#/admin' : '#/student'}">${T('hero.toDashboard', 'الذهاب إلى لوحتي')}</a>`
                : `${s.registrationOpen ? `<a class="btn btn--primary btn--large" href="#/register">${T('hero.register', 'أنشئ حسابك')}</a>` : ''}<a class="btn btn--onDark btn--large" href="#/login">${T('hero.login', 'تسجيل الدخول')}</a>`}
          </div>
        </div>
        <div class="wrap hero__facts">
          <dl>
            <div><dt>${T('hero.fact1.label', 'أسبوع الفضاء')}</dt><dd>${T('hero.fact1.value', '4 – 10 تشرين الأول')}</dd></div>
            <div><dt>${T('hero.fact2.label', 'آخر موعد لتسليم المشاريع')}</dt><dd>${esc(fmtDate(s.submissionDeadline))}${left > 0 ? `<small>بعد ${left} يومًا</small>` : ''}</dd></div>
            <div><dt>${T('hero.fact3.label', 'إعلان النتائج')}</dt><dd>${esc(fmtDate(s.resultsDate))}</dd></div>
          </dl>
        </div>
      </section>

      ${news.length ? `<section class="wrap news" aria-labelledby="news-h"><h2 id="news-h">${T('home.newsTitle', 'آخر الإعلانات')}</h2><div class="news__list">${announcementList(news.slice(0, 3))}</div></section>` : ''}

      ${cms.html}`;
    cms.bind(main);
  });

  /* ---------- أي صفحة منشأة من لوحة الإدارة ---------- */
  WSW.route('/p/:slug', async (main, { slug }) => {
    const cms = await cmsBlock(slug);
    main.innerHTML = `
      <div class="page-head"><div class="wrap"><h1>${esc(cms.page.title)}</h1></div></div>
      ${cms.html}`;
    cms.bind(main);
  });

  /* ---------- الدخول ---------- */
  WSW.route('/login', async main => {
    if (WSW.state.user) return WSW.go(api.hasRole(WSW.state.user, 'editor') ? '/admin' : '/student');
    main.innerHTML = `
      <div class="auth">
        <form class="auth__card" novalidate>
          <h1>${T('login.title', 'تسجيل الدخول')}</h1>
          <div class="field"><label for="username">${T('login.username', 'اسم المستخدم')}</label><input id="username" name="username" dir="ltr" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
          <div class="field"><label for="password">${T('login.password', 'كلمة المرور')}</label><input id="password" name="password" type="password" dir="ltr" autocomplete="current-password" required></div>
          <button class="btn btn--primary btn--block" type="submit">${T('login.submit', 'دخول')}</button>
          <p class="auth__alt">${T('login.noAccount', 'ليس لديك حساب؟')} <a href="#/register">${T('login.toRegister', 'أنشئ حسابًا')}</a></p>
          <p class="auth__alt hint">${T('login.forgot', 'نسيت كلمة المرور؟ تواصل مع معلمك المشرف أو مع الجمعية لإعادة تعيينها.')}</p>
        </form>
        <aside class="demo-box">
          <p><strong>حسابات تجريبية</strong> (للـPrototype فقط)</p>
          <table>
            <tr><td>مشرف عام</td><td dir="ltr">admin / admin123</td></tr>
            <tr><td>محرر محتوى</td><td dir="ltr">editor / editor123</td></tr>
            <tr><td>طالب مفعّل</td><td dir="ltr">student / student123</td></tr>
            <tr><td>طالب بانتظار التفعيل</td><td dir="ltr">pending / student123</td></tr>
          </table>
        </aside>
      </div>`;
    const form = main.querySelector('form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = formData(form);
      await withBusy(form.querySelector('[type=submit]'), async () => {
        try {
          const u = await api.login(d.username, d.password);
          WSW.state.user = u;
          const next = WSW.query().next;
          WSW.go(u.status !== 'active' ? '/account-status' : next || (api.hasRole(u, 'editor') ? '/admin' : '/student'));
        } catch (err) { showErrors(form, err); }
      });
    });
  }, { layout: 'public' });

  /* ---------- التسجيل ---------- */
  WSW.route('/register', async main => {
    const s = WSW.state.settings;
    if (!s.registrationOpen) {
      main.innerHTML = `<div class="wrap page-pad">${WSW.ui.empty(WSW.t('register.closed.title', 'التسجيل مغلق'), WSW.t('register.closed.text', 'التسجيل غير متاح حاليًا. تابع إعلانات الجمعية.'))}</div>`;
      return;
    }
    const regionOpts = Object.entries(WSW.config.regions).map(([k, r]) => [k, r.label]);
    main.innerHTML = `
      <div class="auth auth--wide">
        <form class="auth__card" novalidate>
          <h1>${T('register.title', 'إنشاء حساب طالب')}</h1>
          <p class="muted">${T('register.intro', 'بعد التسجيل يراجع فريق الجمعية بياناتك ويفعّل حسابك.')}</p>

          <div class="field"><label for="fullName">${T('register.fullName', 'الاسم الرباعي')}</label><input id="fullName" name="fullName" autocomplete="name" required><p class="hint">${T('register.fullName.hint', 'كما هو في الوثائق الرسمية، لتمييزك عن الطلبة ذوي الأسماء المتشابهة.')}</p></div>

          <div class="grid-2">
            <div class="field"><label for="username">${T('register.username', 'اسم المستخدم')}</label><input id="username" name="username" dir="ltr" autocomplete="username" autocapitalize="none" spellcheck="false" required><p class="hint">${T('register.username.hint', 'بالإنجليزية: أحرف وأرقام و . _ — ستستخدمه لتسجيل الدخول.')}</p></div>
            <div class="field"><label for="password">${T('register.password', 'كلمة المرور')}</label><input id="password" name="password" type="password" dir="ltr" autocomplete="new-password" minlength="8" required><p class="hint">${T('register.password.hint', '8 أحرف على الأقل.')}</p></div>
          </div>

          <div class="field"><label for="guardianPhone">${T('register.guardianPhone', 'رقم هاتف ولي الأمر')}</label><input id="guardianPhone" name="guardianPhone" type="tel" inputmode="numeric" dir="ltr" placeholder="07XXXXXXXX" autocomplete="tel" required><p class="hint">${T('register.guardianPhone.hint', 'رقم موبايل أردني، للتواصل بخصوص المسابقة.')}</p></div>

          <fieldset class="field school-pick">
            <legend>${T('register.school', 'المدرسة')}</legend>
            <div class="region-choice" role="radiogroup" aria-label="${esc(WSW.t('register.region', 'الإقليم'))}">
              ${regionOpts.map(([k, l]) => `<label class="region-chip"><input type="radio" name="region" value="${esc(k)}"><span>${esc(l.replace('إقليم ', ''))}</span></label>`).join('')}
            </div>
            <select id="schoolId" name="schoolId" required disabled aria-label="${esc(WSW.t('register.school', 'المدرسة'))}"><option value="">${esc(WSW.t('register.school.pickRegion', 'اختر الإقليم أولًا'))}</option></select>
            <p class="hint" id="school-hint">${T('register.school.hint', 'اختر إقليمك لتظهر مدارسه فقط. إن لم تجد مدرستك تواصل مع معلمك المشرف.')}</p>
          </fieldset>

          <div class="field"><label for="grade">${T('register.grade', 'الصف')}</label><select id="grade" name="grade" required>${options(WSW.config.grades, '', { placeholder: WSW.t('register.grade.pick', 'اختر الصف') })}</select></div>

          <label class="check"><input type="checkbox" name="acceptTerms"> <span>${T('register.terms', 'أوافق على شروط المسابقة وعلى استخدام بياناتي لأغراض المسابقة فقط.')} <a href="#/p/rules" target="_blank">${T('register.termsLink', 'قراءة الشروط')}</a></span></label>
          <button class="btn btn--primary btn--block" type="submit">${T('register.submit', 'إنشاء الحساب')}</button>
          <p class="auth__alt">${T('register.haveAccount', 'لديك حساب؟')} <a href="#/login">${T('register.toLogin', 'سجّل الدخول')}</a></p>
        </form>
      </div>`;

    const form = main.querySelector('form');
    const school = form.querySelector('#schoolId');
    const hint = form.querySelector('#school-hint');
    let schools = [];
    form.querySelectorAll('[name=region]').forEach(r => r.addEventListener('change', async () => {
      school.disabled = true;
      school.innerHTML = `<option value="">${esc(WSW.t('common.loading', 'جارٍ التحميل…'))}</option>`;
      schools = await api.listSchools({ region: r.value });
      school.innerHTML = schools.length
        ? options(schools.map(x => [x.id, x.name + ' — ' + x.governorate]), '', { placeholder: WSW.t('register.school.pick', 'اختر مدرستك') })
        : `<option value="">${esc(WSW.t('register.school.none', 'لا توجد مدارس مسجّلة في هذا الإقليم'))}</option>`;
      school.disabled = !schools.length;
      school.focus();
    }));
    school.addEventListener('change', () => {
      const sc = schools.find(x => x.id === school.value);
      if (sc) hint.textContent = 'محافظة ' + sc.governorate;
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = formData(form);
      await withBusy(form.querySelector('[type=submit]'), async () => {
        try {
          WSW.state.user = await api.register(d);
          WSW.go('/account-status');
        } catch (err) { showErrors(form, err); }
      });
    });
  });

  /* ---------- حالة الحساب (بانتظار / مرفوض / معطّل) ---------- */
  WSW.route('/account-status', async main => {
    const u = await WSW.refreshUser();
    if (!u) return WSW.go('/login');
    if (u.status === 'active') return WSW.go(api.hasRole(u, 'editor') ? '/admin' : '/student');
    const msg = {
      pending: [T('status.pending.title', 'حسابك بانتظار التفعيل'), T('status.pending.text', 'وصلنا طلبك. يراجع فريق الجمعية بياناتك ويفعّل حسابك، وبعدها تستطيع الوصول إلى المحتوى ورفع مشروعك.')],
      rejected: [T('status.rejected.title', 'لم يُقبل طلب التسجيل'), T('status.rejected.text', 'إن كنت ترى أن هذا خطأ، تواصل مع معلمك المشرف أو مع الجمعية.')],
      disabled: [T('status.disabled.title', 'الحساب معطّل'), T('status.disabled.text', 'تواصل مع الجمعية لمعرفة التفاصيل.')]
    }[u.status];
    main.innerHTML = `
      <div class="auth"><div class="auth__card status-card status-card--${esc(u.status)}">
        <h1>${msg[0]}</h1><p>${msg[1]}</p>
        <dl class="kv">
          <div><dt>الاسم</dt><dd>${esc(u.fullName)}</dd></div>
          <div><dt>اسم المستخدم</dt><dd dir="ltr">${esc(u.username)}</dd></div>
          <div><dt>المدرسة</dt><dd>${esc(u.schoolName || '—')}</dd></div>
          <div><dt>الصف</dt><dd>${esc(u.grade || '—')}</dd></div>
          <div><dt>المحافظة</dt><dd>${esc(u.governorate || '—')} — ${esc(WSW.geo.regionLabel(u.region))}</dd></div>
        </dl>
        <button class="btn btn--ghost" data-action="logout">${T('nav.logout', 'تسجيل الخروج')}</button>
      </div></div>`;
  });

  WSW.route('/404', async main => {
    main.innerHTML = `<div class="wrap page-pad">${WSW.ui.empty('الصفحة غير موجودة', 'تأكد من الرابط أو عد إلى الرئيسية.', '<a class="btn btn--ghost" href="#/">الرئيسية</a>')}</div>`;
  }, { notFound: true });
})();
