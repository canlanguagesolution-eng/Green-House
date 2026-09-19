import React, { useState } from 'react';
import { Award, X, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { Badge, BadgeCategory, BadgeTier } from '../types';
import { BadgeIcon } from './BadgeIcon';

interface BadgeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBadgeToAward?: (badge: Badge) => void;
  showAwardButton?: boolean;
}

export const BadgeLibraryModal: React.FC<BadgeLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectBadgeToAward,
  showAwardButton = false,
}) => {
  const { badges, memberBadges, members, currentUser } = useHouse();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [activeBadge, setActiveBadge] = useState<Badge | null>(null);

  if (!isOpen) return null;

  const filteredBadges = badges.filter((badge) => {
    if (selectedCategory === 'member' && badge.category !== 'member' && badge.category !== 'both')
      return false;
    if (selectedCategory === 'committee' && badge.category !== 'committee' && badge.category !== 'both')
      return false;
    if (selectedCategory === 'special' && !badge.isSpecialTeacherOnly)
      return false;
    if (selectedTier !== 'all' && badge.tier !== selectedTier)
      return false;
    return true;
  });

  const getHoldersCount = (badgeId: string) => {
    return memberBadges.filter((b) => b.badgeId === badgeId).length;
  };

  const currentMemberBadgeIds = memberBadges
    .filter((b) => b.memberId === currentUser.id)
    .map((b) => b.badgeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                敬社榮譽徽章典藏庫
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-700 border border-emerald-500 font-normal">
                  共 {badges.length} 款社徽章
                </span>
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                見證敬社社員與幹事在體育、藝文、服務與社務領導中的光榮足跡
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> 分類:
            </span>
            {[
              { key: 'all', label: '全部' },
              { key: 'member', label: '社員通用徽章' },
              { key: 'committee', label: '幹事會專屬勳章' },
              { key: 'special', label: '特別嘉許' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === tab.key
                    ? 'bg-emerald-800 text-white font-semibold'
                    : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-stone-500 mr-1">等級:</span>
            {[
              { key: 'all', label: '全部' },
              { key: 'bronze', label: '青銅' },
              { key: 'silver', label: '白銀' },
              { key: 'gold', label: '黃金' },
              { key: 'diamond', label: '鑽石' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTier(t.key)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTier === t.key
                    ? 'bg-stone-800 text-white font-semibold'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="p-6 overflow-y-auto space-y-6 grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => {
              const isCurrentUserOwner = currentMemberBadgeIds.includes(badge.id);
              const holdersCount = getHoldersCount(badge.id);

              return (
                <div
                  key={badge.id}
                  onClick={() => setActiveBadge(badge)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isCurrentUserOwner
                      ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-500 shadow-sm'
                      : 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <BadgeIcon
                        iconName={badge.iconName}
                        tier={badge.tier}
                        size="md"
                        isUnlocked={true}
                      />
                      <div className="text-right">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            badge.tier === 'diamond'
                              ? 'bg-teal-100 text-teal-800 border border-teal-300'
                              : badge.tier === 'gold'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : badge.tier === 'silver'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {badge.tier === 'diamond'
                            ? '鑽石階'
                            : badge.tier === 'gold'
                            ? '黃金階'
                            : badge.tier === 'silver'
                            ? '白銀階'
                            : '青銅階'}
                        </span>
                        <div className="text-[11px] text-emerald-700 font-bold mt-1">
                          +{badge.pointsReward} 貢獻分
                        </div>
                      </div>
                    </div>

                    <h3 className="font-bold text-stone-900 text-base group-hover:text-emerald-800 flex items-center gap-1.5">
                      {badge.name}
                      {isCurrentUserOwner && (
                        <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> 已獲得
                        </span>
                      )}
                    </h3>

                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span className="truncate max-w-[170px]" title={badge.requirement}>
                      條件: {badge.requirement}
                    </span>
                    <span className="font-semibold text-emerald-700 shrink-0">
                      {holdersCount} 人持有
                    </span>
                  </div>

                  {showAwardButton && onSelectBadgeToAward && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBadgeToAward(badge);
                      }}
                      className="mt-3 w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      選擇頒授此徽章 →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex items-center justify-between shrink-0">
          <span>
            敬社徽章系統依循社規設立，凡達標者由顧問老師與幹事會共同見證頒發。
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-xl text-xs transition-colors"
          >
            關閉
          </button>
        </div>

      </div>
    </div>
  );
};
