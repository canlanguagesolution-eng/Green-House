import React, { useState } from 'react';
import {
  PenTool,
  Trophy,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  Flame,
  Music,
  Activity,
  HeartHandshake,
  BookOpen,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Target,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import {
  ContributionCategory,
  ContributionRecord,
  Member,
  Badge,
  hasRoleOrHigher,
} from '../types';
import { BadgeIcon } from './BadgeIcon';
import { ContributionForm } from './ContributionForm';
import { TalentFinderView } from './TalentFinderView';
import { compareClassAndNumber } from '../utils/memberSorting';

export const CommitteeView: React.FC = () => {
  const {
    currentUser,
    members,
    contributions,
    badges,
    memberBadges,
    awardBadge,
    deleteContribution,
    triggerCelebration,
  } = useHouse();

  const isTeacherOrMaster = hasRoleOrHigher(currentUser.role, 'teacher');
  const [activeTab, setActiveTab] = useState<'record' | 'talents' | 'history' | 'award_badge' | 'leaderboard'>('record');
  
  // Selected member for recording contribution via Talent Finder
  const [selectedMemberForContribution, setSelectedMemberForContribution] = useState<string>('');

  // Badge awarding modal / state
  const [badgeAwardMemberId, setBadgeAwardMemberId] = useState('');
  const [badgeAwardBadgeId, setBadgeAwardBadgeId] = useState('');
  const [badgeAwardReason, setBadgeAwardReason] = useState('');

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState('all');

  const categoryLabels: Record<ContributionCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    sports: { label: '社際體育', icon: Activity },
    arts: { label: '文藝展演', icon: Music },
    cheering: { label: '啦啦隊助威', icon: Flame },
    service: { label: '義工與社務', icon: HeartHandshake },
    organization: { label: '活動籌備', icon: PenTool },
    academic: { label: '學術常識', icon: BookOpen },
  };

  const filteredContributions = contributions.filter((c) => {
    const matchesSearch =
      c.memberName.includes(historySearch) ||
      c.title.includes(historySearch) ||
      c.description.includes(historySearch) ||
      c.recordedBy.includes(historySearch);
    const matchesCategory = historyCategory === 'all' || c.category === historyCategory;
    return matchesSearch && matchesCategory;
  });

  // Top contributors
  const rankedMembers = [...members]
    .filter((m) => m.role !== 'teacher')
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="space-y-6">
      
      {/* Committee Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-800/80 border border-teal-500 text-teal-200 mb-2">
              {currentUser.role === 'master' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>👑 系統最高管理員 · 學生管理工作台 (權限繼承)</span>
                </>
              ) : currentUser.role === 'teacher' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                  <span>🛡️ 老師指導管理員 · 學生管理工作台 (權限繼承)</span>
                </>
              ) : (
                <>
                  <PenTool className="w-3.5 h-3.5" />
                  <span>敬社學生管理員工作台</span>
                </>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              社員與學生管理員成就貢獻登錄站
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
              {currentUser.role === 'master' ? (
                <>
                  您正以<strong className="text-white">系統最高管理員身份 ({currentUser.name})</strong>指導學生幹事會工作。系統最高管理員享有所有下屬層級之完整權限，可直接代為登記活動貢獻、頒授社際徽章（含顧問老師特批特約徽章）及查核撤銷流水紀錄。
                </>
              ) : currentUser.role === 'teacher' ? (
                <>
                  您正以<strong className="text-white">老師管理員身份 ({currentUser.name} 老師)</strong>督導學生幹事會工作。老師享有學生管理員及普通社員之一切權益，可指導登記活動貢獻、頒授全社徽章（含老師特批專屬徽章）及撤銷不當紀錄。
                </>
              ) : (
                <>
                  辛苦了，<strong className="text-white">{currentUser.name} {currentUser.committeeTitle}</strong>！學生管理員共同負責記錄敬社社員及管理員自身在各項校際、社際活動中的傑出付出與積分，並頒授敬社徽章。
                </>
              )}
            </p>
          </div>

          <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-800 shrink-0">
            <div className="leading-tight">
              <div className="font-bold text-white text-sm">
                {currentUser.name}
                {currentUser.role === 'teacher' && ' 老師'}
                {currentUser.role === 'master' && ' (最高管理員)'}
              </div>
              {currentUser.englishName && (
                <div className="text-xs text-emerald-200 font-sans mt-0.5">{currentUser.englishName}</div>
              )}
              <div className="text-xs text-emerald-300 mt-1">{currentUser.committeeTitle}</div>
              <div className="text-[11px] text-emerald-200/70 font-mono mt-0.5">
                個人累積分: {currentUser.totalPoints} 分
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('record')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'record'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <PenTool className="w-4 h-4 text-emerald-700" />
          登記社員貢獻／成績
        </button>
        <button
          id="tab-committee-talents"
          onClick={() => setActiveTab('talents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'talents'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Target className="w-4 h-4 text-emerald-700" />
          社員特長與賽事獲獎檢索 (人才庫)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-700" />
          全社貢獻流水紀錄 ({contributions.length})
        </button>
        <button
          onClick={() => setActiveTab('award_badge')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'award_badge'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" />
          為社友頒授活動徽章
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          全社貢獻風雲榜
        </button>
      </div>

      {/* TAB 1: RECORD CONTRIBUTION FORM */}
      {activeTab === 'record' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Component */}
          <div className="lg:col-span-2">
            <ContributionForm
              currentUserName={currentUser.name}
              currentUserTitle={currentUser.committeeTitle}
              allowedTargetTypes={['all', 'member', 'committee']}
              defaultTargetType={selectedMemberForContribution ? 'member' : 'all'}
              initialMemberId={selectedMemberForContribution}
              formTitle="登記社員貢獻／成績"
              formSubtitle="可為敬社成員登記社長 (60)、副社長 (50)、社職員 (50)、啦啦隊隊員 (40) 等職位奉獻及各項社際活動賽事名次與積分"
              onSuccess={() => {
                setSelectedMemberForContribution('');
              }}
            />
          </div>

          {/* Quick Guide & Rules Card */}
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 text-stone-800">
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                學生管理員貢獻登錄規範
              </h4>
              <ul className="text-xs space-y-2.5 mt-3 text-emerald-900">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>職位預設奉獻分：</strong>社長 (60分)、副社長 (50分)、社職員 (50分)、啦啦隊隊員 (40分)。點選對應職位即可直接自動帶入標準分數與說明。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>公平客觀：</strong>凡代表敬社出賽、出勤看台或協助社務者，學生管理員均應依社規標準登記。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>賽事項目：</strong>支援五人足球、籃球、辯論比賽、陸運會各組別徑賽/田賽及自訂項目。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>名次核計：</strong>冠軍/第一 (35分)；亞軍/第二 (25分)；季軍/第三 (20分)；殿軍/第四 (15分)。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>自動徽章：</strong>當社員累積達 100 分時，系統將自動解鎖「百分敬意」黃金榮譽勳章。</span>
                </li>
              </ul>
            </div>

            {/* Recent Recorded by this officer */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-3">
                近期全社最新貢獻
              </h4>
              <div className="space-y-2.5">
                {contributions.slice(0, 4).map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                    <div className="flex items-center justify-between font-bold text-stone-800">
                      <span>{c.memberName} ({c.memberClass})</span>
                      <span className="text-emerald-700 font-black">+{c.points}分</span>
                    </div>
                    <div className="text-stone-600 mt-0.5 truncate">{c.title}</div>
                    <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
                      <span>記錄: {c.recordedBy}</span>
                      <span>{c.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TALENTS FINDER */}
      {activeTab === 'talents' && (
        <TalentFinderView
          titlePrefix="學生管理工作台 · "
          onSelectMemberForRecord={(memberId) => {
            setSelectedMemberForContribution(memberId);
            setActiveTab('record');
          }}
        />
      )}

      {/* TAB 2: CONTRIBUTION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="搜尋成員、活動事蹟或記錄幹事..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={historyCategory}
                onChange={(e) => setHistoryCategory(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 font-medium"
              >
                <option value="all">所有活動類別</option>
                <option value="sports">🏃 社際體育</option>
                <option value="arts">🎭 文藝展演</option>
                <option value="cheering">📣 啦啦隊助威</option>
                <option value="service">🤝 義工與社務</option>
                <option value="organization">📋 活動籌備</option>
                <option value="academic">📚 學術問答</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
            {filteredContributions.map((item) => {
              const CategoryIcon = categoryLabels[item.category]?.icon || Activity;
              return (
                <div key={item.id} className="p-4 sm:p-5 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 text-base">
                            {item.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            +{item.points} 貢獻分
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-stone-100 text-stone-600">
                            {categoryLabels[item.category]?.label}
                          </span>
                        </div>

                        <div className="text-xs text-stone-600 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-emerald-800">
                            貢獻成員: {item.memberName} ({item.memberClass})
                          </span>
                          <span>·</span>
                          <span>審定記錄: {item.recordedBy}</span>
                          <span>·</span>
                          <span className="text-stone-400">日期: {item.date}</span>
                        </div>

                        <p className="text-xs text-stone-700 mt-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right flex items-center gap-2 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        已審核確認
                      </span>
                      <button
                        onClick={async () => {
                          if (
                            confirm(
                              `確定要撤銷此筆貢獻紀錄嗎？\n項目：${item.title}\n社員：${item.memberName} (+${item.points}分)\n撤銷後將自動扣除該成員對應之積分。`
                            )
                          ) {
                            await deleteContribution(item.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs flex items-center gap-1 transition-colors"
                        title="撤銷此筆貢獻紀錄"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] hidden sm:inline">撤銷</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AWARD BADGES TO MEMBERS */}
      {activeTab === 'award_badge' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              幹事會活動徽章提名與頒發
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              社友在社際運動會、啦啦隊助威、文藝比賽表現優異時，幹事會可直接為其頒授對應徽章
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">受獎社員 *</label>
                <select
                  value={badgeAwardMemberId}
                  onChange={(e) => setBadgeAwardMemberId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">-- 選擇敬社成員（依班別與班號順序）--</option>
                  {[...members].sort(compareClassAndNumber).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.class} {m.classNumber ? `(${m.classNumber}號)` : ''} · {m.name} - {m.committeeTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">頒發徽章 *</label>
                <select
                  value={badgeAwardBadgeId}
                  onChange={(e) => setBadgeAwardBadgeId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">-- 選擇頒發徽章 --</option>
                  {badges
                    .filter((b) => isTeacherOrMaster || !b.isSpecialTeacherOnly)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (+{b.pointsReward}分) {b.isSpecialTeacherOnly ? '★ 老師特批' : ''} - {b.description}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">頒授理由 *</label>
                <input
                  type="text"
                  placeholder="例: 社際水運會榮獲50米蝶泳銀牌"
                  value={badgeAwardReason}
                  onChange={(e) => setBadgeAwardReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  if (!badgeAwardMemberId || !badgeAwardBadgeId || !badgeAwardReason) {
                    alert('請填寫完整頒發資訊');
                    return;
                  }
                  const signerName =
                    currentUser.role === 'master'
                      ? `${currentUser.name} (系統最高管理員)`
                      : currentUser.role === 'teacher'
                      ? `${currentUser.name} 老師 (老師管理員)`
                      : `${currentUser.name} (${currentUser.committeeTitle})`;
                  awardBadge(
                    badgeAwardMemberId,
                    badgeAwardBadgeId,
                    badgeAwardReason,
                    signerName
                  );
                  setBadgeAwardReason('');
                  alert('徽章已成功頒發！');
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                確認頒發徽章
              </button>
            </div>
          </div>

          {/* Quick Badges Gallery for reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges
              .filter((b) => isTeacherOrMaster || !b.isSpecialTeacherOnly)
              .map((badge) => (
                <div
                  key={badge.id}
                  className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex items-start gap-3"
                >
                  <BadgeIcon
                    iconName={badge.iconName}
                    tier={badge.tier}
                    size="md"
                    isUnlocked={true}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-stone-900">{badge.name}</h4>
                      <span className="text-[10px] font-bold text-emerald-700">+{badge.pointsReward}分</span>
                      {badge.isSpecialTeacherOnly && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          ★ 顧問老師特批
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">{badge.description}</p>
                    <div className="text-[11px] text-stone-400 mt-2">條件: {badge.requirement}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-stone-900">
                敬社全社貢獻榮譽排行榜
              </h3>
              <p className="text-xs text-stone-500">
                見證為綠社付出最多心血與汗水的優秀敬人
              </p>
            </div>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Trophy className="w-6 h-6" />
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {rankedMembers.map((member, idx) => {
              const badgesCount = memberBadges.filter((b) => b.memberId === member.id).length;
              const isTop3 = idx < 3;
              return (
                <div
                  key={member.id}
                  className={`py-3.5 px-3 flex items-center justify-between rounded-xl transition-colors ${
                    isTop3 ? 'bg-amber-50/40 font-semibold' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="leading-tight">
                      <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        {member.name}
                        <span className="text-xs font-normal text-stone-500 font-mono">
                          {member.class}
                        </span>
                        {member.role === 'committee' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                            ★ {member.committeeTitle}
                          </span>
                        )}
                      </div>
                      {member.englishName && (
                        <div className="text-xs text-stone-400 font-sans mt-0.5">
                          {member.englishName}
                        </div>
                      )}
                      <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                        學號: {member.studentId || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {badgesCount} 枚徽章
                      </span>
                    </div>

                    <div>
                      <span className="text-base font-black text-emerald-800">
                        {member.totalPoints}
                      </span>
                      <span className="text-xs text-stone-500 ml-1">分</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
