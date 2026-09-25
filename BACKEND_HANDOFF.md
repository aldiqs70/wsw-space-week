# منصة أسبوع الفضاء العالمي — ملف التسليم لمطوّر الـBackend

**الجمعية الفلكية الأردنية** · الإصدار 0.2 (Prototype للواجهة) · أيلول 2026

هذا الملف يشرح ما بُني في الواجهة، وما المطلوب من الـBackend بالضبط حتى يُربط دون إعادة بناء الواجهة. الواجهة مكتملة وتعمل الآن على بيانات تجريبية محفوظة في المتصفح. مهمتك استبدال مصدر البيانات فقط.

---

## 1. الصورة العامة

منصة مستقلة على عنوان خاص (مثل `space.jas.org.jo`)، منفصلة عن موقع الجمعية الرئيسي على ووردبريس.

- نحو **200 طالب** مرشّحين من مدارس اختارتها وزارة التربية والتعليم.
- الطالب ينشئ حسابًا ← يبقى `pending` حتى يفعّله المشرف ← يتعلّم من المحتوى ← يرفع مشروعه ← يتابع حالته.
- المشرف يدير الطلبة والمشاريع والمحتوى من لوحة إدارة.
- **آخر موعد للتسليم** آذار 2027 تقريبًا، و**النتائج** في نيسان 2027. (القيم الفعلية في الإعدادات.)
- المحتوى مبني على نموذج: **Pages ← Sections ← Components**، يديره المحرر من الواجهة نفسها دون تعديل HTML: إما من لوحة الإدارة، أو **مباشرة على الصفحة** في «وضع تحرير المحتوى».
- **المشرف العام يعدّل أي نص أو زر في الواجهة** من «وضع تحرير النصوص» (القسم 10.1).
- **لا يوجد بريد إلكتروني.** الدخول باسم مستخدم وكلمة مرور، والطالب يُدخل **رقم هاتف ولي الأمر**. استعادة كلمة المرور يقوم بها المشرف (القسم 8).
- في التسجيل يختار الطالب **الإقليم أولًا** فتظهر مدارس إقليمه فقط. المحافظة والإقليم يُشتقّان من المدرسة ولا يُخزّنان للطالب.

### ما الجديد في 0.2
- الدخول باسم المستخدم بدل البريد، وحقل هاتف ولي الأمر.
- إعادة تعيين كلمة المرور من المشرف (`resetStudentPassword`).
- التسجيل: الإقليم ← المدرسة. `listSchools` يقبل فلتر `region`.
- نصوص الواجهة القابلة للتعديل: `getTexts`، `updateText`، وجدول `site_texts`.
- التحرير المباشر على الصفحة (لا يحتاج endpoints جديدة — يستخدم نفس عمليات الأقسام والمكوّنات).

معايير التحكيم ودور المحكّمين **غير مبنيين بعد** وسيضافان لاحقًا (القسم 12).

---

## 2. تشغيل النسخة التجريبية

افتح `index.html` مباشرة في المتصفح، أو شغّل أي سيرفر ملفات ثابتة في مجلد المشروع:

```bash
python3 -m http.server 8080
# ثم افتح http://localhost:8080
```

لا يوجد build step ولا npm. عند رفع أي تحديث غيّر رقم `?v=` في `index.html` حتى لا يعرض المتصفح نسخة قديمة من الكاش. JavaScript عادي (بدون modules) حتى يعمل من `file://` أيضًا.

| الدور | اسم المستخدم | كلمة المرور |
|---|---|---|
| مشرف عام (super_admin) | admin | admin123 |
| محرر محتوى (editor) | editor | editor123 |
| طالب مفعّل | student | student123 |
| طالب بانتظار التفعيل | pending | student123 |

إعادة ضبط البيانات التجريبية: لوحة الإدارة ← الإعدادات ← «إعادة ضبط البيانات التجريبية».

---

## 3. هيكل الملفات

```
index.html                  نقطة الدخول الوحيدة (SPA بمسارات #)
assets/css/styles.css       التصميم كاملًا، ألوان الهوية الرسمية متغيّرات في :root (--brand, --charcoal)
assets/img/                 شعار أسبوع الفضاء (ملون + للخلفيات الغامقة)، شعار الجمعية، وأيقونة المتصفح
assets/js/config.js         إعدادات ثابتة: الأقاليم، المحافظات، الصفوف، أنواع المشاريع، حدود الرفع، إيميل الجمعية وحساباتها
assets/js/ui.js             أدوات عرض مشتركة (escape، نوافذ، نماذج، تنسيق تواريخ)
assets/js/texts.js          نصوص الواجهة القابلة للتعديل + شريط أوضاع التحرير
assets/js/components.js     مكتبة المكوّنات: schema + render لكل نوع
assets/js/mock-data.js      البيانات التجريبية — شكلها = شكل الجداول
assets/js/api.js            ⭐ طبقة البيانات — هذا الملف الذي ستستبدل تنفيذه
assets/js/app.js            الـRouter والقوالب وحماية المسارات
assets/js/views/public.js   الرئيسية، الصفحات، الدخول، التسجيل
assets/js/views/student.js  لوحة الطالب والمشاريع
assets/js/views/admin.js    لوحة الإدارة ومحرر الصفحات
```

---

## 4. المبدأ الأساسي: `api.js` هو العقد

لا توجد صفحة في الواجهة تقرأ بيانات من أي مكان آخر غير `WSW.api`. كل دالة فيها `async` وترجع Promise، وعند الخطأ ترمي `ApiError`.

**المطلوب منك:** كتابة Backend يقدّم نفس العمليات، ثم استبدال جسم كل دالة في `api.js` باستدعاء HTTP. **أسماء الدوال وشكل المدخلات والمخرجات يجب أن تبقى كما هي**، وإلا ستحتاج الواجهة لتعديل.

### 4.1 شكل الخطأ

الواجهة تتوقع أن يحمل كل خطأ:

```js
new ApiError(code, message, fields)
// code:    'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'closed'
// message: نص عربي يُعرض للمستخدم مباشرة
// fields:  { fieldName: 'رسالة' }  — لأخطاء التحقق، تُعرض تحت الحقل نفسه
```

المقترح أن يرجع الـBackend:

```json
HTTP 422
{ "error": { "code": "validation", "message": "راجع الحقول المحددة.", "fields": { "username": "اسم المستخدم محجوز، اختر غيره." } } }
```

| code | HTTP |
|---|---|
| unauthorized | 401 |
| forbidden | 403 |
| closed (التسجيل أو التسليم مغلق) | 403 |
| not_found | 404 |
| conflict | 409 |
| validation | 422 |

### 4.2 مثال على الاستبدال

```js
// قبل (mock):
async login(username, password) { ...يبحث في localStorage... }

// بعد:
async login(username, password) {
  return http('POST', '/auth/login', { username, password });
}

// دالة مساعدة واحدة لكل الطلبات:
async function http(method, path, body) {
  const res = await fetch(WSW.config.apiBaseUrl + path, {
    method,
    credentials: 'include',                     // جلسة عبر httpOnly cookie
    headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    throw new ApiError(e.code || 'error', e.message || 'حدث خطأ غير متوقع.', e.fields);
  }
  return data;
}
```

الـAPI بـ**camelCase** (كما في الواجهة). قاعدة البيانات يمكن أن تكون snake_case، والتحويل في الـBackend.

---

## 5. قائمة العمليات (API Contract)

المسارات مقترحة — المهم أن تبقى دوال `api.js` بنفس توقيعها. «الصلاحية» = أدنى دور مطلوب.

### المصادقة والحساب

| دالة api.js | Endpoint مقترح | الصلاحية | ملاحظات |
|---|---|---|---|
| `getMe()` | `GET /me` | أي أحد | يرجع المستخدم أو `null`. يشمل `schoolName` و`region` محسوبين |
| `login(username, password)` | `POST /auth/login` | عام | اسم المستخدم بدون حساسية لحالة الأحرف. يُسمح لحساب `pending` بالدخول، لكن لا يصل إلا لـ`getMe` |
| `logout()` | `POST /auth/logout` | مسجّل | |
| `register(data)` | `POST /auth/register` | عام | ينشئ طالبًا بحالة `pending` ويسجّل دخوله. يُرفض إن كان `registrationOpen=false` |
| `updateMyProfile({guardianPhone})` | `PATCH /me` | مفعّل | الطالب يعدّل رقم ولي الأمر فقط. الاسم واسم المستخدم والمدرسة يعدّلها المشرف |
| `changePassword(current, next)` | `POST /me/password` | مسجّل | |

`register` يستقبل: `fullName, username, password, guardianPhone, schoolId, grade, acceptTerms` (وقد يصل أيضًا `region` من النموذج — تجاهله، فالإقليم يُشتق من المدرسة).

قواعد التحقق (مطابقة لـ`config.js`):
- `username`: `^[a-zA-Z0-9._]{4,30}$`، فريد، يُخزّن بأحرف صغيرة.
- `guardianPhone`: بعد إزالة المسافات والشرطات وتحويل `+962`/`00962` إلى `0`، يطابق `^07[789][0-9]{7}$`.
- `fullName`: 4 مقاطع على الأقل.

### الإعدادات والمدارس

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `getSettings()` | `GET /settings` | عام |
| `updateSettings(patch)` | `PATCH /settings` | super_admin |
| `listSchools({region})` | `GET /schools?region=north` | عام — نموذج التسجيل يطلب مدارس إقليم واحد بعد أن يختار الطالب إقليمه |
| `createSchool({name, governorate, type})` | `POST /schools` | admin |

### إدارة الطلبة

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `listStudents(filter)` | `GET /admin/students?q=&status=&grade=&governorate=&region=&schoolId=` | admin |
| `setStudentStatus(id, status)` | `PATCH /admin/students/:id/status` | admin |
| `updateStudent(id, patch)` | `PATCH /admin/students/:id` | admin — الحقول: `fullName, username, guardianPhone, schoolId, grade` |
| `resetStudentPassword(id)` | `POST /admin/students/:id/reset-password` | admin — يولّد كلمة مرور مؤقتة ويرجع `{ temporaryPassword }` مرة واحدة فقط |

`q` يبحث في الاسم واسم المستخدم وهاتف ولي الأمر واسم المدرسة. `governorate` و`region` فلاتر مشتقة من مدرسة الطالب.

### الصفحات والأقسام والمكوّنات

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `listPages()` | `GET /pages` | عام (المحرر يرى المسودات) |
| `getPage(slug, {preview})` | `GET /pages/:slug?preview=1` | حسب `visibility` الصفحة؛ `preview` للمحرر فقط |
| `createPage({title, slug, visibility})` | `POST /pages` | editor |
| `updatePage(id, patch)` | `PATCH /pages/:id` | editor |
| `deletePage(id)` | `DELETE /pages/:id` | admin — صفحات `system=true` لا تُحذف |
| `createSection(pageId, {title, description, status})` | `POST /pages/:id/sections` | editor |
| `updateSection(id, patch)` | `PATCH /sections/:id` | editor |
| `deleteSection(id)` | `DELETE /sections/:id` | editor (يحذف مكوّناته) |
| `reorderSections(pageId, orderedIds)` | `PUT /pages/:id/sections/order` | editor |
| `createComponent(sectionId, type, data, status)` | `POST /sections/:id/components` | editor |
| `updateComponent(id, {data?, status?})` | `PATCH /components/:id` | editor |
| `deleteComponent(id)` | `DELETE /components/:id` | editor |
| `reorderComponents(sectionId, orderedIds)` | `PUT /sections/:id/components/order` | editor |

**شكل `getPage`** — صفحة مع أقسامها ومكوّناتها، مرتبة ومفلترة:

```json
{
  "page": { "id": "pg_learn", "slug": "learn", "title": "المحتوى التعليمي", "visibility": "students", "status": "published", "system": true },
  "sections": [
    { "id": "sec_rockets", "pageId": "pg_learn", "title": "فيزياء الصواريخ", "description": "...", "order": 1, "status": "published",
      "components": [
        { "id": "c5", "sectionId": "sec_rockets", "type": "text", "order": 1, "status": "published", "data": { "body": "..." } }
      ] }
  ]
}
```

بدون `preview`: يرجع فقط ما حالته `published`. صفحة `visibility=students` تتطلب طالبًا مفعّلًا (401 لغيره).

### الملفات

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `uploadFile(file)` | `POST /files` (multipart) | مفعّل |

يرجع: `{ id, name, size, mime, url }`. التفاصيل في القسم 9.

### المشاريع

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `listMyProjects()` | `GET /me/projects` | طالب مفعّل |
| `getProject(id)` | `GET /projects/:id` | صاحبه أو admin. يشمل `student` (كائن الطالب) |
| `saveProject(data)` | `POST /projects` أو `PATCH /projects/:id` | صاحبه. ينشئ/يحدّث دون تغيير الحالة |
| `submitProject(id)` | `POST /projects/:id/submit` | صاحبه |
| `deleteProject(id)` | `DELETE /projects/:id` | صاحبه، والمسودات فقط |
| `listProjects(filter)` | `GET /admin/projects?q=&status=&type=&region=` | admin — لا يرجع المسودات |
| `reviewProject(id, status, note)` | `POST /admin/projects/:id/review` | admin |

`saveProject` يستقبل: `id?, title, type, description, videoUrl, notes, links: [{label, url}], files: [{id, ...}]`.

### نصوص الواجهة

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `getTexts()` | `GET /texts` | عام — يرجع `{ "key": "نص", ... }` للنصوص المعدّلة فقط |
| `updateText(key, value)` | `PUT /texts/:key` | super_admin — `value` فارغ يحذف التعديل ويعيد النص الأصلي. حد أقصى 500 حرف |

### الإعلانات والإحصائيات

| دالة | Endpoint | الصلاحية |
|---|---|---|
| `listAnnouncements({includeDrafts})` | `GET /announcements` | عام يرى `public`، الطالب المفعّل يرى الكل، المحرر يرى المسودات |
| `saveAnnouncement(data)` | `POST` / `PATCH /announcements/:id` | editor |
| `deleteAnnouncement(id)` | `DELETE /announcements/:id` | editor |
| `getStats()` | `GET /admin/stats` | editor |
| `listAuditLog()` | `GET /admin/audit-log` | super_admin |

شكل `getStats` موجود في `api.js` (دالة `getStats`) — انسخه كما هو.

> `resetDemo()` خاصة بالـPrototype ولا تُنفّذ في الـBackend.

---

## 6. نموذج البيانات

```
users ─┬─< projects ─┬─< project_files
       │             └─< project_history
       └── schools
pages ─< sections ─< components
announcements · settings · site_texts · audit_log
```

### users

| الحقل | النوع | ملاحظات |
|---|---|---|
| id | PK | |
| role | enum | `student` · `editor` · `admin` · `super_admin` |
| username | unique | يُخزّن بأحرف صغيرة. يُستخدم للدخول |
| password_hash | | bcrypt أو argon2. ⚠️ `_demoPassword` في البيانات التجريبية يجب ألا يوجد أبدًا |
| full_name | | الاسم الرباعي — 4 مقاطع على الأقل (مطلوب لتمييز الأسماء المتشابهة) |
| school_id | FK → schools | للطلبة فقط |
| grade | | من القائمة في `config.js` |
| guardian_phone | | للطلبة فقط، بصيغة موحدة `07XXXXXXXX` |
| status | enum | `pending` · `active` · `rejected` · `disabled` |
| created_at, updated_at, last_login_at | | |

**المحافظة والإقليم لا يُخزّنان للطالب.** تُؤخذ المحافظة من مدرسته، والإقليم من المحافظة (الخريطة في `config.js`). الـAPI يرجعهما محسوبين في كائن المستخدم (`governorate`, `region`, `schoolName`) لأن الواجهة تعرضهما وتفلتر بهما.

### schools
`id, name, governorate, type` — `type`: حكومية / خاصة / وكالة الغوث / عسكرية.

### pages
`id, slug (unique, [a-z0-9-]), title, visibility (public|students), status (published|draft), system (bool)`.
صفحتا `home` و`learn` هما `system=true`: لا تُحذفان ولا تتغيّر رؤيتهما.

### sections
`id, page_id (FK, cascade), title, description, order (int), status (published|draft|hidden)`.

### components
`id, section_id (FK, cascade), type, order (int), status (published|draft|hidden), data (JSON)`.

### projects

| الحقل | ملاحظات |
|---|---|
| id, student_id (FK) | |
| title, description, type, video_url, notes | `type` من `config.projectTypes` |
| links | JSON: `[{label, url}]` |
| status | `draft` · `submitted` · `under_review` · `approved` · `needs_revision` · `rejected` |
| reviewer_note | آخر ملاحظة من المراجِع، تظهر للطالب |
| created_at, updated_at, submitted_at | |

### project_files
`id, project_id (FK, nullable قبل الربط), uploaded_by, name, size, mime, storage_key, created_at`.
الواجهة تتوقع في المشروع مصفوفة `files: [{ id, name, size, mime, url }]`.

### project_history
`id, project_id, status, at, by_user_id, note` — الواجهة تعرضه كسجل، وتستخدمه لرسم مسار الحالة.

### announcements
`id, title, body, audience (public|students), pinned (bool), status (published|draft), published_at`.

### settings
صف واحد أو جدول key/value: `siteTitle, tagline, registrationOpen, submissionsOpen, submissionDeadline, resultsDate`.
**كل ما يخص «نسخة 2026» هنا**، حتى تتحول المنصة لاحقًا إلى «برنامج الجمعية التعليمي 2027» بتعديل الإعدادات فقط.

### site_texts
`key (PK), value, updated_at, updated_by` — فقط النصوص التي عدّلها المشرف العام. غياب المفتاح = يُعرض النص الأصلي المكتوب في الكود.

### audit_log
`id, at, user_id, action, target, detail (JSON)` — يُسجَّل فيه كل إجراء إداري (أسماء الأفعال المستخدمة موجودة في `api.js`: `student.status`, `project.review`, `page.create`, ...).

---

## 7. الأدوار والصلاحيات

الأدوار متدرّجة: كل دور يملك صلاحيات ما تحته.

| | student | editor | admin | super_admin |
|---|:-:|:-:|:-:|:-:|
| مشاهدة المحتوى ورفع المشاريع | ✓ | | | |
| إدارة الصفحات والأقسام والمكوّنات والإعلانات | | ✓ | ✓ | ✓ |
| الإحصائيات | | ✓ | ✓ | ✓ |
| إدارة الطلبة والمدارس ومراجعة المشاريع | | | ✓ | ✓ |
| حذف الصفحات | | | ✓ | ✓ |
| الإعدادات وسجل العمليات | | | | ✓ |
| تعديل نصوص الواجهة والأزرار | | | | ✓ |
| إعادة تعيين كلمة مرور طالب | | | ✓ | ✓ |

⚠️ **الواجهة تخفي الأزرار فقط. الـBackend هو المرجع الوحيد للصلاحيات** ويجب أن يرفض كل طلب غير مصرّح به، بغض النظر عمّا تعرضه الواجهة.

---

## 8. قواعد العمل

### تفعيل الحسابات
- التسجيل الجديد: `pending` دائمًا.
- حساب غير `active` يستطيع تسجيل الدخول واستدعاء `GET /me` فقط (تعرض له الواجهة صفحة حالة الحساب). كل ما عداه `403`.
- المشرف: `pending → active | rejected`، `active → disabled`، `rejected | disabled → active`.

### كلمات المرور (بدون بريد)
- لا توجد «نسيت كلمة المرور» ذاتية. المشرف يعيد التعيين من لوحة الطلبة، فتُولَّد كلمة مرور مؤقتة عشوائية تُعرض له **مرة واحدة**، ويبلغ بها الطالب أو ولي أمره.
- يُفضّل (غير مبني في الواجهة بعد): علَم `must_change_password` يجبر الطالب على تغيير كلمة المرور المؤقتة عند أول دخول.
- كل إعادة تعيين تُسجّل في `audit_log` (`student.password_reset`).

### دورة حياة المشروع

```
            ┌──────────── needs_revision ◄───┐
            ▼                                │
draft ──► submitted ──► under_review ──► approved
                  │              │
                  └──────────────┴──────► rejected
```

**الطالب:**
- يعدّل فقط في `draft` أو `needs_revision`.
- يرسل من `draft` أو `needs_revision` ← `submitted`. الإرسال يتطلب وصفًا غير فارغ.
- يحذف فقط في `draft`.

**المشرف** (الجدول الدقيق في `WSW.projectFlow.reviewTransitions` داخل `api.js`):

| من | إلى |
|---|---|
| submitted | under_review, approved, needs_revision, rejected |
| under_review | approved, needs_revision, rejected |
| approved / rejected | under_review (للتراجع) |

- `needs_revision` تتطلب ملاحظة غير فارغة.
- كل انتقال يُضاف إلى `project_history` ويُسجَّل في `audit_log`.

### الإغلاق
- `registrationOpen=false` ← `register` يرجع `closed`.
- `submissionsOpen=false` ← `saveProject` و`submitProject` يرجعان `closed`.
- يُفضّل أيضًا أن يغلق الـBackend التسليم تلقائيًا بعد `submissionDeadline`.

### ترتيب المحتوى
`reorderSections` و`reorderComponents` يستقبلان **المصفوفة الكاملة** لمعرّفات الإخوة بالترتيب الجديد. نفّذها داخل transaction.

---

## 9. رفع الملفات

- الحدود الحالية في `config.js`: **20MB** للملف، **10** ملفات للمشروع، الأنواع: `pdf, docx, pptx, jpg, jpeg, png, zip`. الفيديو يُرسل كرابط لا كملف.
- الواجهة ترفع الملف **فور اختياره** (قبل حفظ المشروع) وتحتفظ بالكائن المُرجع. عند `saveProject` ترسل مصفوفة `files` كاملة.
- لذلك: الملف يُنشأ «غير مربوط» (`project_id = null`)، ويُربط عند حفظ المشروع. تحقق أن كل `file.id` مرسل يعود لنفس المستخدم. احذف الملفات غير المربوطة بعد 24 ساعة.
- الملفات في **File Storage** (مجلد خارج web root، أو S3/R2/Supabase Storage)، وقاعدة البيانات تحفظ `storage_key` فقط.
- `url` المُرجع يجب ألا يكون رابطًا عامًا دائمًا: إما endpoint يتحقق من الصلاحية (`GET /files/:id`) أو signed URL قصير العمر. ملفات الطالب لا يراها إلا هو والمشرفون.
- تحقق من **النوع الفعلي** للملف (magic bytes)، لا الامتداد فقط. أعد تسمية الملف في التخزين، واحفظ الاسم الأصلي في `name` فقط.

---

## 10. التحرير من الواجهة والمكوّنات

### 10.1 أوضاع التحرير
- يظهر شريط عائم أسفل الصفحة للمحرر فما فوق. حالته محفوظة في `sessionStorage` فقط، ولا تحتاج Backend.
- **تحرير المحتوى** (editor+): عند فتح أي صفحة CMS (`/` أو `/p/:slug`) تُطلب بـ`preview=1` وتظهر أدوات إضافة/تعديل/ترتيب/حذف الأقسام والمكوّنات على الصفحة نفسها. تستخدم نفس endpoints الأقسام والمكوّنات في القسم 5. صفحة `learn` تُفتح للمحرر على `/p/learn`.
- **تحرير النصوص** (super_admin): كل نص ثابت في الواجهة مكتوب عبر `T('key', 'النص الأصلي')`، ويظهر في هذا الوضع محاطًا بخط متقطع. النقر عليه يفتح نافذة تعديل ← `updateText`. اسم النسخة والسطر التعريفي يُعدّلان بنفس الطريقة لكنهما يذهبان إلى `updateSettings`.
- المفاتيح ثابتة ومعرّفة في الكود (مثل `hero.register`, `login.submit`, `student.nav.projects`). **لا تغيّر مفتاحًا موجودًا** لأن التعديلات المحفوظة مرتبطة به.
- النصوص تُعرض دائمًا بعد escape، فلا يمكن حقن HTML عبرها. تحقق في الـBackend من الطول ومن صيغة المفتاح `^[a-z0-9_.-]{2,80}$`.

### 10.2 المكوّنات

- يُخزّن كل مكوّن كـ `{ type, data }`، و`data` كائن JSON حقوله معرّفة في `components.js` (خاصية `fields`).
- **تحقق من `data` في الـBackend بنفس القواعد:** الحقول المطلوبة (`required: true`)، والروابط تبدأ بـ `http://` أو `https://`. انسخ الـschema إلى الـBackend أو اجعله ملف JSON مشترك.
- الأنواع الحالية: `text, image, video, link, file, simulation, card, gallery, notice, steps, mission, assignment`. نوع غير معروف ← `validation`.
- **لا يوجد مكوّن HTML خام** في هذه النسخة عن قصد. كل النصوص تُعرض بعد escape. إن أُضيف `Custom HTML` لاحقًا: super_admin فقط، مع sanitization في الـBackend (مثل HTML Purifier / DOMPurify)، ومنع `<script>` ومعالجات `on*`.
- مكوّن `simulation` يُضمَّن كـiframe فقط من النطاقات في `config.allowedEmbedHosts`؛ غيرها يُعرض كرابط. يُفضّل فرض نفس القائمة في الـBackend.
- إضافة نوع جديد = إضافة مدخل في `components.js` (+ نفس الـschema في الـBackend). لا حاجة لتعديل أي صفحة.

---

## 11. الأمان — قائمة تحقق قبل فتح التسجيل

- [ ] كلمات المرور hash (bcrypt/argon2)، وحد أدنى 8 أحرف.
- [ ] الجلسة في **httpOnly + Secure + SameSite cookie**، لا في localStorage.
- [ ] حماية CSRF للطلبات التي تغيّر البيانات (SameSite=Lax/Strict + token أو فحص Origin).
- [ ] Rate limiting على `login` و`register`.
- [ ] كل endpoint يتحقق من الدور **ومن الملكية** (الطالب لا يصل لمشروع غيره حتى لو خمّن الـid).
- [ ] أرقام هواتف أولياء الأمور بيانات شخصية لقاصرين: تظهر للمشرفين وصاحب الحساب فقط، ولا تُرجع في أي endpoint عام.
- [ ] رسالة فشل الدخول واحدة لا تكشف إن كان اسم المستخدم موجودًا.
- [ ] رفع الملفات حسب القسم 9.
- [ ] لا تُكشف قائمة المستخدمين في أي endpoint عام. (إن استُخدم ووردبريس: عطّل `/wp-json/wp/v2/users`.)
- [ ] CORS مقيّد بعنوان المنصة فقط.
- [ ] HTTPS إلزامي.
- [ ] نسخ احتياطي يومي لقاعدة البيانات والملفات.
- [ ] `audit_log` لكل إجراء إداري.
- [ ] رسائل الخطأ لا تكشف تفاصيل داخلية (stack traces، أسماء جداول).

---

## 12. قرارات مفتوحة وما لم يُبنَ بعد

### قرار: تقنية الـBackend
الواجهة محايدة تجاه الاختيار. ملاحظات على الخيارات التي نوقشت:

- **Supabase / Firebase:** Auth وDatabase وStorage جاهزة. `api.js` يستدعي الـSDK مباشرة بدل `fetch`. الحماية تعتمد كليًا على **Row Level Security** — يجب كتابتها واختبارها بعناية، لأن مفتاح الـclient علني. العمليات الحساسة (تغيير الحالات، المراجعة) يُفضّل وضعها في Database Functions أو Edge Functions لا في الـclient.
- **PHP/MySQL على استضافة الجمعية:** تحكم كامل ولا تبعية خارجية. كل البنود في القسم 11 مسؤوليتك.
- **WordPress (Headless أو ثيم مخصص):** Users وRoles وMedia جاهزة. المشاريع كـCustom Post Type. انتبه لـ: تسجيل الدخول من دومين منفصل (JWT/Application Passwords)، صلاحية الرفع للمشتركين، وكشف المستخدمين عبر REST.

### لم يُبنَ بعد (مطلوب لاحقًا)
- **معايير التحكيم ودور المحكّم (judge):** دور يرى المشاريع المُسندة إليه فقط، ويعطي درجات حسب معايير. يحتاج جداول `criteria` و`scores` و`assignments`.
- **إجبار تغيير كلمة المرور المؤقتة** عند أول دخول بعد إعادة التعيين.
- **إشعارات** (SMS أو واتساب لولي الأمر، إن رغبت الجمعية): تفعيل الحساب، تغيّر حالة المشروع، طلب التعديل.
- **رفع الملفات من لوحة الإدارة** لمكوّنات `image` و`file` و`gallery` (حاليًا روابط).
- **Pagination** للقوائم (غير ضروري لـ200 طالب، لكن مفيد للتوسع).

### اقتراح للنقاش: التسجيل المسبق
بما أن الطلبة مرشّحون بأسمائهم من مدارسهم، يمكن استيراد القائمة مسبقًا وإرسال رابط/كود تفعيل لكل طالب بدل التسجيل المفتوح والموافقة اليدوية. يحتاج endpoint استيراد (CSV) وجدول `invites`. الواجهة الحالية تدعم التسجيل المفتوح فقط.

---

## 13. خطوات الربط المقترحة

1. اختيار تقنية الـBackend وإنشاء الجداول (القسم 6).
2. Auth: `register, login, logout, getMe, resetStudentPassword` — وتجربة دورة التسجيل والتفعيل كاملة.
3. `getSettings, getTexts, listSchools, getPage, listAnnouncements` — ليعمل الموقع العام.
4. إدارة الطلبة.
5. المشاريع + رفع الملفات.
6. المحتوى (الصفحات والأقسام والمكوّنات).
7. الإحصائيات وسجل العمليات.
8. مراجعة الأمان (القسم 11) واختبار الصلاحيات بحساب طالب يحاول الوصول لبيانات غيره.
9. بعد استبدال كل دوال `api.js`: احذف `mock-data.js` ووسم تحميله، وشريط «نسخة تجريبية» من `index.html`، وجدول الحسابات التجريبية في صفحة الدخول (`views/public.js`).

أي تعديل على شكل البيانات أو أسماء الحقول: **اتفقوا عليه قبل تنفيذه** وحدّثوا هذا الملف.
