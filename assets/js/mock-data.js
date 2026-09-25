/* =========================================================
   mock-data.js — بيانات تجريبية للـPrototype فقط
   شكل كل كائن هنا = شكل الصف في قاعدة البيانات الحقيقية.
   أسماء الحقول متفق عليها في BACKEND_HANDOFF.md — لا تغيّرها
   من طرف واحد.
   ========================================================= */
window.WSW = window.WSW || {};

WSW.seed = function () {
  const now = new Date().toISOString();
  const daysAgo = d => new Date(Date.now() - d * 864e5).toISOString();

  return {
    version: 4,

    settings: {
      siteTitle: 'أسبوع الفضاء العالمي 2026',
      tagline: 'مسابقة الجمعية الفلكية الأردنية لطلبة المدارس',
      registrationOpen: true,
      submissionsOpen: true,
      submissionDeadline: '2027-03-15',
      resultsDate: '2027-04-15'
    },

    // الدخول باسم المستخدم (لا بريد إلكتروني). المحافظة والإقليم يُشتقّان من مدرسة الطالب.
    // ⚠️ كلمات مرور بنص صريح — مقبول في الـPrototype فقط.
    // الـBackend الحقيقي لا يخزّن كلمة المرور أبدًا، بل hash (bcrypt/argon2).
    users: [
      { id: 'u_admin', role: 'super_admin', username: 'admin', _demoPassword: 'admin123',
        fullName: 'مشرف المنصة', status: 'active', createdAt: daysAgo(40) },
      { id: 'u_editor', role: 'editor', username: 'editor', _demoPassword: 'editor123',
        fullName: 'محرر المحتوى', status: 'active', createdAt: daysAgo(35) },

      { id: 'u_s1', role: 'student', username: 'student', _demoPassword: 'student123',
        fullName: 'ليان محمد أحمد العمري', schoolId: 'sch_1', grade: 'العاشر', guardianPhone: '0791234567',
        status: 'active', createdAt: daysAgo(20) },
      { id: 'u_s2', role: 'student', username: 'omar', _demoPassword: 'student123',
        fullName: 'عمر خالد يوسف الزعبي', schoolId: 'sch_2', grade: 'الحادي عشر', guardianPhone: '0782345678',
        status: 'active', createdAt: daysAgo(18) },
      { id: 'u_s3', role: 'student', username: 'sara', _demoPassword: 'student123',
        fullName: 'سارة إبراهيم سليمان الحوراني', schoolId: 'sch_3', grade: 'التاسع', guardianPhone: '0773456789',
        status: 'active', createdAt: daysAgo(15) },
      { id: 'u_s4', role: 'student', username: 'pending', _demoPassword: 'student123',
        fullName: 'يزن عبدالله محمود النعيمات', schoolId: 'sch_4', grade: 'الثاني عشر', guardianPhone: '0799876543',
        status: 'pending', createdAt: daysAgo(2) },
      { id: 'u_s5', role: 'student', username: 'tala', _demoPassword: 'student123',
        fullName: 'تالا سامر فؤاد الخطيب', schoolId: 'sch_1', grade: 'الثامن', guardianPhone: '0788765432',
        status: 'pending', createdAt: daysAgo(1) },
      { id: 'u_s6', role: 'student', username: 'hamza', _demoPassword: 'student123',
        fullName: 'حمزة علي حسن المومني', schoolId: 'sch_5', grade: 'العاشر', guardianPhone: '0777654321',
        status: 'pending', createdAt: daysAgo(1) },
      { id: 'u_s7', role: 'student', username: 'noor', _demoPassword: 'student123',
        fullName: 'نور وليد جميل الطراونة', schoolId: 'sch_6', grade: 'الحادي عشر', guardianPhone: '0795556667',
        status: 'rejected', createdAt: daysAgo(9) }
    ],

    // المدارس مختارة من وزارة التربية — الطالب يختار من القائمة ولا يكتب اسم المدرسة يدويًا
    schools: [
      { id: 'sch_1', name: 'مدرسة عيّنة الثانوية الأولى', governorate: 'عمّان', type: 'حكومية' },
      { id: 'sch_2', name: 'مدرسة عيّنة الثانوية الثانية', governorate: 'إربد', type: 'حكومية' },
      { id: 'sch_3', name: 'مدرسة عيّنة الأساسية', governorate: 'الكرك', type: 'حكومية' },
      { id: 'sch_4', name: 'أكاديمية عيّنة', governorate: 'العقبة', type: 'خاصة' },
      { id: 'sch_5', name: 'مدرسة عيّنة المختلطة', governorate: 'المفرق', type: 'حكومية' },
      { id: 'sch_6', name: 'مدرسة عيّنة النموذجية', governorate: 'الطفيلة', type: 'حكومية' }
    ],

    pages: [
      { id: 'pg_home', slug: 'home', title: 'الرئيسية', visibility: 'public', status: 'published', system: true },
      { id: 'pg_learn', slug: 'learn', title: 'المحتوى التعليمي', visibility: 'students', status: 'published', system: true },
      { id: 'pg_rules', slug: 'rules', title: 'شروط المسابقة', visibility: 'public', status: 'published', system: false }
    ],

    sections: [
      { id: 'sec_about', pageId: 'pg_home', title: 'ما هو أسبوع الفضاء العالمي؟', description: '', order: 1, status: 'published' },
      { id: 'sec_comp', pageId: 'pg_home', title: 'عن المسابقة', description: '', order: 2, status: 'published' },
      { id: 'sec_steps', pageId: 'pg_home', title: 'كيف تشارك', description: '', order: 3, status: 'published' },

      { id: 'sec_rockets', pageId: 'pg_learn', title: 'فيزياء الصواريخ',
        description: 'كيف يرتفع صاروخ وزنه مئات الأطنان عن الأرض؟', order: 1, status: 'published' },
      { id: 'sec_missions', pageId: 'pg_learn', title: 'مهمات فضائية غيّرت فهمنا للكون',
        description: '', order: 2, status: 'published' },
      { id: 'sec_sims', pageId: 'pg_learn', title: 'محاكيات تفاعلية', description: 'جرّب بنفسك.', order: 3, status: 'published' },
      { id: 'sec_mars', pageId: 'pg_learn', title: 'استكشاف المريخ', description: 'قسم قيد الإعداد.', order: 4, status: 'draft' },

      { id: 'sec_rules', pageId: 'pg_rules', title: 'الشروط ومعايير التحكيم', description: '', order: 1, status: 'published' }
    ],

    components: [
      { id: 'c1', sectionId: 'sec_about', type: 'text', order: 1, status: 'published', data: {
        body: 'أسبوع الفضاء العالمي احتفال دولي أقرّته الجمعية العامة للأمم المتحدة عام 1999، ويُقام سنويًا من 4 إلى 10 تشرين الأول.\n\nيرتبط التاريخان بحدثين: إطلاق أول قمر صناعي "سبوتنيك 1" في 4 تشرين الأول 1957، ودخول معاهدة الفضاء الخارجي حيّز التنفيذ في 10 تشرين الأول 1967.' } },

      { id: 'c2', sectionId: 'sec_comp', type: 'text', order: 1, status: 'published', data: {
        body: 'تنظّم الجمعية الفلكية الأردنية مسابقة لطلبة المدارس المرشّحين من مدارسهم، يقدّم فيها كل طالب مشروعًا في علوم الفلك والفضاء: بحثًا أو تجربة أو نموذجًا أو برنامجًا أو تصميمًا.\n\nتُعلن النتائج في نيسان.' } },
      { id: 'c3', sectionId: 'sec_comp', type: 'notice', order: 2, status: 'published', data: {
        tone: 'info', title: 'معايير التحكيم', body: 'تُنشر معايير التحكيم التفصيلية قريبًا في صفحة شروط المسابقة.' } },

      { id: 'c4', sectionId: 'sec_steps', type: 'steps', order: 1, status: 'published', data: {
        items: 'أنشئ حسابك باسمك الرباعي ومدرستك\nانتظر تفعيل الحساب من فريق الجمعية\nتعلّم من المحتوى والمحاكيات داخل المنصة\nارفع مشروعك قبل الموعد النهائي\nتابع حالة مشروعك وملاحظات المحكّمين' } },

      { id: 'c5', sectionId: 'sec_rockets', type: 'text', order: 1, status: 'published', data: {
        body: 'يعمل الصاروخ وفق قانون نيوتن الثالث: لكل فعل ردّ فعل مساوٍ له في المقدار ومعاكس له في الاتجاه. يدفع المحرك الغازات الساخنة إلى الأسفل بسرعة هائلة، فتدفع الغازات الصاروخ إلى الأعلى.\n\nلا يحتاج الصاروخ إلى هواء "يستند" عليه، ولهذا يعمل في الفراغ.' } },
      { id: 'c6', sectionId: 'sec_rockets', type: 'video', order: 2, status: 'published', data: {
        title: 'فيديو تعريفي (رابط تجريبي)', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
      { id: 'c7', sectionId: 'sec_rockets', type: 'assignment', order: 3, status: 'published', data: {
        title: 'نشاط: صاروخ الماء', body: 'صمّم صاروخ ماء من قنينة بلاستيكية، وسجّل أقصى ارتفاع وصل إليه مع ثلاث كميات مختلفة من الماء. ارفع النتائج كمشروع من نوع "تجربة".', due: '2027-01-31' } },

      { id: 'c8', sectionId: 'sec_missions', type: 'mission', order: 1, status: 'published', data: {
        name: 'فوييجر 1', agency: 'NASA', date: '1977-09-05', image: '',
        description: 'أبعد جسم صنعه الإنسان عن الأرض، وأول مسبار يدخل الفضاء بين النجمي.', url: 'https://science.nasa.gov/mission/voyager/' } },
      { id: 'c9', sectionId: 'sec_missions', type: 'mission', order: 2, status: 'published', data: {
        name: 'مسبار الأمل', agency: 'الإمارات', date: '2020-07-19', image: '',
        description: 'أول مهمة عربية إلى المريخ، تدرس غلافه الجوي وطقسه على مدار العام المريخي.', url: 'https://www.emiratesmarsmission.ae' } },
      { id: 'c10', sectionId: 'sec_missions', type: 'mission', order: 3, status: 'published', data: {
        name: 'جيمس ويب', agency: 'NASA / ESA / CSA', date: '2021-12-25', image: '',
        description: 'تلسكوب يرصد بالأشعة تحت الحمراء، ويرى المجرات الأولى التي تشكّلت بعد الانفجار العظيم.', url: 'https://science.nasa.gov/mission/webb/' } },

      { id: 'c11', sectionId: 'sec_sims', type: 'simulation', order: 1, status: 'published', data: {
        title: 'الجاذبية والمدارات', url: 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_ar_SA.html', height: 480 } },
      { id: 'c12', sectionId: 'sec_sims', type: 'link', order: 2, status: 'published', data: {
        title: 'Stellarium Web — خريطة السماء الليلة', url: 'https://stellarium-web.org', description: 'قبة سماوية في المتصفح.' } },

      { id: 'c13', sectionId: 'sec_mars', type: 'text', order: 1, status: 'draft', data: { body: 'مسودة — لا تظهر للطلاب.' } },

      { id: 'c14', sectionId: 'sec_rules', type: 'notice', order: 1, status: 'published', data: {
        tone: 'warn', title: 'قيد الإعداد', body: 'ستُضاف شروط المشاركة ومعايير التحكيم هنا من لوحة الإدارة.' } }
    ],

    projects: [
      { id: 'p1', studentId: 'u_s1', title: 'قياس ارتفاع صاروخ الماء بالمثلثات',
        description: 'استخدمت زاوية الرؤية والمسافة الأفقية لحساب أقصى ارتفاع لصاروخ الماء في خمس تجارب.',
        type: 'تجربة', videoUrl: '', notes: '',
        links: [{ label: 'جدول النتائج', url: 'https://drive.google.com/' }],
        files: [{ id: 'f1', name: 'تقرير-التجربة.pdf', size: 1843200, mime: 'application/pdf', url: '#' }],
        status: 'under_review', reviewerNote: '',
        createdAt: daysAgo(10), updatedAt: daysAgo(6), submittedAt: daysAgo(6),
        history: [
          { status: 'draft', at: daysAgo(10), by: 'u_s1' },
          { status: 'submitted', at: daysAgo(6), by: 'u_s1' },
          { status: 'under_review', at: daysAgo(4), by: 'u_admin' }
        ] },
      { id: 'p2', studentId: 'u_s1', title: 'نموذج مصغّر للنظام الشمسي',
        description: 'مسودة — ما زلت أجمع الصور.', type: 'نموذج', videoUrl: '', notes: '',
        links: [], files: [], status: 'draft', reviewerNote: '',
        createdAt: daysAgo(3), updatedAt: daysAgo(3), submittedAt: null,
        history: [{ status: 'draft', at: daysAgo(3), by: 'u_s1' }] },
      { id: 'p3', studentId: 'u_s2', title: 'برنامج يحسب مواقع أقمار المشتري',
        description: 'برنامج بايثون يحسب مواقع أقمار غاليليو الأربعة لأي تاريخ.', type: 'برمجة',
        videoUrl: '', notes: '', links: [{ label: 'GitHub', url: 'https://github.com/' }], files: [],
        status: 'needs_revision', reviewerNote: 'فكرة ممتازة. أضف مقارنة بين نتائج البرنامج ورصد حقيقي أو برنامج Stellarium.',
        createdAt: daysAgo(12), updatedAt: daysAgo(2), submittedAt: daysAgo(8),
        history: [
          { status: 'draft', at: daysAgo(12), by: 'u_s2' },
          { status: 'submitted', at: daysAgo(8), by: 'u_s2' },
          { status: 'needs_revision', at: daysAgo(2), by: 'u_admin', note: 'فكرة ممتازة. أضف مقارنة بين نتائج البرنامج ورصد حقيقي أو برنامج Stellarium.' }
        ] },
      { id: 'p4', studentId: 'u_s3', title: 'رصد أطوار القمر لمدة شهر',
        description: 'صور يومية للقمر مع تحليل لنسبة الإضاءة.', type: 'مشروع فلكي',
        videoUrl: '', notes: '', links: [], files: [{ id: 'f2', name: 'صور-القمر.zip', size: 15728640, mime: 'application/zip', url: '#' }],
        status: 'submitted', reviewerNote: '',
        createdAt: daysAgo(7), updatedAt: daysAgo(1), submittedAt: daysAgo(1),
        history: [
          { status: 'draft', at: daysAgo(7), by: 'u_s3' },
          { status: 'submitted', at: daysAgo(1), by: 'u_s3' }
        ] }
    ],

    announcements: [
      { id: 'a1', title: 'فُتح باب التسجيل', body: 'يمكن للطلبة المرشّحين من مدارسهم إنشاء حساباتهم الآن. يُفعَّل الحساب بعد مراجعة فريق الجمعية.',
        audience: 'public', pinned: true, status: 'published', publishedAt: daysAgo(20) },
      { id: 'a2', title: 'ورشة عن صواريخ الماء', body: 'ورشة عبر الإنترنت لطلبة المسابقة يوم السبت القادم. سيُرسل الرابط عبر المنصة.',
        audience: 'students', pinned: false, status: 'published', publishedAt: daysAgo(5) }
    ],

    // نصوص الواجهة التي عدّلها المشرف العام من وضع "تحرير النصوص" — { مفتاح: نص }
    texts: {},

    auditLog: []
  };
};
