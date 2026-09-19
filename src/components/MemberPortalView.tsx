import React, { useState } from 'react';
import {
  Shield,
  Award,
  Activity,
  Gift,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingUp,
  User,
  Star,
  QrCode,
  Flame,
  Music,
  HeartHandshake,
  BookOpen,
  PenTool,
  Users,
  Search,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { BadgeIcon } from './BadgeIcon';
import { ContributionCategory, hasRoleOrHigher } from '../types';

export const MemberPortalView: React.FC = () => {
  const {
    currentUser,
    members,
    badges,
    getMemberBadges,
    getMemberRewards,
    getMemberContributions,
    showBadgeLibrary,
  } = useHouse();

  const isHigherAccount = currentUser ? hasRoleOrHigher(currentUser.role, 'committee') : false;
  const defaultMember = members[0] || {
    id: 'guest',
    studentId: 'GUEST',
    name: '敬社社員',
    englishName: 'GHouse Member',
    class: '-',
    role: 'member' as const,
    committeeTitle: '社員',
    sportsPoints: 0,
    nonSportsPoints: 0,
    totalPoints: 0,
    isStaff: false,
    isActive: true,
  };
  const [viewingMemberId, setViewingMemberId] = useState<string>(currentUser?.id || defaultMember.id);
  const viewingMember = members.find((m) => m.id === viewingMemberId) || currentUser || defaultMember;
  const isViewingSelf = currentUser ? viewingMember.id === currentUser.id : false;

  const [activeTab, setActiveTab] = useState<'contributions' | 'rewards' | 'badges'>('contributions');
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<any | null>(null);

  const myBadges = getMemberBadges(viewingMember.id);
  const myRewards = getMemberRewards(viewingMember.id);
  const myContributions = getMemberContributions(viewingMember.id);

  const myBadgeIds = myBadges.map((b) => b.badgeId);

  const categoryIcons: Record<ContributionCategory, React.ComponentType<{ className?: string }>> = {
    sports: Activity,
    arts: Music,
    cheering: Flame,
    service: HeartHandshake,
    organization: PenTool,
    academic: BookOpen,
  };

  return (
    <div className="space-y-6">

      {/* HIGHER-LEVEL ACCOUNT ACCESS BAR (Inherited Member View Right) */}
      {isHigherAccount && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>
                  {currentUser.role === 'master'
                    ? '👑 系統管理員：全級社員權限繼承'
                    : currentUser.role === 'teacher'
                    ? '🛡️ 老師管理員：社員權限繼承'
                    : '✍️ 學生管理員：社員權限與同儕查閱'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-semibold">
                  跨級查閱已啟用
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5">
                依敬社權限繼承規則，高級別帳號享有一切低級別帳號之權益，可隨時檢閱任一社員的數位通行證、成長里程碑及獲獎檔案。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative w-full md:w-64">
              <select
                id="member-portal-target-selector"
                value={viewingMemberId}
                onChange={(e) => setViewingMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-stone-800 shadow-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
              >
                <optgroup label="當前登入者本人">
                  <option value={currentUser.id}>
                    👤 本人：{currentUser.name} ({currentUser.committeeTitle})
                  </option>
                </optgroup>
                <optgroup label="查核敬社其他成員檔案">
                  {members
                    .filter((m) => m.id !== currentUser.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.class}) · {m.committeeTitle} [{m.totalPoints}分]
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {!isViewingSelf && (
              <button
                onClick={() => setViewingMemberId(currentUser.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors shrink-0"
              >
                返回我的檔案
              </button>
            )}
          </div>
        </div>
      )}

      {/* When inspecting another member, show notice */}
      {!isViewingSelf && currentUser && (
        <div className="bg-amber-50 border border-amber-200/80 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-medium">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              您正以【<strong>{currentUser.committeeTitle}</strong>】特權查核【<strong>{viewingMember.name} ({viewingMember.class})</strong>】之社員通行證及個人成就。
            </span>
          </div>
          <span className="text-[11px] text-amber-800">
            學號: {viewingMember.studentId || '-'}
          </span>
        </div>
      )}

      {!currentUser && (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-950 font-medium">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              您目前為訪客預覽模式，正查核【<strong>{viewingMember.name} ({viewingMember.class})</strong>】的公開榮譽記錄。
            </span>
          </div>
          {members.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-800">切換查看成員:</span>
              <select
                value={viewingMemberId}
                onChange={(e) => setViewingMemberId(e.target.value)}
                className="px-2 py-1 rounded bg-white border border-emerald-300 text-xs text-stone-800 font-bold"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.class} {m.classNumber ? `#${m.classNumber}` : ''} {m.name} ({m.totalPoints}分)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      
      {/* DIGITAL HOUSE MEMBERSHIP PASS (Green card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-950 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/25 border border-emerald-500/40">
        {/* Subtle decorative watermarks */}
        <div className="absolute right-0 -bottom-10 opacity-10 pointer-events-none">
          <Shield className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          {/* Member Profile info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 shadow-md shrink-0 text-amber-300 font-bold text-xl sm:text-2xl">
              {viewingMember.name ? viewingMember.name.slice(0, 1) : '敬'}
            </div>

            <div className="leading-tight">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {viewingMember.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/70 border border-emerald-500/50 text-emerald-200">
                    {viewingMember.committeeTitle && viewingMember.committeeTitle !== '普通社員' && viewingMember.committeeTitle !== 'none'
                      ? viewingMember.committeeTitle
                      : '社員'}
                  </span>
                </div>
                {viewingMember.englishName && (
                  <div className="text-emerald-200 font-medium text-sm sm:text-base font-sans mt-0.5">
                    {viewingMember.englishName}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-emerald-100/90 mt-2 flex-wrap">
                <span className="font-mono bg-emerald-900/60 px-2 py-0.5 rounded">
                  班別: {viewingMember.class}
                </span>
                <span className="font-mono bg-emerald-900/60 px-2 py-0.5 rounded">
                  學號: {viewingMember.studentId || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Points & Badge Counter */}
          <div className="flex items-center gap-3 bg-emerald-950/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-600/40 shrink-0">
            <div className={`text-center px-3 ${showBadgeLibrary ? 'border-r border-emerald-800' : ''}`}>
              <div className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold">
                敬社累積貢獻分
              </div>
              <div className="text-3xl font-black text-amber-300 mt-0.5">
                {viewingMember.totalPoints}{' '}
                <span className="text-xs text-emerald-200 font-normal">分</span>
              </div>
            </div>

            {showBadgeLibrary && (
              <div className="text-center px-3">
                <div className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold">
                  解鎖勳章
                </div>
                <div className="text-3xl font-black text-white mt-0.5">
                  {myBadges.length}{' '}
                  <span className="text-xs text-emerald-200 font-normal">枚</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('contributions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'contributions'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-700" />
          {isViewingSelf ? '我的貢獻與成長歷程' : `${viewingMember.name} 的貢獻紀錄`} ({myContributions.length})
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'rewards'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-600" />
          {isViewingSelf ? '評語' : `${viewingMember.name} 的評語`} ({myRewards.length})
        </button>

        {(showBadgeLibrary || isHigherAccount) && (
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'badges'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-700" />
            {isViewingSelf ? '我的徽章' : `${viewingMember.name} 的徽章`} ({myBadges.length}/{badges.length})
          </button>
        )}
      </div>

      {/* TAB 1: MY CONTRIBUTIONS */}
      {activeTab === 'contributions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                {isViewingSelf ? '個人社務與競賽成就時間軸' : `${viewingMember.name} 的社務與競賽成就時間軸`}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {isViewingSelf
                  ? '社職為您登記的陸運會、啦啦隊、及其他社際活動貢獻紀錄'
                  : `此社員在敬社登錄的陸運會、啦啦隊、及各項活動貢獻詳情`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400">累積活動次數</span>
              <div className="font-extrabold text-emerald-800 text-base">
                {myContributions.length} 次
              </div>
            </div>
          </div>

          {myContributions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500">
              <Activity className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-bold text-stone-700">目前尚無已登記的貢獻紀錄</p>
              <p className="text-xs text-stone-400 mt-1">
                積極參與社際陸運會、水運會、歌唱比賽或看台助威，幹事會將為您登記榮譽點數！
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
              {myContributions.map((item) => {
                const IconComponent = categoryIcons[item.category] || Activity;
                return (
                  <div key={item.id} className="p-4 sm:p-5 hover:bg-stone-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-stone-900 text-base">
                              {item.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              +{item.points} 貢獻分
                            </span>
                          </div>

                          <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                            <span>記錄人: {item.recordedBy}</span>
                            <span>·</span>
                            <span>日期: {item.date}</span>
                          </div>

                          <p className="text-xs text-stone-700 mt-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          幹事會認證
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY REWARDS / 評語 */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                評語
              </h3>
            </div>
          </div>

          {myRewards.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500">
              <Gift className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-bold text-stone-700">目前尚無評語紀錄</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-gradient-to-br from-amber-50/50 via-white to-stone-50 rounded-3xl border border-amber-200 p-5 shadow-sm space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-400 text-amber-950 font-bold shadow-sm">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-stone-900">
                          {reward.title}
                        </h4>
                        <div className="text-xs text-stone-500">
                          頒發人: {reward.awardedBy} · {reward.date}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                      +{reward.points} 分
                    </span>
                  </div>

                  <div className="bg-white/80 p-3 rounded-2xl border border-amber-100 text-xs text-stone-700 leading-relaxed italic">
                    「{reward.comment}」
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY BADGES WALL */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                個人榮譽徽章殿堂
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                已解鎖的敬社勳章（亮起）與即將達成的目標勳章（灰色，點擊查看條件）
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              達成率: {Math.round((myBadges.length / badges.length) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => {
              const awardedRecord = myBadges.find((b) => b.badgeId === badge.id);
              const isUnlocked = !!awardedRecord;

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadgeDetail({ badge, awardedRecord })}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isUnlocked
                      ? 'bg-white border-emerald-300 hover:border-emerald-500 shadow-md ring-1 ring-emerald-400/20'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <BadgeIcon
                        iconName={badge.iconName}
                        tier={badge.tier}
                        size="md"
                        isUnlocked={isUnlocked}
                      />

                      <div className="text-right">
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            已解鎖
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                            <Lock className="w-3 h-3 text-stone-400" />
                            未解鎖
                          </span>
                        )}
                        <div className="text-[11px] text-emerald-700 font-bold mt-1">
                          +{badge.pointsReward} 貢獻分
                        </div>
                      </div>
                    </div>

                    <h4
                      className={`font-bold text-base ${
                        isUnlocked ? 'text-stone-900' : 'text-stone-600'
                      }`}
                    >
                      {badge.name}
                    </h4>

                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 text-xs">
                    {isUnlocked ? (
                      <div className="text-emerald-800 font-medium flex items-center justify-between text-[11px]">
                        <span>獲獎理由: {awardedRecord?.reason}</span>
                        <span className="font-mono text-stone-400">{awardedRecord?.awardedAt}</span>
                      </div>
                    ) : (
                      <div className="text-stone-500 text-[11px]">
                        解鎖條件: <span className="font-semibold text-stone-700">{badge.requirement}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BADGE DETAIL POPUP */}
      {selectedBadgeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-stone-800">
            <div className="text-center pb-4 border-b border-stone-100">
              <div className="flex justify-center mb-3">
                <BadgeIcon
                  iconName={selectedBadgeDetail.badge.iconName}
                  tier={selectedBadgeDetail.badge.tier}
                  size="xl"
                  isUnlocked={!!selectedBadgeDetail.awardedRecord}
                />
              </div>

              <h3 className="text-xl font-bold text-stone-900">
                {selectedBadgeDetail.badge.name}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {selectedBadgeDetail.badge.description}
              </p>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-2xl space-y-1">
                <div className="font-bold text-stone-700">解鎖條件說明：</div>
                <div className="text-stone-600">{selectedBadgeDetail.badge.requirement}</div>
              </div>

              {selectedBadgeDetail.awardedRecord ? (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    您已獲得此勳章！
                  </div>
                  <div>授勳事蹟: {selectedBadgeDetail.awardedRecord.reason}</div>
                  <div>頒授方: {selectedBadgeDetail.awardedRecord.awardedBy}</div>
                  <div className="text-emerald-700 text-[11px]">
                    獲獎日期: {selectedBadgeDetail.awardedRecord.awardedAt}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Lock className="w-4 h-4 text-amber-600" />
                    此勳章尚未解鎖
                  </div>
                  <p className="text-amber-900/90 text-xs">
                    完成對應條件後，敬社顧問老師或幹事會將即時為您頒授！
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBadgeDetail(null)}
                className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
