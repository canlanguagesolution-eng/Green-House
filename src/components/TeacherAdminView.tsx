import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  UserPlus,
  Users,
  Award,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Sparkles,
  ChevronRight,
  Gift,
  Medal,
  PenTool,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  MinusSquare,
  Target,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import {
  Member,
  CommitteeRoleKey,
  UserRole,
  RewardCategory,
  Badge,
} from '../types';
import { BadgeIcon } from './BadgeIcon';
import { ContributionForm } from './ContributionForm';
import { ActivityLogView } from './ActivityLogView';
import { TalentFinderView } from './TalentFinderView';
import { parseRosterCSV } from '../utils/csvParser';
import {
  MemberSortField,
  sortMembersList,
  computeAllMembersPoints,
  compareClassAndNumber,
} from '../utils/memberSorting';

export const TeacherAdminView: React.FC = () => {
  const {
    currentUser,
    members,
    rewards,
    badges,
    memberBadges,
    contributions,
    addMember,
    updateMember,
    deleteMember,
    deleteMembersBatch,
    batchUploadMembers,
    updateCommitteeRole,
    addReward,
    deleteReward,
    deleteContribution,
    awardBadge,
    revokeMemberBadge,
    triggerCelebration,
    showBadgeLibrary,
  } = useHouse();

  const defaultAwarder =
    currentUser.role === 'master'
      ? `${currentUser.name} (系統最高管理員)`
      : `${currentUser.name} 老師 (老師管理員)`;

  const [activeTab, setActiveTab] = useState<'roster' | 'contribution' | 'committee' | 'talents' | 'rewards' | 'badges' | 'activity_logs'>('roster');
  
  // Selected member for recording contribution via Talent Finder
  const [selectedMemberForContribution, setSelectedMemberForContribution] = useState<string>('');

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Dynamic available classes: all standard secondary classes (1A-6D) + any present in roster
  const availableClassOptions = useMemo(() => {
    const classSet = new Set<string>();
    // Standard classes: 1A-1D, 2A-2D, 3A-3D, 4A-4D, 5A-5D, 6A-6D
    for (let f = 1; f <= 6; f++) {
      ['A', 'B', 'C', 'D'].forEach((sec) => classSet.add(`${f}${sec}`));
    }
    // Also include all classes found in existing members (e.g. 5E, 6E, STAFF, etc.)
    members.forEach((m) => {
      if (m.class && m.class.trim() && m.class !== 'ADMIN') {
        classSet.add(m.class.trim());
      }
    });

    const classCounts: Record<string, number> = {};
    members.forEach((m) => {
      if (m.class) {
        classCounts[m.class] = (classCounts[m.class] || 0) + 1;
      }
    });

    const sortedClasses = Array.from(classSet).sort((a, b) => {
      if (a === 'STAFF') return 1;
      if (b === 'STAFF') return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    return {
      classes: sortedClasses,
      counts: classCounts,
    };
  }, [members]);

  // Modals state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchResultMsg, setBatchResultMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    studentId: '',
    name: '',
    englishName: '',
    class: '1A',
    role: 'member' as UserRole,
    committeeRoleKey: 'none' as CommitteeRoleKey,
    committeeTitle: '普通社員',
    phone: '',
    email: '',
    avatar: '',
    joinedYear: new Date().getFullYear(),
  });

  // Reward modal
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    memberId: '',
    title: '',
    category: 'service' as RewardCategory,
    points: 25,
    comment: '',
    awardedBy: defaultAwarder,
    badgeAwardedId: '',
  });

  // Committee assignment modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Member | null>(null);
  const [roleFormKey, setRoleFormKey] = useState<CommitteeRoleKey>('none');
  const [roleFormTitle, setRoleFormTitle] = useState('');

  // Special badge award modal
  const [showSpecialBadgeModal, setShowSpecialBadgeModal] = useState(false);
  const [specialBadgeRecipientId, setSpecialBadgeRecipientId] = useState('');
  const [selectedSpecialBadgeId, setSelectedSpecialBadgeId] = useState('');
  const [specialBadgeReason, setSpecialBadgeReason] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Committee role options
  const committeeRoleOptions: { key: CommitteeRoleKey; title: string }[] = [
    { key: 'chairperson', title: '敬社主席 (Chairperson)' },
    { key: 'vice_chairperson', title: '敬社副主席 (Vice Chairperson)' },
    { key: 'treasurer', title: '財政司庫 (Treasurer)' },
    { key: 'secretary', title: '社務秘書 (Secretary)' },
    { key: 'sports_captain', title: '體育幹事 (Sports Captain)' },
    { key: 'recreation', title: '康樂活動幹事 (Recreation Officer)' },
    { key: 'publicity', title: '宣傳美工幹事 (Publicity Officer)' },
    { key: 'general', title: '總務幹事 (General Affairs)' },
    { key: 'none', title: '卸任 / 轉回普通社員 (Regular Member)' },
  ];

  // Sorting state (Default: class and class number)
  const [sortBy, setSortBy] = useState<MemberSortField>('classAndNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Batch delete state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Compute breakdown points (sports, non-sports, total) for all members
  const pointsMap = useMemo(
    () => computeAllMembersPoints(members, contributions, rewards),
    [members, contributions, rewards]
  );

  // Master list ordered by class & class number for clean dropdowns
  const membersSortedByClass = useMemo(
    () => [...members].sort(compareClassAndNumber),
    [members]
  );

  // Filtered and Sorted members for Roster table
  const sortedAndFilteredMembers = useMemo(() => {
    const filtered = members.filter((m) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (m.name && m.name.toLowerCase().includes(term)) ||
        (m.englishName && m.englishName.toLowerCase().includes(term)) ||
        (m.studentId && m.studentId.toLowerCase().includes(term)) ||
        (m.committeeTitle && m.committeeTitle.toLowerCase().includes(term)) ||
        (m.class && m.class.toLowerCase().includes(term));

      const matchesClass =
        classFilter === 'all' ||
        m.class === classFilter ||
        (classFilter.startsWith('FORM_') && m.class && m.class.startsWith(classFilter.replace('FORM_', '')));
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;

      return matchesSearch && matchesClass && matchesRole;
    });

    return sortMembersList(filtered, sortBy, sortOrder, pointsMap);
  }, [members, searchTerm, classFilter, roleFilter, sortBy, sortOrder, pointsMap]);

  // Members in current filtered view that can be batch deleted (exclude teachers & system admins)
  const deletableMemberIdsInView = useMemo(
    () =>
      sortedAndFilteredMembers
        .filter((m) => m.role !== 'master' && m.role !== 'teacher')
        .map((m) => m.id),
    [sortedAndFilteredMembers]
  );

  const isAllSelected =
    deletableMemberIdsInView.length > 0 &&
    deletableMemberIdsInView.every((id) => selectedMemberIds.includes(id));
  const isSomeSelected =
    selectedMemberIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all in current view
      setSelectedMemberIds((prev) =>
        prev.filter((id) => !deletableMemberIdsInView.includes(id))
      );
    } else {
      // Select all in current view
      setSelectedMemberIds((prev) => {
        const union = new Set([...prev, ...deletableMemberIdsInView]);
        return Array.from(union);
      });
    }
  };

  const handleToggleSelectMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedMemberIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      await deleteMembersBatch(selectedMemberIds);
      setSelectedMemberIds([]);
      setShowBatchDeleteModal(false);
      triggerCelebration();
    } catch (err) {
      console.error('Batch deletion error:', err);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleSortColumnClick = (field: MemberSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      // Default order when clicking points is descending (highest first)
      if (field === 'sportsPoints' || field === 'nonSportsPoints' || field === 'totalPoints') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  const committeeMembers = members.filter((m) => m.role === 'committee');

  const [isBatchImporting, setIsBatchImporting] = useState(false);

  // Handle batch CSV / text upload
  const handleBatchParse = async (content: string) => {
    if (!content || !content.trim()) {
      setBatchResultMsg({ text: '請輸入或上傳有效的名單內容', type: 'error' });
      return;
    }

    try {
      setIsBatchImporting(true);
      const parsedItems = parseRosterCSV(content);

      if (parsedItems.length === 0) {
        setBatchResultMsg({
          text: '無法解析內容，請確保包含姓名。格式：學號(選填), 姓名, 英文名(選填), 班別, 社職位',
          type: 'error',
        });
        setIsBatchImporting(false);
        return;
      }

      const { addedCount, updatedCount } = await batchUploadMembers(parsedItems);
      setBatchResultMsg({
        text: `匯入成功！成功新增 ${addedCount} 位新社員，更新 ${updatedCount} 位現有成員資料（共處理 ${parsedItems.length} 筆紀錄）。`,
        type: 'success',
      });
      setBatchText('');
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchResultMsg(null);
      }, 2000);
    } catch (e) {
      console.error('Batch parse/upload error:', e);
      setBatchResultMsg({ text: '檔案解析或寫入失敗，請確認檔案格式是否正確。', type: 'error' });
    } finally {
      setIsBatchImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleBatchParse(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadSampleCSV = () => {
    const csvContent =
      '學號,姓名,英文名,班別,社職位\nS10101,黃子謙,Kelvin Wong,1A,普通社員\nS10102,林嘉欣,Kayla Lam,1A,普通社員\nS40105,張家豪,Ka-Ho Cheung,4A,體育幹事\nS50201,梁佩珊,Sandy Leung,5B,敬社副主席\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '敬社社員名單匯入範本_House_of_Reverence.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentRoster = () => {
    const headers = '學號,姓名,英文名,班別,社職位,身份類別,累積貢獻分\n';
    const rows = members
      .map(
        (m) =>
          `"${m.studentId}","${m.name}","${m.englishName}","${m.class}","${m.committeeTitle}","${
            m.role === 'teacher' ? '教師' : m.role === 'committee' ? '幹事' : '社員'
          }","${m.totalPoints}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `敬社全體社員總名冊_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Stats */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-700/60 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800/80 border border-emerald-600 text-emerald-200 mb-3">
              {currentUser.role === 'master' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>👑 系統最高管理員 · 老師工作台 (全權統管)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>老師管理員工作台 (Teacher Administration)</span>
                </>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              敬社社務管理與名單體系
            </h2>
            <p className="text-sm text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
              {currentUser.role === 'master' ? (
                <>
                  您正以<strong className="text-white">系統最高管理員身份 ({currentUser.name})</strong>管理全社社務。您具備全系統最高控制權限，涵蓋社員名冊建檔匯入、學生管理幹事職位任命、社際嘉許獎勵核發、特批榮譽勳章頒發及隨時撤銷更正之完整管理特權。
                </>
              ) : (
                <>
                  統籌敬社社員名冊匯入、任命學生管理員職位、頒發社際成就獎勵，並掌管老師特批榮譽勳章。
                </>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-open-record-contrib"
              onClick={() => setActiveTab('contribution')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <PenTool className="w-4 h-4" />
              登記社員貢獻／成績
            </button>
            <button
              id="btn-open-batch-upload"
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              匯入社員名單 (CSV)
            </button>
            <button
              id="btn-open-reward-modal"
              onClick={() => setShowAddRewardModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Gift className="w-4 h-4 text-amber-950" />
              登記發放獎勵
            </button>
          </div>
        </div>

        {/* Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-emerald-800/80">
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/60">
            <div className="text-xs text-emerald-300 font-medium">敬社總人數</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {members.length} <span className="text-xs font-normal text-emerald-300">人</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/60">
            <div className="text-xs text-emerald-300 font-medium">學生管理員</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-200 mt-1">
              {committeeMembers.length} <span className="text-xs font-normal text-emerald-300">位</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/60">
            <div className="text-xs text-emerald-300 font-medium">已核發獎勵項</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
              {rewards.length} <span className="text-xs font-normal text-emerald-300">項</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/60">
            <div className="text-xs text-emerald-300 font-medium">全社總累積貢獻</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-100 mt-1">
              {members.reduce((acc, m) => acc + m.totalPoints, 0)}{' '}
              <span className="text-xs font-normal text-emerald-300">分</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'roster'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            全社名冊管理 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('contribution')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'contribution'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <PenTool className="w-4 h-4 text-emerald-700" />
            登記社員貢獻／成績
          </button>
          <button
            onClick={() => setActiveTab('committee')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'committee'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            學生管理員職位管理 ({committeeMembers.length})
          </button>
          <button
            id="tab-teacher-talents"
            onClick={() => setActiveTab('talents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'talents'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Target className="w-4 h-4 text-emerald-700" />
            社員特長與賽事獲獎檢索 (人才庫)
          </button>
          {(showBadgeLibrary || currentUser?.role === 'master') && (
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'badges'
                  ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Medal className="w-4 h-4 text-emerald-700" />
              特批榮譽勳章
            </button>
          )}
          <button
            id="tab-teacher-activity-log"
            onClick={() => setActiveTab('activity_logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'activity_logs'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <History className="w-4 h-4 text-emerald-700" />
            操作日誌與還原
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pb-1">
          <button
            onClick={downloadSampleCSV}
            className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 flex items-center gap-1.5"
            title="下載名單 CSV 範本"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            下載範本
          </button>
          <button
            onClick={exportCurrentRoster}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 flex items-center gap-1.5"
            title="導出名冊為 CSV 檔案"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            導出名冊
          </button>
        </div>
      </div>

      {/* TAB 1: ROSTER MANAGEMENT */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="relative w-full xl:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="搜尋姓名、英文名、學號或職位..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full xl:w-auto justify-start xl:justify-end flex-wrap">
              {/* Class filter - covers all school classes 1A-6D and custom roster classes */}
              <select
                id="select-teacher-class-filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              >
                <option value="all">所有班別 (全社 {members.length} 人)</option>

                <optgroup label="── 依年級篩選 (By Form) ──">
                  <option value="FORM_1">中一級全級 (1A - 1D)</option>
                  <option value="FORM_2">中二級全級 (2A - 2D)</option>
                  <option value="FORM_3">中三級全級 (3A - 3D)</option>
                  <option value="FORM_4">中四級全級 (4A - 4D)</option>
                  <option value="FORM_5">中五級全級 (5A - 5D)</option>
                  <option value="FORM_6">中六級全級 (6A - 6D)</option>
                </optgroup>

                <optgroup label="── 各獨立班別 (All Classes) ──">
                  {availableClassOptions.classes.map((cls) => {
                    const count = availableClassOptions.counts[cls] || 0;
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
                        {label} {count > 0 ? `· (${count}人)` : '· (0人)'}
                      </option>
                    );
                  })}
                </optgroup>
              </select>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              >
                <option value="all">所有身份</option>
                <option value="teacher">教師管理員</option>
                <option value="committee">幹事會幹事</option>
                <option value="member">普通社員</option>
              </select>

              {/* Sorting Selector */}
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl p-0.5">
                <span className="text-[11px] font-bold text-stone-500 pl-2">排序：</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const field = e.target.value as MemberSortField;
                    setSortBy(field);
                    if (field === 'sportsPoints' || field === 'nonSportsPoints' || field === 'totalPoints') {
                      setSortOrder('desc');
                    } else {
                      setSortOrder('asc');
                    }
                  }}
                  className="bg-transparent py-1.5 px-2 text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="classAndNumber">班別及班號 (預設)</option>
                  <option value="studentId">學生學號 (Student ID)</option>
                  <option value="sportsPoints">體育分 (Sports Pts)</option>
                  <option value="nonSportsPoints">非體育分 (Non-Sports)</option>
                  <option value="totalPoints">總累積貢獻分 (Total)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200/70 text-xs font-bold transition-all"
                  title={sortOrder === 'asc' ? '目前為升冪排序 (點擊切換為降冪)' : '目前為降冪排序 (點擊切換為升冪)'}
                >
                  {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Batch delete trigger button if selected */}
              {selectedMemberIds.length > 0 && (
                <button
                  id="btn-trigger-batch-delete"
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all animate-in fade-in"
                >
                  <Trash2 className="w-4 h-4" />
                  批次刪除 ({selectedMemberIds.length})
                </button>
              )}

              <button
                id="btn-add-single-member"
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                新增單一成員
              </button>
            </div>
          </div>

          {/* Batch Selection Banner */}
          {selectedMemberIds.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-red-900">
                  已選取 <span className="underline decoration-red-400 font-extrabold text-red-700">{selectedMemberIds.length}</span> 位社員帳號
                </span>
                <span className="text-stone-500 text-xs hidden md:inline">
                  （可執行批次自敬社名冊移除，並會自動記錄安全存檔備份）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMemberIds([])}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs cursor-pointer"
                >
                  取消全選
                </button>
                <button
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  確定批次刪除選取社員 ({selectedMemberIds.length})
                </button>
              </div>
            </div>
          )}

          {/* Table of Members */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider select-none">
                    <th className="py-3.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="p-1 text-stone-500 hover:text-emerald-700 cursor-pointer"
                        title={isAllSelected ? '取消全選' : '選取本頁所有社員'}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700" />
                        ) : isSomeSelected ? (
                          <MinusSquare className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">姓名 (中/英)</th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortColumnClick('classAndNumber')}
                        className={`inline-flex items-center gap-1 cursor-pointer hover:text-emerald-800 ${
                          sortBy === 'classAndNumber' ? 'text-emerald-800 font-extrabold' : ''
                        }`}
                        title="按班別與班號排序"
                      >
                        班別與班號
                        {sortBy === 'classAndNumber' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortColumnClick('studentId')}
                        className={`inline-flex items-center gap-1 cursor-pointer hover:text-emerald-800 ${
                          sortBy === 'studentId' ? 'text-emerald-800 font-extrabold' : ''
                        }`}
                        title="按學號排序"
                      >
                        學號
                        {sortBy === 'studentId' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">社職位 / 身份</th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortColumnClick('sportsPoints')}
                        className={`inline-flex items-center gap-1 cursor-pointer hover:text-blue-800 ${
                          sortBy === 'sportsPoints' ? 'text-blue-800 font-extrabold' : ''
                        }`}
                        title="按體育分排序"
                      >
                        體育分
                        {sortBy === 'sportsPoints' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-700" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortColumnClick('nonSportsPoints')}
                        className={`inline-flex items-center gap-1 cursor-pointer hover:text-emerald-800 ${
                          sortBy === 'nonSportsPoints' ? 'text-emerald-800 font-extrabold' : ''
                        }`}
                        title="按非體育分排序"
                      >
                        非體育分
                        {sortBy === 'nonSportsPoints' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSortColumnClick('totalPoints')}
                        className={`inline-flex items-center gap-1 cursor-pointer hover:text-stone-900 ${
                          sortBy === 'totalPoints' ? 'text-stone-900 font-extrabold' : ''
                        }`}
                        title="按總累積貢獻分排序"
                      >
                        累積貢獻分
                        {sortBy === 'totalPoints' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-stone-900" /> : <ArrowDown className="w-3.5 h-3.5 text-stone-900" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-3">徽章數</th>
                    <th className="py-3.5 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {sortedAndFilteredMembers.map((member) => {
                    const badgeCount = memberBadges.filter((b) => b.memberId === member.id).length;
                    const breakdown = pointsMap.get(member.id);
                    const points = {
                      sports: breakdown?.sportsPoints ?? 0,
                      nonSports: breakdown?.nonSportsPoints ?? 0,
                      total: breakdown?.totalPoints ?? (member.totalPoints || 0),
                    };
                    const isSelected = selectedMemberIds.includes(member.id);
                    const canDelete = member.role !== 'teacher' && member.role !== 'master';

                    return (
                      <tr
                        key={member.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-red-50/60 hover:bg-red-50'
                            : 'hover:bg-emerald-50/40'
                        }`}
                      >
                        {/* Multi-selection Checkbox */}
                        <td className="py-3.5 px-3 text-center">
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSelectMember(member.id)}
                              className="p-1 cursor-pointer text-stone-400 hover:text-emerald-700"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-red-600" />
                              ) : (
                                <Square className="w-4 h-4 text-stone-300" />
                              )}
                            </button>
                          ) : (
                            <span className="text-stone-300 text-xs">--</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="leading-tight">
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              {member.name}
                              {isSelected && (
                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                                  已選取
                                </span>
                              )}
                            </div>
                            {member.englishName && (
                              <div className="text-xs text-stone-500 font-sans mt-0.5">
                                {member.englishName}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-stone-700">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-xs font-mono font-bold">
                            {member.class} {member.classNumber ? `(${member.classNumber}號)` : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs text-stone-700 font-semibold">
                          {member.studentId || '-'}
                        </td>

                        <td className="py-3.5 px-3">
                          {member.role === 'teacher' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ShieldCheck className="w-3 h-3" /> {member.committeeTitle}
                            </span>
                          ) : member.role === 'committee' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
                              ★ {member.committeeTitle}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                              {member.committeeTitle}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 font-bold">
                            {points.sports} 分
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold">
                            {points.nonSports} 分
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-stone-900 text-sm font-mono">
                            {points.total}{' '}
                            <span className="text-[11px] font-normal text-stone-500">分</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold inline-flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-600" />
                            {badgeCount} 枚
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedMemberForRole(member);
                                setRoleFormKey(member.committeeRoleKey);
                                setRoleFormTitle(member.committeeTitle);
                                setShowRoleModal(true);
                              }}
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100/70 text-xs font-medium flex items-center gap-1"
                              title="任命/更改幹事職位"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">任職</span>
                            </button>

                            <button
                              onClick={() => {
                                setRewardForm((prev) => ({
                                  ...prev,
                                  memberId: member.id,
                                }));
                                setShowAddRewardModal(true);
                              }}
                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100/70 text-xs font-medium flex items-center gap-1"
                              title="直接獎勵此成員"
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">獎勵</span>
                            </button>

                            {canDelete && (
                              <button
                                onClick={() => {
                                  if (confirm(`確定自敬社名冊移除社員【${member.name} (${member.studentId})】嗎？`)) {
                                    deleteMember(member.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs cursor-pointer"
                                title="刪除社員"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sortedAndFilteredMembers.length === 0 && (
              <div className="p-12 text-center text-stone-500">
                <Users className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                <p className="font-semibold">找不到符合條件的社員</p>
                <p className="text-xs text-stone-400 mt-1">請嘗試修改搜尋詞或篩選條件</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: RECORD CONTRIBUTION / PERFORMANCE */}
      {activeTab === 'contribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ContributionForm
              currentUserName={currentUser?.name || '何敏儀 老師'}
              currentUserTitle="老師管理員"
              allowedTargetTypes={['all', 'member', 'committee']}
              defaultTargetType={selectedMemberForContribution ? 'member' : 'all'}
              initialMemberId={selectedMemberForContribution}
              formTitle="登記社員貢獻／成績"
              formSubtitle="老師管理員可為敬社成員登記社長 (60)、副社長 (50)、社職員 (50)、啦啦隊隊員 (40) 等職位奉獻及各項社際賽事名次積分"
              onSuccess={() => {
                setSelectedMemberForContribution('');
              }}
            />
          </div>

          {/* Teacher Guide Card */}
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 text-stone-800">
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                老師管理員評分指引
              </h4>
              <ul className="text-xs space-y-2.5 mt-3 text-emerald-900">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>職位預設奉獻分：</strong>社長 (60分)、副社長 (50分)、社職員 (50分)、啦啦隊隊員 (40分)。選取職位後系統將自動帶入對應預設分及評語。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>正式成績認證：</strong>老師管理員登記之賽事名次或事蹟即時生效，直接納入成員個人檔案與全社累積總分。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>名次積分預設：</strong>第一名 (35分)；第二名 (25分)；第三名 (20分)；第四名 (15分)。老師亦可按賽事規模靈活調整分值。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>陸運會專項：</strong>選取「社際陸運會」時，可細分性別（男/女）、組別（甲/乙/丙）及具體田徑跑跳投項目。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>自動徽章解鎖：</strong>累積貢獻分達標後，系統自動簽發「百分敬意」或相應體育/文藝徽章。</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TALENT FINDER (社員特長與賽事獲獎檢索) */}
      {activeTab === 'talents' && (
        <TalentFinderView
          titlePrefix="老師管理台 · "
          onSelectMemberForRecord={(memberId) => {
            setSelectedMemberForContribution(memberId);
            setActiveTab('contribution');
          }}
        />
      )}

      {/* TAB 2: COMMITTEE MEMBERS & ROLES */}
      {activeTab === 'committee' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-700 text-white rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 text-sm">
                  敬社第 2025-2026 年度學生管理員團隊
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  身為敬社老師管理員，您在此掌控學生管理員職位任命、考核與獎賞。學生管理員擁有登記社友成就及推薦徽章之權限。
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('roster');
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shrink-0"
            >
              + 從名冊任命學生管理員
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {committeeMembers.map((officer) => {
              const badgesCount = memberBadges.filter((b) => b.memberId === officer.id).length;
              return (
                <div
                  key={officer.id}
                  className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="leading-tight">
                        <div className="text-base font-bold text-stone-900">
                          {officer.name}
                        </div>
                        {officer.englishName && (
                          <div className="text-xs text-stone-500 font-sans mt-0.5">
                            {officer.englishName}
                          </div>
                        )}
                        <div className="text-[11px] text-stone-400 mt-1 font-mono">
                          班別: {officer.class} · 學號: {officer.studentId || '-'}
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-800 text-emerald-100 shadow-sm">
                        {officer.committeeTitle}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-stone-50 p-2 rounded-xl">
                        <div className="text-stone-400 font-medium">累積貢獻分</div>
                        <div className="font-black text-emerald-800 text-sm mt-0.5">
                          {officer.totalPoints} 分
                        </div>
                      </div>
                      <div className="bg-stone-50 p-2 rounded-xl">
                        <div className="text-stone-400 font-medium">持有勳章</div>
                        <div className="font-black text-amber-700 text-sm mt-0.5">
                          {badgesCount} 枚
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedMemberForRole(officer);
                        setRoleFormKey(officer.committeeRoleKey);
                        setRoleFormTitle(officer.committeeTitle);
                        setShowRoleModal(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl text-center transition-colors"
                    >
                      更換職位
                    </button>
                    <button
                      onClick={() => {
                        setRewardForm({
                          memberId: officer.id,
                          title: `${officer.committeeTitle}學期社務卓越履職獎勵`,
                          category: 'leadership',
                          points: 40,
                          comment: `感謝 ${officer.name} 擔任敬社${officer.committeeTitle}期間的辛勞付出與領航！`,
                          awardedBy: '何敏儀 老師 (老師管理員)',
                          badgeAwardedId: 'badge_comm_mvp',
                        });
                        setShowAddRewardModal(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold rounded-xl text-center transition-colors"
                    >
                      頒授學生管理員獎勵
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEACHER SPECIAL BADGE APPROVAL */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 via-emerald-50 to-emerald-100/50 border border-amber-200 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-amber-950 shadow-md">
                  <Medal className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    老師管理員專屬特批勳章
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    「社監特別嘉許勳章」及「年度卓越學生管理員章」僅限老師管理員簽發，專為敬社做出卓越奉獻者而設。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSpecialBadgeModal(true)}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                簽發特別勳章
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badges
              .filter((b) => b.isSpecialTeacherOnly)
              .map((badge) => {
                const awardedList = memberBadges.filter((mb) => mb.badgeId === badge.id);
                return (
                  <div
                    key={badge.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-start gap-4">
                      <BadgeIcon
                        iconName={badge.iconName}
                        tier={badge.tier}
                        size="lg"
                        isUnlocked={true}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-stone-900">
                            {badge.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                            最高鑽石榮譽
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1">
                          {badge.description}
                        </p>
                        <div className="text-xs font-semibold text-emerald-800 mt-2">
                          附帶獎勵: +{badge.pointsReward} 貢獻分
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100">
                      <div className="text-xs font-bold text-stone-500 mb-2">
                        已獲簽發成員名單 ({awardedList.length} 人)：
                      </div>
                      {awardedList.length === 0 ? (
                        <p className="text-xs text-stone-400 italic">尚未特批頒授此勳章</p>
                      ) : (
                        <div className="space-y-1.5">
                          {awardedList.map((item) => {
                            const member = members.find((m) => m.id === item.memberId);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-50 border border-stone-100 gap-2"
                              >
                                <span className="font-bold text-stone-800 shrink-0">
                                  {member?.name} ({member?.class})
                                </span>
                                <span className="text-stone-500 truncate flex-1">{item.reason}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-stone-400 font-mono">{item.awardedAt}</span>
                                  <button
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `確定要收回此成員之【${badge.name}】特批勳章嗎？\n成員：${member?.name}\n收回後將扣除該勳章所附帶之積分獎勵。`
                                        )
                                      ) {
                                        await revokeMemberBadge(item.id);
                                      }
                                    }}
                                    className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="收回勳章"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVITY AUDIT LOG & UNDO */}
      {activeTab === 'activity_logs' && (
        <div className="pt-2">
          <ActivityLogView />
        </div>
      )}

      {/* MODAL 1: BATCH UPLOAD */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">批次匯入敬社社員名單</h3>
                  <p className="text-xs text-stone-500">支援 CSV 檔案拖放上傳或直接貼上表格文字</p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-700 mb-2" />
                <p className="text-sm font-bold text-emerald-950">點擊選擇 CSV 名單檔案</p>
                <p className="text-xs text-stone-500 mt-0.5">或將 Excel/CSV 拖曳至此</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">
                    或直接貼上名冊內容 (逗號或Tab分隔)：
                  </label>
                  <button
                    onClick={downloadSampleCSV}
                    className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3 h-3" /> 下載範本
                  </button>
                </div>
                <textarea
                  rows={5}
                  placeholder={`學號,姓名,英文名,班別,社職位\nS10101,黃子謙,Kelvin Wong,1A,普通社員\n,林嘉欣,,1A,普通社員`}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  💡 說明：學號與英文名為選填項目。匯入時若儲存格留空，系統將自動填補為「-」。
                </p>
              </div>

              {batchResultMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    batchResultMsg.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-red-100 text-red-900 border border-red-300'
                  }`}
                >
                  {batchResultMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                  )}
                  {batchResultMsg.text}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
              >
                取消
              </button>
              <button
                disabled={isBatchImporting}
                onClick={() => handleBatchParse(batchText)}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {isBatchImporting ? '處理匯入中...' : '確認匯入名冊'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SINGLE MEMBER */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-base">新增敬社社員</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">學號 (選填，無則為 -)</label>
                  <input
                    type="text"
                    placeholder="例: S10204"
                    value={newMemberData.studentId}
                    onChange={(e) =>
                      setNewMemberData({ ...newMemberData, studentId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">班別 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 1B, 4A"
                    value={newMemberData.class}
                    onChange={(e) =>
                      setNewMemberData({ ...newMemberData, class: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">中文姓名 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例: 謝安琪"
                    value={newMemberData.name}
                    onChange={(e) =>
                      setNewMemberData({ ...newMemberData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">英文名 (選填，無則為 -)</label>
                  <input
                    type="text"
                    placeholder="例: Kay Tse"
                    value={newMemberData.englishName}
                    onChange={(e) =>
                      setNewMemberData({ ...newMemberData, englishName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">社職位 / 幹事任命</label>
                <select
                  value={newMemberData.committeeRoleKey}
                  onChange={(e) => {
                    const val = e.target.value as CommitteeRoleKey;
                    const opt = committeeRoleOptions.find((o) => o.key === val);
                    const isComm = val !== 'none';
                    setNewMemberData({
                      ...newMemberData,
                      committeeRoleKey: val,
                      role: isComm ? 'committee' : 'member',
                      committeeTitle: opt ? opt.title.split(' ')[0] : '普通社員',
                    });
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                >
                  {committeeRoleOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!newMemberData.name.trim()) {
                    alert('請填寫中文姓名');
                    return;
                  }
                  addMember({
                    ...newMemberData,
                    studentId: newMemberData.studentId.trim() || '-',
                    englishName: newMemberData.englishName.trim() || '-',
                  });
                  setShowAddMemberModal(false);
                  setNewMemberData({
                    studentId: '',
                    name: '',
                    englishName: '',
                    class: '1A',
                    role: 'member',
                    committeeRoleKey: 'none',
                    committeeTitle: '普通社員',
                    phone: '',
                    email: '',
                    avatar: '',
                    joinedYear: new Date().getFullYear(),
                  });
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md"
              >
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN COMMITTEE ROLE */}
      {showRoleModal && selectedMemberForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-base">
                任命敬社幹事職位
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <div className="leading-tight">
                  <div className="font-bold text-emerald-950">
                    {selectedMemberForRole.name}
                  </div>
                  {selectedMemberForRole.englishName && (
                    <div className="text-xs text-emerald-800 font-sans mt-0.5">
                      {selectedMemberForRole.englishName}
                    </div>
                  )}
                  <div className="text-xs text-emerald-800 mt-0.5">
                    班別: {selectedMemberForRole.class} · 學號: {selectedMemberForRole.studentId || '-'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  選擇幹事職位：
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {committeeRoleOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setRoleFormKey(opt.key);
                        setRoleFormTitle(opt.title.split(' ')[0]);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                        roleFormKey === opt.key
                          ? 'bg-emerald-100/80 border-emerald-500 text-emerald-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>{opt.title}</span>
                      {roleFormKey === opt.key && <span className="text-emerald-700">✓ 選取</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateCommitteeRole(selectedMemberForRole.id, roleFormKey, roleFormTitle);
                  setShowRoleModal(false);
                  triggerCelebration();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md"
              >
                確認任命
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SPECIAL TEACHER BADGE */}
      {showSpecialBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <Medal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">簽發顧問老師特別勳章</h3>
                  <p className="text-xs text-stone-500">向最卓越的敬社成員或幹事授予最高終身榮譽</p>
                </div>
              </div>
              <button
                onClick={() => setShowSpecialBadgeModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">獲授成員 *</label>
                <select
                  value={specialBadgeRecipientId}
                  onChange={(e) => setSpecialBadgeRecipientId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">-- 請選擇敬社成員（依班別與班號順序）--</option>
                  {membersSortedByClass.map((m) => {
                    const classTag = m.classNumber ? `${m.class} (${m.classNumber}號)` : m.class;
                    const studentIdTag = m.studentId && m.studentId !== '-' ? ` [學號:${m.studentId}]` : '';
                    return (
                      <option key={m.id} value={m.id}>
                        {classTag} · {m.name} {m.englishName && m.englishName !== '-' ? `(${m.englishName})` : ''}{studentIdTag} [{m.committeeTitle}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">勳章項目 *</label>
                <select
                  value={selectedSpecialBadgeId}
                  onChange={(e) => setSelectedSpecialBadgeId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">-- 請選擇最高勳章 --</option>
                  {badges
                    .filter((b) => b.isSpecialTeacherOnly)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (+{b.pointsReward}分) - {b.description}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">授勳理由與嘉許事蹟 *</label>
                <textarea
                  rows={3}
                  placeholder="寫明其在敬社發揮的關鍵奉獻，例如：率領敬社奪得歷屆最佳成績、品學兼優堪為全社表率..."
                  value={specialBadgeReason}
                  onChange={(e) => setSpecialBadgeReason(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                onClick={() => setShowSpecialBadgeModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!specialBadgeRecipientId || !selectedSpecialBadgeId || !specialBadgeReason) {
                    alert('請填寫完整授勳資訊');
                    return;
                  }
                  awardBadge(
                    specialBadgeRecipientId,
                    selectedSpecialBadgeId,
                    specialBadgeReason,
                    `${defaultAwarder} (特批頒授)`
                  );
                  setShowSpecialBadgeModal(false);
                  setSpecialBadgeReason('');
                }}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                確認簽發勳章
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: BATCH DELETE MEMBERS CONFIRMATION */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 pb-4 border-b border-stone-200 text-red-600">
              <div className="p-2.5 rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">確認批次刪除社員帳號</h3>
                <p className="text-xs text-red-600 font-semibold">
                  此操作將從名冊中永久移除選取的 {selectedMemberIds.length} 位成員
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  已為您啟用雙重安全防護：
                </p>
                <p>1. 系統已自動於刪除前執行全域時光機備份存檔，日後可隨時還原。</p>
                <p>2. 操作日誌將完整留痕，支援單鍵還原此次批次刪除作業。</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  即將被移除的成員名單 ({selectedMemberIds.length} 位)：
                </label>
                <div className="max-h-48 overflow-y-auto p-2 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  {selectedMemberIds.map((id) => {
                    const m = members.find((mem) => mem.id === id);
                    if (!m) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-stone-100"
                      >
                        <span className="font-semibold text-stone-800">
                          {m.class} {m.classNumber ? `(${m.classNumber}號)` : ''} · {m.name} {m.englishName && m.englishName !== '-' ? `(${m.englishName})` : ''}
                        </span>
                        <span className="font-mono text-stone-400 text-[11px]">
                          {m.studentId || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                disabled={isBatchDeleting}
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                disabled={isBatchDeleting}
                onClick={handleConfirmBatchDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isBatchDeleting ? '正在安全刪除中...' : `確認刪除這 ${selectedMemberIds.length} 位社員`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
