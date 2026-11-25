export interface CategorySeoCopy {
  titleBase: string;
  description: string;
  h1: string;
}

export const HOME_SEO = {
  title: 'Walkathawa (වල් කතාව) — Sinhala Wal Katha & Wela Katha New',
  description:
    'Walkathawa (වල් කතාව) — Read new Sinhala wal katha, wela katha, and sinhala wala katha online free. Daily updated wal katha sinhala and aluth sinhala walkatha.',
  h1: 'Sinhala Wal Katha — නවතම වල් කතා',
  subtitle:
    'Walkathawa (වල් කතාව) — අලුත්ම wal katha new, wela katha සහ sinhala wala katha නොමිලේ කියවන්න.',
} as const;

export const CATEGORY_SEO_MAP: Record<string, CategorySeoCopy> = {
  wife: {
    titleBase: 'Wife Wal Katha — වයිෆ් / බිරිඳ කතා',
    h1: 'Wife Wal Katha — වයිෆ් / බිරිඳ කතා',
    description:
      'අලුත්ම wife wal katha, බිරිඳ කතා සහ sinhala wal katha Walkathawa වෙතින් නොමිලේ කියවන්න. Daily updated wela katha sinhala.',
  },
  'akka-malli': {
    titleBase: 'Akka Malli Wal Katha — අක්කා මල්ලි කතා',
    h1: 'Akka Malli Wal Katha — අක්කා මල්ලි කතා',
    description:
      'නවතම akka wal katha, අක්කා මල්ලි කතා සහ sinhala wala katha Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  nanda: {
    titleBase: 'Aunty & Nanda Wal Katha — නැන්දා කතා',
    h1: 'Aunty & Nanda Wal Katha — නැන්දා / ඇන්ටි කතා',
    description:
      'හොඳම aunty wal katha, නැන්දා කතා සහ sinhala wal katha new එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.',
  },
  'ඇන්ටි-පුතා': {
    titleBase: 'Aunty Wal Katha — ඇන්ටි පුතා කතා',
    h1: 'Aunty Wal Katha — ඇන්ටි පුතා කතා',
    description:
      'අලුත්ම aunty wal katha, ඇන්ටි පුතා කතා සහ wal katha sinhala Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  'අම්මා-පුතා': {
    titleBase: 'Amma Wal Katha — අම්මා පුතා කතා',
    h1: 'Amma Wal Katha — අම්මා පුතා කතා',
    description:
      'අලුත්ම amma wal katha, අම්මා පුතා කතා සහ sinhala wal katha Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  school: {
    titleBase: 'School & Teacher Wal Katha — පාසල් කතා',
    h1: 'School & Teacher Wal Katha — පාසල් කතා',
    description:
      'නවතම school wal katha, teacher wal katha සහ පාසල් කැම්පස් sinhala walkatha එකතුව Walkathawa වෙතින් කියවන්න.',
  },
  lesbian: {
    titleBase: 'Lesbian Wal Katha — සිංහල වල් කතා',
    h1: 'Lesbian Wal Katha — සිංහල කතා',
    description:
      'අලුත්ම lesbian wal katha සහ sinhala wela katha එකතුව Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  'වටේ-යාම': {
    titleBase: 'Cuckold & Wife Sharing Wal Katha — වටේ යාම',
    h1: 'Cuckold & Wife Sharing Wal Katha — වටේ යාම',
    description:
      'අලුත්ම cuckold wal katha, wife sharing සහ වටේ යාම sinhala wal katha Walkathawa වෙතින් නොමිලේ කියවන්න.',
  },
  romantic: {
    titleBase: 'Romantic Sinhala Wal Katha — ආදර කතා',
    h1: 'Romantic Sinhala Wal Katha — ආදර කතා',
    description:
      'ආදර හා හැඟීම්බර sinhala wal katha, wela katha සහ sinhala walkatha කෙටි කතා Walkathawa වෙතින් නොමිලේ කියවන්න.',
  },
};

export function getCategorySeoCopy(slug: string, fallbackLabel: string): CategorySeoCopy {
  const key = String(slug || '').trim().toLowerCase();
  if (CATEGORY_SEO_MAP[key]) {
    return CATEGORY_SEO_MAP[key];
  }
  const cleanLabel = String(fallbackLabel || slug || 'Sinhala Wal Katha').trim();
  return {
    titleBase: `${cleanLabel} — Wal Katha`,
    h1: cleanLabel,
    description: `${cleanLabel} — අලුත්ම sinhala wal katha, wela katha සහ walkatha එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`,
  };
}

export function formatStorySeoTitle(rawTitle: string): string {
  const cleaned = String(rawTitle || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const brandSuffix = ' | Walkathawa';
  const hasCoreKeyword = /(wal\s*katha|wela\s*katha|wala\s*katha|walkatha|වල්\s*කතා)/i.test(cleaned);
  const fullWithKeyword = hasCoreKeyword
    ? `${cleaned}${brandSuffix}`
    : `${cleaned} — Wal Katha${brandSuffix}`;

  if (fullWithKeyword.length <= 65) {
    return fullWithKeyword;
  }
  const plainWithBrand = `${cleaned}${brandSuffix}`;
  if (plainWithBrand.length <= 65) {
    return plainWithBrand;
  }
  return `${cleaned.slice(0, Math.max(12, 62 - brandSuffix.length)).trim()}...${brandSuffix}`;
}

export function formatStoryImageAlt(storyTitle: string, categoryLabel?: string): string {
  const t = String(storyTitle || '').trim();
  const c = String(categoryLabel || '').trim();
  return c ? `${t} — ${c} | Sinhala Wal Katha` : `${t} — Sinhala Wal Katha | Walkathawa`;
}
