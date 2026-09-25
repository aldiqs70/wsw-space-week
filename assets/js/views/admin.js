/* =========================================================
   views/admin.js — لوحة الإدارة
   ========================================================= */
(function () {
  const { esc, fmtDate, formData, showErrors, withBusy, options, governorateOptions, toast, modal, confirmDialog,
    projectPill, accountPill, publishPill, empty } = WSW.ui;
  const api = WSW.api;
  const A = role => ({ layout: 'admin', role });
  const flow = WSW.projectFlow;
  const regionOpts = Object.entries(WSW.config.regions).map(([k, r]) => [k, r.label]);

  /* ---------- نظرة عامة ---------- */
  WSW.route('/admin', async main => {
    const u = WSW.state.user;
    const st = await api.getStats();
    const isAdmin = api.hasRole(u, 'admin');
    const [pending, awaiting] = isAdmin
      ? await Promise.all([api.listStudents({ status: 'pending' }), api.listProjects({})])
      : [[], []];
    const waiting = awaiting.filter(p => ['submitted', 'under_review'].includes(p.status));
    const maxRegion = Math.max(1, ...Object.values(st.activeByRegion));

    main.innerHTML = `
      <header class="dash-head"><h1>نظرة عامة</h1></header>
      <div class="stat-row">
        <a class="stat" href="#/admin/students?status=active"><span class="stat__n">${st.studentsActive}</span><span>طالب مفعّل</span></a>
        <a class="stat stat--alert" href="#/admin/students?status=pending"><span class="stat__n">${st.studentsPending}</span><span>طلب تسجيل ينتظر</span></a>
        <a class="stat" href="#/admin/projects"><span class="stat__n">${st.projectsTotal}</span><span>مشروع مُرسل</span></a>
        <a class="stat stat--alert" href="#/admin/projects?status=submitted"><span class="stat__n">${st.projectsAwaiting}</span><span>مشروع ينتظر المراجعة</span></a>
        <div class="stat"><span class="stat__n">${st.schoolsParticipating}<small>/${st.schoolsTotal}</small></span><span>مدرسة مشاركة</span></div>
      </div>

      <div class="dash-grid">
        <section class="panel">
          <h2>الطلبة المفعّلون حسب الإقليم</h2>
          <ul class="bars">${Object.entries(st.activeByRegion).map(([k, n]) => `
            <li><span>${esc(WSW.geo.regionLabel(k))}</span><span class="bars__track"><span class="bars__fill" style="width:${(n / maxRegion) * 100}%"></span></span><b>${n}</b></li>`).join('')}
          </ul>
        </section>

        ${isAdmin ? `
        <section class="panel">
          <div class="panel__head"><h2>طلبات تسجيل تنتظر</h2><a href="#/admin/students?status=pending">الكل</a></div>
          ${pending.length ? `<ul class="mini-list">${pending.slice(0, 5).map(s => `
            <li><span><b>${esc(s.fullName)}</b><br><small class="muted">${esc(s.schoolName)} — ${esc(s.grade)}</small></span>
              <span class="btn-group"><button class="btn btn--small btn--primary" data-approve="${esc(s.id)}">تفعيل</button></span></li>`).join('')}</ul>`
            : '<p class="muted">لا توجد طلبات معلّقة.</p>'}
        </section>

        <section class="panel panel--wide">
          <div class="panel__head"><h2>مشاريع تنتظر المراجعة</h2><a href="#/admin/projects">الكل</a></div>
          ${waiting.length ? `<ul class="mini-list">${waiting.slice(0, 6).map(p => `
            <li><a href="#/admin/projects/${esc(p.id)}"><b>${esc(p.title)}</b></a><span class="muted">${esc(p.student.fullName)}</span>${projectPill(p.status)}</li>`).join('')}</ul>`
            : '<p class="muted">لا توجد مشاريع تنتظر.</p>'}
        </section>` : ''}
      </div>`;

    main.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', async () => {
      await withBusy(b, () => api.setStudentStatus(b.dataset.approve, 'active'));
      toast('فُعّل الحساب.');
      WSW.go('/admin');
    }));
  }, A('editor'));

  /* ---------- الطلبة ---------- */
  WSW.route('/admin/students', async main => {
    const q = WSW.query();
    const schools = await api.listSchools();
    main.innerHTML = `
      <header class="dash-head dash-head--row"><h1>الطلبة</h1><button class="btn btn--ghost" data-export>تصدير CSV</button></header>
      <form class="filters" data-filters>
        <input name="q" type="search" placeholder="بحث بالاسم أو اسم المستخدم أو الهاتف أو المدرسة" value="${esc(q.q || '')}" aria-label="بحث">
        <select name="status" aria-label="الحالة">${options(Object.entries(WSW.accountStatus), q.status || '', { placeholder: 'كل الحالات' })}</select>
        <select name="region" aria-label="الإقليم">${options(regionOpts, q.region || '', { placeholder: 'كل الأقاليم' })}</select>
        <select name="governorate" aria-label="المحافظة">${governorateOptions(q.governorate || '', 'كل المحافظات')}</select>
        <select name="grade" aria-label="الصف">${options(WSW.config.grades, q.grade || '', { placeholder: 'كل الصفوف' })}</select>
        <select name="schoolId" aria-label="المدرسة">${options(schools.map(s => [s.id, s.name]), q.schoolId || '', { placeholder: 'كل المدارس' })}</select>
      </form>
      <div class="bulk" data-bulk hidden><span data-bulk-count></span><button class="btn btn--small btn--primary" data-bulk-approve>تفعيل المحدّد</button></div>
      <div data-table>${WSW.ui.loading()}</div>`;

    const form = main.querySelector('[data-filters]');
    const box = main.querySelector('[data-table]');
    let rows = [];

    const load = async () => {
      rows = await api.listStudents(formData(form));
      box.innerHTML = rows.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th><input type="checkbox" data-all aria-label="تحديد الكل"></th><th>الطالب</th><th>المدرسة</th><th>الصف</th><th>المحافظة</th><th>هاتف ولي الأمر</th><th>الحالة</th><th>التسجيل</th><th><span class="sr-only">إجراءات</span></th></tr></thead>
          <tbody>${rows.map(s => `
            <tr>
              <td>${s.status === 'pending' ? `<input type="checkbox" data-pick="${esc(s.id)}" aria-label="تحديد ${esc(s.fullName)}">` : ''}</td>
              <td><b>${esc(s.fullName)}</b><br><small class="muted" dir="ltr">@${esc(s.username)}</small></td>
              <td>${esc(s.schoolName)}</td><td>${esc(s.grade)}</td>
              <td>${esc(s.governorate)}<br><small class="muted">${esc(WSW.geo.regionLabel(s.region))}</small></td>
              <td dir="ltr"><a href="tel:${esc(s.guardianPhone)}">${esc(s.guardianPhone)}</a></td>
              <td>${accountPill(s.status)}</td><td>${esc(fmtDate(s.createdAt))}</td>
              <td class="row-actions">
                ${s.status === 'pending' ? `<button class="btn btn--small btn--primary" data-set="active" data-id="${esc(s.id)}">تفعيل</button><button class="btn btn--small btn--ghost" data-set="rejected" data-id="${esc(s.id)}">رفض</button>` : ''}
                ${s.status === 'active' ? `<button class="btn btn--small btn--ghost" data-set="disabled" data-id="${esc(s.id)}">تعطيل</button>` : ''}
                ${['rejected', 'disabled'].includes(s.status) ? `<button class="btn btn--small btn--ghost" data-set="active" data-id="${esc(s.id)}">تفعيل</button>` : ''}
                <button class="btn btn--small btn--ghost" data-edit="${esc(s.id)}">تعديل</button>
              </td>
            </tr>`).join('')}</tbody>
        </table></div><p class="muted table-count">${rows.length} طالب</p>`
        : empty('لا نتائج', 'لا يوجد طلبة يطابقون هذه الفلاتر.');
      syncBulk();
    };

    const syncBulk = () => {
      const picked = box.querySelectorAll('[data-pick]:checked').length;
      main.querySelector('[data-bulk]').hidden = !picked;
      main.querySelector('[data-bulk-count]').textContent = `${picked} محدّد`;
    };

    let t;
    form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 200); });
    form.addEventListener('submit', e => e.preventDefault());

    box.addEventListener('change', e => {
      if (e.target.matches('[data-all]')) box.querySelectorAll('[data-pick]').forEach(c => { c.checked = e.target.checked; });
      syncBulk();
    });

    main.querySelector('[data-bulk-approve]').addEventListener('click', async e => {
      const ids = [...box.querySelectorAll('[data-pick]:checked')].map(c => c.dataset.pick);
      await withBusy(e.target, async () => { for (const id of ids) await api.setStudentStatus(id, 'active'); });
      toast(`فُعّل ${ids.length} حساب.`);
      load();
    });

    box.addEventListener('click', async e => {
      const b = e.target.closest('[data-set]');
      if (b) {
        const st = b.dataset.set;
        if (st !== 'active' && !await confirmDialog(st === 'rejected' ? 'رفض طلب التسجيل؟' : 'تعطيل الحساب؟ لن يستطيع الطالب الدخول.', { confirmLabel: st === 'rejected' ? 'رفض' : 'تعطيل', danger: true })) return;
        await api.setStudentStatus(b.dataset.id, st);
        toast({ active: 'فُعّل الحساب.', rejected: 'رُفض الطلب.', disabled: 'عُطّل الحساب.' }[st]);
        load();
      }
      const ed = e.target.closest('[data-edit]');
      if (ed) editStudent(rows.find(r => r.id === ed.dataset.edit), schools, load);
    });

    main.querySelector('[data-export]').addEventListener('click', () => {
      const head = ['الاسم', 'اسم المستخدم', 'هاتف ولي الأمر', 'المدرسة', 'الصف', 'المحافظة', 'الإقليم', 'الحالة', 'تاريخ التسجيل'];
      const csv = [head, ...rows.map(s => [s.fullName, s.username, s.guardianPhone, s.schoolName, s.grade, s.governorate, WSW.geo.regionLabel(s.region), WSW.accountStatus[s.status], s.createdAt.slice(0, 10)])]
        .map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'students.csv';
      a.click();
    });

    load();
  }, A('admin'));

  function editStudent(s, schools, done) {
    const schoolOpts = region => options(schools.filter(x => WSW.geo.regionOf(x.governorate) === region).map(x => [x.id, x.name + ' — ' + x.governorate]), s.schoolId);
    modal({
      title: 'تعديل بيانات الطالب',
      body: `<form novalidate>
        <div class="field"><label for="fullName">الاسم الرباعي</label><input id="fullName" name="fullName" value="${esc(s.fullName)}"></div>
        <div class="grid-2">
          <div class="field"><label for="username">اسم المستخدم</label><input id="username" name="username" dir="ltr" value="${esc(s.username)}"></div>
          <div class="field"><label for="guardianPhone">هاتف ولي الأمر</label><input id="guardianPhone" name="guardianPhone" type="tel" dir="ltr" value="${esc(s.guardianPhone)}"></div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="region">الإقليم</label><select id="region">${options(regionOpts, s.region)}</select></div>
          <div class="field"><label for="schoolId">المدرسة</label><select id="schoolId" name="schoolId">${schoolOpts(s.region)}</select></div>
        </div>
        <div class="field"><label for="grade">الصف</label><select id="grade" name="grade">${options(WSW.config.grades, s.grade)}</select></div>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">حفظ التغييرات</button>
          <button class="btn btn--ghost" type="button" data-reset-pass>إعادة تعيين كلمة المرور</button>
          <button class="btn btn--ghost" type="button" data-close>إلغاء</button>
        </div>
      </form>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        el.querySelector('#region').addEventListener('change', e => { el.querySelector('#schoolId').innerHTML = schoolOpts(e.target.value); });
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try { await api.updateStudent(s.id, formData(f)); toast('حُفظت التغييرات.'); close(); done(); }
          catch (err) { showErrors(f, err); }
        });
        el.querySelector('[data-reset-pass]').addEventListener('click', async () => {
          close();
          if (!await confirmDialog(`إنشاء كلمة مرور مؤقتة جديدة لـ ${s.fullName}؟ كلمة المرور الحالية ستتوقف عن العمل.`, { confirmLabel: 'إعادة التعيين' })) return;
          const { temporaryPassword } = await api.resetStudentPassword(s.id);
          modal({
            title: 'كلمة المرور المؤقتة',
            body: `<p>أبلغ الطالب بها (أو ولي أمره على <span dir="ltr">${esc(s.guardianPhone)}</span>). لن تظهر مرة أخرى.</p>
              <dl class="kv temp-pass"><div><dt>اسم المستخدم</dt><dd dir="ltr">${esc(s.username)}</dd></div><div><dt>كلمة المرور</dt><dd dir="ltr"><code>${esc(temporaryPassword)}</code></dd></div></dl>
              <div class="form-actions"><button class="btn btn--primary" data-close>تم</button></div>`
          });
        });
      }
    });
  }

  /* ---------- المشاريع ---------- */
  WSW.route('/admin/projects', async main => {
    const q = WSW.query();
    main.innerHTML = `
      <header class="dash-head"><h1>المشاريع</h1></header>
      <form class="filters" data-filters>
        <input name="q" type="search" placeholder="بحث بالعنوان أو اسم الطالب" value="${esc(q.q || '')}" aria-label="بحث">
        <select name="status" aria-label="الحالة">${options(Object.entries(flow.labels).filter(([k]) => k !== 'draft'), q.status || '', { placeholder: 'كل الحالات' })}</select>
        <select name="type" aria-label="النوع">${options(WSW.config.projectTypes, q.type || '', { placeholder: 'كل الأنواع' })}</select>
        <select name="region" aria-label="الإقليم">${options(regionOpts, q.region || '', { placeholder: 'كل الأقاليم' })}</select>
      </form>
      <div data-table>${WSW.ui.loading()}</div>`;
    const form = main.querySelector('[data-filters]');
    const box = main.querySelector('[data-table]');
    const load = async () => {
      const rows = await api.listProjects(formData(form));
      box.innerHTML = rows.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المشروع</th><th>الطالب</th><th>النوع</th><th>الحالة</th><th>أُرسل</th></tr></thead>
          <tbody>${rows.map(p => `<tr class="is-link" data-href="#/admin/projects/${esc(p.id)}">
            <td><a href="#/admin/projects/${esc(p.id)}"><b>${esc(p.title)}</b></a></td>
            <td>${esc(p.student.fullName)}<br><small class="muted">${esc(p.student.schoolName)} — ${esc(WSW.geo.regionLabel(p.student.region))}</small></td>
            <td>${esc(p.type)}</td><td>${projectPill(p.status)}</td><td>${esc(fmtDate(p.submittedAt))}</td></tr>`).join('')}</tbody>
        </table></div><p class="muted table-count">${rows.length} مشروع</p>`
        : empty('لا نتائج', 'لا توجد مشاريع مُرسلة تطابق الفلاتر.');
    };
    form.addEventListener('input', load);
    form.addEventListener('submit', e => e.preventDefault());
    box.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr && !e.target.closest('a')) location.hash = tr.dataset.href; });
    load();
  }, A('admin'));

  WSW.route('/admin/projects/:id', async (main, { id }) => {
    const p = await api.getProject(id);
    const next = flow.reviewTransitions[p.status] || [];
    main.innerHTML = WSW.projectDetail(p, { student: false }) + (next.length ? `
      <section class="panel review-panel">
        <h2>المراجعة</h2>
        <form novalidate>
          <div class="field"><label for="note">ملاحظة للطالب</label><textarea id="note" name="note" rows="4" placeholder="مطلوبة عند طلب التعديل">${esc(p.reviewerNote || '')}</textarea><p class="hint">يراها الطالب في صفحة مشروعه.</p></div>
          <div class="form-actions">${next.map(st => `<button class="btn ${st === 'approved' ? 'btn--primary' : st === 'rejected' ? 'btn--danger-ghost' : 'btn--ghost'}" type="submit" data-status="${st}">${esc({ under_review: 'بدء المراجعة', approved: 'قبول', needs_revision: 'طلب تعديل', rejected: 'رفض' }[st])}</button>`).join('')}</div>
        </form>
        <p class="hint">معايير التحكيم ونموذج الدرجات يُضافان لاحقًا (راجع ملف التسليم، القسم 9).</p>
      </section>` : '');
    const form = main.querySelector('.review-panel form');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const st = e.submitter.dataset.status;
      if (st === 'rejected' && !await confirmDialog('رفض المشروع؟', { confirmLabel: 'رفض', danger: true })) return;
      await withBusy(e.submitter, async () => {
        try { await api.reviewProject(p.id, st, formData(form).note); toast('حُدّثت حالة المشروع.'); WSW.go('/admin/projects/' + p.id); }
        catch (err) { showErrors(form, err); }
      });
    });
  }, A('admin'));

  /* ---------- المدارس ---------- */
  WSW.route('/admin/schools', async main => {
    const [schools, students] = await Promise.all([api.listSchools(), api.listStudents({ status: 'active' })]);
    const count = id => students.filter(s => s.schoolId === id).length;
    main.innerHTML = `
      <header class="dash-head dash-head--row"><h1>المدارس المشاركة</h1><button class="btn btn--primary" data-add>إضافة مدرسة</button></header>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>المدرسة</th><th>المحافظة</th><th>الإقليم</th><th>النوع</th><th>طلبة مفعّلون</th></tr></thead>
        <tbody>${schools.map(s => `<tr><td><a href="#/admin/students?schoolId=${esc(s.id)}">${esc(s.name)}</a></td><td>${esc(s.governorate)}</td><td>${esc(WSW.geo.regionLabel(WSW.geo.regionOf(s.governorate)))}</td><td>${esc(s.type)}</td><td>${count(s.id)}</td></tr>`).join('')}</tbody>
      </table></div>`;
    main.querySelector('[data-add]').addEventListener('click', () => modal({
      title: 'إضافة مدرسة',
      body: `<form novalidate>
        <div class="field"><label for="name">اسم المدرسة</label><input id="name" name="name"></div>
        <div class="grid-2">
          <div class="field"><label for="governorate">المحافظة</label><select id="governorate" name="governorate">${governorateOptions('')}</select></div>
          <div class="field"><label for="type">النوع</label><select id="type" name="type">${options(['حكومية', 'خاصة', 'وكالة الغوث', 'عسكرية'], 'حكومية')}</select></div>
        </div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">إضافة المدرسة</button><button class="btn btn--ghost" type="button" data-close>إلغاء</button></div>
      </form>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try { await api.createSchool(formData(f)); toast('أُضيفت المدرسة.'); close(); WSW.go('/admin/schools'); }
          catch (err) { showErrors(f, err); }
        });
      }
    }));
  }, A('admin'));

  /* ---------- الصفحات ---------- */
  WSW.route('/admin/content', async main => {
    const pages = await api.listPages();
    main.innerHTML = `
      <header class="dash-head dash-head--row"><h1>الصفحات والمحتوى</h1><button class="btn btn--primary" data-new-page>صفحة جديدة</button></header>
      <p class="muted">كل صفحة مكوّنة من أقسام، وكل قسم يحتوي مكوّنات. عدّلها من هنا، أو اضغط «تحرير على الصفحة» لتضيف المحتوى وأنت ترى الصفحة كما يراها الطلبة.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>الصفحة</th><th>الرابط</th><th><span class="sr-only">تحرير</span></th><th>من يراها</th><th>الحالة</th></tr></thead>
        <tbody>${pages.map(p => `<tr class="is-link" data-href="#/admin/content/${esc(p.id)}">
          <td><a href="#/admin/content/${esc(p.id)}"><b>${esc(p.title)}</b></a></td>
          <td dir="ltr" class="muted">${p.slug === 'home' ? '#/' : p.slug === 'learn' ? '#/student/learn' : '#/p/' + esc(p.slug)}</td>
          <td><button class="btn btn--small btn--ghost" data-inline="${esc(p.slug)}">تحرير على الصفحة</button></td>
          <td>${p.visibility === 'public' ? 'الجميع' : 'الطلبة المسجّلون'}</td><td>${publishPill(p.status)}</td></tr>`).join('')}</tbody>
      </table></div>`;
    main.querySelector('tbody').addEventListener('click', e => {
      const ib = e.target.closest('[data-inline]');
      if (ib) { WSW.setEditMode('content', true); return WSW.go(ib.dataset.inline === 'home' ? '/' : '/p/' + ib.dataset.inline); }
      const tr = e.target.closest('tr[data-href]');
      if (tr && !e.target.closest('a')) location.hash = tr.dataset.href;
    });
    main.querySelector('[data-new-page]').addEventListener('click', () => modal({
      title: 'صفحة جديدة',
      body: `<form novalidate>
        <div class="field"><label for="title">العنوان</label><input id="title" name="title" placeholder="الطقس الفضائي"></div>
        <div class="field"><label for="slug">المعرّف في الرابط</label><input id="slug" name="slug" dir="ltr" placeholder="space-weather"><p class="hint">أحرف إنجليزية صغيرة وأرقام وشرطات.</p></div>
        <div class="field"><label for="visibility">من يراها</label><select id="visibility" name="visibility">${options([['students', 'الطلبة المسجّلون'], ['public', 'الجميع']], 'students')}</select></div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">إنشاء الصفحة</button><button class="btn btn--ghost" type="button" data-close>إلغاء</button></div>
      </form>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try { const p = await api.createPage(formData(f)); close(); WSW.go('/admin/content/' + p.id); }
          catch (err) { showErrors(f, err); }
        });
      }
    }));
  }, A('editor'));

  /* ---------- محرر الصفحة (Page Builder) ---------- */
  WSW.route('/admin/content/:pageId', async (main, { pageId }) => {
    const pages = await api.listPages();
    const page = pages.find(p => p.id === pageId);
    if (!page) throw new api.ApiError('not_found', 'الصفحة غير موجودة.');
    const { sections } = await api.getPage(page.slug, { preview: true });
    const types = WSW.components.types;
    const statusSel = (cur, attr) => `<select ${attr} aria-label="الحالة">${options([['published', 'منشور'], ['draft', 'مسودة'], ['hidden', 'مخفي']], cur)}</select>`;
    const viewUrl = page.slug === 'home' ? '#/' : '#/p/' + page.slug;

    main.innerHTML = `
      <header class="dash-head">
        <p class="crumbs"><a href="#/admin/content">الصفحات</a></p>
        <div class="dash-head--row">
          <h1>${esc(page.title)}</h1>
          <div class="btn-group">
            <button class="btn btn--ghost" data-inline-edit>تحرير على الصفحة</button>
            <button class="btn btn--ghost" data-page-settings>إعدادات الصفحة</button>
            <button class="btn btn--primary" data-add-section>إضافة قسم</button>
          </div>
        </div>
      </header>
      ${sections.length ? `<ol class="builder">${sections.map((s, i) => `
        <li class="builder__section ${s.status !== 'published' ? 'is-muted' : ''}" data-sec="${esc(s.id)}">
          <header class="builder__head">
            <div class="builder__move">
              <button class="icon-btn" data-sec-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="نقل القسم للأعلى">↑</button>
              <button class="icon-btn" data-sec-move="1" ${i === sections.length - 1 ? 'disabled' : ''} aria-label="نقل القسم للأسفل">↓</button>
            </div>
            <div class="builder__title"><h2>${esc(s.title)}</h2>${s.description ? `<p class="muted">${esc(s.description)}</p>` : ''}</div>
            <div class="builder__tools">
              ${statusSel(s.status, 'data-sec-status')}
              <button class="btn btn--small btn--ghost" data-sec-edit>تعديل</button>
              <button class="btn btn--small btn--danger-ghost" data-sec-del>حذف</button>
            </div>
          </header>
          <ol class="builder__items">${s.components.map((c, j) => `
            <li class="builder__item ${c.status !== 'published' ? 'is-muted' : ''}" data-cmp="${esc(c.id)}">
              <div class="builder__move">
                <button class="icon-btn" data-cmp-move="-1" ${j === 0 ? 'disabled' : ''} aria-label="نقل للأعلى">↑</button>
                <button class="icon-btn" data-cmp-move="1" ${j === s.components.length - 1 ? 'disabled' : ''} aria-label="نقل للأسفل">↓</button>
              </div>
              <span class="type-chip"><span aria-hidden="true">${esc((types[c.type] || {}).icon || '?')}</span>${esc((types[c.type] || {}).label || c.type)}</span>
              <span class="builder__summary">${esc(WSW.components.summary(c))}</span>
              <div class="builder__tools">
                ${statusSel(c.status, 'data-cmp-status')}
                <button class="btn btn--small btn--ghost" data-cmp-edit>تعديل</button>
                <button class="btn btn--small btn--danger-ghost" data-cmp-del aria-label="حذف المكوّن">حذف</button>
              </div>
            </li>`).join('')}
          </ol>
          <button class="add-cmp" data-add-cmp>إضافة مكوّن</button>
        </li>`).join('')}</ol>`
        : empty('الصفحة فارغة', 'ابدأ بإضافة قسم، ثم أضف داخله نصوصًا وفيديوهات ومحاكيات.', '<button class="btn btn--primary" data-add-section>إضافة قسم</button>')}`;

    const reload = () => WSW.go('/admin/content/' + pageId);
    const secOf = el => sections.find(s => s.id === el.closest('[data-sec]').dataset.sec);
    const cmpOf = (sec, el) => sec.components.find(c => c.id === el.closest('[data-cmp]').dataset.cmp);
    const move = (arr, idx, d) => { const a = arr.map(x => x.id); [a[idx], a[idx + d]] = [a[idx + d], a[idx]]; return a; };

    main.addEventListener('click', async e => {
      const t = e.target;
      if (t.closest('[data-add-section]')) return sectionForm(pageId, null, reload);
      if (t.closest('[data-page-settings]')) return pageSettings(page, reload);
      if (t.closest('[data-inline-edit]')) { WSW.setEditMode('content', true); return WSW.go(viewUrl.slice(1)); }
      if (!t.closest('[data-sec]')) return;
      const sec = secOf(t);

      if (t.closest('[data-sec-move]')) {
        const d = +t.closest('[data-sec-move]').dataset.secMove;
        await api.reorderSections(pageId, move(sections, sections.indexOf(sec), d));
        return reload();
      }
      if (t.closest('[data-sec-edit]')) return sectionForm(pageId, sec, reload);
      if (t.closest('[data-sec-del]')) {
        if (!await confirmDialog(`حذف قسم «${sec.title}» وكل مكوّناته؟`, { confirmLabel: 'حذف القسم', danger: true })) return;
        await api.deleteSection(sec.id); toast('حُذف القسم.'); return reload();
      }
      if (t.closest('[data-add-cmp]')) return pickComponent(sec.id, reload);
      if (t.closest('[data-cmp]')) {
        const c = cmpOf(sec, t);
        if (t.closest('[data-cmp-move]')) {
          const d = +t.closest('[data-cmp-move]').dataset.cmpMove;
          await api.reorderComponents(sec.id, move(sec.components, sec.components.indexOf(c), d));
          return reload();
        }
        if (t.closest('[data-cmp-edit]')) return componentForm(sec.id, c.type, c, reload);
        if (t.closest('[data-cmp-del]')) {
          if (!await confirmDialog('حذف هذا المكوّن؟', { confirmLabel: 'حذف', danger: true })) return;
          await api.deleteComponent(c.id); toast('حُذف المكوّن.'); return reload();
        }
      }
    });

    main.addEventListener('change', async e => {
      const t = e.target;
      if (t.matches('[data-sec-status]')) { await api.updateSection(secOf(t).id, { status: t.value }); toast('حُدّثت حالة القسم.'); reload(); }
      if (t.matches('[data-cmp-status]')) { const s = secOf(t); await api.updateComponent(cmpOf(s, t).id, { status: t.value }); toast('حُدّثت حالة المكوّن.'); reload(); }
    });
  }, A('editor'));

  function pageSettings(page, done) {
    modal({
      title: 'إعدادات الصفحة',
      body: `<form novalidate>
        <div class="field"><label for="title">العنوان</label><input id="title" name="title" value="${esc(page.title)}"></div>
        <div class="grid-2">
          <div class="field"><label for="visibility">من يراها</label><select id="visibility" name="visibility" ${page.system ? 'disabled' : ''}>${options([['students', 'الطلبة المسجّلون'], ['public', 'الجميع']], page.visibility)}</select></div>
          <div class="field"><label for="status">الحالة</label><select id="status" name="status" ${page.system ? 'disabled' : ''}>${options([['published', 'منشورة'], ['draft', 'مسودة']], page.status)}</select></div>
        </div>
        ${page.system ? '<p class="hint">هذه صفحة أساسية في النظام؛ يمكن تعديل عنوانها ومحتواها فقط.</p>' : ''}
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">حفظ الإعدادات</button>
          ${!page.system && api.hasRole(WSW.state.user, 'admin') ? '<button class="btn btn--danger-ghost" type="button" data-del-page>حذف الصفحة</button>' : ''}
        </div>
      </form>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          const d = formData(f);
          if (page.system) { delete d.visibility; delete d.status; }
          try { await api.updatePage(page.id, d); toast('حُفظت الإعدادات.'); close(); WSW.rerenderShell(); done(); }
          catch (err) { showErrors(f, err); }
        });
        el.querySelector('[data-del-page]')?.addEventListener('click', async () => {
          close();
          if (!await confirmDialog(`حذف صفحة «${page.title}» بكل أقسامها؟`, { confirmLabel: 'حذف الصفحة', danger: true })) return;
          await api.deletePage(page.id); toast('حُذفت الصفحة.'); WSW.rerenderShell(); WSW.go('/admin/content');
        });
      }
    });
  }

  function sectionForm(pageId, sec, done) {
    modal({
      title: sec ? 'تعديل القسم' : 'قسم جديد',
      body: `<form novalidate>
        <div class="field"><label for="title">عنوان القسم</label><input id="title" name="title" value="${esc(sec ? sec.title : '')}" placeholder="استكشاف المريخ"></div>
        <div class="field"><label for="description">وصف قصير</label><input id="description" name="description" value="${esc(sec ? sec.description : '')}"></div>
        <div class="field"><label for="status">الحالة</label><select id="status" name="status">${options([['published', 'منشور'], ['draft', 'مسودة (لا يراه الطلبة)'], ['hidden', 'مخفي']], sec ? sec.status : 'published')}</select></div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">${sec ? 'حفظ القسم' : 'إضافة القسم'}</button><button class="btn btn--ghost" type="button" data-close>إلغاء</button></div>
      </form>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try {
            if (sec) await api.updateSection(sec.id, formData(f)); else await api.createSection(pageId, formData(f));
            toast(sec ? 'حُفظ القسم.' : 'أُضيف القسم.'); close(); done();
          } catch (err) { showErrors(f, err); }
        });
      }
    });
  }

  function pickComponent(sectionId, done) {
    const types = WSW.components.types;
    modal({
      title: 'إضافة مكوّن',
      wide: true,
      body: `<div class="type-grid">${Object.entries(types).map(([k, t]) => `
        <button class="type-tile" data-type="${esc(k)}"><span class="type-tile__icon" aria-hidden="true">${esc(t.icon)}</span><span>${esc(t.label)}</span>${t.custom ? '<small>مخصص</small>' : ''}</button>`).join('')}</div>`,
      onMount(el, close) {
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-type]');
          if (!b) return;
          close();
          componentForm(sectionId, b.dataset.type, null, done);
        });
      }
    });
  }

  function componentForm(sectionId, type, cmp, done, withStatus = true) {
    const def = WSW.components.types[type];
    const statusField = withStatus ? `<div class="field"><label for="c_status">الحالة</label><select id="c_status" name="__status">${options([['published', 'منشور'], ['draft', 'مسودة (لا يراه الطلبة)'], ['hidden', 'مخفي']], cmp ? cmp.status : 'published')}</select></div>` : '';
    modal({
      title: (cmp ? 'تعديل: ' : 'إضافة: ') + def.label,
      wide: true,
      body: `<div class="cmp-editor">
        <form novalidate>
          ${WSW.components.formFields(type, cmp ? cmp.data : {})}
          ${statusField}
          <div class="form-actions"><button class="btn btn--primary" type="submit">${cmp ? 'حفظ المكوّن' : 'إضافة المكوّن'}</button><button class="btn btn--ghost" type="button" data-close>إلغاء</button></div>
        </form>
        <div class="cmp-preview"><p class="cmp-preview__label">معاينة</p><div class="cms cms--app" data-preview></div></div>
      </div>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        const pv = el.querySelector('[data-preview]');
        const collect = () => { const d = formData(f); delete d.__status; return d; };
        const statusOf = () => (f.querySelector('[name=__status]') || {}).value || 'published';
        const draw = () => { pv.innerHTML = WSW.components.renderList([{ type, data: collect() }]); };
        draw();
        let t; f.addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 250); });
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try {
            if (cmp) await api.updateComponent(cmp.id, { data: collect(), status: statusOf() });
            else await api.createComponent(sectionId, type, collect(), statusOf());
            toast(cmp ? 'حُفظ المكوّن.' : 'أُضيف المكوّن.'); close(); done();
          } catch (err) { showErrors(f, err); }
        });
      }
    });
  }

  /* ---------- التحرير على الصفحة نفسها ---------- */
  function bindPage(container, page, sections) {
    if (!container) return;
    const reload = () => WSW.reload();
    const secOf = el => sections.find(s => s.id === el.closest('[data-sec]').dataset.sec);
    const move = (arr, idx, d) => { const a = arr.map(x => x.id); [a[idx], a[idx + d]] = [a[idx + d], a[idx]]; return a; };
    container.addEventListener('click', async e => {
      const t = e.target;
      if (t.closest('[data-add-section]')) return sectionForm(page.id, null, reload);
      if (!t.closest('[data-sec]')) return;
      const sec = secOf(t);
      try {
        if (t.closest('[data-sec-move]')) { await api.reorderSections(page.id, move(sections, sections.indexOf(sec), +t.closest('[data-sec-move]').dataset.secMove)); return reload(); }
        if (t.closest('[data-sec-edit]')) return sectionForm(page.id, sec, reload);
        if (t.closest('[data-sec-del]')) {
          if (!await confirmDialog(`حذف قسم «${sec.title}» وكل مكوّناته؟`, { confirmLabel: 'حذف القسم', danger: true })) return;
          await api.deleteSection(sec.id); toast('حُذف القسم.'); return reload();
        }
        if (t.closest('[data-add-cmp]')) return pickComponent(sec.id, reload);
        const cEl = t.closest('[data-cmp]');
        if (!cEl) return;
        const c = sec.components.find(x => x.id === cEl.dataset.cmp);
        if (t.closest('[data-cmp-move]')) { await api.reorderComponents(sec.id, move(sec.components, sec.components.indexOf(c), +t.closest('[data-cmp-move]').dataset.cmpMove)); return reload(); }
        if (t.closest('[data-cmp-edit]')) return componentForm(sec.id, c.type, c, reload, true);
        if (t.closest('[data-cmp-del]')) {
          if (!await confirmDialog('حذف هذا المكوّن؟', { confirmLabel: 'حذف', danger: true })) return;
          await api.deleteComponent(c.id); toast('حُذف المكوّن.'); return reload();
        }
      } catch (err) { toast(err.message, 'err'); }
    });
  }
  WSW.editor = { bindPage, sectionForm, pickComponent, componentForm };

  /* ---------- مكتبة المكوّنات ---------- */
  WSW.route('/admin/components', async main => {
    const types = WSW.components.types;
    main.innerHTML = `
      <header class="dash-head"><h1>مكتبة المكوّنات</h1>
        <p class="muted">أنواع المكوّنات المتاحة لبناء الصفحات. إضافة نوع جديد تتم في الكود (ملف components.js) من قبل المطوّر، ثم يظهر هنا ويصبح متاحًا في كل الصفحات.</p></header>
      <div class="lib">${Object.entries(types).map(([k, t]) => `
        <article class="lib__item">
          <header><span class="type-tile__icon" aria-hidden="true">${esc(t.icon)}</span><h2>${esc(t.label)}</h2>${t.custom ? '<span class="pill pill--pub-draft">مخصص</span>' : ''}</header>
          <p class="muted" dir="ltr">type: ${esc(k)}</p>
          <ul>${t.fields.map(f => `<li>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''} <small class="muted" dir="ltr">${esc(f.key)}: ${esc(f.type)}</small></li>`).join('')}</ul>
        </article>`).join('')}</div>`;
  }, A('editor'));

  /* ---------- الإعلانات ---------- */
  WSW.route('/admin/announcements', async main => {
    const list = await api.listAnnouncements({ includeDrafts: true });
    main.innerHTML = `
      <header class="dash-head dash-head--row"><h1>الإعلانات</h1><button class="btn btn--primary" data-new>إعلان جديد</button></header>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>العنوان</th><th>لمن</th><th>الحالة</th><th>التاريخ</th><th><span class="sr-only">إجراءات</span></th></tr></thead>
        <tbody>${list.map(a => `<tr>
          <td><b>${esc(a.title)}</b>${a.pinned ? ' <span class="pill pill--pub-published">مثبّت</span>' : ''}</td>
          <td>${a.audience === 'public' ? 'الجميع' : 'الطلبة'}</td><td>${publishPill(a.status)}</td><td>${esc(fmtDate(a.publishedAt))}</td>
          <td class="row-actions"><button class="btn btn--small btn--ghost" data-edit="${esc(a.id)}">تعديل</button><button class="btn btn--small btn--danger-ghost" data-del="${esc(a.id)}">حذف</button></td>
        </tr>`).join('')}</tbody></table></div>`
        : empty('لا توجد إعلانات', 'أنشئ إعلانًا ليظهر للطلبة أو للزوار.')}`;
    const form = a => modal({
      title: a ? 'تعديل الإعلان' : 'إعلان جديد',
      body: `<form novalidate>
        <div class="field"><label for="title">العنوان</label><input id="title" name="title" value="${esc(a ? a.title : '')}"></div>
        <div class="field"><label for="body">النص</label><textarea id="body" name="body" rows="6">${esc(a ? a.body : '')}</textarea></div>
        <div class="grid-2">
          <div class="field"><label for="audience">لمن</label><select id="audience" name="audience">${options([['students', 'الطلبة المسجّلون'], ['public', 'الجميع']], a ? a.audience : 'students')}</select></div>
          <div class="field"><label for="status">الحالة</label><select id="status" name="status">${options([['published', 'منشور'], ['draft', 'مسودة']], a ? a.status : 'published')}</select></div>
        </div>
        <label class="check"><input type="checkbox" name="pinned" ${a && a.pinned ? 'checked' : ''}> تثبيت في الأعلى</label>
        <div class="form-actions"><button class="btn btn--primary" type="submit">${a ? 'حفظ الإعلان' : 'نشر الإعلان'}</button><button class="btn btn--ghost" type="button" data-close>إلغاء</button></div>
      </form>`,
      onMount(el, close) {
        const f = el.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try { await api.saveAnnouncement({ ...formData(f), id: a && a.id }); toast('حُفظ الإعلان.'); close(); WSW.go('/admin/announcements'); }
          catch (err) { showErrors(f, err); }
        });
      }
    });
    main.addEventListener('click', async e => {
      if (e.target.closest('[data-new]')) return form(null);
      const ed = e.target.closest('[data-edit]');
      if (ed) return form(list.find(a => a.id === ed.dataset.edit));
      const del = e.target.closest('[data-del]');
      if (del && await confirmDialog('حذف الإعلان؟', { confirmLabel: 'حذف', danger: true })) {
        await api.deleteAnnouncement(del.dataset.del); toast('حُذف الإعلان.'); WSW.go('/admin/announcements');
      }
    });
  }, A('editor'));

  /* ---------- الإعدادات ---------- */
  WSW.route('/admin/settings', async main => {
    const [s, log] = await Promise.all([api.getSettings(), api.listAuditLog()]);
    main.innerHTML = `
      <header class="dash-head"><h1>الإعدادات</h1></header>
      <div class="detail-grid">
        <section class="panel panel--wide">
          <h2>النسخة الحالية من المسابقة</h2>
          <form novalidate data-settings>
            <div class="grid-2">
              <div class="field"><label for="siteTitle">اسم المنصة / النسخة</label><input id="siteTitle" name="siteTitle" value="${esc(s.siteTitle)}"><p class="hint">مثال: برنامج الجمعية التعليمي 2027</p></div>
              <div class="field"><label for="tagline">السطر التعريفي</label><input id="tagline" name="tagline" value="${esc(s.tagline)}"></div>
              <div class="field"><label for="submissionDeadline">آخر موعد للتسليم</label><input id="submissionDeadline" name="submissionDeadline" type="date" value="${esc(s.submissionDeadline)}"></div>
              <div class="field"><label for="resultsDate">إعلان النتائج</label><input id="resultsDate" name="resultsDate" type="date" value="${esc(s.resultsDate)}"></div>
            </div>
            <label class="check"><input type="checkbox" name="registrationOpen" ${s.registrationOpen ? 'checked' : ''}> التسجيل مفتوح</label>
            <label class="check"><input type="checkbox" name="submissionsOpen" ${s.submissionsOpen ? 'checked' : ''}> استقبال المشاريع مفتوح</label>
            <div class="form-actions"><button class="btn btn--primary" type="submit">حفظ الإعدادات</button></div>
          </form>
        </section>
        <section class="panel panel--wide">
          <h2>سجل العمليات الإدارية</h2>
          ${log.length ? `<div class="table-wrap"><table class="table table--compact"><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>العنصر</th></tr></thead>
            <tbody>${log.map(l => `<tr><td>${esc(fmtDate(l.at))}</td><td>${esc(l.userName || '—')}</td><td dir="ltr">${esc(l.action)}</td><td dir="ltr" class="muted">${esc(l.target)}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="muted">لا توجد عمليات مسجّلة بعد.</p>'}
        </section>
        <section class="panel panel--wide panel--danger">
          <h2>البيانات التجريبية</h2>
          <p class="muted">يعيد كل البيانات إلى حالتها الأولى. موجود في الـPrototype فقط.</p>
          <button class="btn btn--danger-ghost" data-reset>إعادة ضبط البيانات التجريبية</button>
        </section>
      </div>`;
    const f = main.querySelector('[data-settings]');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      try { WSW.state.settings = await api.updateSettings(formData(f)); toast('حُفظت الإعدادات.'); WSW.rerenderShell(); }
      catch (err) { showErrors(f, err); }
    });
    main.querySelector('[data-reset]').addEventListener('click', async () => {
      if (!await confirmDialog('إعادة ضبط كل البيانات التجريبية وتسجيل الخروج؟', { confirmLabel: 'إعادة الضبط', danger: true })) return;
      await api.resetDemo();
      WSW.state.user = null;
      WSW.state.settings = await api.getSettings();
      WSW.rerenderShell();
      WSW.go('/');
    });
  }, A('super_admin'));
})();
