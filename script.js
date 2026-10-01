const translations = {
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.competitions': 'Competitions',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.signup': 'Create account',
    'cta.primary': 'Start writing',
    'cta.secondary': 'Explore stories',
    'hero.eyebrow': 'Poetry • Blogs • Stories • Voice',
    'hero.title': 'Write your voice. Build your audience.',
    'hero.subtitle': 'Qalamkar is a creative platform for Urdu, Balochi and English writers to publish stories, poems, blogs, and personal essays that connect with readers.',
    'stat.writers': 'Writers',
    'stat.stories': 'Published works',
    'stat.readers': 'Readers',
    'section.featured': 'Featured work',
    'section.featured.desc': 'Fresh voices and unforgettable reads from our growing creative community.',
    'section.why': 'Why writers choose Qalamkar',
    'section.why.desc': 'A safe space to publish, connect, and grow with readers who value words.',
    'section.monetize': 'Monetize your craft',
    'section.monetize.desc': 'Turn your creativity into income through community support, visibility, and reader engagement.',
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy',
  },
  ur: {
    'nav.home': 'ہوم',
    'nav.about': 'ہمارے بارے میں',
    'nav.competitions': 'مقابلے',
    'nav.contact': 'رابطہ',
    'nav.login': 'لاگ ان',
    'nav.signup': 'اکاؤنٹ بنائیں',
    'cta.primary': 'لکھنا شروع کریں',
    'cta.secondary': 'کہانیاں دیکھیں',
    'hero.eyebrow': 'شاعری • بلاگز • کہانیاں • آواز',
    'hero.title': 'اپنی آواز لکھیں۔ اپنے قارئین بنائیں۔',
    'hero.subtitle': 'Qalamkar اردو، بلوچ اور انگریزی لکھاریوں کے لیے ایک تخلیقی پلیٹ فارم ہے جہاں وہ کہانیاں، شاعری، بلاگز اور ذاتی مضامین شائع کر سکتے ہیں۔',
    'stat.writers': 'لکھاری',
    'stat.stories': 'شائع شدہ کام',
    'stat.readers': 'قارئین',
    'section.featured': 'نمایاں کام',
    'section.featured.desc': 'ہماری بڑھتی ہوئی تخلیقی کمیونٹی سے تازہ آوازیں اور یادگار پڑھیں۔',
    'section.why': 'لکھاری Qalamkar کیوں پسند کرتے ہیں',
    'section.why.desc': 'ایک محفوظ جگہ جہاں آپ اپنی تحریر شائع کر سکتے ہیں، قارئین سے جڑ سکتے ہیں اور ترقی کر سکتے ہیں۔',
    'section.monetize': 'اپنی تخلیق کو کمائیں',
    'section.monetize.desc': 'کمیونٹی سپورٹ، دیکھ بھال اور قارئین کے تعامل کے ذریعے اپنی تخلیق کو آمدنی میں بدلیں۔',
    'footer.about': 'ہماری معلومات',
    'footer.contact': 'رابطہ',
    'footer.terms': 'شرائط',
    'footer.privacy': 'رازداری',
  },
  bal: {
    'nav.home': 'کور',
    'nav.about': 'ما را باره',
    'nav.competitions': 'مقابلین',
    'nav.contact': 'درخواست',
    'nav.login': 'لاگ ان',
    'nav.signup': 'اکاؤنٹ بساز',
    'cta.primary': 'نویسین پیل کن',
    'cta.secondary': 'داستان ها ببین',
    'hero.eyebrow': 'شاعری • بلاگ • داستان • آواز',
    'hero.title': 'خودت آواز بکن. دک کُنتی ببرسا',
    'hero.subtitle': 'Qalamkar د عربی/بلوچی/انگلیسی نیویسین د خولیکی پلیٹ فارم است که د داستان، شعر، بلاگ، او خودی مضمونونو نشر توانکری.',
    'stat.writers': 'نویسین',
    'stat.stories': 'نشر شوی کام',
    'stat.readers': 'خوانندگانی',
    'section.featured': 'په‌لوی کار',
    'section.featured.desc': 'د هزاری تخلیقی ټولنه څخه نوی آوازونه او یادگار کتابونه.',
    'section.why': 'نویسین د Qalamkar کیوں پسند کین',
    'section.why.desc': 'یوه مطمئن ځای که تاسو خپل لیک نشر، خوانندگانی سره پیوند، او پیشرفت توانریت.',
    'section.monetize': 'د خپل سلیقه کمیت',
    'section.monetize.desc': 'د خوانندگانی ملاتړ، اگاهی، او تعامل په کار بگیرید تا خپل خلاقیت به عاید بدل کړئ.',
    'footer.about': 'زما باره',
    'footer.contact': 'درخواست',
    'footer.terms': 'شرایط',
    'footer.privacy': 'پتوی',
  }
};

const defaultLanguage = localStorage.getItem('qalamkar-lang') || 'en';

function applyTranslations(lang) {
  const selected = translations[lang] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (selected[el.dataset.i18n]) {
      el.textContent = selected[el.dataset.i18n];
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      localStorage.setItem('qalamkar-lang', lang);
      applyTranslations(lang);
    });
  });

  const yearNode = document.querySelector('[data-year]');
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  const eligibilityForm = document.querySelector('[data-eligibility-form]');
  if (eligibilityForm) {
    const monetizeButton = document.querySelector('[data-monetize-button]');
    const eligibilityStatus = document.querySelector('[data-eligibility-status]');

    eligibilityForm.addEventListener('input', () => {
      monetizeButton.hidden = true;
      eligibilityStatus.textContent = '';
    });

    eligibilityForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(eligibilityForm);
      const isEligible = Number(formData.get('followers')) >= 500
        && Number(formData.get('originalPosts')) >= 50
        && Number(formData.get('engagements')) >= 100;

      monetizeButton.hidden = !isEligible;
      eligibilityStatus.textContent = isEligible
        ? 'You meet the displayed criteria.'
        : 'You do not yet meet all the displayed criteria.';
    });
  }

  applyTranslations(defaultLanguage);

  const otpInputs = document.querySelectorAll('.otp-row input');
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (event) => {
      const value = event.target.value.replace(/\D/g, '').slice(0, 1);
      event.target.value = value;
      if (value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });
});
