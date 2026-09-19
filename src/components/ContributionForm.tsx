import React, { useState } from 'react';
import {
  Activity,
  PenTool,
  CheckCircle2,
  Calendar,
  Users,
  Plus,
  Trophy,
  Award,
  Sparkles,
  Crown,
  Briefcase,
  Megaphone,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { ContributionCategory, Member } from '../types';
import { compareClassAndNumber } from '../utils/memberSorting';

export interface ContributionFormProps {
  currentUserName: string;
  currentUserTitle: string;
  allowedTargetTypes?: ('all' | 'member' | 'committee')[];
  defaultTargetType?: 'all' | 'member' | 'committee';
  initialMemberId?: string;
  onSuccess?: () => void;
  formTitle?: string;
  formSubtitle?: string;
}

export interface PositionDutyPreset {
  id: string;
  name: string;
  category: ContributionCategory;
  defaultPoints: number;
  badge: string;
  iconType: 'Crown' | 'Award' | 'Briefcase' | 'Megaphone';
  roleHint: string;
  defaultDesc: string;
}

// System prescribed positions and their default points
export const POSITION_DUTY_PRESETS: PositionDutyPreset[] = [
  {
    id: 'pos_president',
    name: '社長',
    category: 'organization',
    defaultPoints: 60,
    badge: '60 分',
    iconType: 'Crown',
    roleHint: '全社社務統領、重大社際活動策劃與幹事會領導',
    defaultDesc: '擔任敬社社長，全年度統領社務規劃、策劃各項大型社際賽事及統率幹事會運作，特此登記年度社職奉獻積分 60 分。',
  },
  {
    id: 'pos_vice_president',
    name: '副社長',
    category: 'organization',
    defaultPoints: 50,
    badge: '50 分',
    iconType: 'Award',
    roleHint: '輔佐社長推進社務、統籌各組賽事組織與幹事聯絡',
    defaultDesc: '擔任敬社副社長，輔佐社長統籌各組社際賽事組織、推進社務聯絡與活動執行，特此登記年度社職奉獻積分 50 分。',
  },
  {
    id: 'pos_committee_officer',
    name: '社職員',
    category: 'organization',
    defaultPoints: 50,
    badge: '50 分',
    iconType: 'Briefcase',
    roleHint: '投入全年度社務推動、活動籌辦宣傳與各項後勤工作',
    defaultDesc: '擔任敬社社職員（幹事），熱心投入各項社務推動、活動籌辦宣傳與後勤統籌工作，特此登記年度社職奉獻積分 50 分。',
  },
  {
    id: 'pos_cheerleader',
    name: '啦啦隊隊員',
    category: 'cheering',
    defaultPoints: 40,
    badge: '40 分',
    iconType: 'Megaphone',
    roleHint: '出席排練、於各項賽事現場全力助威吶喊提振士氣',
    defaultDesc: '擔任敬社啦啦隊隊員，積極出席團隊排練，於陸運會及各項社際賽事現場全力助威吶喊、提振敬社士氣，特此登記積分 40 分。',
  },
];

// Default standard event choices
export const DEFAULT_ACTIVITY_PRESETS = [
  { id: 'football5', name: '社際五人足球', defaultCategory: 'sports' as ContributionCategory, defaultPoints: 25 },
  { id: 'basketball', name: '社際籃球', defaultCategory: 'sports' as ContributionCategory, defaultPoints: 25 },
  { id: 'debate', name: '社際辯論比賽', defaultCategory: 'academic' as ContributionCategory, defaultPoints: 30 },
  { id: 'sports_day', name: '陸運會', defaultCategory: 'sports' as ContributionCategory, defaultPoints: 30 },
];

export const SPORTS_DAY_EVENTS = [
  '100米短跑',
  '200米',
  '400米',
  '800米',
  '1500米',
  '3千米',
  '100米跨欄',
  '百一米跨欄',
  '跳遠',
  '跳高',
  '三級跳',
  '推鉛球',
  '標槍',
  '4×100米接力',
  '4×400米接力',
  '社際4×100米接力',
];

export const RANK_OPTIONS = [
  { value: '第一', label: '冠軍 / 第一名', defaultPointsBonus: 30 },
  { value: '第二', label: '亞軍 / 第二名', defaultPointsBonus: 20 },
  { value: '第三', label: '季軍 / 第三名', defaultPointsBonus: 15 },
  { value: '第四', label: '殿軍 / 第四名', defaultPointsBonus: 10 },
  { value: '出賽/參與', label: '出賽代表 / 參與貢獻', defaultPointsBonus: 0 },
];

export const ContributionForm: React.FC<ContributionFormProps> = ({
  currentUserName,
  currentUserTitle,
  allowedTargetTypes = ['all', 'member', 'committee'],
  defaultTargetType = 'all',
  initialMemberId = '',
  onSuccess,
  formTitle = '登記社員貢獻／成績',
  formSubtitle = '可為敬社成員登記社長、副社長、社職員、啦啦隊隊員職位奉獻，以及各項社際賽事名次與積分',
}) => {
  const { members, addContribution, triggerCelebration } = useHouse();

  // Target member state (supports 'all', 'member', 'committee')
  const [targetType, setTargetType] = useState<'all' | 'member' | 'committee'>(defaultTargetType);
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId);

  // Sync initialMemberId if it changes
  React.useEffect(() => {
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
    }
  }, [initialMemberId]);

  // Activity mode: preset or custom or position
  const [activityMode, setActivityMode] = useState<string>('pos_president'); // Default to president or sports
  const [customActivityName, setCustomActivityName] = useState('');

  // Sports Day specific sub-options
  const [sportsGender, setSportsGender] = useState<'男子' | '女子'>('男子');
  const [sportsGrade, setSportsGrade] = useState<'甲組' | '乙組' | '丙組'>('甲組');
  const [sportsItem, setSportsItem] = useState<string>(SPORTS_DAY_EVENTS[0]);

  // Rank / Result (第一、第二、第三、第四、出賽/參與)
  const [rankResult, setRankResult] = useState<string>('第一');

  // Custom user items added during session
  const [userCreatedActivities, setUserCreatedActivities] = useState<
    Array<{ id: string; name: string; category: ContributionCategory; defaultPoints: number }>
  >([]);
  const [showAddPresetInput, setShowAddPresetInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<ContributionCategory>('sports');

  // Category, Points, Date, Description
  const [category, setCategory] = useState<ContributionCategory>('organization');
  const [points, setPoints] = useState<number>(60);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(
    POSITION_DUTY_PRESETS[0].defaultDesc
  );
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(false);

  // Available target members - strictly ordered by class and class number
  const eligibleMembers = [...members.filter((m) => {
    if (targetType === 'committee') return m.role === 'committee';
    if (targetType === 'member') return m.role === 'member';
    return true; // 'all'
  })].sort(compareClassAndNumber);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Check if current activity mode is a position duty preset
  const activePositionPreset = POSITION_DUTY_PRESETS.find((p) => p.id === activityMode);

  // Calculate or suggest title
  const getActivityDisplayName = (): string => {
    if (activePositionPreset) {
      return activePositionPreset.id === 'pos_cheerleader'
        ? `活動服務：${activePositionPreset.name} (預設 ${activePositionPreset.defaultPoints} 分)`
        : `社職服務：${activePositionPreset.name} (預設 ${activePositionPreset.defaultPoints} 分)`;
    }
    if (activityMode === 'sports_day') {
      return `社際陸運會：${sportsGender}${sportsGrade} ${sportsItem} - ${rankResult}`;
    }
    if (activityMode === 'custom') {
      return customActivityName ? `${customActivityName} - ${rankResult}` : `自訂社際活動 - ${rankResult}`;
    }
    const foundUser = userCreatedActivities.find((a) => a.id === activityMode);
    if (foundUser) {
      return `${foundUser.name} - ${rankResult}`;
    }
    const foundPreset = DEFAULT_ACTIVITY_PRESETS.find((p) => p.id === activityMode);
    return foundPreset ? `${foundPreset.name} - ${rankResult}` : `社際活動 - ${rankResult}`;
  };

  // Add new activity preset
  const handleAddNewActivity = () => {
    if (!newPresetName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newAct = {
      id: newId,
      name: newPresetName.trim(),
      category: newPresetCategory,
      defaultPoints: 20,
    };
    setUserCreatedActivities((prev) => [...prev, newAct]);
    setActivityMode(newId);
    setCategory(newPresetCategory);
    setNewPresetName('');
    setShowAddPresetInput(false);
  };

  // Update default points based on rank, activity or position
  const handleActivityChange = (modeVal: string) => {
    setActivityMode(modeVal);
    const posPreset = POSITION_DUTY_PRESETS.find((p) => p.id === modeVal);
    if (posPreset) {
      setCategory(posPreset.category);
      setPoints(posPreset.defaultPoints);
      setDescription(posPreset.defaultDesc);
      return;
    }

    if (modeVal === 'sports_day') {
      setCategory('sports');
      setPoints(35);
      setDescription('');
    } else if (modeVal === 'football5' || modeVal === 'basketball') {
      setCategory('sports');
      setPoints(25);
      setDescription('');
    } else if (modeVal === 'debate') {
      setCategory('academic');
      setPoints(30);
      setDescription('');
    } else {
      const found = userCreatedActivities.find((a) => a.id === modeVal);
      if (found) {
        setCategory(found.category);
        setPoints(found.defaultPoints);
        setDescription('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert('請選擇敬社成員名單');
      return;
    }

    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;

    let finalTitle = '';
    if (activePositionPreset) {
      finalTitle =
        activePositionPreset.id === 'pos_cheerleader'
          ? `活動服務：${activePositionPreset.name}`
          : `社職服務：${activePositionPreset.name}`;
    } else if (activityMode === 'sports_day') {
      finalTitle = `社際陸運會：${sportsGender}${sportsGrade} ${sportsItem}（${rankResult}）`;
    } else if (activityMode === 'custom') {
      if (!customActivityName.trim()) {
        alert('請輸入自訂活動項目名稱');
        return;
      }
      finalTitle = `${customActivityName.trim()}（${rankResult}）`;
    } else {
      const userAct = userCreatedActivities.find((a) => a.id === activityMode);
      if (userAct) {
        finalTitle = `${userAct.name}（${rankResult}）`;
      } else {
        const preset = DEFAULT_ACTIVITY_PRESETS.find((p) => p.id === activityMode);
        finalTitle = `${preset?.name || '社際項目'}（${rankResult}）`;
      }
    }

    const defaultDetail = activePositionPreset
      ? activePositionPreset.defaultDesc
      : `於「${finalTitle}」表現優異，榮獲${rankResult}，特此登錄敬社積分。`;

    const detailDesc = description.trim() ? description.trim() : defaultDetail;

    addContribution({
      memberId: member.id,
      memberName: member.name,
      memberClass: member.class,
      title: finalTitle,
      category,
      points: Number(points),
      date,
      recordedBy: `${currentUserName} (${currentUserTitle})`,
      recordedByRole: currentUserTitle,
      description: detailDesc,
      status: 'verified',
    });

    triggerCelebration();
    setSubmitSuccessMsg(true);
    if (!activePositionPreset) {
      setDescription('');
    }
    if (activityMode === 'custom') {
      setCustomActivityName('');
    }

    setTimeout(() => {
      setSubmitSuccessMsg(false);
      if (onSuccess) onSuccess();
    }, 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 mb-6 gap-2">
        <div>
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-700" />
            <span>{formTitle}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">{formSubtitle}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-center">
          登記主管: {currentUserName} [{currentUserTitle}]
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Target Type Selection */}
        {allowedTargetTypes.length > 1 && (
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              名冊篩選類別：
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="btn-target-all"
                onClick={() => {
                  setTargetType('all');
                  setSelectedMemberId('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  targetType === 'all'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                全體名冊 ({members.length})
              </button>
              <button
                type="button"
                id="btn-target-member"
                onClick={() => {
                  setTargetType('member');
                  setSelectedMemberId('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  targetType === 'member'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                敬社社員 ({members.filter((m) => m.role === 'member').length})
              </button>
              <button
                type="button"
                id="btn-target-committee"
                onClick={() => {
                  setTargetType('committee');
                  setSelectedMemberId('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  targetType === 'committee'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                幹事／管理員 ({members.filter((m) => m.role === 'committee').length})
              </button>
            </div>
          </div>
        )}

        {/* 2. Select Member */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            選擇對應成員 *
          </label>
          <select
            id="select-contribution-member"
            required
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          >
            <option value="">-- 請選擇敬社成員（依班別及班號順序排列，共 {eligibleMembers.length} 位）--</option>
            {eligibleMembers.map((m) => {
              const classTag = m.classNumber ? `${m.class} (${m.classNumber}號)` : m.class;
              const studentIdTag = m.studentId && m.studentId !== '-' ? ` [學號:${m.studentId}]` : '';
              return (
                <option key={m.id} value={m.id}>
                  {classTag} · {m.name} {m.englishName && m.englishName !== '-' ? `(${m.englishName})` : ''}{studentIdTag} [{m.committeeTitle}]
                </option>
              );
            })}
          </select>

          {/* Smart suggestion if selected member has a recognized position */}
          {selectedMember && (
            <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950">
                  {selectedMember.name}（{selectedMember.class}）
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                  現任職位：{selectedMember.committeeTitle}
                </span>
              </div>
              {POSITION_DUTY_PRESETS.some(
                (p) =>
                  selectedMember.committeeTitle?.includes(p.name) ||
                  (p.id === 'pos_committee_officer' && (selectedMember.committeeTitle?.includes('幹事') || selectedMember.committeeTitle?.includes('職員'))) ||
                  (p.id === 'pos_cheerleader' && selectedMember.committeeTitle?.includes('啦啦隊'))
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    const matched = POSITION_DUTY_PRESETS.find(
                      (p) =>
                        selectedMember.committeeTitle?.includes(p.name) ||
                        (p.id === 'pos_committee_officer' && (selectedMember.committeeTitle?.includes('幹事') || selectedMember.committeeTitle?.includes('職員'))) ||
                        (p.id === 'pos_cheerleader' && selectedMember.committeeTitle?.includes('啦啦隊'))
                    );
                    if (matched) handleActivityChange(matched.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] cursor-pointer transition-all shadow-xs"
                >
                  ⚡ 套用該職位預設分
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Activity & Position Selection */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
          {/* 3A. Position Presets: 社長 (60), 副社長 (50), 社職員 (50), 啦啦隊隊員 (40) */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>社職及隊員職務貢獻（點選直接套用預設分數）：</span>
              </label>
              <span className="text-[10px] text-stone-500 font-semibold">
                社長 60分 • 副社長 50分 • 社職員 50分 • 啦啦隊 40分
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {POSITION_DUTY_PRESETS.map((pos) => {
                const isSelected = activityMode === pos.id;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    id={`position-${pos.id}`}
                    onClick={() => handleActivityChange(pos.id)}
                    className={`p-3 rounded-2xl text-left transition-all border cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-white text-stone-800 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pos.iconType === 'Crown' && <Crown className="w-3.5 h-3.5" />}
                          {pos.iconType === 'Award' && <Award className="w-3.5 h-3.5" />}
                          {pos.iconType === 'Briefcase' && <Briefcase className="w-3.5 h-3.5" />}
                          {pos.iconType === 'Megaphone' && <Megaphone className="w-3.5 h-3.5" />}
                        </div>
                        <div className="font-extrabold text-xs tracking-tight">{pos.name}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-black shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 shadow-xs'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {pos.defaultPoints} 分
                      </span>
                    </div>
                    <p
                      className={`text-[10px] leading-tight line-clamp-2 ${
                        isSelected ? 'text-emerald-100' : 'text-stone-500'
                      }`}
                    >
                      {pos.roleHint}
                    </p>
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-stone-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3B. Competition & Activity Presets */}
          <div className="space-y-2.5 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-700" />
                <span>社際常規賽事與活動項目（可選名次與規格）：</span>
              </label>
              <button
                type="button"
                id="btn-show-add-preset"
                onClick={() => setShowAddPresetInput(!showAddPresetInput)}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddPresetInput ? '取消新增' : '新增自訂項目'}
              </button>
            </div>

            {/* Quick Add Custom Activity Preset input */}
            {showAddPresetInput && (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-sm flex flex-col sm:flex-row gap-2 items-center animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="輸入新活動名稱（例如：社際羽毛球、社際常識問答）"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <select
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value as ContributionCategory)}
                  className="w-full sm:w-auto px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                >
                  <option value="sports">體育賽事</option>
                  <option value="academic">學術常識</option>
                  <option value="arts">文藝競賽</option>
                  <option value="cheering">啦啦助威</option>
                  <option value="service">義工服務</option>
                  <option value="organization">活動籌備</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddNewActivity}
                  className="w-full sm:w-auto px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                >
                  保存項目
                </button>
              </div>
            )}

            {/* Activity Radio/Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFAULT_ACTIVITY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  id={`activity-${preset.id}`}
                  onClick={() => handleActivityChange(preset.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                    activityMode === preset.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400'
                  }`}
                >
                  <span>{preset.name}</span>
                  {activityMode === preset.id && <Sparkles className="w-3.5 h-3.5 text-emerald-200" />}
                </button>
              ))}

              {userCreatedActivities.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  id={`activity-${act.id}`}
                  onClick={() => handleActivityChange(act.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                    activityMode === act.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400'
                  }`}
                >
                  <span>{act.name}</span>
                  {activityMode === act.id && <Sparkles className="w-3.5 h-3.5 text-emerald-200" />}
                </button>
              ))}

              <button
                type="button"
                id="activity-custom"
                onClick={() => handleActivityChange('custom')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                  activityMode === 'custom'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400'
                }`}
              >
                <span>+ 其他自訂項目</span>
                {activityMode === 'custom' && <Sparkles className="w-3.5 h-3.5 text-emerald-200" />}
              </button>
            </div>

            {/* If custom is selected, show input */}
            {activityMode === 'custom' && (
              <div className="pt-1 animate-in fade-in duration-150">
                <input
                  type="text"
                  id="input-custom-activity"
                  placeholder="輸入其他活動項目完整名稱（例如：社際水運會、社刊設計比賽、社歌對賽）"
                  value={customActivityName}
                  onChange={(e) => setCustomActivityName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. SPORTS DAY SPECIFIC SUB-DROPDOWNS (條件展示: 選擇「陸運會」時) */}
        {activityMode === 'sports_day' && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-950">
              <Activity className="w-4 h-4 text-amber-700" />
              <span>社際陸運會專屬項目規格設定：</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 男子 / 女子 */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  組別性別
                </label>
                <select
                  id="select-sports-gender"
                  value={sportsGender}
                  onChange={(e) => setSportsGender(e.target.value as '男子' | '女子')}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                >
                  <option value="男子">男子組</option>
                  <option value="女子">女子組</option>
                </select>
              </div>

              {/* 甲組 / 乙組 / 丙組 */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  年齡年級組別
                </label>
                <select
                  id="select-sports-grade"
                  value={sportsGrade}
                  onChange={(e) => setSportsGrade(e.target.value as '甲組' | '乙組' | '丙組')}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                >
                  <option value="甲組">甲組 (Grade A - 中五至中六)</option>
                  <option value="乙組">乙組 (Grade B - 中三至中四)</option>
                  <option value="丙組">丙組 (Grade C - 中一至中二)</option>
                </select>
              </div>

              {/* 田徑田賽項目 */}
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  田徑 / 田賽項目
                </label>
                <select
                  id="select-sports-item"
                  value={sportsItem}
                  onChange={(e) => setSportsItem(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                >
                  {SPORTS_DAY_EVENTS.map((event) => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 5. RANK / RESULT OR POSITION SERVICE STATUS */}
        {activePositionPreset ? (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0 shadow-xs">
                {activePositionPreset.iconType === 'Crown' && <Crown className="w-5 h-5 text-amber-700" />}
                {activePositionPreset.iconType === 'Award' && <Award className="w-5 h-5 text-amber-700" />}
                {activePositionPreset.iconType === 'Briefcase' && <Briefcase className="w-5 h-5 text-amber-700" />}
                {activePositionPreset.iconType === 'Megaphone' && <Megaphone className="w-5 h-5 text-amber-700" />}
              </div>
              <div>
                <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                  <span>已選定社職／隊員服務：【{activePositionPreset.name}】</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 text-[10px] font-extrabold">
                    預設 {activePositionPreset.defaultPoints} 分
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/85 mt-0.5">
                  系統已自動帶入預設分數 <strong>+{activePositionPreset.defaultPoints} 分</strong>。此項目屬於正式社職／服務奉獻認證，毋須填寫比賽名次。
                </p>
              </div>
            </div>
            <div className="shrink-0 self-end sm:self-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                已套用預設 +{activePositionPreset.defaultPoints} 分
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              獲得名次 / 成績表現 (Rank / Result) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RANK_OPTIONS.slice(0, 4).map((rank) => (
                <button
                  key={rank.value}
                  type="button"
                  id={`rank-${rank.value}`}
                  onClick={() => {
                    setRankResult(rank.value);
                    if (rank.value === '第一') setPoints(35);
                    else if (rank.value === '第二') setPoints(25);
                    else if (rank.value === '第三') setPoints(20);
                    else if (rank.value === '第四') setPoints(15);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    rankResult === rank.value
                      ? 'bg-amber-500 text-amber-950 border-amber-500 shadow-md ring-2 ring-amber-300'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-sm font-extrabold">{rank.value}</div>
                  <div className="text-[10px] font-normal opacity-80">{rank.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. POINTS, CATEGORY & DATE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              活動類別
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContributionCategory)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="sports">🏃 社際體育 (Sports)</option>
              <option value="arts">🎭 文藝展演 (Arts)</option>
              <option value="cheering">📣 啦啦隊助威 (Cheer)</option>
              <option value="service">🤝 義工服務 (Service)</option>
              <option value="organization">📋 活動籌備 (Org)</option>
              <option value="academic">📚 學術常識 (Academic)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              核計社貢獻點數 (+分)
            </label>
            <input
              type="number"
              min={5}
              max={100}
              step={5}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              賽事 / 活動日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* 7. PREVIEW & REMARKS */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            賽事細節備註與說明（選填）
          </label>
          <textarea
            rows={2}
            placeholder={`填寫賽事發揮、代表感言或破紀錄成績，如：「於決賽表現出色，為敬社贏得關鍵${rankResult}！」`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        {/* Live Title Summary Preview */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-800">登記預覽標題：</span>
            <span className="font-semibold text-stone-800">{getActivityDisplayName()}</span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white font-bold text-[11px]">
            +{points} 分
          </span>
        </div>

        {submitSuccessMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            已成功記錄成績與貢獻！積分已即時累積至該成員之敬社檔案中。
          </div>
        )}

        <button
          type="submit"
          id="btn-submit-contribution"
          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          確認登記社員貢獻／成績並核發積分
        </button>
      </form>
    </div>
  );
};
