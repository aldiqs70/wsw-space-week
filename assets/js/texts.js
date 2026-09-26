/* =========================================================
   texts.js — نصوص الواجهة القابلة للتعديل + أوضاع التحرير
   ---------------------------------------------------------
   كل نص ثابت في الواجهة (الأزرار، العناوين، التسميات) يُكتب عبر:
       T('login.submit', 'دخول')
   - 'login.submit' مفتاح ثابت.
   - 'دخول' النص الأصلي.
   إذا عدّل المشرف العام هذا النص من "وضع تحرير النصوص"، يُحفظ
   التعديل في جدول site_texts ويظهر بدل النص الأصلي في كل مكان.

   الأوضاع (شريط عائم أسفل الصفحة):
   - تحرير المحتوى: للمحرر فما فوق — إضافة وتعديل الأقسام والمكوّنات
     مباشرة على الصفحة.
   - تحرير النصوص: للمشرف العام فقط — الضغط على أي زر أو عنوان
     أو تسمية يفتح نافذة لتعديل نصه.
   ========================================================= */
window.WSW = window.WSW || {};

(function () {
  const { esc } = WSW.ui;
  const defaults = {};          // المفتاح ← النص الأصلي (يُملأ أثناء العرض)
  const MODES_KEY = 'wsw_modes';

  /* النص كنص خام (للاستخدام داخل خصائص أو رسائل) */
  WSW.t = (key, fallback) => {
    defaults[key] = fallback;
    const o = (WSW.state && WSW.state.texts) || {};
    return o[key] != null ? o[key] : fallback;
  };
  /* النص داخل HTML — قابل للنقر في وضع تحرير النصوص */
  WSW.T = (key, fallback) => `<span data-t="${esc(key)}">${esc(WSW.t(key, fallback))}</span>`;
  /* قيم من الإعدادات (اسم النسخة، السطر التعريفي) — تُعدّل من نفس الوضع */
  WSW.S = key => `<span data-setting="${esc(key)}">${esc(WSW.state.settings[key] || '')}</span>`;

  /* ---------- الأوضاع ---------- */
  function readModes() { try { return JSON.parse(sessionStorage.getItem(MODES_KEY) || '{}'); } catch (e) { return {}; } }
  function writeModes(m) { try { sessionStorage.setItem(MODES_KEY, JSON.stringify(m)); } catch (e) {} }
  let modes = readModes();

  WSW.editMode = {
    content() { return !!modes.content && WSW.api.hasRole(WSW.state.user, 'editor') && WSW.state.user.status === 'active'; },
    texts() { return !!modes.texts && WSW.api.hasRole(WSW.state.user, 'super_admin') && WSW.state.user.status === 'active'; }
  };

  WSW.setEditMode = (m, on) => { modes[m] = !!on; writeModes(modes); };

  function renderBar() {
    let bar = document.getElementById('edit-bar');
    const u = WSW.state.user;
    const canContent = WSW.api.hasRole(u, 'editor') && u.status === 'active';
    const canTexts = WSW.api.hasRole(u, 'super_admin') && u.status === 'active';
    document.body.classList.toggle('is-editing-texts', WSW.editMode.texts());
    document.body.classList.toggle('is-editing-content', WSW.editMode.content());
    if (!canContent) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'edit-bar';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', 'أدوات التحرير');
      document.body.appendChild(bar);
      bar.addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        const m = b.dataset.mode;
        modes[m] = !modes[m];
        writeModes(modes);
        WSW.rerenderShell();
      });
    }
    bar.innerHTML = `
      <button type="button" data-mode="content" aria-pressed="${WSW.editMode.content()}">
        <span class="edit-bar__dot" aria-hidden="true"></span>تحرير المحتوى</button>
      ${canTexts ? `<button type="button" data-mode="texts" aria-pressed="${WSW.editMode.texts()}">
        <span class="edit-bar__dot" aria-hidden="true"></span>تحرير النصوص والأزرار</button>` : ''}
      ${WSW.editMode.texts() ? '<span class="edit-bar__hint">اضغط على أي نص محاط بخط متقطع لتعديله</span>' : ''}
      ${WSW.editMode.content() && !document.querySelector('[data-editable-page]') ? '<span class="edit-bar__hint">افتح صفحة محتوى (الرئيسية أو أي صفحة) لإضافة المحتوى عليها</span>' : ''}`;
  }
  WSW.renderEditBar = renderBar;

  /* ---------- تعديل نص عند النقر ---------- */
  document.addEventListener('click', e => {
    if (!WSW.state || !WSW.state.user || !WSW.editMode.texts()) return;
    if (e.target.closest('#edit-bar, .modal-backdrop')) return;
    const el = e.target.closest('[data-t], [data-setting]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (el.dataset.t) editText(el.dataset.t);
    else editSetting(el.dataset.setting);
  }, true);

  function editText(key) {
    const original = defaults[key] || '';
    const current = WSW.t(key, original);
    const long = original.length > 60;
    WSW.ui.modal({
      title: 'تعديل نص',
      body: `<form novalidate>
        <div class="field"><label for="value">النص</label>
          ${long ? `<textarea id="value" name="value" rows="4">${esc(current)}</textarea>` : `<input id="value" name="value" value="${esc(current)}">`}
          <p class="hint">النص الأصلي: «${esc(original)}»</p>
          <p class="hint" dir="ltr">key: ${esc(key)}</p></div>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">حفظ النص</button>
          ${current !== original ? '<button class="btn btn--ghost" type="button" data-restore>إرجاع النص الأصلي</button>' : ''}
          <button class="btn btn--ghost" type="button" data-close>إلغاء</button>
        </div>
      </form>`,
      onMount(m, close) {
        const f = m.querySelector('form');
        const saveText = async v => {
          try {
            WSW.state.texts = await WSW.api.updateText(key, v === original ? '' : v);
            WSW.ui.toast('حُفظ النص.');
            close();
            WSW.rerenderShell();
          } catch (err) { WSW.ui.showErrors(f, err); }
        };
        f.addEventListener('submit', e => { e.preventDefault(); saveText(WSW.ui.formData(f).value); });
        m.querySelector('[data-restore]')?.addEventListener('click', () => saveText(''));
      }
    });
  }

  function editSetting(key) {
    const labels = { siteTitle: 'اسم المنصة / النسخة', tagline: 'السطر التعريفي' };
    WSW.ui.modal({
      title: 'تعديل: ' + (labels[key] || key),
      body: `<form novalidate>
        <div class="field"><label for="value">${esc(labels[key] || key)}</label><input id="value" name="value" value="${esc(WSW.state.settings[key] || '')}"></div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">حفظ</button><button class="btn btn--ghost" type="button" data-close>إلغاء</button></div>
      </form>`,
      onMount(m, close) {
        const f = m.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          try {
            WSW.state.settings = await WSW.api.updateSettings({ [key]: WSW.ui.formData(f).value });
            WSW.ui.toast('حُفظ.');
            close();
            WSW.rerenderShell();
          } catch (err) { WSW.ui.showErrors(f, err); }
        });
      }
    });
  }
})();
