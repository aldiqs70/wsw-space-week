/* =========================================================
   views/student.js — واجهة الطالب
   ========================================================= */
(function () {
  const { esc, fmtDate, fmtSize, daysUntil, formData, showErrors, withBusy, options, toast, confirmDialog, projectPill, empty, safeUrl } = WSW.ui;
  const api = WSW.api;
  const T = (k, d) => WSW.T(k, d);
  const S = { layout: 'student', role: 'student' };
  const flow = WSW.projectFlow;
  const editable = p => ['draft', 'needs_revision'].includes(p.status);

  /* ---------- الرئيسية ---------- */
  WSW.route('/student', async main => {
    const u = WSW.state.user;
    const s = WSW.state.settings;
    const [projects, news] = await Promise.all([api.listMyProjects(), api.listAnnouncements()]);
    const left = daysUntil(s.submissionDeadline);
    const attention = projects.filter(p => p.status === 'needs_revision');
    const first = u.fullName.split(' ')[0];

    main.innerHTML = `
      <header class="dash-head">
        <h1>${T('student.dash.hello', 'مرحبًا،')} ${esc(first)}</h1>
        <p class="dash-head__meta">${esc(u.schoolName || '')}<br>الصف ${esc(u.grade)}، ${esc(WSW.geo.regionLabel(u.region))} – محافظة ${esc(u.governorate)}</p>
      </header>

      ${attention.map(p => `
        <aside class="c-notice c-notice--warn">
          <strong>مشروع «${esc(p.title)}» بحاجة لتعديل</strong>
          <p>${esc(p.reviewerNote)}</p>
          <p><a href="#/student/projects/${esc(p.id)}">افتح المشروع</a></p>
        </aside>`).join('')}

      <div class="dash-grid">
        <section class="panel panel--deadline">
          <h2>${T('student.dash.deadline', 'موعد التسليم')}</h2>
          ${left > 0
            ? `<p class="big-number">${left}<span>يومًا متبقيًا</span></p><p class="muted">آخر موعد ${esc(fmtDate(s.submissionDeadline))}</p>`
            : `<p>انتهى موعد التسليم في ${esc(fmtDate(s.submissionDeadline))}.</p>`}
        </section>

        <section class="panel">
          <div class="panel__head"><h2>${T('student.dash.projects', 'مشاريعي')}</h2><a href="#/student/projects">${T('common.all', 'الكل')}</a></div>
          ${projects.length
            ? `<ul class="mini-list">${projects.slice(0, 4).map(p => `<li><a href="#/student/projects/${esc(p.id)}">${esc(p.title)}</a>${projectPill(p.status)}</li>`).join('')}</ul>`
            : `<p class="muted">لم تبدأ أي مشروع بعد.</p>`}
          ${s.submissionsOpen ? `<a class="btn btn--primary" href="#/student/projects/new">${T('student.newProject', 'مشروع جديد')}</a>` : ''}
        </section>

        <section class="panel panel--wide">
          <div class="panel__head"><h2>${T('student.dash.news', 'آخر الإعلانات')}</h2><a href="#/student/announcements">${T('common.all', 'الكل')}</a></div>
          ${news.length ? WSW.announcementList(news.slice(0, 2)) : '<p class="muted">لا توجد إعلانات.</p>'}
        </section>
      </div>`;
  }, S);

  /* ---------- أي صفحة محتوى داخل لوحة الطالب (عامة أو خاصة بالطلبة) ---------- */
  WSW.route('/student/learn', async () => WSW.go('/student/p/learn'), S);
  WSW.route('/student/p/:slug', async (main, { slug }) => {
    const { page, sections } = await api.getPage(slug);
    main.innerHTML = `
      <header class="dash-head"><h1>${esc(page.title)}</h1>${page.visibility === 'students' ? `<p class="muted">${T('student.page.private', 'هذه الصفحة للطلبة المسجّلين فقط.')}</p>` : ''}</header>
      ${sections.length ? `
        ${sections.length > 1 ? `<nav class="toc" aria-label="أقسام الصفحة">${sections.map(s => `<a href="#/student/p/${esc(slug)}" data-jump="s-${esc(s.id)}">${esc(s.title)}</a>`).join('')}</nav>` : ''}
        <div class="cms cms--app">${WSW.renderSections(sections)}</div>`
        : empty('لا يوجد محتوى بعد', 'سيضيف فريق الجمعية المحتوى قريبًا.')}`;
    main.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const t = document.getElementById(a.dataset.jump);
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    }));
  }, S);

  /* ---------- قائمة المشاريع ---------- */
  WSW.route('/student/projects', async main => {
    const projects = await api.listMyProjects();
    const open = WSW.state.settings.submissionsOpen;
    main.innerHTML = `
      <header class="dash-head dash-head--row"><h1>${T('student.projects.title', 'مشاريعي')}</h1>${open ? `<a class="btn btn--primary" href="#/student/projects/new">${T('student.newProject', 'مشروع جديد')}</a>` : ''}</header>
      ${projects.length ? `<div class="project-list">${projects.map(p => `
        <a class="project-row" href="#/student/projects/${esc(p.id)}">
          <div><h2>${esc(p.title)}</h2><p class="muted">${esc(p.type)} — آخر تعديل ${esc(fmtDate(p.updatedAt))}</p></div>
          ${projectPill(p.status)}
        </a>`).join('')}</div>`
        : empty('لا توجد مشاريع بعد', 'ابدأ مشروعك الأول واحفظه كمسودة، ثم أرسله عندما يكتمل.', open ? '<a class="btn btn--primary" href="#/student/projects/new">ابدأ مشروعًا</a>' : '')}`;
  }, S);

  /* ---------- تفاصيل مشروع ---------- */
  WSW.route('/student/projects/:id', async (main, { id }) => {
    if (id === 'new') return projectForm(main, null);
    const p = await api.getProject(id);
    main.innerHTML = projectDetail(p, { student: true });

    main.querySelector('[data-submit]')?.addEventListener('click', async e => {
      if (!await confirmDialog('بعد الإرسال لا يمكنك تعديل المشروع إلا إذا طلب المراجِع ذلك. هل تريد الإرسال؟', { confirmLabel: 'إرسال المشروع' })) return;
      await withBusy(e.target, async () => {
        try { await api.submitProject(p.id); toast('أُرسل المشروع.'); WSW.go('/student/projects/' + p.id); }
        catch (err) { toast(err.message, 'err'); }
      });
    });
    main.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!await confirmDialog('حذف المسودة نهائيًا؟', { confirmLabel: 'حذف', danger: true })) return;
      try { await api.deleteProject(p.id); toast('حُذفت المسودة.'); WSW.go('/student/projects'); }
      catch (err) { toast(err.message, 'err'); }
    });
  }, S);

  WSW.route('/student/projects/:id/edit', async (main, { id }) => {
    const p = await api.getProject(id);
    if (!editable(p)) return WSW.go('/student/projects/' + id);
    projectForm(main, p);
  }, S);

  /* تفاصيل مشروع — مشتركة بين الطالب والمشرف */
  WSW.projectDetail = projectDetail;
  function projectDetail(p, { student }) {
    const track = ['draft', 'submitted', 'under_review', ['approved', 'needs_revision', 'rejected'].includes(p.status) ? p.status : 'approved'];
    const reached = st => p.history.some(h => h.status === st) || p.status === st;
    return `
      <header class="dash-head">
        <p class="crumbs"><a href="${student ? '#/student/projects' : '#/admin/projects'}">${student ? 'مشاريعي' : 'المشاريع'}</a></p>
        <div class="dash-head--row"><h1>${esc(p.title)}</h1>${projectPill(p.status)}</div>
        ${student ? `<p class="muted">${esc(flow.studentHints[p.status])}</p>` : ''}
      </header>

      <ol class="track" aria-label="مراحل المشروع">
        ${track.map(st => `<li class="${reached(st) ? 'is-done' : ''} ${p.status === st ? 'is-current' : ''} track--${esc(st)}">${esc(flow.labels[st])}</li>`).join('')}
      </ol>

      ${p.reviewerNote ? `<aside class="c-notice ${p.status === 'needs_revision' ? 'c-notice--warn' : 'c-notice--info'}"><strong>ملاحظة المراجِع</strong><p>${esc(p.reviewerNote)}</p></aside>` : ''}

      ${student ? `<div class="toolbar">
        ${editable(p) ? `<a class="btn btn--ghost" href="#/student/projects/${esc(p.id)}/edit">${T('project.edit', 'تعديل')}</a><button class="btn btn--primary" data-submit>${p.status === 'needs_revision' ? T('project.resubmit', 'إعادة الإرسال') : T('project.submit', 'إرسال المشروع')}</button>` : ''}
        ${p.status === 'draft' ? `<button class="btn btn--danger-ghost" data-delete>${T('project.deleteDraft', 'حذف المسودة')}</button>` : ''}
      </div>` : ''}

      <div class="detail-grid">
        <section class="panel panel--wide">
          <h2>الوصف</h2>
          ${p.description ? WSW.ui.paragraphs(p.description) : '<p class="muted">لا يوجد وصف.</p>'}
          ${p.notes ? `<h3>ملاحظات إضافية</h3>${WSW.ui.paragraphs(p.notes)}` : ''}
        </section>
        <section class="panel">
          <h2>معلومات</h2>
          <dl class="kv">
            <div><dt>النوع</dt><dd>${esc(p.type)}</dd></div>
            ${p.student && !student ? `<div><dt>الطالب</dt><dd>${esc(p.student.fullName)}</dd></div><div><dt>المدرسة</dt><dd>${esc(p.student.schoolName)}</dd></div><div><dt>الصف</dt><dd>${esc(p.student.grade)}</dd></div><div><dt>المحافظة</dt><dd>${esc(p.student.governorate)}</dd></div><div><dt>هاتف ولي الأمر</dt><dd dir="ltr"><a href="tel:${esc(p.student.guardianPhone)}">${esc(p.student.guardianPhone)}</a></dd></div>` : ''}
            <div><dt>أُرسل</dt><dd>${esc(fmtDate(p.submittedAt))}</dd></div>
            <div><dt>آخر تعديل</dt><dd>${esc(fmtDate(p.updatedAt))}</dd></div>
          </dl>
        </section>
        <section class="panel">
          <h2>الملفات والروابط</h2>
          ${p.files.length || p.links.length || p.videoUrl ? `<ul class="attach-list">
            ${p.files.map(f => `<li><a href="${esc(safeUrl(f.url) || '#')}" target="_blank" rel="noopener">${esc(f.name)}</a><span class="muted">${esc(fmtSize(f.size))}</span></li>`).join('')}
            ${p.videoUrl ? `<li><a href="${esc(safeUrl(p.videoUrl))}" target="_blank" rel="noopener">فيديو المشروع</a></li>` : ''}
            ${p.links.map(l => `<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a></li>`).join('')}
          </ul>` : '<p class="muted">لا توجد مرفقات.</p>'}
        </section>
        <section class="panel">
          <h2>السجل</h2>
          <ol class="history">${p.history.slice().reverse().map(h => `<li><span>${esc(flow.labels[h.status])}</span><time>${esc(fmtDate(h.at))}</time></li>`).join('')}</ol>
        </section>
      </div>`;
  }

  /* ---------- نموذج المشروع ---------- */
  function projectForm(main, p) {
    if (!WSW.state.settings.submissionsOpen) {
      main.innerHTML = empty('استقبال المشاريع مغلق', 'لا يمكن إنشاء أو تعديل المشاريع حاليًا.');
      return;
    }
    const cfg = WSW.config.uploads;
    let files = p ? p.files.slice() : [];
    let links = p && p.links.length ? p.links.slice() : [{ label: '', url: '' }];

    main.innerHTML = `
      <header class="dash-head">
        <p class="crumbs"><a href="#/student/projects">مشاريعي</a></p>
        <h1>${p ? T('projectForm.editTitle', 'تعديل المشروع') : T('projectForm.newTitle', 'مشروع جديد')}</h1>
      </header>
      <form class="form-panel" novalidate>
        <div class="field"><label for="title">${T('projectForm.title', 'عنوان المشروع')} <span class="req">*</span></label><input id="title" name="title" value="${esc(p ? p.title : '')}" maxlength="150"></div>
        <div class="field"><label for="type">${T('projectForm.type', 'نوع المشروع')} <span class="req">*</span></label><select id="type" name="type">${options(WSW.config.projectTypes, p ? p.type : '', { placeholder: 'اختر النوع' })}</select></div>
        <div class="field"><label for="description">${T('projectForm.description', 'وصف المشروع')}</label><textarea id="description" name="description" rows="8">${esc(p ? p.description : '')}</textarea><p class="hint">${T('projectForm.description.hint', 'ما الفكرة؟ ماذا فعلت؟ ما النتائج؟ مطلوب قبل الإرسال.')}</p></div>

        <fieldset class="field">
          <legend>${T('projectForm.files', 'الملفات')}</legend>
          <p class="hint">${esc(cfg.allowedExtensions.map(e => e.toUpperCase()).join('، '))} — حتى ${cfg.maxFileSizeMB} ميغابايت للملف، ${cfg.maxFilesPerProject} ملفات كحد أقصى. للفيديو استخدم رابطًا.</p>
          <ul class="file-list" data-files></ul>
          <label class="dropzone"><input type="file" multiple accept="${esc(cfg.allowedExtensions.map(e => '.' + e).join(','))}" data-file-input><span>${T('projectForm.dropzone', 'اختر ملفات أو اسحبها هنا')}</span></label>
        </fieldset>

        <div class="field"><label for="videoUrl">${T('projectForm.video', 'رابط فيديو المشروع')}</label><input id="videoUrl" name="videoUrl" type="url" dir="ltr" placeholder="https://youtube.com/..." value="${esc(p ? p.videoUrl : '')}"></div>

        <fieldset class="field">
          <legend>${T('projectForm.links', 'روابط إضافية')}</legend>
          <p class="hint">Google Drive أو GitHub أو موقع المشروع.</p>
          <div data-links></div>
          <button type="button" class="btn btn--small btn--ghost" data-add-link>${T('projectForm.addLink', 'إضافة رابط')}</button>
        </fieldset>

        <div class="field"><label for="notes">${T('projectForm.notes', 'ملاحظات إضافية')}</label><textarea id="notes" name="notes" rows="3">${esc(p ? p.notes : '')}</textarea></div>

        <div class="form-actions form-actions--sticky">
          <button class="btn btn--ghost" type="submit" data-mode="save">${T('projectForm.saveDraft', 'حفظ كمسودة')}</button>
          <button class="btn btn--primary" type="submit" data-mode="submit">${p && p.status === 'needs_revision' ? T('projectForm.saveResubmit', 'حفظ وإعادة الإرسال') : T('projectForm.saveSubmit', 'حفظ وإرسال')}</button>
        </div>
      </form>`;

    const form = main.querySelector('form');
    const fileList = form.querySelector('[data-files]');
    const linkBox = form.querySelector('[data-links]');

    const drawFiles = () => {
      fileList.innerHTML = files.map((f, i) => `<li><span>${esc(f.name)}</span><span class="muted">${esc(fmtSize(f.size))}</span><button type="button" class="icon-btn" data-rm-file="${i}" aria-label="إزالة ${esc(f.name)}">✕</button></li>`).join('');
    };
    const syncLinks = () => {
      links = [...linkBox.querySelectorAll('.link-row')].map(r => ({ label: r.querySelector('[data-l]').value.trim(), url: r.querySelector('[data-u]').value.trim() }));
    };
    const drawLinks = () => {
      linkBox.innerHTML = links.map((l, i) => `
        <div class="link-row">
          <input data-l placeholder="الوصف" value="${esc(l.label)}" aria-label="وصف الرابط ${i + 1}">
          <input data-u type="url" dir="ltr" placeholder="https://" value="${esc(l.url)}" aria-label="الرابط ${i + 1}">
          <button type="button" class="icon-btn" data-rm-link="${i}" aria-label="حذف الرابط">✕</button>
        </div>`).join('');
    };
    drawFiles(); drawLinks();

    const addFiles = async list => {
      for (const file of list) {
        if (files.length >= cfg.maxFilesPerProject) { toast('وصلت للحد الأقصى من الملفات.', 'err'); break; }
        try { files.push(await api.uploadFile(file)); drawFiles(); }
        catch (err) { toast(err.message, 'err'); }
      }
    };
    form.querySelector('[data-file-input]').addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; });
    const dz = form.querySelector('.dropzone');
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('is-over'); }));
    dz.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));

    form.addEventListener('click', e => {
      const rf = e.target.closest('[data-rm-file]');
      if (rf) { files.splice(+rf.dataset.rmFile, 1); drawFiles(); }
      const rl = e.target.closest('[data-rm-link]');
      if (rl) { syncLinks(); links.splice(+rl.dataset.rmLink, 1); drawLinks(); }
      if (e.target.closest('[data-add-link]')) { syncLinks(); links.push({ label: '', url: '' }); drawLinks(); }
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const mode = (e.submitter && e.submitter.dataset.mode) || 'save';
      syncLinks();
      const d = formData(form);
      const payload = { id: p && p.id, title: d.title, type: d.type, description: d.description, videoUrl: d.videoUrl, notes: d.notes,
        files, links: links.filter(l => l.url) };
      await withBusy(e.submitter, async () => {
        try {
          const saved = await api.saveProject(payload);
          if (mode === 'submit') {
            if (!await confirmDialog('بعد الإرسال لا يمكنك التعديل إلا إذا طلب المراجِع ذلك. متابعة؟', { confirmLabel: 'إرسال المشروع' })) {
              toast('حُفظت المسودة.'); return WSW.go('/student/projects/' + saved.id);
            }
            await api.submitProject(saved.id);
            toast('أُرسل المشروع.');
          } else toast('حُفظت المسودة.');
          WSW.go('/student/projects/' + saved.id);
        } catch (err) { showErrors(form, err); }
      });
    });
  }

  /* ---------- الإعلانات ---------- */
  WSW.route('/student/announcements', async main => {
    const news = await api.listAnnouncements();
    main.innerHTML = `<header class="dash-head"><h1>${T('student.news.title', 'الإعلانات')}</h1></header>
      ${news.length ? `<div class="news__list news__list--stack">${WSW.announcementList(news)}</div>` : empty('لا توجد إعلانات', 'ستظهر هنا إعلانات فريق المسابقة.')}`;
  }, S);

  /* ---------- الملف الشخصي ---------- */
  WSW.route('/student/profile', async main => {
    const u = WSW.state.user;
    main.innerHTML = `
      <header class="dash-head"><h1>${T('profile.title', 'ملفي')}</h1></header>
      <div class="detail-grid">
        <section class="panel">
          <h2>${T('profile.data', 'بيانات المسابقة')}</h2>
          <dl class="kv">
            <div><dt>الاسم</dt><dd>${esc(u.fullName)}</dd></div>
            <div><dt>اسم المستخدم</dt><dd dir="ltr">${esc(u.username)}</dd></div>
            <div><dt>المدرسة</dt><dd>${esc(u.schoolName)}</dd></div>
            <div><dt>الصف</dt><dd>${esc(u.grade)}</dd></div>
            <div><dt>المحافظة</dt><dd>${esc(u.governorate)} — ${esc(WSW.geo.regionLabel(u.region))}</dd></div>
          </dl>
          <p class="hint">${T('profile.data.hint', 'لتصحيح أي من هذه البيانات تواصل مع فريق الجمعية.')}</p>
        </section>
        <section class="panel">
          <h2>${T('profile.guardian', 'رقم ولي الأمر')}</h2>
          <form data-phone novalidate>
            <div class="field"><label for="guardianPhone">${T('profile.guardian.label', 'موبايل ولي الأمر')}</label><input id="guardianPhone" name="guardianPhone" type="tel" inputmode="numeric" dir="ltr" value="${esc(u.guardianPhone)}"></div>
            <button class="btn btn--ghost" type="submit">${T('profile.guardian.save', 'حفظ الرقم')}</button>
          </form>
        </section>
        <section class="panel">
          <h2>${T('profile.password', 'كلمة المرور')}</h2>
          <form data-pass novalidate>
            <div class="field"><label for="current">${T('profile.password.current', 'الحالية')}</label><input id="current" name="current" type="password" dir="ltr" autocomplete="current-password"></div>
            <div class="field"><label for="next">${T('profile.password.next', 'الجديدة')}</label><input id="next" name="next" type="password" dir="ltr" autocomplete="new-password"></div>
            <button class="btn btn--ghost" type="submit">${T('profile.password.save', 'تغيير كلمة المرور')}</button>
          </form>
        </section>
      </div>`;
    const ph = main.querySelector('[data-phone]');
    ph.addEventListener('submit', async e => {
      e.preventDefault();
      try { WSW.state.user = await api.updateMyProfile(formData(ph)); toast('حُفظ الرقم.'); }
      catch (err) { showErrors(ph, err); }
    });
    const pf = main.querySelector('[data-pass]');
    pf.addEventListener('submit', async e => {
      e.preventDefault();
      const d = formData(pf);
      try { await api.changePassword(d.current, d.next); pf.reset(); toast('تغيّرت كلمة المرور.'); }
      catch (err) { showErrors(pf, err); }
    });
  }, S);
})();
