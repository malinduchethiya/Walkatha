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

const PAGE_MAP: Record<
  StaticPageSlug,
  { title: string; canonicalPath: string; noIndex?: boolean; body: string }
> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    canonicalPath: '/page/privacy-policy',
    body: `Walkathawa (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ඉහළින්ම ගරු කරයි.\n\n1. තොරතුරු රැස්කිරීම: අප පරිශීලකයන්ගේ පෞද්ගලික තොරතුරු අනවසරයෙන් රැස් නොකරයි.\n2. කුකීස්: වෙබ් අඩවියේ වේගය සහ ක්‍රියාකාරීත්වය වැඩිදියුණු කිරීමට පමණක් භාවිත වේ.`,
  },
  privacy: {
    title: 'Privacy Policy',
    canonicalPath: '/page/privacy-policy',
    body: `Walkathawa (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ඉහළින්ම ගරු කරයි.\n\n1. තොරතුරු රැස්කිරීම: අප පරිශීලකයන්ගේ පෞද්ගලික තොරතුරු අනවසරයෙන් රැස් නොකරයි.\n2. කුකීස්: වෙබ් අඩවියේ වේගය සහ ක්‍රියාකාරීත්වය වැඩිදියුණු කිරීමට පමණක් භාවිත වේ.`,
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    canonicalPath: '/page/terms-and-conditions',
    body: `Walkathawa වෙබ් අඩවිය භාවිතා කිරීමෙන් ඔබ පහත කොන්දේසි වලට එකඟ වේ:\n\n1. වයස් සීමාව: මෙම වෙබ් අඩවියේ පළවන නිර්මාණ වැඩිහිටියන් (18+) සඳහා පමණක් සීමා වේ.\n2. අන්තර්ගත භාවිතය: සියලු කතා හුදෙක් ප්‍රබන්ධ සහ සාහිත්‍ය රසවින්දනය සඳහා පමණක් පළකෙරේ.`,
  },
  terms: {
    title: 'Terms and Conditions',
    canonicalPath: '/page/terms-and-conditions',
    body: `Walkathawa වෙබ් අඩවිය භාවිතා කිරීමෙන් ඔබ පහත කොන්දේසි වලට එකඟ වේ:\n\n1. වයස් සීමාව: මෙම වෙබ් අඩවියේ පළවන නිර්මාණ වැඩිහිටියන් (18+) සඳහා පමණක් සීමා වේ.\n2. අන්තර්ගත භාවිතය: සියලු කතා හුදෙක් ප්‍රබන්ධ සහ සාහිත්‍ය රසවින්දනය සඳහා පමණක් පළකෙරේ.`,
  },
  'send-your-story': {
    title: 'Send Your Story',
    canonicalPath: '/page/send-your-story',
    body: `ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල කතා Walkathawa වෙබ් අඩවියේ පළ කිරීමට අප වෙත එවන්න.\n\nEmail: stories@walkathawa.site\nTelegram: https://t.me/walkathawa`,
  },
  disclaimer: {
    title: 'Disclaimer',
    canonicalPath: '/page/disclaimer',
    body: `Walkathawa (walkathawa.site) හි පළවන සියලුම කතා හුදෙක් ප්‍රබන්ධ (fictional stories) වන අතර සැබෑ පුද්ගලයන් හෝ සිදුවීම් සමඟ කිසිදු සම්බන්ධයක් නොමැත. වයස අවුරුදු 18ට වැඩි පාඨකයන් සඳහා පමණි.`,
  },
  about: {
    title: 'About Us',
    canonicalPath: '/about',
    body: `Walkathawa යනු ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ අන්තර්ජාල සිංහල කතා කියවීමේ වේදිකාවයි.`,
  },
  contact: {
    title: 'Contact Us',
    canonicalPath: '/contact',
    body: `Walkathawa සම්බන්ධයෙන් ඕනෑම විමසීමක් සඳහා අප හා සම්බන්ධ වන්න:\n\nEmail: contact@walkathawa.site`,
  },
  login: {
    title: 'Login',
    canonicalPath: '/login',
    noIndex: true,
    body: `Walkathawa සාමාජික ගිණුමට පිවිසෙන්න.`,
  },
  register: {
    title: 'Register',
    canonicalPath: '/register',
    noIndex: true,
    body: `Walkathawa නව සාමාජික ගිණුමක් ලියාපදිංචි කරන්න.`,
  },
  'forgot-password': {
    title: 'Forgot Password',
    canonicalPath: '/forgot-password',
    noIndex: true,
    body: `මුරපදය යළි පිහිටුවීම සඳහා ඔබගේ විද්‍යුත් තැපෑල භාවිත කරන්න.`,
  },
};

export const StaticPage: React.FC<StaticPageProps> = ({ page, onBack }) => {
  const info = PAGE_MAP[page] || PAGE_MAP['privacy-policy'];

  useEffect(() => {
    if (info.noIndex) {
      SeoService.updateNoIndexSeo(info.title, info.canonicalPath);
    } else {
      SeoService.updateStaticPageSeo(info.title, info.canonicalPath);
    }
  }, [info.title, info.canonicalPath, info.noIndex]);

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onBack();
  };

  return (
    <article className="max-w-[700px] mx-auto px-4 sm:px-6 py-10 space-y-6">
      <a
        href="/"
        onClick={handleBack}
        className="inline-block text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        ← මුල් පිටුව
      </a>

      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-zinc-50 pb-4 border-b border-zinc-800/80">
          {info.title}
        </h1>
        <div className="story-prose text-[15px] text-zinc-300 whitespace-pre-line">
          {info.body}
        </div>
      </div>
    </article>
  );
};
