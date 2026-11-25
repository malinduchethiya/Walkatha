export interface CategorySeoCopy {
  slug: string;
  sinhalaName: string;
  anchorText: string;
  titleBase: string;
  shortBase: string;
  h1: string;
  description: string;
  themeKeyword: string;
}

/**
 * Highest Priority Core Keywords (exact priority order):
 * 1. sinhala wal katha
 * 2. wela katha
 * 3. sinhala wela katha
 * 4. walkatha / wal katha
 * 5. sinhala wal
 */
export const CORE_SEO_KEYWORDS = [
  'sinhala wal katha',
  'wela katha',
  'sinhala wela katha',
  'walkatha',
  'wal katha',
  'sinhala wal',
  'amma wal katha',
  'thaththa duwa',
  'akka wal katha',
  'wife wal katha',
  'nana wal katha',
  'teacher wal katha',
  'samalingika',
  'spa kathawa',
  'aluth wal katha',
  'wal katha 2026',
  'sinhala sex katha',
  'walle kathawa',
  'walkatha sinhala',
  'wala katha',
] as const;

export const HOME_SEO = {
  title: 'Sinhala Wal Katha & Wela Katha — Walkathawa (වල් කතාව)',
  description:
    'Sinhala wal katha, wela katha සහ sinhala wela katha නොමිලේ කියවන්න. Walkathawa (වල් කතාව) අලුත්ම walkatha, wal katha 2026 සහ sinhala wal එකතුව.',
  h1: 'Sinhala Wal Katha & Wela Katha — සිංහල වල් කතා',
  subtitle:
    'අලුත්ම sinhala wal katha, wela katha, sinhala wela katha සහ walkatha (වල් කතාව) දිනපතා නොමිලේ කියවන්න.',
} as const;

export const CATEGORY_SEO_MAP: Record<string, CategorySeoCopy> = {
  'අම්මා-පුතා': {
    slug: 'අම්මා-පුතා',
    sinhalaName: 'අම්ම පුතා',
    anchorText: 'අම්ම පුතා (Amma Wal Katha)',
    titleBase: 'Amma Wal Katha — අම්ම පුතා සහ Ammai Puthai',
    shortBase: 'Amma Wal Katha',
    h1: 'Amma Wal Katha — අම්ම පුතා (Ammai Puthai) කතා',
    description:
      'අලුත්ම amma wal katha, අම්ම පුතා (ammai puthai) කතා සහ sinhala wal katha එකතුව. Walkathawa වෙතින් sinhala wela katha නොමිලේ කියවන්න.',
    themeKeyword: 'Amma Wal Katha',
  },
  wife: {
    slug: 'wife',
    sinhalaName: 'වයිෆ් හෝ GF',
    anchorText: 'වයිෆ් හෝ GF (Wife Wal Katha)',
    titleBase: 'Wife Wal Katha & Wife GF — වයිෆ් හෝ GF කතා',
    shortBase: 'Wife Wal Katha',
    h1: 'Wife Wal Katha & Wife GF — වයිෆ් හෝ GF කතා',
    description:
      'අලුත්ම wife wal katha, wife gf (වයිෆ් හෝ GF) කතා සහ sinhala wal katha එකතුව. Walkathawa වෙතින් දිනපතා wela katha සහ walkatha කියවන්න.',
    themeKeyword: 'Wife Wal Katha',
  },
  'thaththa-duwa': {
    slug: 'thaththa-duwa',
    sinhalaName: 'පියා සහ දියණියෝ',
    anchorText: 'පියා සහ දියණියෝ (Thaththa Duwa)',
    titleBase: 'Thaththa Duwa & Thaththa Wal Katha — පියා දියණි',
    shortBase: 'Thaththa Duwa Wal Katha',
    h1: 'Thaththa Duwa & Thaththa Wal Katha — පියා සහ දියණියෝ',
    description:
      'අලුත්ම thaththa duwa, thaththa wal katha (පියා සහ දියණියෝ) කතා සහ sinhala wal katha එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.',
    themeKeyword: 'Thaththa Duwa Wal Katha',
  },
  'akka-malli': {
    slug: 'akka-malli',
    sinhalaName: 'ලොකු අක්කා / අක්කා මල්ලි',
    anchorText: 'ලොකු අක්කා (Akka Wal Katha)',
    titleBase: 'Akka Wal Katha — ලොකු අක්කා සහ අක්කා මල්ලි',
    shortBase: 'Akka Wal Katha',
    h1: 'Akka Wal Katha — ලොකු අක්කා සහ සහෝදර කතා',
    description:
      'නවතම akka wal katha, akkagen sapa, ලොකු අක්කා සහ sahodhara sohadhari (අක්කා මල්ලි) sinhala wal katha හා wela katha නොමිලේ කියවන්න.',
    themeKeyword: 'Akka Wal Katha',
  },
  nanda: {
    slug: 'nanda',
    sinhalaName: 'නෑනා / නැන්දා',
    anchorText: 'නෑනා / නැන්දා (Nana Wal Katha)',
    titleBase: 'Nana Wal Katha & Nanda — නෑනා සහ පවුලේ අන් අය',
    shortBase: 'Nana & Nanda Wal Katha',
    h1: 'Nana Wal Katha — නෑනා, නැන්දා සහ පවුලේ අන් අය',
    description:
      'හොඳම nana wal katha, pawule an aya (නෑනා සහ නැන්දා) කතා සහ අලුත්ම sinhala wal katha හා wela katha Walkathawa වෙතින් කියවන්න.',
    themeKeyword: 'Nana Wal Katha',
  },
  'ඇන්ටි-පුතා': {
    slug: 'ඇන්ටි-පුතා',
    sinhalaName: 'ඇන්ටි පුතා',
    anchorText: 'ඇන්ටි පුතා (Aunty Wal Katha)',
    titleBase: 'Aunty Wal Katha — ඇන්ටි පුතා සහ වැඩිමහල් කතා',
    shortBase: 'Aunty Wal Katha',
    h1: 'Aunty Wal Katha — ඇන්ටි පුතා සහ Wadimahal Bala කතා',
    description:
      'අලුත්ම aunty wal katha, ඇන්ටි පුතා, wadimahal bala සහ uncle තේමා රැගත් sinhala wal katha හා sinhala wela katha නොමිලේ කියවන්න.',
    themeKeyword: 'Aunty Wal Katha',
  },
  school: {
    slug: 'school',
    sinhalaName: 'පාසල් / ගුරු',
    anchorText: 'පාසල් / ගුරු (Teacher Wal Katha)',
    titleBase: 'Teacher & School Wal Katha — පාසල් සහ කැම්පස්',
    shortBase: 'Teacher & School Wal Katha',
    h1: 'Teacher Wal Katha & Model Wal Katha — පාසල් සහ කැම්පස්',
    description:
      'නවතම teacher wal katha, model wal katha, campus, hostel සහ bus wal katha ඇතුළු පාසල් sinhala wal katha එකතුව නොමිලේ කියවන්න.',
    themeKeyword: 'Teacher Wal Katha',
  },
  'spa-katha': {
    slug: 'spa-katha',
    sinhalaName: 'ස්පා කතා',
    anchorText: 'ස්පා කතා (Spa Kathawa)',
    titleBase: 'Spa Kathawa & Spa Katha — ස්පා සිංහල වල් කතා',
    shortBase: 'Spa Kathawa',
    h1: 'Spa Kathawa & Spa Katha — ස්පා සහ මසාජ් කතා',
    description:
      'අලුත්ම spa kathawa, spa katha, මසාජ් අත්දැකීම් සහ real story (ඇත්ත සීන් එකක්) ඇතුළත් sinhala wal katha හා wela katha කියවන්න.',
    themeKeyword: 'Spa Kathawa',
  },
  lesbian: {
    slug: 'lesbian',
    sinhalaName: 'සමලිංගික කතා',
    anchorText: 'සමලිංගික (Samalingika)',
    titleBase: 'Samalingika & Lesbian Wal Katha — සමලිංගික කතා',
    shortBase: 'Samalingika Wal Katha',
    h1: 'Samalingika & Lesbian Wal Katha — සමලිංගික කතා',
    description:
      'අලුත්ම samalingika (සමලිංගික) කතා, lesbian wal katha සහ sinhala wela katha එකතුව Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
    themeKeyword: 'Samalingika Wal Katha',
  },
  'වටේ-යාම': {
    slug: 'වටේ-යාම',
    sinhalaName: 'වටේ යාම',
    anchorText: 'වටේ යාම (Threesome & Walle Kathawa)',
    titleBase: 'Threesome Wal Katha & Walle Kathawa — වටේ යාම',
    shortBase: 'Threesome & Walle Kathawa',
    h1: 'Threesome Wal Katha & Walle Kathawa — වටේ යාම කතා',
    description:
      'අලුත්ම threesome wal katha, walle kathawa, wife sharing සහ වටේ යාම sinhala wal katha හා wela katha Walkathawa වෙතින් කියවන්න.',
    themeKeyword: 'Walle Kathawa',
  },
  romantic: {
    slug: 'romantic',
    sinhalaName: 'ආදර සහ රස කතා',
    anchorText: 'ආදර කතා (Sinhala Sex Katha)',
    titleBase: 'Sinhala Sex Katha & Real Story — ආදර වල් කතා',
    shortBase: 'Sinhala Sex Katha',
    h1: 'Sinhala Sex Katha & Real Story — ආදර සහ රස කතා',
    description:
      'ආදර හා හැඟීම්බර sinhala sex katha, sinhala sex stories, real story (ඇත්ත සීන් එකක්), jil katha සහ sinhala wal katha කියවන්න.',
    themeKeyword: 'Sinhala Sex Katha',
  },
};

export const CATEGORY_THEME_PATTERNS: Record<string, RegExp> = {
  'අම්මා-පුතා': /(amma|අම්ම|මව|putha|පුතා)/i,
  wife: /(wife|වයිෆ්|බිරිඳ|බිරින්ද|gf|girlfriend|කෙල්ල|couple|ජෝඩු|husband)/i,
  'thaththa-duwa': /(thaththa|තාත්ත|පියා|duwa|දුව|දියණි|bappa|බාප්ප)/i,
  'akka-malli': /(akka|අක්ක|නංගි|nangi|මල්ලි|malli|සහෝදර|sahodhara)/i,
  nanda: /(nanda|නැන්ද|nana|නෑන|පවුල|pawul|මාමා|mama)/i,
  'ඇන්ටි-පුතා': /(aunty|ඇන්ටි|anti|අන්කල්|uncle)/i,
  school: /(school|පාසල්|ඉස්කෝල|teacher|ටීච|මැඩම්|madam|campus|කැම්පස්|hostel|හොස්ටල්|model|ක්ලාස්|class)/i,
  'spa-katha': /(spa|ස්පා|massage|මසාජ්)/i,
  lesbian: /(lesbian|සමලිංගික|samalingika|ලෙස්බියන්)/i,
  'වටේ-යාම': /(වටේ|wate|cuckold|threesome|ත්‍රීසම්|ජෝඩු මාරු|sharing|වල්ලෙ|walle)/i,
  romantic: /(romantic|ආදර|love|රස|sex katha|real|ඇත්ත)/i,
};

export function storyMatchesCategory(
  story: {
    category?: string;
    categoryId?: string;
    categoryName?: string;
    title?: string;
    slug?: string;
    shortDescription?: string;
    description?: string;
    tags?: string[];
  },
  rawCategorySlug: string
): boolean {
  let cleanCat = String(rawCategorySlug || '').trim().toLowerCase();
  try {
    cleanCat = decodeURIComponent(cleanCat).trim().toLowerCase();
  } catch {
    // ignore
  }
  if (!cleanCat || cleanCat === 'all') return true;

  const sCat = String(story.category || '').trim().toLowerCase();
  const sCatId = String(story.categoryId || '').trim().toLowerCase();
  const sCatName = String(story.categoryName || '').trim().toLowerCase();
  const sTags = Array.isArray(story.tags)
    ? story.tags.map((t) => String(t || '').trim().toLowerCase())
    : [];

  if (
    sCat === cleanCat ||
    sCatId === cleanCat ||
    (cleanCat.length > 2 && sCatName.includes(cleanCat)) ||
    sTags.includes(cleanCat)
  ) {
    return true;
  }

  const pattern = CATEGORY_THEME_PATTERNS[cleanCat];
  if (pattern) {
    const searchText = `${story.title || ''} ${story.slug || ''} ${
      story.shortDescription || story.description || ''
    } ${sTags.join(' ')}`;
    return pattern.test(searchText);
  }

  return false;
}

export function getCategorySeoCopy(slug: string, fallbackLabel?: string): CategorySeoCopy {
  let key = String(slug || '').trim().toLowerCase();
  try {
    key = decodeURIComponent(key).trim().toLowerCase();
  } catch {
    // ignore
  }
  if (CATEGORY_SEO_MAP[key]) {
    return CATEGORY_SEO_MAP[key];
  }
  const cleanLabel = String(fallbackLabel || slug || 'Sinhala Wal Katha').trim();
  return {
    slug: key || 'romantic',
    sinhalaName: cleanLabel,
    anchorText: `${cleanLabel} (Wal Katha)`,
    titleBase: `${cleanLabel} — Sinhala Wal Katha`,
    shortBase: cleanLabel,
    h1: `${cleanLabel} — Sinhala Wal Katha & Wela Katha`,
    description: `${cleanLabel} — අලුත්ම sinhala wal katha, wela katha, sinhala wela katha සහ walkatha එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`,
    themeKeyword: 'Sinhala Wal Katha',
  };
}

export function getCategoryAnchorText(slug: string, fallbackLabel?: string): string {
  let key = String(slug || '').trim().toLowerCase();
  try {
    key = decodeURIComponent(key).trim().toLowerCase();
  } catch {
    // ignore
  }
  if (CATEGORY_SEO_MAP[key]) {
    return CATEGORY_SEO_MAP[key].anchorText;
  }
  return String(fallbackLabel || slug || 'Sinhala Wal Katha').trim();
}

export function detectStoryThemeKeyword(rawTitle: string, categorySlug?: string): string {
  const text = `${rawTitle || ''} ${categorySlug || ''}`;
  if (/(amma|අම්ම|මව)/i.test(text)) return 'Amma Wal Katha';
  if (/(thaththa|තාත්ත|පියා|duwa|දුව)/i.test(text)) return 'Thaththa Duwa';
  if (/(akka|අක්ක|නංගි|nangi)/i.test(text)) return 'Akka Wal Katha';
  if (/(wife|වයිෆ්|බිරිඳ|gf)/i.test(text)) return 'Wife Wal Katha';
  if (/(nana|නෑන|nanda|නැන්ද)/i.test(text)) return 'Nana Wal Katha';
  if (/(teacher|ටීච|මැඩම්|school|පාසල්|campus|model)/i.test(text)) return 'Teacher Wal Katha';
  if (/(spa|ස්පා|මසාජ්)/i.test(text)) return 'Spa Kathawa';
  if (/(aunty|ඇන්ටි)/i.test(text)) return 'Aunty Wal Katha';
  return 'Sinhala Wal Katha';
}

export function formatStorySeoTitle(rawTitle: string, categorySlug?: string): string {
  const cleaned = String(rawTitle || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const brandSuffix = ' | Walkathawa';
  const hasCoreKeyword =
    /(wal\s*katha|wela\s*katha|wala\s*katha|walkatha|sex\s*katha|වල්\s*කතා|වැල\s*කතා)/i.test(
      cleaned
    );

  if (!hasCoreKeyword) {
    const themeKw = detectStoryThemeKeyword(cleaned, categorySlug);
    const withTheme = `${cleaned} — ${themeKw}${brandSuffix}`;
    if (withTheme.length <= 65) {
      return withTheme;
    }
    const withShortKw = `${cleaned} — Wal Katha${brandSuffix}`;
    if (withShortKw.length <= 65) {
      return withShortKw;
    }
  }

  const plainWithBrand = `${cleaned}${brandSuffix}`;
  if (plainWithBrand.length <= 65) {
    return plainWithBrand;
  }
  return `${cleaned.slice(0, Math.max(12, 62 - brandSuffix.length)).trim()}...${brandSuffix}`;
}

export function formatStoryImageAlt(
  storyTitle: string,
  categoryLabel?: string,
  categorySlug?: string
): string {
  const t = String(storyTitle || '').trim();
  const c = String(categoryLabel || '').trim();
  const themeKw = detectStoryThemeKeyword(t, categorySlug || c);
  return c
    ? `${t} — ${c} (${themeKw} | Sinhala Wal Katha & Wela Katha)`
    : `${t} — ${themeKw} | Sinhala Wal Katha & Wela Katha`;
}
