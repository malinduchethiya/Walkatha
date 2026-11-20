import React, { useEffect } from 'react';
import type { Category } from '../../types/story';
import { SeoService } from '../../services/seoService';
import { cleanCategoryBadgeName } from '../../utils/formatters';

interface CategoriesPageProps {
  categories: Category[];
  onSelectCategory: (slug: string) => void;
  onBack: () => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  onSelectCategory,
  onBack,
}) => {
  useEffect(() => {
    SeoService.updateCategoriesSeo(categories);
  }, [categories]);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, fn: () => void) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    fn();
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="pb-5 border-b border-zinc-800/80 flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">
            වර්ගීකරණ
          </h1>
          <p className="text-sm text-zinc-400">
            කැමති විෂය පථය තෝරා සිංහල කතා කියවන්න.
          </p>
        </div>
        <a
          href="/"
          onClick={(e) => handleLink(e, onBack)}
          className="text-xs text-zinc-400 hover:text-zinc-100 shrink-0 transition-colors"
        >
          ← මුල් පිටුව
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const slug = cat.slug || cat.id;
          const label = cleanCategoryBadgeName(cat.sinhalaName || cat.name);
          return (
            <a
              key={slug}
              href={`/category/${encodeURIComponent(slug)}`}
              onClick={(e) => handleLink(e, () => onSelectCategory(slug))}
              className="group p-5 rounded-md border border-zinc-800/80 bg-[#16161a]/60 hover:border-zinc-600 transition-colors flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
                  {label}
                </h2>
                {cat.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>
              {typeof cat.storyCount === 'number' && cat.storyCount > 0 && (
                <span className="text-xs text-zinc-500 tabular-nums">
                  කතා {cat.storyCount}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
};
