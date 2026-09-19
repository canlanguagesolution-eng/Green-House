import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trophy,
  Activity,
  Music,
  Flame,
  HeartHandshake,
  BookOpen,
  Award,
  Medal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Users,
  UserCheck,
  Calendar,
  PenTool,
  ArrowUpDown,
  Tag,
  Share2,
  HelpCircle,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import {
  Member,
  ContributionRecord,
  RewardRecord,
  MemberBadgeRecord,
  ContributionCategory,
  Badge,
} from '../types';
import { BadgeIcon } from './BadgeIcon';
import { compareClassAndNumber } from '../utils/memberSorting';

interface TalentFinderViewProps {
  onSelectMemberForRecord?: (memberId: string) => void;
  titlePrefix?: string;
}

export const TalentFinderView: React.FC<TalentFinderViewProps> = ({
  onSelectMemberForRecord,
  titlePrefix = '',
}) => {
  const {
    members,
    contributions,
    rewards,
    badges,
    memberBadges,
    currentUser,
  } = useHouse();

  // Search and Filter states
  const [keyword, setKeyword] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [recordCriteria, setRecordCriteria] = useState<string>('has_records');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'events_desc' | 'category_points_desc' | 'total_points_desc' | 'class_number_asc'>('events_desc');

  // Expanded member cards state (memberId -> boolean)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copySuccess, setCopySuccess] = useState(false);

  // Category labels and icons mapping
  const categoryConfig: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeBg: string }
  > = {
    sports: {
      label: '社際體育',
      icon: Activity,
      color: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    arts: {
      label: '文藝展演',
      icon: Music,
      color: 'text-purple-700',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    cheering: {
      label: '啦啦隊助威',
      icon: Flame,
      color: 'text-orange-600',
      badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    },
    service: {
      label: '義工與社務',
      icon: HeartHandshake,
      color: 'text-blue-700',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    academic: {
      label: '學術與問答',
      icon: BookOpen,
      color: 'text-indigo-700',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    organization: {
      label: '活動籌備/社職',
      icon: PenTool,
      color: 'text-teal-700',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    leadership: {
      label: '領袖風範',
      icon: Trophy,
      color: 'text-amber-700',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    },
  };

  // Build aggregated talent profiles for all members
  const memberTalentProfiles = useMemo(() => {
    const badgeMap = new Map<string, Badge>();
    badges.forEach((b) => badgeMap.set(b.id, b));

    return members
      .filter((m) => m.role !== 'master') // Exclude system admin from student talent search
      .map((member) => {
        // Contributions
        const memberContribs = contributions
          .filter((c) => c.memberId === member.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Rewards
        const memberRewardList = rewards
          .filter((r) => r.memberId === member.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Badges
        const memberBadgeList = memberBadges
          .filter((mb) => mb.memberId === member.id)
          .map((mb) => ({
            ...mb,
            badge: badgeMap.get(mb.badgeId),
          }));

        // Category breakdown
        const sportsEvents = memberContribs.filter((c) => c.category === 'sports');
        const sportsPoints = sportsEvents.reduce((acc, c) => acc + c.points, 0);

        const artsEvents = memberContribs.filter((c) => c.category === 'arts');
        const artsPoints = artsEvents.reduce((acc, c) => acc + c.points, 0);

        const cheeringEvents = memberContribs.filter((c) => c.category === 'cheering');
        const cheeringPoints = cheeringEvents.reduce((acc, c) => acc + c.points, 0);

        const serviceEvents = memberContribs.filter((c) => c.category === 'service');
        const servicePoints = serviceEvents.reduce((acc, c) => acc + c.points, 0);

        const academicEvents = memberContribs.filter((c) => c.category === 'academic');
        const academicPoints = academicEvents.reduce((acc, c) => acc + c.points, 0);

        const orgEvents = memberContribs.filter(
          (c) =>
            c.category === 'organization' ||
            c.category === 'president' ||
            c.category === 'vice_president' ||
            c.category === 'committee_officer'
        );
        const orgPoints = orgEvents.reduce((acc, c) => acc + c.points, 0);

        const totalEventCount = memberContribs.length;
        const totalRewardCount = memberRewardList.length;
        const totalBadgeCount = memberBadgeList.length;

        // Form digit extraction
        const formMatch = (member.class || '').match(/^([1-6])/);
        const formDigit = formMatch ? parseInt(formMatch[1], 10) : 0;

        return {
          member,
          contributions: memberContribs,
          rewards: memberRewardList,
          badges: memberBadgeList,
          sportsEvents,
          sportsPoints,
          artsEvents,
          artsPoints,
          cheeringEvents,
          cheeringPoints,
          serviceEvents,
          servicePoints,
          academicEvents,
          academicPoints,
          orgEvents,
          orgPoints,
          totalEventCount,
          totalRewardCount,
          totalBadgeCount,
          formDigit,
        };
      });
  }, [members, contributions, rewards, badges, memberBadges]);

  // General talent statistics across all house members
  const overallStats = useMemo(() => {
    let sportsAthletes = 0;
    let artsPerformers = 0;
    let cheeringSquad = 0;
    let rewardedCount = 0;
    let badgedCount = 0;
    let totalExperienced = 0;

    memberTalentProfiles.forEach((p) => {
      if (p.sportsEvents.length > 0) sportsAthletes++;
      if (p.artsEvents.length > 0) artsPerformers++;
      if (p.cheeringEvents.length > 0) cheeringSquad++;
      if (p.rewards.length > 0) rewardedCount++;
      if (p.badges.length > 0) badgedCount++;
      if (p.totalEventCount > 0 || p.totalRewardCount > 0 || p.totalBadgeCount > 0) {
        totalExperienced++;
      }
    });

    return {
      sportsAthletes,
      artsPerformers,
      cheeringSquad,
      rewardedCount,
      badgedCount,
      totalExperienced,
    };
  }, [memberTalentProfiles]);

  // Dynamic available classes for filter dropdown
  const availableClassOptions = useMemo(() => {
    const classSet = new Set<string>();
    // Standard classes: 1A-1D to 6A-6D
    for (let f = 1; f <= 6; f++) {
      ['A', 'B', 'C', 'D'].forEach((sec) => classSet.add(`${f}${sec}`));
    }
    // Also include any classes existing in members
    members.forEach((m) => {
      if (m.class && m.class.trim() && m.class !== 'ADMIN') {
        classSet.add(m.class.trim());
      }
    });

    return Array.from(classSet).sort((a, b) => {
      if (a === 'STAFF') return 1;
      if (b === 'STAFF') return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [members]);

  // Filter and Sort matching talent profiles
  const filteredProfiles = useMemo(() => {
    const term = keyword.trim().toLowerCase();

    return memberTalentProfiles.filter((p) => {
      const { member, contributions, rewards, badges } = p;

      // 1. Keyword search (matches member details OR past event titles / descriptions / awards)
      if (term) {
        const matchesMember =
          member.name.toLowerCase().includes(term) ||
          (member.englishName && member.englishName.toLowerCase().includes(term)) ||
          (member.studentId && member.studentId.toLowerCase().includes(term)) ||
          (member.class && member.class.toLowerCase().includes(term)) ||
          (member.committeeTitle && member.committeeTitle.toLowerCase().includes(term));

        const matchesContrib = contributions.some(
          (c) =>
            c.title.toLowerCase().includes(term) ||
            c.description.toLowerCase().includes(term) ||
            c.category.toLowerCase().includes(term)
        );

        const matchesReward = rewards.some(
          (r) =>
            r.title.toLowerCase().includes(term) ||
            r.comment.toLowerCase().includes(term) ||
            r.category.toLowerCase().includes(term)
        );

        const matchesBadge = badges.some(
          (b) =>
            (b.badge && b.badge.name.toLowerCase().includes(term)) ||
            (b.reason && b.reason.toLowerCase().includes(term))
        );

        if (!matchesMember && !matchesContrib && !matchesReward && !matchesBadge) {
          return false;
        }
      }

      // 2. Domain / Category Filter
      if (domainFilter === 'sports' && p.sportsEvents.length === 0) return false;
      if (domainFilter === 'arts' && p.artsEvents.length === 0) return false;
      if (domainFilter === 'cheering' && p.cheeringEvents.length === 0) return false;
      if (domainFilter === 'service' && p.serviceEvents.length === 0) return false;
      if (domainFilter === 'academic' && p.academicEvents.length === 0) return false;
      if (domainFilter === 'organization' && p.orgEvents.length === 0) return false;
      if (domainFilter === 'rewards' && p.rewards.length === 0) return false;
      if (domainFilter === 'badges' && p.badges.length === 0) return false;

      // 3. Record Criteria Filter
      if (recordCriteria === 'has_records') {
        if (p.totalEventCount === 0 && p.totalRewardCount === 0 && p.totalBadgeCount === 0) {
          return false;
        }
      } else if (recordCriteria === 'sports_veteran') {
        if (p.sportsEvents.length === 0) return false;
      } else if (recordCriteria === 'arts_veteran') {
        if (p.artsEvents.length === 0) return false;
      } else if (recordCriteria === 'rewarded') {
        if (p.rewards.length === 0) return false;
      } else if (recordCriteria === 'multi_active') {
        if (p.totalEventCount + p.totalRewardCount < 2) return false;
      }

      // 4. Division / Form Filter
      if (divisionFilter === 'GRADE_A') {
        // 甲組: 中五、中六
        if (p.formDigit !== 5 && p.formDigit !== 6) return false;
      } else if (divisionFilter === 'GRADE_B') {
        // 乙組: 中三、中四
        if (p.formDigit !== 3 && p.formDigit !== 4) return false;
      } else if (divisionFilter === 'GRADE_C') {
        // 丙組: 中一、中二
        if (p.formDigit !== 1 && p.formDigit !== 2) return false;
      } else if (divisionFilter.startsWith('FORM_')) {
        const targetForm = parseInt(divisionFilter.replace('FORM_', ''), 10);
        if (p.formDigit !== targetForm) return false;
      } else if (divisionFilter !== 'all') {
        if (member.class !== divisionFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (sortBy === 'events_desc') {
        const totalA = a.totalEventCount + a.totalRewardCount;
        const totalB = b.totalEventCount + b.totalRewardCount;
        if (totalB !== totalA) return totalB - totalA;
        return compareClassAndNumber(a.member, b.member);
      }

      if (sortBy === 'category_points_desc') {
        let ptsA = 0;
        let ptsB = 0;
        if (domainFilter === 'sports') {
          ptsA = a.sportsPoints;
          ptsB = b.sportsPoints;
        } else if (domainFilter === 'arts') {
          ptsA = a.artsPoints;
          ptsB = b.artsPoints;
        } else if (domainFilter === 'cheering') {
          ptsA = a.cheeringPoints;
          ptsB = b.cheeringPoints;
        } else if (domainFilter === 'service') {
          ptsA = a.servicePoints;
          ptsB = b.servicePoints;
        } else if (domainFilter === 'academic') {
          ptsA = a.academicPoints;
          ptsB = b.academicPoints;
        } else {
          ptsA = a.member.totalPoints;
          ptsB = b.member.totalPoints;
        }
        if (ptsB !== ptsA) return ptsB - ptsA;
        return compareClassAndNumber(a.member, b.member);
      }

      if (sortBy === 'total_points_desc') {
        if (b.member.totalPoints !== a.member.totalPoints) {
          return b.member.totalPoints - a.member.totalPoints;
        }
        return compareClassAndNumber(a.member, b.member);
      }

      if (sortBy === 'class_number_asc') {
        return compareClassAndNumber(a.member, b.member);
      }

      return 0;
    });
  }, [memberTalentProfiles, keyword, domainFilter, recordCriteria, divisionFilter, sortBy]);

  // Toggle single member card expansion
  const toggleCard = (memberId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // Toggle all cards expansion
  const toggleAllCards = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    filteredProfiles.forEach((p) => {
      next[p.member.id] = expand;
    });
    setExpandedCards(next);
  };

  // Copy talent roster to clipboard
  const handleCopyRoster = () => {
    if (filteredProfiles.length === 0) return;

    let domainText = '全社專長綜合檢索';
    if (domainFilter === 'sports') domainText = '社際體育出賽人才';
    if (domainFilter === 'arts') domainText = '文藝演出人才';
    if (domainFilter === 'cheering') domainText = '啦啦隊助威代表';
    if (domainFilter === 'rewards') domainText = '官方嘉許狀獲獎名單';

    const lines: string[] = [
      `【敬社 · ${domainText}名單】（共 ${filteredProfiles.length} 位社員）`,
      `產出日期：${new Date().toLocaleDateString('zh-HK')}`,
      `----------------------------------------`,
    ];

    filteredProfiles.forEach((p, idx) => {
      const clsNum = p.member.classNumber ? `#${p.member.classNumber}` : '';
      const english = p.member.englishName ? ` (${p.member.englishName})` : '';
      const lineSummary = [
        p.sportsEvents.length > 0 ? `體育:${p.sportsEvents.length}項` : null,
        p.artsEvents.length > 0 ? `文藝:${p.artsEvents.length}項` : null,
        p.cheeringEvents.length > 0 ? `啦啦隊:${p.cheeringEvents.length}次` : null,
        p.rewards.length > 0 ? `嘉許狀:${p.rewards.length}項` : null,
      ].filter(Boolean).join(' | ');

      const recentEvent = p.contributions[0]?.title || p.rewards[0]?.title || '尚無具體賽事';

      lines.push(`${idx + 1}. ${p.member.name}${english} [${p.member.class} ${clsNum}] - ${lineSummary || '新入社'} (近期代表作: ${recentEvent})`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`敬社社務管理系統 · Talent Finder 檢索輸出`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Export CSV report
  const handleExportCSV = () => {
    if (filteredProfiles.length === 0) return;

    const headers = [
      '姓名',
      '英文名',
      '班別',
      '班號',
      '學號',
      '社內身分',
      '全社總分',
      '體育出賽數',
      '體育積分',
      '文藝活動數',
      '文藝積分',
      '啦啦隊次數',
      '義工社務次數',
      '嘉許狀數量',
      '勳章數量',
      '歷年出賽與獲獎明細摘要',
    ];

    const rows = filteredProfiles.map((p) => {
      const allEventsSummary = [
        ...p.contributions.map((c) => `[${c.date} ${c.category}] ${c.title} (+${c.points}分)`),
        ...p.rewards.map((r) => `[${r.date} 嘉許狀] ${r.title} (+${r.points}分)`),
      ].join('; ');

      return [
        `"${p.member.name}"`,
        `"${p.member.englishName || ''}"`,
        `"${p.member.class}"`,
        `"${p.member.classNumber || ''}"`,
        `"${p.member.studentId || ''}"`,
        `"${p.member.committeeTitle || '普通社員'}"`,
        p.member.totalPoints,
        p.sportsEvents.length,
        p.sportsPoints,
        p.artsEvents.length,
        p.artsPoints,
        p.cheeringEvents.length,
        p.serviceEvents.length,
        p.rewards.length,
        p.badges.length,
        `"${allEventsSummary.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `敬社_社員特長與出賽獲獎檔案_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Introduction */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-stone-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg border border-emerald-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-800/80 border border-emerald-500 text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{titlePrefix}社員專長與賽事獲獎人才庫 · Talent Finder</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              精準檢索歷年賽事代表與獲獎社員
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              專為學生管理員（幹事會）與老師管理員打造：支援依社際體育（水運會、陸運會、球賽）、文藝演出（歌唱、音樂、壁報、朗誦）、啦啦隊、義工社務，以及各項嘉許狀與勳章歷史進行交叉檢索，輕鬆發掘具備特定專長之成員，以利各項大賽選拔及幹事組隊！
            </p>
          </div>

          {/* Quick Stat Pill Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 shrink-0">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-300 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-[11px] font-medium">體育健將</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {overallStats.sportsAthletes} <span className="text-xs font-normal text-emerald-200">人</span>
              </div>
            </div>

            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-center">
              <div className="flex items-center justify-center gap-1.5 text-purple-300 mb-1">
                <Music className="w-4 h-4" />
                <span className="text-[11px] font-medium">文藝演出</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {overallStats.artsPerformers} <span className="text-xs font-normal text-purple-200">人</span>
              </div>
            </div>

            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-center">
              <div className="flex items-center justify-center gap-1.5 text-orange-300 mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-[11px] font-medium">啦啦隊員</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {overallStats.cheeringSquad} <span className="text-xs font-normal text-orange-200">人</span>
              </div>
            </div>

            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-300 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-[11px] font-medium">官方嘉許</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {overallStats.rewardedCount} <span className="text-xs font-normal text-amber-200">人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Deck */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
        {/* Row 1: Search Keyword */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-stone-400" />
          <input
            id="input-talent-search"
            type="text"
            placeholder="搜尋學生姓名、英文名、學號、班別，或輸入賽事關鍵字 (例如: 自由泳、足球、接力、歌唱、壁報、伴奏、辯論、啦啦隊)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all placeholder:text-stone-400"
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="absolute right-3.5 top-3.5 text-xs text-stone-400 hover:text-stone-600 font-bold"
            >
              清除
            </button>
          )}
        </div>

        {/* Row 2: Category & Division Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Domain / Talent Category */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              專長 / 活動賽事領域
            </label>
            <select
              id="select-talent-domain"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">🌟 全部領域 (體育/文藝/啦啦隊/嘉許)</option>
              <option value="sports">🏃 社際體育 (水運會、陸運會、球類)</option>
              <option value="arts">🎨 文藝展演 (歌唱、伴奏、壁報、朗誦)</option>
              <option value="cheering">📣 啦啦隊助威與排練</option>
              <option value="service">🤝 義工服務與社務支援</option>
              <option value="academic">📖 學術常識與辯論</option>
              <option value="organization">👑 社職幹事統籌</option>
              <option value="rewards">🏅 曾獲官方嘉許狀</option>
              <option value="badges">🎖️ 曾獲頒社務勳章</option>
            </select>
          </div>

          {/* Record Criteria */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              出賽／獲獎門檻
            </label>
            <select
              id="select-record-criteria"
              value={recordCriteria}
              onChange={(e) => setRecordCriteria(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="has_records">⚡ 曾有出賽/活動或獲獎紀錄</option>
              <option value="all">👥 全體敬社社員 (含尚無紀錄者)</option>
              <option value="sports_veteran">🏃 曾出賽體育賽事</option>
              <option value="arts_veteran">🎨 曾參與文藝活動演出</option>
              <option value="rewarded">🏅 曾獲頒正式嘉許狀</option>
              <option value="multi_active">🔥 多項全能活躍者 (2次以上出賽/獎項)</option>
            </select>
          </div>

          {/* Division / Grade / Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              比賽組別 / 年級與班別
            </label>
            <select
              id="select-division-filter"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">所有組別與班別</option>

              <optgroup label="── 陸水運會年齡組別 (Division) ──">
                <option value="GRADE_A">甲組 (A-Grade) · 中五、中六</option>
                <option value="GRADE_B">乙組 (B-Grade) · 中三、中四</option>
                <option value="GRADE_C">丙組 (C-Grade) · 中一、中二</option>
              </optgroup>

              <optgroup label="── 依全級篩選 (By Form) ──">
                <option value="FORM_1">中一級全級 (F.1)</option>
                <option value="FORM_2">中二級全級 (F.2)</option>
                <option value="FORM_3">中三級全級 (F.3)</option>
                <option value="FORM_4">中四級全級 (F.4)</option>
                <option value="FORM_5">中五級全級 (F.5)</option>
                <option value="FORM_6">中六級全級 (F.6)</option>
              </optgroup>

              <optgroup label="── 各獨立班別 (Individual Classes) ──">
                {availableClassOptions.map((cls) => {
                  const formMatch = cls.match(/^([1-6])([A-Za-z]+)$/);
                  let label = cls;
                  if (formMatch) {
                    const formZh = ['一', '二', '三', '四', '五', '六'][parseInt(formMatch[1], 10) - 1];
                    label = `中${formZh} (${cls})`;
                  } else if (cls === 'STAFF') {
                    label = '教職員 (STAFF)';
                  }
                  return (
                    <option key={cls} value={cls}>
                      {label}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              結果排序依據
            </label>
            <select
              id="select-talent-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="events_desc">依出賽/獲獎次數多寡 (高至低)</option>
              <option value="category_points_desc">依該領域特長積分 (高至低)</option>
              <option value="total_points_desc">依個人全社總積分 (高至低)</option>
              <option value="class_number_asc">依標準班別與學號 (1A 01 順序)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
          <div className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <span>
              檢索結果：共找到 <strong className="text-emerald-900 font-mono text-sm">{filteredProfiles.length}</strong> 位社員
            </span>
            {keyword && (
              <span className="text-[11px] font-normal text-stone-500">
                (關鍵字「{keyword}」)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => toggleAllCards(true)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
            >
              全部展開明細
            </button>
            <button
              onClick={() => toggleAllCards(false)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
            >
              全部收起
            </button>
            <button
              id="btn-copy-talent-roster"
              onClick={handleCopyRoster}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-900 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="複製目前篩選之隊員出賽名單至剪貼簿"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>已複製名單！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-700" />
                  <span>複製選拔/出賽名單</span>
                </>
              )}
            </button>
            <button
              id="btn-export-talent-csv"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer"
              title="導出為 CSV 試算表"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>導出專長總表 (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-800">未找到符合條件的專長社員</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            目前篩選條件下沒有相符紀錄。您可以嘗試調整關鍵字（例如簡化為「球」或「泳」）、放寬「出賽／獲獎門檻」，或將「領域」切換為「全部領域」。
          </p>
          <button
            onClick={() => {
              setKeyword('');
              setDomainFilter('all');
              setRecordCriteria('all');
              setDivisionFilter('all');
            }}
            className="mt-2 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
          >
            重設所有篩選條件
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProfiles.map((p) => {
            const {
              member,
              contributions,
              rewards,
              badges,
              sportsEvents,
              sportsPoints,
              artsEvents,
              artsPoints,
              cheeringEvents,
              serviceEvents,
              academicEvents,
              orgEvents,
              totalEventCount,
              totalRewardCount,
            } = p;

            const isExpanded = !!expandedCards[member.id];

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-stone-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Member Basic Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {member.class || '敬'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-stone-900">
                          {member.name}
                        </span>
                        {member.englishName && (
                          <span className="text-xs text-stone-500 font-sans">
                            {member.englishName}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-xs font-mono font-bold text-stone-700">
                          {member.class} {member.classNumber ? `#${member.classNumber}` : ''}
                        </span>
                        {member.studentId && (
                          <span className="text-[11px] font-mono text-stone-400">
                            {member.studentId}
                          </span>
                        )}
                        {member.committeeTitle && member.committeeTitle !== '普通社員' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {member.committeeTitle}
                          </span>
                        )}
                      </div>

                      {/* Talent Highlight Chips */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                        {sportsEvents.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                            <Activity className="w-3 h-3 text-emerald-600" />
                            體育賽事 {sportsEvents.length} 項 ({sportsPoints}分)
                          </span>
                        )}

                        {artsEvents.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-medium">
                            <Music className="w-3 h-3 text-purple-600" />
                            文藝展演 {artsEvents.length} 項 ({artsPoints}分)
                          </span>
                        )}

                        {cheeringEvents.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 font-medium">
                            <Flame className="w-3 h-3 text-orange-600" />
                            啦啦隊 {cheeringEvents.length} 次
                          </span>
                        )}

                        {serviceEvents.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                            <HeartHandshake className="w-3 h-3 text-blue-600" />
                            社際義工 {serviceEvents.length} 次
                          </span>
                        )}

                        {rewards.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                            <Award className="w-3 h-3 text-amber-600" />
                            嘉許狀 {rewards.length} 項
                          </span>
                        )}

                        {badges.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 font-medium">
                            <Medal className="w-3 h-3 text-stone-600" />
                            勳章 {badges.length} 枚
                          </span>
                        )}

                        {totalEventCount === 0 && totalRewardCount === 0 && (
                          <span className="text-[11px] text-stone-400 italic">
                            尚無登記出賽紀錄 (可點擊登記)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Points + Toggle & Quick Action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                    <div className="text-right">
                      <div className="text-[11px] text-stone-400 font-medium">全社累積積分</div>
                      <div className="text-base font-black text-emerald-800 font-mono">
                        {member.totalPoints} <span className="text-xs font-normal text-stone-500">分</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onSelectMemberForRecord && (
                        <button
                          onClick={() => onSelectMemberForRecord(member.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="為此社員登記新賽事或出賽成績"
                        >
                          <PenTool className="w-3 h-3 text-emerald-700" />
                          <span>登記賽事</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleCard(member.id)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <span>{isExpanded ? '收起明細' : `檢視履歷 (${totalEventCount + totalRewardCount})`}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Records Timeline */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-stone-50/70 border-t border-stone-200 space-y-4">
                    {/* Top: Badges Earned */}
                    {badges.length > 0 && (
                      <div className="p-3 bg-white rounded-xl border border-stone-200">
                        <div className="text-xs font-bold text-stone-800 mb-2 flex items-center gap-1.5">
                          <Medal className="w-3.5 h-3.5 text-amber-600" />
                          <span>獲頒榮譽勳章 ({badges.length} 枚)</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {badges.map((b) => (
                            <div
                              key={b.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900"
                              title={`授勳原因：${b.reason} (頒發者: ${b.awardedBy})`}
                            >
                              <BadgeIcon iconName={b.badge?.iconName || 'Sparkles'} tier={b.badge?.tier || 'bronze'} className="w-3.5 h-3.5" />
                              <span>{b.badge?.name || '社務勳章'}</span>
                              <span className="text-[10px] text-amber-600 font-mono">({b.awardedAt})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Official Commendations / Rewards */}
                    {rewards.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-600" />
                          <span>官方嘉許與表彰狀 ({rewards.length} 項)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {rewards.map((r) => (
                            <div
                              key={r.id}
                              className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-amber-950 text-xs sm:text-sm">
                                  {r.title}
                                </span>
                                <span className="text-xs font-bold font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                                  +{r.points} 分
                                </span>
                              </div>
                              {r.comment && (
                                <p className="text-[11px] text-amber-900/80 italic leading-relaxed">
                                  "{r.comment}"
                                </p>
                              )}
                              <div className="text-[10px] text-amber-700 flex items-center justify-between pt-1 border-t border-amber-200/50">
                                <span>頒發：{r.awardedBy}</span>
                                <span>日期：{r.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Competitions & Activity Contributions */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-700" />
                        <span>歷年出賽與社務貢獻流水明細 ({contributions.length} 項)</span>
                      </div>

                      {contributions.length === 0 ? (
                        <div className="p-4 bg-white rounded-xl border border-stone-200 text-center text-xs text-stone-400">
                          此社員目前尚無具體的社際出賽或活動流水紀錄。
                        </div>
                      ) : (
                        <div className="divide-y divide-stone-200 bg-white rounded-xl border border-stone-200 overflow-hidden">
                          {contributions.map((c) => {
                            const cfg = categoryConfig[c.category] || {
                              label: c.category,
                              icon: Activity,
                              color: 'text-stone-700',
                              badgeBg: 'bg-stone-50 text-stone-800 border-stone-200',
                            };
                            const CategoryIcon = cfg.icon;

                            return (
                              <div key={c.id} className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50/50 transition-colors">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${cfg.badgeBg}`}>
                                      <CategoryIcon className="w-3 h-3" />
                                      {cfg.label}
                                    </span>
                                    <strong className="text-xs sm:text-sm text-stone-900 font-bold">
                                      {c.title}
                                    </strong>
                                  </div>
                                  {c.description && (
                                    <p className="text-xs text-stone-600 pl-0.5 leading-relaxed">
                                      {c.description}
                                    </p>
                                  )}
                                  <div className="text-[10px] text-stone-400 flex items-center gap-3">
                                    <span>登記日期：{c.date}</span>
                                    {c.recordedBy && <span>登記人：{c.recordedBy}</span>}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <span className="font-mono font-bold text-xs sm:text-sm text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                    +{c.points} 分
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
