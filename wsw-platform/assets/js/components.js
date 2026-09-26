/* =========================================================
   components.js — مكتبة المكوّنات (Component Library)
   ---------------------------------------------------------
   كل نوع مكوّن = تعريف حقول (schema) + دالة عرض (render).
   - لوحة الإدارة تبني نموذج الإدخال تلقائيًا من fields.
   - الصفحات العامة تعرض المكوّن عبر render(data).
   - الـBackend يخزّن فقط: { type, data } — والتحقق من data
     يجب أن يطابق fields هنا (نفس الحقول المطلوبة).

   لإضافة مكوّن جديد (مثل "حدث فلكي"): أضف مدخلًا جديدًا
   في types أدناه. لا حاجة لتعديل أي صفحة أخرى.
   ========================================================= */
window.WSW = window.WSW || {};

(function () {
  const { esc, safeUrl, isExternal, linkAttrs, paragraphs, fmtDate } = WSW.ui;

  const youTubeId = url => {
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  };
  // يُسمح بتضمين الصفحات من داخل الموقع نفسه، ومن النطاقات المعتمدة في الإعدادات
  const hostAllowed = url => {
    if (safeUrl(url) && !isExternal(url) && !String(url).startsWith('#')) return true;
    try { return WSW.config.allowedEmbedHosts.includes(new URL(url).hostname); } catch (e) { return false; }
  };
  const hostOf = url => { try { return new URL(url).hostname; } catch (e) { return ''; } };
  const lines = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
  const media = (url, alt) => safeUrl(url)
    ? `<img src="${esc(safeUrl(url))}" alt="${esc(alt || '')}" loading="lazy">`
    : `<div class="media-placeholder" aria-hidden="true"></div>`;

  const types = {
    text: {
      label: 'نص / مقال', icon: '¶',
      fields: [{ key: 'body', label: 'النص', type: 'textarea', required: true, hint: 'اترك سطرًا فارغًا بين الفقرات.' }],
      render: d => `<div class="c-text prose">${paragraphs(d.body)}</div>`
    },

    image: {
      label: 'صورة', icon: '▣',
      fields: [
        { key: 'url', label: 'رابط الصورة', type: 'url', required: true },
        { key: 'alt', label: 'وصف الصورة (لقارئات الشاشة)', type: 'text', required: true },
        { key: 'caption', label: 'تعليق', type: 'text' }
      ],
      render: d => `<figure class="c-image">${media(d.url, d.alt)}${d.caption ? `<figcaption>${esc(d.caption)}</figcaption>` : ''}</figure>`
    },

    video: {
      label: 'فيديو', icon: '▶',
      fields: [
        { key: 'title', label: 'العنوان', type: 'text' },
        { key: 'url', label: 'رابط YouTube أو ملف فيديو', type: 'url', required: true }
      ],
      render: d => {
        const id = youTubeId(d.url);
        const player = id
          ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="${esc(d.title || 'فيديو')}" loading="lazy" allowfullscreen allow="accelerometer; encrypted-media; picture-in-picture"></iframe>`
          : safeUrl(d.url) ? `<video src="${esc(safeUrl(d.url))}" controls preload="metadata"></video>` : '';
        return `<figure class="c-video"><div class="ratio">${player}</div>${d.title ? `<figcaption>${esc(d.title)}</figcaption>` : ''}</figure>`;
      }
    },

    link: {
      label: 'رابط', icon: '↗', grid: true,
      fields: [
        { key: 'title', label: 'العنوان', type: 'text', required: true },
        { key: 'url', label: 'الرابط', type: 'url', required: true, hint: 'رابط خارجي https://… أو صفحة في المنصة مثل #/p/resources' },
        { key: 'description', label: 'وصف قصير', type: 'text' }
      ],
      render: d => `<a class="c-link" ${linkAttrs(d.url)}>
          <span class="c-link__title">${esc(d.title)}</span>
          ${d.description ? `<span class="c-link__desc">${esc(d.description)}</span>` : ''}
          <span class="c-link__host">${esc(isExternal(d.url) ? hostOf(d.url) : WSW.t('link.internal', 'افتح الصفحة'))}</span>
        </a>`
    },

    file: {
      label: 'ملف للتحميل', icon: '⤓', grid: true,
      fields: [
        { key: 'title', label: 'اسم الملف', type: 'text', required: true },
        { key: 'url', label: 'رابط الملف', type: 'url', required: true, hint: 'لاحقًا: رفع مباشر إلى File Storage من لوحة الإدارة.' },
        { key: 'description', label: 'وصف', type: 'text' }
      ],
      render: d => `<a class="c-link c-link--file" ${linkAttrs(d.url, { newTab: true })} download>
          <span class="c-link__title">${esc(d.title)}</span>
          ${d.description ? `<span class="c-link__desc">${esc(d.description)}</span>` : ''}
          <span class="c-link__host">تحميل الملف</span>
        </a>`
    },

    simulation: {
      label: 'محاكاة تفاعلية', icon: '◎',
      fields: [
        { key: 'title', label: 'العنوان', type: 'text', required: true },
        { key: 'url', label: 'رابط المحاكاة', type: 'url', required: true, hint: 'يُعرض داخل الصفحة فقط من المواقع المعتمدة في الإعدادات.' },
        { key: 'height', label: 'الارتفاع بالبكسل', type: 'number' }
      ],
      render: d => hostAllowed(d.url)
        ? `<figure class="c-sim"><iframe src="${esc(safeUrl(d.url))}" title="${esc(d.title)}" loading="lazy" style="height:${Math.min(900, Math.max(300, Number(d.height) || 480))}px" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe><figcaption>${esc(d.title)}</figcaption></figure>`
        : `<a class="c-link" ${linkAttrs(d.url, { newTab: true })}><span class="c-link__title">${esc(d.title)}</span><span class="c-link__host">فتح المحاكاة في نافذة جديدة</span></a>`
    },

    card: {
      label: 'بطاقة', icon: '▭', grid: true,
      fields: [
        { key: 'title', label: 'العنوان', type: 'text', required: true },
        { key: 'image', label: 'رابط صورة', type: 'url' },
        { key: 'description', label: 'الوصف', type: 'textarea' },
        { key: 'url', label: 'رابط (اختياري)', type: 'url' }
      ],
      render: d => {
        const inner = `${media(d.image, '')}<div class="c-card__body"><h4>${esc(d.title)}</h4>${d.description ? `<p>${esc(d.description)}</p>` : ''}</div>`;
        return safeUrl(d.url)
          ? `<a class="c-card" ${linkAttrs(d.url)}>${inner}</a>`
          : `<div class="c-card">${inner}</div>`;
      }
    },

    gallery: {
      label: 'معرض صور', icon: '▦',
      fields: [
        { key: 'images', label: 'روابط الصور', type: 'lines', required: true, hint: 'رابط واحد في كل سطر.' },
        { key: 'caption', label: 'تعليق', type: 'text' }
      ],
      render: d => `<figure class="c-gallery"><div class="c-gallery__grid">${lines(d.images).map(u => media(u, '')).join('')}</div>${d.caption ? `<figcaption>${esc(d.caption)}</figcaption>` : ''}</figure>`
    },

    notice: {
      label: 'تنبيه / إعلان', icon: '!',
      fields: [
        { key: 'tone', label: 'النوع', type: 'select', options: [['info', 'معلومة'], ['warn', 'تنبيه'], ['success', 'خبر سار']], required: true },
        { key: 'title', label: 'العنوان', type: 'text' },
        { key: 'body', label: 'النص', type: 'textarea', required: true }
      ],
      render: d => `<aside class="c-notice c-notice--${esc(d.tone || 'info')}">${d.title ? `<strong>${esc(d.title)}</strong>` : ''}${paragraphs(d.body)}</aside>`
    },

    steps: {
      label: 'خطوات مرقّمة', icon: '1.',
      fields: [{ key: 'items', label: 'الخطوات', type: 'lines', required: true, hint: 'خطوة في كل سطر، بالترتيب.' }],
      render: d => `<ol class="c-steps">${lines(d.items).map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
    },

    /* مثال على Custom Component — "بطاقة مهمة فضائية" */
    mission: {
      label: 'بطاقة مهمة فضائية', icon: '✦', grid: true, custom: true,
      fields: [
        { key: 'name', label: 'اسم المهمة', type: 'text', required: true },
        { key: 'agency', label: 'الجهة', type: 'text' },
        { key: 'date', label: 'تاريخ الإطلاق', type: 'date' },
        { key: 'image', label: 'رابط صورة', type: 'url' },
        { key: 'description', label: 'وصف المهمة', type: 'textarea', required: true },
        { key: 'url', label: 'رابط للمزيد', type: 'url' }
      ],
      render: d => `<article class="c-mission">
          <header><span class="c-mission__date">${d.date ? esc(new Date(d.date).getFullYear()) : ''}</span><h4>${esc(d.name)}</h4>${d.agency ? `<span class="c-mission__agency">${esc(d.agency)}</span>` : ''}</header>
          ${d.image ? media(d.image, d.name) : ''}
          <p>${esc(d.description)}</p>
          <footer>${d.date ? `<span>أُطلقت ${esc(fmtDate(d.date))}</span>` : '<span></span>'}${safeUrl(d.url) ? `<a ${linkAttrs(d.url)}>المزيد عن المهمة</a>` : ''}</footer>
        </article>`
    },

    /* مختبر تفاعلي: صفحة HTML مستقلة (من مجلد labs/ في الموقع أو رابط خارجي)،
       تُفتح بملء الشاشة في نافذة جديدة لأن معظم المختبرات تطبيقات كاملة. */
    lab: {
      label: 'مختبر تفاعلي', icon: '⚗', grid: true,
      fields: [
        { key: 'title', label: 'اسم المختبر', type: 'text', required: true },
        { key: 'description', label: 'ماذا يتعلم الطالب؟', type: 'textarea', required: true },
        { key: 'url', label: 'رابط المختبر', type: 'url', required: true, hint: 'مسار داخل الموقع مثل labs/rockets/index.html أو رابط https://…' },
        { key: 'image', label: 'صورة مصغّرة (اختياري)', type: 'url', hint: 'مثل assets/img/labs/rockets.webp' },
        { key: 'language', label: 'لغة المختبر', type: 'select', options: [['ar', 'بالعربية'], ['en', 'بالإنجليزية'], ['ar-en', 'عربي وإنجليزي']] },
        { key: 'level', label: 'المستوى', type: 'select', options: [['', '—'], ['beginner', 'مبتدئ'], ['intermediate', 'متوسط'], ['advanced', 'متقدم']] },
        { key: 'author', label: 'إعداد', type: 'text' },
        { key: 'note', label: 'ملاحظة للزائر (اختياري)', type: 'text', hint: 'مثل: يحمّل بيانات 16 ميغابايت عند الفتح' }
      ],
      render: d => {
        const langs = { ar: 'بالعربية', en: 'بالإنجليزية', 'ar-en': 'عربي وإنجليزي' };
        const levels = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' };
        const link = linkAttrs(d.url, { newTab: true });
        return `<article class="c-lab">
          <a class="c-lab__media" ${link} tabindex="-1" aria-hidden="true">${d.image ? media(d.image, '') : '<div class="media-placeholder"></div>'}<span class="c-lab__play">▶</span></a>
          <div class="c-lab__body">
            <div class="c-lab__tags">${d.language ? `<span class="pill pill--pub-draft">${esc(langs[d.language] || d.language)}</span>` : ''}${levels[d.level] ? `<span class="pill pill--pub-draft">${esc(levels[d.level])}</span>` : ''}</div>
            <h4>${esc(d.title)}</h4>
            ${paragraphs(d.description)}
            ${d.note ? `<p class="c-lab__note">${esc(d.note)}</p>` : ''}
            <footer>${d.author ? `<span class="c-lab__author">إعداد: ${esc(d.author)}</span>` : '<span></span>'}<a class="btn btn--primary btn--small" ${link}>${WSW.T('lab.open', 'افتح المختبر')}</a></footer>
          </div>
        </article>`;
      }
    },

    assignment: {
      label: 'نشاط مطلوب', icon: '✎',
      fields: [
        { key: 'title', label: 'عنوان النشاط', type: 'text', required: true },
        { key: 'body', label: 'التعليمات', type: 'textarea', required: true },
        { key: 'due', label: 'آخر موعد', type: 'date' }
      ],
      render: d => `<aside class="c-assignment">
          <div><strong>${esc(d.title)}</strong>${paragraphs(d.body)}${d.due ? `<p class="c-assignment__due">آخر موعد: ${esc(fmtDate(d.due))}</p>` : ''}</div>
          ${WSW.config.accountsEnabled ? '<a class="btn btn--primary" href="#/student/projects/new">ابدأ مشروعًا</a>' : ''}
        </aside>`
    }
  };

  function validate(type, data) {
    const def = types[type];
    const errors = {};
    if (!def) return { _: 'نوع غير معروف' };
    def.fields.forEach(f => {
      const v = data[f.key];
      if (f.required && (v == null || String(v).trim() === '')) errors[f.key] = 'حقل مطلوب.';
      if (f.type === 'url' && v && !safeUrl(v)) errors[f.key] = 'رابط غير صالح. استخدم https://… أو مسارًا داخل الموقع مثل labs/rockets/index.html';
    });
    return errors;
  }

  function render(component) {
    const def = types[component.type];
    if (!def) return `<!-- مكوّن غير معروف: ${esc(component.type)} -->`;
    try { return def.render(component.data || {}); }
    catch (e) { console.error(e); return ''; }
  }

  /* يعرض قائمة مكوّنات، ويجمع المكوّنات المتتالية من الأنواع الشبكية في شبكة واحدة.
     editable: يلفّ كل مكوّن بأدوات التحرير (وضع تحرير المحتوى). */
  function renderList(components, { editable = false } = {}) {
    let html = '', buffer = [];
    const flush = () => { if (buffer.length) { html += `<div class="c-grid">${buffer.join('')}</div>`; buffer = []; } };
    const wrap = (c, i) => !editable ? render(c) : `
      <div class="ed-cmp ${c.status !== 'published' ? 'is-muted' : ''}" data-cmp="${esc(c.id)}">
        <div class="ed-tools">
          <span class="ed-tools__label">${esc((types[c.type] || {}).label || c.type)}</span>
          ${c.status !== 'published' ? WSW.ui.publishPill(c.status) : ''}
          <button class="ed-btn" data-cmp-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="نقل للأعلى">↑</button>
          <button class="ed-btn" data-cmp-move="1" ${i === components.length - 1 ? 'disabled' : ''} aria-label="نقل للأسفل">↓</button>
          <button class="ed-btn" data-cmp-edit>تعديل</button>
          <button class="ed-btn ed-btn--danger" data-cmp-del aria-label="حذف المكوّن">حذف</button>
        </div>
        ${render(c)}
      </div>`;
    components.forEach((c, i) => {
      if ((types[c.type] || {}).grid) buffer.push(wrap(c, i));
      else { flush(); html += wrap(c, i); }
    });
    flush();
    return html;
  }

  /* يبني حقول نموذج الإدخال للوحة الإدارة من الـschema */
  function formFields(type, data = {}) {
    const def = types[type];
    return def.fields.map(f => {
      const v = data[f.key] == null ? '' : data[f.key];
      const id = 'f_' + f.key;
      let input;
      if (f.type === 'textarea' || f.type === 'lines')
        input = `<textarea id="${id}" name="${f.key}" rows="${f.type === 'lines' ? 5 : 7}">${esc(v)}</textarea>`;
      else if (f.type === 'select')
        input = `<select id="${id}" name="${f.key}">${WSW.ui.options(f.options, v)}</select>`;
      else
        input = `<input id="${id}" name="${f.key}" type="${f.type === 'url' ? 'text' : f.type}" value="${esc(v)}" ${f.type === 'url' ? 'dir="ltr" inputmode="url" spellcheck="false" placeholder="https://…"' : ''}>`;
      return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>${input}${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}</div>`;
    }).join('');
  }

  function summary(component) {
    const d = component.data || {};
    return d.title || d.name || (d.body ? String(d.body).slice(0, 70) + (String(d.body).length > 70 ? '…' : '') : '') || d.url || '';
  }

  WSW.components = { types, validate, render, renderList, formFields, summary };
})();
