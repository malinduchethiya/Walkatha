import React, { useEffect } from 'react';
import { SeoService } from '../../services/seoService';

export type StaticPageSlug =
  | 'privacy-policy'
  | 'terms-and-conditions'
  | 'send-your-story'
  | 'disclaimer'
  | 'privacy'
  | 'terms'
  | 'about'
  | 'contact'
  | 'login'
  | 'register'
  | 'forgot-password';

interface StaticPageProps {
  page: StaticPageSlug;
  onBack: () => void;
}

const PAGE_MAP: Record<StaticPageSlug, { title: string; canonicalPath: string; body: string }> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    canonicalPath: '/page/privacy-policy',
    body: `Wal Katha (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ඉහළින්ම ගරු කරයි.\n\n1. තොරතුරු රැස්කිරීම: අප පරිශීලකයන්ගේ පෞද්ගලික තොරතුරු අනවසරයෙන් රැස් නොකරයි.\n2. කුකීස්: වෙබ් අඩවියේ වේගය සහ ක්‍රියාකාරීත්වය වැඩිදියුණු කිරීමට පමණක් භාවිත වේ.`,
  },
  privacy: {
    title: 'Privacy Policy',
    canonicalPath: '/page/privacy-policy',
    body: `Wal Katha (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ඉහළින්ම ගරු කරයි.\n\n1. තොරතුරු රැස්කිරීම: අප පරිශීලකයන්ගේ පෞද්ගලික තොරතුරු අනවසරයෙන් රැස් නොකරයි.\n2. කුකීස්: වෙබ් අඩවියේ වේගය සහ ක්‍රියාකාරීත්වය වැඩිදියුණු කිරීමට පමණක් භාවිත වේ.`,
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    canonicalPath: '/page/terms-and-conditions',
    body: `Wal Katha වෙබ් අඩවිය භාවිතා කිරීමෙන් ඔබ පහත කොන්දේසි වලට එකඟ වේ:\n\n1. වයස් සීමාව: මෙම වෙබ් අඩවියේ පළවන සිංහල වැල කතා සහ වල් කතා නිර්මාණ වැඩිහිටියන් (18+) සඳහා පමණක් සීමා වේ.\n2. අන්තර්ගත භාවිතය: සියලු කතා හුදෙක් ප්‍රබන්ධ සහ සාහිත්‍ය රසවින්දනය සඳහා පමණක් පළකෙරේ.`,
  },
  terms: {
    title: 'Terms and Conditions',
    canonicalPath: '/page/terms-and-conditions',
    body: `Wal Katha වෙබ් අඩවිය භාවිතා කිරීමෙන් ඔබ පහත කොන්දේසි වලට එකඟ වේ:\n\n1. වයස් සීමාව: මෙම වෙබ් අඩවියේ පළවන සිංහල වැල කතා සහ වල් කතා නිර්මාණ වැඩිහිටියන් (18+) සඳහා පමණක් සීමා වේ.\n2. අන්තර්ගත භාවිතය: සියලු කතා හුදෙක් ප්‍රබන්ධ සහ සාහිත්‍ය රසවින්දනය සඳහා පමණක් පළකෙරේ.`,
  },
  'send-your-story': {
    title: 'Send Your Story',
    canonicalPath: '/page/send-your-story',
    body: `ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල වැල කතා සහ වල් කතා Wal Katha වෙබ් අඩවියේ පළ කිරීමට අප වෙත එවන්න.\n\nEmail: stories@walkathawa.site\nTelegram: https://t.me/walkathawa`,
  },
  disclaimer: {
    title: 'Disclaimer',
    canonicalPath: '/page/disclaimer',
    body: `Wal Katha (walkathawa.site) හි පළවන සියලුම කතා හුදෙක් ප්‍රබන්ධ (fictional adult stories) වන අතර සැබෑ පුද්ගලයන් හෝ සිදුවීම් සමඟ කිසිදු සම්බන්ධයක් නොමැත. වයස අවුරුදු 18ට වැඩි පාඨකයන් සඳහා පමණි.`,
  },
  about: {
    title: 'About Us',
    canonicalPath: '/about',
    body: `Wal Katha යනු ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ අන්තර්ජාල සිංහල වැල කතා සහ වල් කතා කියවීමේ ප්‍රමුඛතම වේදිකාවයි.`,
  },
  contact: {
    title: 'Contact Us',
    canonicalPath: '/contact',
    body: `Wal Katha සම්බන්ධයෙන් ඕනෑම විමසීමක් සඳහා අප හා සම්බන්ධ වන්න:\n\nEmail: contact@walkathawa.site`,
  },
  login: {
    title: 'Login',
    canonicalPath: '/login',
    body: `Wal Katha සාමාජික ගිණුමට පිවිසෙන්න.`,
  },
  register: {
    title: 'Register',
    canonicalPath: '/register',
    body: `Wal Katha නව සාමාජික ගිණුමක් ලියාපදිංචි කරන්න.`,
  },
  'forgot-password': {
    title: 'Forgot Password',
    canonicalPath: '/forgot-password',
    body: `මුරපදය යළි පිහිටුවීම සඳහා ඔබගේ විද්‍යුත් තැපෑල භාවිත කරන්න.`,
  },
};

export const StaticPage: React.FC<StaticPageProps> = ({ page, onBack }) => {
  const info = PAGE_MAP[page] || PAGE_MAP['privacy-policy'];

  useEffect(() => {
    SeoService.updateStaticPageSeo(info.title, info.canonicalPath);
  }, [info.title, info.canonicalPath]);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-blue-400 hover:underline cursor-pointer"
      >
        ← මුල් පිටුවට (Home)
      </button>

      <article className="bg-[#111a33] border border-[#1e2d52] rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-white border-b border-[#1e2d52] pb-3">
          {info.title}
        </h1>
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {info.body}
        </div>
      </article>
    </div>
  );
};
