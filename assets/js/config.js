/* =========================================================
   config.js — إعدادات المنصة
   كل ما يخص نسخة معينة من المسابقة موجود هنا فقط،
   بحيث يمكن تحويل "أسبوع الفضاء العالمي 2026" إلى
   "برنامج الجمعية التعليمي 2027" دون لمس بقية الكود.
   (في النسخة الحقيقية تُقرأ هذه القيم من جدول settings عبر الـAPI)
   ========================================================= */
window.WSW = window.WSW || {};

WSW.config = {
  orgName: 'الجمعية الفلكية الأردنية',
  orgNameEn: 'Jordanian Astronomical Society',
  orgUrl: 'https://jas.org.jo/',

  // التواصل — تظهر في ذيل الصفحة
  contactEmail: 'info@jas.org.jo',
  socialLinks: [
    { key: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/jas_sky87/' },
    { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/JASorg' },
    { key: 'website', label: 'jas.org.jo', url: 'https://jas.org.jo/' }
  ],

  // عنوان الـAPI الحقيقي (يستخدمه api.js بعد الربط)
  apiBaseUrl: '/api/v1',

  // حدود رفع الملفات (يجب أن يفرضها الـBackend أيضًا — هذا تحقق للواجهة فقط)
  uploads: {
    maxFileSizeMB: 20,
    maxFilesPerProject: 10,
    allowedExtensions: ['pdf', 'docx', 'pptx', 'jpg', 'jpeg', 'png', 'zip']
  },

  // الأقاليم والمحافظات — الإقليم يُشتق من المحافظة ولا يُخزّن منفصلًا
  regions: {
    north:  { label: 'إقليم الشمال', governorates: ['إربد', 'المفرق', 'جرش', 'عجلون'] },
    center: { label: 'إقليم الوسط', governorates: ['عمّان', 'الزرقاء', 'البلقاء', 'مادبا'] },
    south:  { label: 'إقليم الجنوب', governorates: ['الكرك', 'الطفيلة', 'معان', 'العقبة'] }
  },

  // اسم المستخدم: أحرف إنجليزية وأرقام و . _ — من 4 إلى 30 خانة
  usernamePattern: '^[a-zA-Z0-9._]{4,30}$',
  // رقم ولي الأمر: موبايل أردني 077 / 078 / 079 ثم 7 أرقام
  phonePattern: '^07[789][0-9]{7}$',

  grades: ['السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'],

  projectTypes: [
    'بحث علمي', 'تجربة', 'نموذج', 'برمجة', 'تصميم',
    'عرض تقديمي', 'فيديو', 'مشروع فضائي', 'مشروع فلكي', 'أخرى'
  ],

  // نطاقات مسموح تضمينها في مكوّن "محاكاة" (iframe)
  allowedEmbedHosts: ['phet.colorado.edu', 'www.youtube-nocookie.com', 'eyes.nasa.gov', 'stellarium-web.org']
};

/* أدوات مساعدة مرتبطة بالإعدادات */
WSW.geo = {
  regionOf(governorate) {
    for (const [key, r] of Object.entries(WSW.config.regions)) {
      if (r.governorates.includes(governorate)) return key;
    }
    return null;
  },
  regionLabel(key) {
    return (WSW.config.regions[key] || {}).label || '—';
  },
  regionOfSchool(school) {
    return school ? this.regionOf(school.governorate) : null;
  },
  allGovernorates() {
    return Object.values(WSW.config.regions).flatMap(r => r.governorates);
  }
};
