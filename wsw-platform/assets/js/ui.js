/* =========================================================
   ui.js — أدوات واجهة مشتركة
   قاعدة ثابتة: أي نص قادم من البيانات يمر عبر esc() قبل
   وضعه في HTML. هذا يمنع حقن السكربتات (XSS).
   ========================================================= */
window.WSW = window.WSW || {};

WSW.ui = (function () {
  const esc = v => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* روابط مسموحة: https://… أو #/… (صفحة في المنصة) أو مسار ملف داخل الموقع مثل labs/rockets/index.html
     أي شيء آخر (javascript: أو data: …) يُرفض ويُعاد فارغًا. */
  const isExternal = u => /^https?:\/\//i.test(String(u || '').trim());
  const safeUrl = u => {
    const s = String(u || '').trim();
    if (isExternal(s) || s === '#' || s.startsWith('#/')) return s;
    if (/^(\.\/)?[a-z0-9_-][a-z0-9._\/-]*(\?[a-z0-9=&._%-]*)?(#[a-z0-9_-]*)?$/i.test(s) && !s.includes('..')) return s;
    return '';
  };
  /* href + فتح الروابط الخارجية والملفات في نافذة جديدة، وصفحات المنصة في النافذة نفسها */
  const linkAttrs = (u, { newTab } = {}) => {
    const s = safeUrl(u);
    const blank = newTab != null ? newTab : !s.startsWith('#');
    return `href="${esc(s || '#')}"${blank ? ' target="_blank" rel="noopener"' : ''}`;
  };

  const paragraphs = text => String(text || '').split(/\n{2,}/)
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  const dateFmt = new Intl.DateTimeFormat('ar-JO-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : dateFmt.format(d); };
  const fmtSize = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(b / 1024)) + ' ك.ب';

  function daysUntil(iso) {
    const t = new Date(iso + 'T23:59:59').getTime();
    return Math.ceil((t - Date.now()) / 864e5);
  }

  /* ---------- Toast ---------- */
  function toast(message, tone = 'ok') {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast toast--' + tone;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  /* ---------- Modal ---------- */
  function modal({ title, body, wide = false, onMount, onClose }) {
    const lastFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__head">
          <h2 id="modal-title">${esc(title)}</h2>
          <button class="icon-btn" data-close aria-label="إغلاق">✕</button>
        </header>
        <div class="modal__body">${body}</div>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    const close = () => {
      wrap.remove();
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (onClose) onClose();
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
    const first = wrap.querySelector('input, select, textarea, button:not([data-close])');
    (first || wrap.querySelector('[data-close]')).focus();
    if (onMount) onMount(wrap.querySelector('.modal'), close);
    return close;
  }

  function confirmDialog(message, { confirmLabel = 'تأكيد', danger = false } = {}) {
    return new Promise(resolve => {
      let answer = false;
      modal({
        title: 'تأكيد',
        body: `<p class="confirm-text">${esc(message)}</p>
          <div class="form-actions">
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-yes>${esc(confirmLabel)}</button>
            <button class="btn btn--ghost" data-close>إلغاء</button>
          </div>`,
        onMount(el, close) { el.querySelector('[data-yes]').addEventListener('click', () => { answer = true; close(); }); },
        onClose() { resolve(answer); }
      });
    });
  }

  /* ---------- Forms ---------- */
  function formData(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v.trim() : v; });
    form.querySelectorAll('input[type=checkbox]').forEach(cb => { out[cb.name] = cb.checked; });
    return out;
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(e => e.remove());
    form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    const g = form.querySelector('.form-error');
    if (g) g.remove();
  }

  function showErrors(form, err) {
    clearErrors(form);
    const fields = (err && err.fields) || {};
    let first = null;
    Object.entries(fields).forEach(([name, msg]) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      input.setAttribute('aria-invalid', 'true');
      // يختفي الخطأ بمجرد أن يعدّل المستخدم الحقل
      const field = input.closest('.field') || input.parentElement;
      const clear = () => { input.removeAttribute('aria-invalid'); field.querySelectorAll('.field-error').forEach(x => x.remove()); };
      input.addEventListener('input', clear, { once: true });
      input.addEventListener('change', clear, { once: true });
      const p = document.createElement('p');
      p.className = 'field-error';
      p.textContent = msg;
      (input.closest('.field') || input.parentElement).appendChild(p);
      first = first || input;
    });
    if (!first) {
      const p = document.createElement('p');
      p.className = 'form-error';
      p.setAttribute('role', 'alert');
      p.textContent = (err && err.message) || 'حدث خطأ غير متوقع.';
      form.prepend(p);
    } else first.focus();
  }

  async function withBusy(button, fn) {
    if (!button) return fn();
    const label = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-busy');
    try { return await fn(); }
    finally { button.disabled = false; button.classList.remove('is-busy'); button.innerHTML = label; }
  }

  /* ---------- Small templates ---------- */
  const options = (list, selected, { placeholder } = {}) =>
    (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') +
    list.map(o => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${esc(l)}</option>`;
    }).join('');

  const governorateOptions = (selected, placeholder = 'اختر المحافظة') =>
    `<option value="">${esc(placeholder)}</option>` +
    Object.values(WSW.config.regions).map(r =>
      `<optgroup label="${esc(r.label)}">${options(r.governorates, selected)}</optgroup>`).join('');

  const projectPill = s => `<span class="pill pill--${esc(s)}">${esc(WSW.projectFlow.labels[s] || s)}</span>`;
  const accountPill = s => `<span class="pill pill--acc-${esc(s)}">${esc(WSW.accountStatus[s] || s)}</span>`;
  const publishPill = s => `<span class="pill pill--pub-${esc(s)}">${esc({ published: 'منشور', draft: 'مسودة', hidden: 'مخفي' }[s] || s)}</span>`;

  const empty = (title, text, action = '') =>
    `<div class="empty"><p class="empty__title">${esc(title)}</p><p>${esc(text)}</p>${action}</div>`;

  const loading = () => `<div class="loading" role="status"><span class="orbit-spinner" aria-hidden="true"></span><span>جارٍ التحميل…</span></div>`;

  return { esc, safeUrl, isExternal, linkAttrs, paragraphs, fmtDate, fmtSize, daysUntil, toast, modal, confirmDialog,
    formData, showErrors, clearErrors, withBusy, options, governorateOptions,
    projectPill, accountPill, publishPill, empty, loading };
})();
