import React, { useState, useRef } from 'react';
import {
  Crown,
  Shield,
  Award,
  Calendar,
  Users,
  Sliders,
  UserPlus,
  Edit3,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Search,
  History,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Sparkles,
  KeyRound,
  Mail,
  Phone,
  Eye,
  GraduationCap,
  ChevronDown,
  Info,
  X,
  Flame,
  Activity,
  Music,
  HeartHandshake,
  PenTool,
  BookOpen,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import {
  Badge,
  BadgeTier,
  BadgeCategory,
  Member,
  UserRole,
  CommitteeRoleKey,
  ContributionRule,
  AwardRule,
  RewardCategory,
} from '../types';
import { BadgeIcon } from './BadgeIcon';
import { ActivityLogView } from './ActivityLogView';
import { parseRosterCSV } from '../utils/csvParser';

export const MasterAdminView: React.FC = () => {
  const {
    currentUser,
    members,
    badges,
    schoolYear,
    contributionRules,
    awardRules,
    renameBadge,
    updateBadge,
    addBadge,
    deleteBadge,
    rolloverSchoolYear,
    applyMemberReconciliation,
    batchUploadMembers,
    updateContributionRule,
    addContributionRule,
    deleteContributionRule,
    updateAwardRule,
    addAwardRule,
    deleteAwardRule,
    addTeacherAdmin,
    updateTeacherAdmin,
    deleteTeacherAdmin,
    createManualAccount,
    updateMember,
    deleteMember,
    setCurrentUserById,
    triggerCelebration,
    showBadgeLibrary,
    toggleBadgeLibraryVisibility,
  } = useHouse();

  const [activeTab, setActiveTab] = useState<
    'badges' | 'rollover' | 'reconciliation' | 'points_rules' | 'teachers' | 'activity_logs'
  >('badges');

  // ==========================================
  // TAB 1: 徽章名稱與榮譽體系重訂 (Renaming the badges)
  // ==========================================
  const [badgeSearch, setBadgeSearch] = useState('');
  const [badgeTierFilter, setBadgeTierFilter] = useState<string>('all');
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [showAddBadgeModal, setShowAddBadgeModal] = useState(false);
  const [newBadgeForm, setNewBadgeForm] = useState<Omit<Badge, 'id'>>({
    name: '',
    category: 'both',
    tier: 'gold',
    iconName: 'Sparkles',
    description: '',
    requirement: '',
    pointsReward: 20,
    isSpecialTeacherOnly: false,
  });

  const filteredBadges = badges.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(badgeSearch.toLowerCase()) ||
      b.description.toLowerCase().includes(badgeSearch.toLowerCase()) ||
      b.requirement.toLowerCase().includes(badgeSearch.toLowerCase());
    const matchTier = badgeTierFilter === 'all' || b.tier === badgeTierFilter;
    return matchSearch && matchTier;
  });

  const handleSaveBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBadge) return;
    updateBadge(editingBadge.id, {
      name: editingBadge.name,
      description: editingBadge.description,
      requirement: editingBadge.requirement,
      tier: editingBadge.tier,
      category: editingBadge.category,
      pointsReward: Number(editingBadge.pointsReward),
      iconName: editingBadge.iconName,
      isSpecialTeacherOnly: editingBadge.isSpecialTeacherOnly,
    });
    setEditingBadge(null);
    triggerCelebration();
  };

  const handleCreateNewBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBadgeForm.name.trim()) return;
    const newId = `badge_${Date.now()}`;
    addBadge({
      ...newBadgeForm,
      id: newId,
      pointsReward: Number(newBadgeForm.pointsReward) || 0,
    });
    setShowAddBadgeModal(false);
    setNewBadgeForm({
      name: '',
      category: 'both',
      tier: 'gold',
      iconName: 'Sparkles',
      description: '',
      requirement: '',
      pointsReward: 20,
      isSpecialTeacherOnly: false,
    });
  };

  // ==========================================
  // TAB 2: 學年交接與升班歸檔 (Roll over to new school year)
  // ==========================================
  const currentYear = schoolYear.currentYear;
  // Calculate next default year: "2025-2026" -> "2026-2027"
  const nextDefaultYear = (() => {
    const parts = currentYear.split('-');
    if (parts.length === 2 && !isNaN(Number(parts[0]))) {
      const start = Number(parts[0]) + 1;
      const end = Number(parts[1]) + 1;
      return `${start}-${end}`;
    }
    return '2026-2027';
  })();

  const [targetYear, setTargetYear] = useState(nextDefaultYear);
  const [rolloverNote, setRolloverNote] = useState('');
  const [showRolloverConfirm, setShowRolloverConfirm] = useState(false);
  const [rolloverResult, setRolloverResult] = useState<{
    promotedCount: number;
    graduatedCount: number;
  } | null>(null);

  // Simulation calculation
  const simulationData = (() => {
    let promoteCount = 0;
    let graduateCount = 0;
    const previewList: Array<{
      id: string;
      name: string;
      currentClass: string;
      newClass: string;
      status: 'promote' | 'graduate' | 'staff';
    }> = [];

    members.forEach((m) => {
      if (m.role === 'master' || m.role === 'teacher') {
        previewList.push({
          id: m.id,
          name: m.name,
          currentClass: m.class,
          newClass: m.class,
          status: 'staff',
        });
        return;
      }
      if (m.status === 'graduated') return;

      const trimmed = m.class.trim();
      const isForm6 = /(?:^|\b)(?:S|F|FORM)?\s*6[A-Z0-9]*/i.test(trimmed);
      if (isForm6) {
        graduateCount++;
        previewList.push({
          id: m.id,
          name: m.name,
          currentClass: m.class,
          newClass: `中六畢業 (${trimmed})`,
          status: 'graduate',
        });
      } else {
        promoteCount++;
        const formMatch = trimmed.match(/^([A-Za-z\.]*?)([1-5])([A-Za-z0-9]*)$/);
        let newCls = trimmed;
        if (formMatch) {
          const prefix = formMatch[1] || '';
          const num = parseInt(formMatch[2], 10);
          const suffix = formMatch[3] || '';
          newCls = `${prefix}${num + 1}${suffix}`;
        }
        previewList.push({
          id: m.id,
          name: m.name,
          currentClass: m.class,
          newClass: newCls,
          status: 'promote',
        });
      }
    });

    return { promoteCount, graduateCount, previewList };
  })();

  const handleExecuteRollover = () => {
    const res = rolloverSchoolYear(targetYear, rolloverNote);
    setRolloverResult(res);
    setShowRolloverConfirm(false);
  };

  // ==========================================
  // TAB 3: 名冊更新與差異比對 (Update member list & reconcile)
  // ==========================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reconcileInputText, setReconcileInputText] = useState('');
  const [reconcileFilter, setReconcileFilter] = useState<'all' | 'new' | 'promote' | 'graduate'>('all');
  const [analyzedData, setAnalyzedData] = useState<{
    promotions: Array<{ id: string; name: string; studentId: string; oldClass: string; newClass: string; newClassNumber?: string; selected: boolean }>;
    graduations: Array<{ id: string; name: string; studentId: string; currentClass: string; selected: boolean }>;
    newStudents: Array<{ studentId: string; name: string; englishName: string; class: string; classNumber?: string; selected: boolean }>;
    unchangedCount: number;
  } | null>(null);
  const [reconcileSuccessMsg, setReconcileSuccessMsg] = useState<string | null>(null);

  // Load realistic sample list to easily test
  const handleLoadSampleReconcileData = () => {
    const sample = `# 格式：學號,中文名,英文名,新學年班別,班號
S50102,陳一心,Yat-Sum Chan,6A,01
S50215,梁偉康,Wai-Hong Leung,6B,03
S40308,鄧曉晴,Chloe Tang,5C,15
S40112,周柏軒,Pak-Hin Chow,5A,08
S30101,張佩佩,Pui-Pui Cheung,4A,12
S30208,何子樂,Tsz-Lok Ho,4B,09
S30115,黃詠恩,Wing-Yan Wong,4A,25
S30322,趙嘉樂,Ka-Lok Chiu,4C,18
S20105,陳志豪,Chi-Ho Chan,3A,05
S20214,李凱晴,Hoi-Ching Li,3B,14
S10101,張子諾,Tsz-Nok Cheung,1A,01
S10102,林卓穎,Cheuk-Wing Lam,1A,15
S10203,陳嘉朗,Ka-Long Chan,1B,08`;
    setReconcileInputText(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setReconcileInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const [isApplyingReconcile, setIsApplyingReconcile] = useState(false);

  const handleAnalyzeReconcile = () => {
    setReconcileSuccessMsg(null);
    if (!reconcileInputText.trim()) return;

    const parsed = parseRosterCSV(reconcileInputText);
    if (parsed.length === 0) {
      alert('無法解析名冊內容，請確認格式包含學生學號或姓名');
      return;
    }

    const promotions: Array<{ id: string; name: string; englishName?: string; studentId: string; oldClass: string; newClass: string; newClassNumber?: string; selected: boolean }> = [];
    const newStudents: Array<{ studentId: string; name: string; englishName: string; class: string; classNumber?: string; selected: boolean }> = [];
    let unchangedCount = 0;

    // Compare with existing DB
    const matchedExistingIds = new Set<string>();

    parsed.forEach((item) => {
      const existing = members.find((m) => {
        if (item.studentId !== '-' && m.studentId && m.studentId !== '-') {
          return m.studentId.trim().toLowerCase() === item.studentId.trim().toLowerCase();
        }
        return m.name.trim().toLowerCase() === item.name.trim().toLowerCase();
      });

      if (existing) {
        matchedExistingIds.add(existing.id);
        const classChanged = existing.class.trim().toUpperCase() !== item.class.trim().toUpperCase();
        const numberChanged = item.classNumber && existing.classNumber !== item.classNumber;
        if (classChanged || numberChanged) {
          promotions.push({
            id: existing.id,
            name: existing.name,
            englishName: existing.englishName || item.englishName,
            studentId: existing.studentId || item.studentId,
            oldClass: existing.class,
            newClass: item.class,
            newClassNumber: item.classNumber,
            selected: true,
          });
        } else {
          unchangedCount++;
        }
      } else {
        // New incoming student
        newStudents.push({
          studentId: item.studentId,
          name: item.name,
          englishName: item.englishName,
          class: item.class,
          classNumber: item.classNumber,
          selected: true,
        });
      }
    });

    // Candidates for graduation / missing in new active list
    const graduations: Array<{ id: string; name: string; englishName?: string; studentId: string; currentClass: string; selected: boolean }> = [];
    members.forEach((m) => {
      if (m.role === 'master' || m.role === 'teacher') return;
      if (m.status === 'graduated') return;

      if (!matchedExistingIds.has(m.id)) {
        // If they are Form 6 or missing in list, candidate for graduation
        graduations.push({
          id: m.id,
          name: m.name,
          englishName: m.englishName,
          studentId: m.studentId || '-',
          currentClass: m.class,
          selected: true,
        });
      }
    });

    setAnalyzedData({
      promotions,
      graduations,
      newStudents,
      unchangedCount,
    });
  };

  const handleApplyReconciliation = async () => {
    if (!analyzedData) return;

    try {
      setIsApplyingReconcile(true);
      const selectedPromotions = analyzedData.promotions.filter((p) => p.selected);
      const selectedGraduations = analyzedData.graduations.filter((g) => g.selected).map((g) => g.id);
      const selectedNewStudents = analyzedData.newStudents.filter((n) => n.selected);

      const res = await applyMemberReconciliation({
        promotions: selectedPromotions.map((p) => ({
          id: p.id,
          newClass: p.newClass,
          newClassNumber: p.newClassNumber,
        })),
        graduations: selectedGraduations,
        newStudents: selectedNewStudents,
      });

      setReconcileSuccessMsg(
        `名冊差異比對更新完成！成功更新 ${res.updatedCount} 名社員班別/班號、標記 ${res.graduatedCount} 名畢業社員、新增 ${res.addedCount} 名入社新生。`
      );
      setAnalyzedData(null);
      setReconcileInputText('');
    } catch (err) {
      console.error('Reconciliation apply error:', err);
      alert('更新名冊時發生錯誤，請確認後重試。');
    } finally {
      setIsApplyingReconcile(false);
    }
  };

  // ==========================================
  // TAB 4: 貢獻與獎勵積分標準設定 (Set contribution and awards points)
  // ==========================================
  const [pointsSubTab, setPointsSubTab] = useState<'contributions' | 'awards'>('contributions');
  const [editingContribRule, setEditingContribRule] = useState<ContributionRule | null>(null);
  const [editingAwardRule, setEditingAwardRule] = useState<AwardRule | null>(null);
  const [showAddContribModal, setShowAddContribModal] = useState(false);
  const [showAddAwardModal, setShowAddAwardModal] = useState(false);

  const [newContribForm, setNewContribForm] = useState<ContributionRule>({
    key: '',
    label: '',
    description: '',
    defaultPoints: 20,
    minPoints: 10,
    maxPoints: 50,
    iconName: 'Activity',
  });

  const [newAwardForm, setNewAwardForm] = useState<AwardRule>({
    id: '',
    title: '',
    category: 'special',
    defaultPoints: 30,
    description: '',
  });

  // ==========================================
  // TAB 5: 全權限帳號管理 (Manage Accounts of All Levels)
  // ==========================================
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | UserRole>('all');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const initialAccountFormState = {
    role: 'member' as UserRole,
    name: '',
    englishName: '',
    studentId: '',
    class: '1A',
    classNumber: '',
    committeeRoleKey: 'none' as CommitteeRoleKey,
    committeeTitle: '普通社員',
    email: '',
    phone: '',
    passcode: 'REVERENCE',
    totalPoints: 10,
    avatar: '',
    status: 'active' as 'active' | 'graduated' | 'inactive',
  };

  const [accountForm, setAccountForm] = useState(initialAccountFormState);

  const handleRoleChangeInForm = (newRole: UserRole) => {
    let defaultTitle = '';
    let defaultClass = '';
    let defaultPasscode = '';
    let defaultAvatar = '';
    let defaultPoints = 0;

    if (newRole === 'master') {
      defaultTitle = '系統管理員';
      defaultClass = 'ADMIN';
      defaultPasscode = 'ADMIN2026';
      defaultAvatar = '';
      defaultPoints = 0;
    } else if (newRole === 'teacher') {
      defaultTitle = '敬社顧問老師';
      defaultClass = 'STAFF';
      defaultPasscode = 'TEA2026';
      defaultAvatar = '';
      defaultPoints = 0;
    } else if (newRole === 'committee') {
      defaultTitle = '敬社主席';
      defaultClass = '5A';
      defaultPasscode = 'REVERENCE';
      defaultAvatar = '';
      defaultPoints = 20;
    } else {
      defaultTitle = '普通社員';
      defaultClass = '1A';
      defaultPasscode = 'REVERENCE';
      defaultAvatar = '';
      defaultPoints = 10;
    }

    setAccountForm((prev) => ({
      ...prev,
      role: newRole,
      committeeTitle: defaultTitle,
      class: defaultClass,
      passcode: defaultPasscode,
      avatar: defaultAvatar,
      totalPoints: defaultPoints,
      committeeRoleKey: newRole === 'committee' ? 'chairperson' : 'none',
    }));
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name.trim()) {
      alert('請填寫中文姓名');
      return;
    }

    await createManualAccount({
      role: accountForm.role,
      name: accountForm.name.trim(),
      englishName: accountForm.englishName.trim() || '-',
      studentId: accountForm.studentId.trim() || '-',
      class: accountForm.class.trim() || (accountForm.role === 'master' ? 'ADMIN' : accountForm.role === 'teacher' ? 'STAFF' : '1A'),
      classNumber: accountForm.classNumber.trim(),
      committeeRoleKey: accountForm.committeeRoleKey,
      committeeTitle: accountForm.committeeTitle,
      email: accountForm.email.trim(),
      phone: accountForm.phone.trim(),
      passcode: accountForm.passcode.trim(),
      totalPoints: Number(accountForm.totalPoints) || 0,
      avatar: accountForm.avatar,
      status: accountForm.status,
    });

    setShowCreateAccountModal(false);
    setAccountForm(initialAccountFormState);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    await updateMember(editingMember.id, {
      name: editingMember.name.trim(),
      englishName: editingMember.englishName?.trim() || '-',
      studentId: editingMember.studentId?.trim() || '-',
      class: editingMember.class.trim(),
      classNumber: editingMember.classNumber?.trim() || '',
      role: editingMember.role,
      committeeRoleKey: editingMember.committeeRoleKey,
      committeeTitle: editingMember.committeeTitle,
      email: editingMember.email?.trim() || '',
      phone: editingMember.phone?.trim() || '',
      passcode: editingMember.passcode?.trim() || '',
      totalPoints: Number(editingMember.totalPoints) || 0,
      avatar: editingMember.avatar,
      status: editingMember.status,
    });

    setEditingMember(null);
    triggerCelebration();
  };

  // Master Admin Batch CSV Upload Modal
  const [showMasterBatchModal, setShowMasterBatchModal] = useState(false);
  const [masterBatchText, setMasterBatchText] = useState('');
  const [isMasterBatchImporting, setIsMasterBatchImporting] = useState(false);
  const [masterBatchResultMsg, setMasterBatchResultMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleMasterBatchParse = async (content: string) => {
    if (!content || !content.trim()) {
      setMasterBatchResultMsg({ text: '請輸入或上傳有效的名單內容', type: 'error' });
      return;
    }

    try {
      setIsMasterBatchImporting(true);
      const parsedItems = parseRosterCSV(content);

      if (parsedItems.length === 0) {
        setMasterBatchResultMsg({
          text: '無法解析內容，請確保包含學號或姓名。格式：學號, 姓名, 英文名(選填), 班別, 社職位',
          type: 'error',
        });
        setIsMasterBatchImporting(false);
        return;
      }

      const { addedCount, updatedCount } = await batchUploadMembers(parsedItems);
      setMasterBatchResultMsg({
        text: `匯入成功！已成功新增 ${addedCount} 位新社員，更新 ${updatedCount} 位現有成員資料（共處理 ${parsedItems.length} 筆紀錄）。`,
        type: 'success',
      });
      setMasterBatchText('');
      setTimeout(() => {
        setShowMasterBatchModal(false);
        setMasterBatchResultMsg(null);
      }, 2000);
    } catch (e) {
      console.error('Master batch parse error:', e);
      setMasterBatchResultMsg({ text: '檔案解析或匯入失敗，請確認檔案格式是否正確。', type: 'error' });
    } finally {
      setIsMasterBatchImporting(false);
    }
  };

  const handleMasterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleMasterBatchParse(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const downloadMasterSampleCSV = () => {
    const csvContent =
      '學號,姓名,英文名,班別,社職位\ns2611004,黎殷彤,,1A,社員\ns2611008,鄧雯濋,,1A,社員\ns2611013,傅詠琳,Fufu Fu,1A,副社長\ns2512001,陳希彤,,2A,社員\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '敬社社員名冊範例.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteMemberAccount = async (targetMember: Member) => {
    if (targetMember.id === currentUser.id) {
      alert('無法刪除當前已登入的使用者帳號。如需刪除，請先切換至其他系統管理員。');
      return;
    }
    const masterAdmins = members.filter((m) => m.role === 'master');
    if (targetMember.role === 'master' && masterAdmins.length <= 1) {
      alert('系統中至少須保留一位系統管理員，無法刪除最後一位系統管理員帳號。');
      return;
    }

    if (
      confirm(
        `確定要刪除帳號【${targetMember.name} (${targetMember.studentId})】嗎？此操作將同步自雲端 Firestore 永久移除。`
      )
    ) {
      await deleteMember(targetMember.id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Master Authority */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-6 sm:p-8 text-white border border-emerald-700/50 shadow-xl shadow-emerald-950/20">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-bold tracking-wider">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              系統管理員專屬控制台 · SYSTEM ADMIN
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>系統控制台</span>
            </h1>
            <p className="text-sm text-emerald-200/90 max-w-2xl leading-relaxed">
              您以 <strong>{currentUser.name}</strong> 系統管理員最高權限登入。本控制台擁有修訂榮譽徽章、新舊學年自動交接升班、名冊智能比對核對、標準積分配額設定及老師管理員權限統籌之最高審批權。
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-emerald-900/60 p-3 rounded-2xl border border-emerald-700/60 backdrop-blur-sm">
            <div className="text-right pr-2 border-r border-emerald-800 hidden sm:block">
              <div className="text-[11px] text-emerald-300">當前學年</div>
              <div className="text-lg font-bold text-amber-300">{schoolYear.currentYear}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-800/80 text-xs font-medium text-emerald-200">
                老師顧問：{members.filter((m) => m.role === 'teacher').length} 位
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-800/80 text-xs font-medium text-emerald-200">
                榮譽徽章：{badges.length} 款
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 5 Master Authority Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-1.5 flex flex-wrap gap-1.5">
        <button
          id="tab-btn-badges"
          onClick={() => setActiveTab('badges')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'badges'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>1. 徽章管理</span>
        </button>

        <button
          id="tab-btn-rollover"
          onClick={() => setActiveTab('rollover')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'rollover'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>2. 新學年交接升班</span>
        </button>

        <button
          id="tab-btn-reconcile"
          onClick={() => setActiveTab('reconciliation')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'reconciliation'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>3. 名冊智能更新比對</span>
        </button>

        <button
          id="tab-btn-points-rules"
          onClick={() => setActiveTab('points_rules')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'points_rules'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>4. 貢獻與獎勵積分標準</span>
        </button>

        <button
          id="tab-btn-teachers"
          onClick={() => setActiveTab('teachers')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>5. 全權限帳號管理</span>
        </button>

        <button
          id="tab-btn-activity-logs"
          onClick={() => setActiveTab('activity_logs')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'activity_logs'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70'
          }`}
        >
          <History className="w-4 h-4 text-amber-300" />
          <span>6. 系統日誌與版本還原</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 徽章名稱與榮譽體系維護 */}
      {/* ========================================================================= */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Feature Toggle: 敬社徽章典藏 前台顯示開關 */}
          <div className="bg-gradient-to-r from-amber-50 to-emerald-50/50 border border-amber-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${showBadgeLibrary ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'} shrink-0`}>
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                    前台「敬社徽章典藏」發佈狀態
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    showBadgeLibrary
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-stone-200 text-stone-800 border border-stone-300'
                  }`}>
                    {showBadgeLibrary ? '● 目前已對全社開放顯示' : '○ 目前已隱藏（尚未開放前台）'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  系統最高管理員專屬權限：可自由決定何時對全體社員開放展示「敬社徽章典藏」。現階段若尚未準備推出徽章體系，可保持隱藏狀態。
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-toggle-badge-library-visibility"
              onClick={() => toggleBadgeLibraryVisibility()}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                showBadgeLibrary
                  ? 'bg-stone-700 hover:bg-stone-800 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {showBadgeLibrary ? '設定為【隱藏】徽章典藏' : '設定為【公開顯示】徽章典藏'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-700" />
                  徽章管理與維護
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  系統管理員可在此自訂每一枚徽章的正式名稱、階梯、領取標準及獎勵分，更改將即時同步至全社檔案。
                </p>
              </div>

              <button
                id="btn-add-new-badge"
                onClick={() => setShowAddBadgeModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                新增自訂徽章
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative grow">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋徽章名稱、說明或獲取條件..."
                  value={badgeSearch}
                  onChange={(e) => setBadgeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-medium">階梯篩選：</span>
                <select
                  value={badgeTierFilter}
                  onChange={(e) => setBadgeTierFilter(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">全部階梯 ({badges.length})</option>
                  <option value="bronze">青銅徽章</option>
                  <option value="silver">白銀徽章</option>
                  <option value="gold">黃金徽章</option>
                  <option value="diamond">鑽石 / 殿堂級徽章</option>
                </select>
              </div>
            </div>
          </div>

          {/* Badges Grid with Direct Rename Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map((badge) => {
              const tierBadgeColors = {
                bronze: 'bg-amber-100 text-amber-900 border-amber-300',
                silver: 'bg-slate-100 text-slate-800 border-slate-300',
                gold: 'bg-yellow-100 text-yellow-900 border-yellow-300',
                diamond: 'bg-cyan-100 text-cyan-900 border-cyan-300',
              }[badge.tier];

              return (
                <div
                  key={badge.id}
                  className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-500/50 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <BadgeIcon iconName={badge.iconName} tier={badge.tier} size="md" />
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase ${tierBadgeColors}`}>
                          {badge.tier}
                        </span>
                        <span className="text-[11px] text-emerald-800 font-bold">
                          +{badge.pointsReward} 積分
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-stone-900">{badge.name}</h3>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {badge.category === 'member' ? '社員' : badge.category === 'committee' ? '幹事' : '通用'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-2">
                        {badge.description}
                      </p>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
                      <strong className="text-stone-700">頒發條件：</strong> {badge.requirement}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <button
                      id={`btn-edit-badge-${badge.id}`}
                      onClick={() => setEditingBadge(badge)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      重命名 / 編輯設定
                    </button>

                    <button
                      id={`btn-delete-badge-${badge.id}`}
                      onClick={() => {
                        if (confirm(`確定要刪除徽章【${badge.name}】嗎？`)) {
                          deleteBadge(badge.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="刪除徽章"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Edit & Rename Badge */}
      {editingBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-stone-800">
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">重命名與編輯徽章屬性</h3>
              </div>
              <button
                onClick={() => setEditingBadge(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBadge} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  徽章正式名稱 (Badge Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editingBadge.name}
                  onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-600 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    階梯等級 (Tier)
                  </label>
                  <select
                    value={editingBadge.tier}
                    onChange={(e) => setEditingBadge({ ...editingBadge, tier: e.target.value as BadgeTier })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="bronze">青銅 (Bronze)</option>
                    <option value="silver">白銀 (Silver)</option>
                    <option value="gold">黃金 (Gold)</option>
                    <option value="diamond">鑽石/殿堂 (Diamond)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    適用類別
                  </label>
                  <select
                    value={editingBadge.category}
                    onChange={(e) => setEditingBadge({ ...editingBadge, category: e.target.value as BadgeCategory })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="both">社員及幹事通用</option>
                    <option value="member">僅限普通社員</option>
                    <option value="committee">僅限幹事會幹事</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  頒發獎勵積分 (+Points)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingBadge.pointsReward}
                  onChange={(e) => setEditingBadge({ ...editingBadge, pointsReward: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  象徵意義與描述
                </label>
                <textarea
                  rows={2}
                  value={editingBadge.description}
                  onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  頒授條件與成就標準
                </label>
                <textarea
                  rows={2}
                  value={editingBadge.requirement}
                  onChange={(e) => setEditingBadge({ ...editingBadge, requirement: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBadge(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md cursor-pointer"
                >
                  儲存重命名變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Custom Badge */}
      {showAddBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-stone-800">
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">新增敬社榮譽徽章</h3>
              </div>
              <button
                onClick={() => setShowAddBadgeModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBadge} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  徽章名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：社旗守護金盾、年度創客先鋒..."
                  value={newBadgeForm.name}
                  onChange={(e) => setNewBadgeForm({ ...newBadgeForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    階級
                  </label>
                  <select
                    value={newBadgeForm.tier}
                    onChange={(e) => setNewBadgeForm({ ...newBadgeForm, tier: e.target.value as BadgeTier })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  >
                    <option value="bronze">青銅 (Bronze)</option>
                    <option value="silver">白銀 (Silver)</option>
                    <option value="gold">黃金 (Gold)</option>
                    <option value="diamond">鑽石 (Diamond)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    圖標款式
                  </label>
                  <select
                    value={newBadgeForm.iconName}
                    onChange={(e) => setNewBadgeForm({ ...newBadgeForm, iconName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  >
                    <option value="Sparkles">Sparkles (星輝)</option>
                    <option value="Flame">Flame (熱忱火焰)</option>
                    <option value="Trophy">Trophy (冠軍金盃)</option>
                    <option value="Music">Music (文藝音符)</option>
                    <option value="HeartHandshake">Heart (熱心義工)</option>
                    <option value="Crown">Crown (領袖皇冠)</option>
                    <option value="Medal">Medal (特別獎章)</option>
                    <option value="ShieldCheck">Shield (守護之盾)</option>
                    <option value="Zap">Zap (飛躍閃電)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  頒授條件與成就說明
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="說明獲得此榮譽之具體門檻..."
                  value={newBadgeForm.requirement}
                  onChange={(e) => setNewBadgeForm({ ...newBadgeForm, requirement: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  獎勵積分 (+Points)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newBadgeForm.pointsReward}
                  onChange={(e) => setNewBadgeForm({ ...newBadgeForm, pointsReward: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBadgeModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md cursor-pointer"
                >
                  確認建立徽章
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 學年交接與升班歸檔 (Roll over to new school year) */}
      {/* ========================================================================= */}
      {activeTab === 'rollover' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">學年交接與升班歸檔系統 (School Year Rollover)</h2>
                <p className="text-xs text-stone-500">
                  一鍵完成全社社員升班（中一至中五自動晉級）、中六畢業社員榮譽歸檔及新學年學生管理員任期交接。
                </p>
              </div>
            </div>

            {/* Current vs Target Year Setting */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">目前運行學年</span>
                <div className="text-2xl font-black text-stone-800 mt-1">{schoolYear.currentYear}</div>
                <p className="text-[11px] text-emerald-700 mt-1">✓ 資料與歷史積分妥善保留中</p>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">交接目標新學年 *</span>
                <input
                  type="text"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-600 text-base"
                />
                <p className="text-[11px] text-stone-400 mt-1">例如：2026-2027</p>
              </div>

              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">交接備註 (選填)</span>
                <input
                  type="text"
                  placeholder="例如：2026年9月新學年啟用"
                  value={rolloverNote}
                  onChange={(e) => setRolloverNote(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Automated Rollover Rules Explained */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-emerald-700" />
                  自動晉升中一至中五
                </div>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  系統自動將 1A→2A、2B→3B、3C→4C、4D→5D、5A→6A，班號預留更新。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  中六學生標記「已畢業」
                </div>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  所有現屆中六學生轉為「畢業校友 (Alumni)」，積分永久列入歷屆功績堂。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-emerald-700" />
                  學生管理員任期屆滿卸任
                </div>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  現屆學生管理員轉為社員以騰出職位，利於新學年改選與新班底上任。
                </p>
              </div>
            </div>

            {/* Simulation Preview & Action */}
            <div className="mt-6 pt-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-600">
                模擬結果預估：<strong>{simulationData.promoteCount}</strong> 位社員升班，
                <strong>{simulationData.graduateCount}</strong> 位中六社員榮譽畢業。
              </div>

              <button
                id="btn-trigger-rollover-modal"
                onClick={() => setShowRolloverConfirm(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                預覽並執行新學年交接
              </button>
            </div>

            {rolloverResult && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-950 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="text-xs">
                  <strong>學年交接執行成功！</strong> 系統已推進至 <strong>{schoolYear.currentYear}</strong>，共升班 {rolloverResult.promotedCount} 位社員，歸檔畢業 {rolloverResult.graduatedCount} 位校友。
                </div>
              </div>
            )}
          </div>

          {/* Past Rollover History Table */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-700" />
              歷次學年交接記錄 (Audit Logs)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-4">執行日期</th>
                    <th className="py-2.5 px-4">學年交接</th>
                    <th className="py-2.5 px-4">升班人數</th>
                    <th className="py-2.5 px-4">畢業歸檔</th>
                    <th className="py-2.5 px-4">執行主管</th>
                    <th className="py-2.5 px-4">備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {schoolYear.rolloverHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-mono">{item.date}</td>
                      <td className="py-3 px-4 font-bold text-emerald-900">
                        {item.fromYear} → {item.toYear}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">+{item.promotedCount} 人</td>
                      <td className="py-3 px-4 text-stone-500">{item.graduatedCount} 人畢業</td>
                      <td className="py-3 px-4 font-medium text-stone-800">{item.performedBy}</td>
                      <td className="py-3 px-4 text-stone-400">{item.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rollover Confirmation */}
      {showRolloverConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-stone-800">
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">確認執行新學年交接 ({targetYear})</h3>
              </div>
              <button
                onClick={() => setShowRolloverConfirm(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>重要確認：</strong> 此操作將把敬社運作學年更新為 <strong>{targetYear}</strong>。全社中一至中五社員將自動晉級，現屆中六社員將標記為「已畢業」，現任學生管理員將卸任轉為社員。社員累積榮譽積分均會完整存檔保留。
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-700">升班與畢業抽樣預覽 (Sample Preview)：</div>
                <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100 text-xs">
                  {simulationData.previewList.slice(0, 8).map((item) => (
                    <div key={item.id} className="p-2.5 flex items-center justify-between">
                      <span className="font-semibold text-stone-800">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">{item.currentClass}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                        <span className={`font-bold ${item.status === 'graduate' ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {item.newClass}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRolloverConfirm(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold cursor-pointer"
                >
                  返回重檢
                </button>
                <button
                  id="btn-confirm-rollover-action"
                  type="button"
                  onClick={handleExecuteRollover}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md cursor-pointer"
                >
                  確認並執行學年交接
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 名冊更新與差異比對 (Update member list & reconcile discrepancies) */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-700" />
                  名冊智能更新與差異比對核對 (Reconcile Discrepancies)
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  匯入新學年全校新編名單（含新班別、新班號）。系統將智慧偵測「升班/新班號」、「新入學社員」及「未在名冊之畢業生」，供系統管理員審核後一鍵同步。
                </p>
              </div>

              <button
                id="btn-load-sample-reconcile"
                onClick={handleLoadSampleReconcileData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                填入示範比對數據 (測試)
              </button>
            </div>

            {/* Input area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>每行一筆格式：<code className="bg-stone-100 px-1 py-0.5 rounded font-mono">學號, 中文姓名, 英文姓名, 新班別, 新班號</code></span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> 上傳 CSV 名單檔案
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <textarea
                rows={6}
                value={reconcileInputText}
                onChange={(e) => setReconcileInputText(e.target.value)}
                placeholder={`S50102, 陳一心, Yat-Sum Chan, 6A, 01\nS40308, 鄧曉晴, Chloe Tang, 5C, 15\nS10101, 張子諾, Tsz-Nok Cheung, 1A, 01 (新社員)`}
                className="w-full p-3 font-mono text-xs bg-stone-50 rounded-xl border border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                id="btn-analyze-reconcile"
                disabled={!reconcileInputText.trim()}
                onClick={handleAnalyzeReconcile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                開始智能比對與差異分析
              </button>
            </div>

            {reconcileSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{reconcileSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Analyzed Discrepancy Cards & Table */}
          {analyzedData && (
            <div className="space-y-4">
              {/* Stat Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  onClick={() => setReconcileFilter('promote')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    reconcileFilter === 'promote'
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                      : 'bg-white border-stone-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-xs text-blue-700 font-bold">班別 / 班號異動</div>
                  <div className="text-2xl font-black text-blue-900 mt-1">
                    {analyzedData.promotions.length} <span className="text-xs font-normal">人</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">升班或班號調動更新</div>
                </div>

                <div
                  onClick={() => setReconcileFilter('new')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    reconcileFilter === 'new'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                      : 'bg-white border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-xs text-emerald-700 font-bold">新入學社員</div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    {analyzedData.newStudents.length} <span className="text-xs font-normal">人</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">中一/插班生加入敬社</div>
                </div>

                <div
                  onClick={() => setReconcileFilter('graduate')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    reconcileFilter === 'graduate'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                      : 'bg-white border-stone-200 hover:border-amber-300'
                  }`}
                >
                  <div className="text-xs text-amber-700 font-bold">未在名冊 / 標記畢業</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">
                    {analyzedData.graduations.length} <span className="text-xs font-normal">人</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">舊名單中六畢業生歸檔</div>
                </div>

                <div
                  onClick={() => setReconcileFilter('all')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    reconcileFilter === 'all'
                      ? 'bg-stone-100 border-stone-400 ring-2 ring-stone-300'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs text-stone-600 font-bold">完全相符無異動</div>
                  <div className="text-2xl font-black text-stone-800 mt-1">
                    {analyzedData.unchangedCount} <span className="text-xs font-normal">人</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">資料吻合無需修改</div>
                </div>
              </div>

              {/* Detail Items to be Reconciled */}
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-stone-700 font-bold">
                    核對項目清單（勾選確認要執行的異動）：
                  </div>
                  <button
                    id="btn-apply-reconcile-actions"
                    onClick={handleApplyReconciliation}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    確認並套用差異更新 (Reconcile & Apply)
                  </button>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  {/* Promotion Items */}
                  {(reconcileFilter === 'all' || reconcileFilter === 'promote') &&
                    analyzedData.promotions.map((p, idx) => (
                      <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-blue-50/30">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={() => {
                              const copy = [...analyzedData.promotions];
                              copy[idx].selected = !copy[idx].selected;
                              setAnalyzedData({ ...analyzedData, promotions: copy });
                            }}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                            升班/新班號
                          </span>
                          <span className="font-mono text-stone-500 text-xs">{p.studentId || '-'}</span>
                          <div className="leading-tight">
                            <strong className="text-stone-900 text-sm">{p.name}</strong>
                            {p.englishName && (
                              <div className="text-xs text-stone-500 font-sans mt-0.5">{p.englishName}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-stone-400">{p.oldClass}</span>
                          <ArrowRight className="w-3 h-3 text-stone-300" />
                          <span className="font-bold text-blue-800">
                            新班別：{p.newClass} {p.newClassNumber ? `(#${p.newClassNumber})` : ''}
                          </span>
                        </div>
                      </div>
                    ))}

                  {/* New Student Items */}
                  {(reconcileFilter === 'all' || reconcileFilter === 'new') &&
                    analyzedData.newStudents.map((n, idx) => (
                      <div key={n.studentId} className="p-3.5 flex items-center justify-between hover:bg-emerald-50/30">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={n.selected}
                            onChange={() => {
                              const copy = [...analyzedData.newStudents];
                              copy[idx].selected = !copy[idx].selected;
                              setAnalyzedData({ ...analyzedData, newStudents: copy });
                            }}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            新增入社
                          </span>
                          <span className="font-mono text-stone-500 text-xs">{n.studentId || '-'}</span>
                          <div className="leading-tight">
                            <strong className="text-stone-900 text-sm">{n.name}</strong>
                            {n.englishName && (
                              <div className="text-xs text-stone-500 font-sans mt-0.5">{n.englishName}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-800">
                            分配班別：{n.class} {n.classNumber ? `(#${n.classNumber})` : ''}
                          </span>
                          <span className="text-[11px] text-stone-400">（自動發放新星徽章）</span>
                        </div>
                      </div>
                    ))}

                  {/* Candidates for Graduation */}
                  {(reconcileFilter === 'all' || reconcileFilter === 'graduate') &&
                    analyzedData.graduations.map((g, idx) => (
                      <div key={g.id} className="p-3.5 flex items-center justify-between hover:bg-amber-50/30">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={g.selected}
                            onChange={() => {
                              const copy = [...analyzedData.graduations];
                              copy[idx].selected = !copy[idx].selected;
                              setAnalyzedData({ ...analyzedData, graduations: copy });
                            }}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                            標記畢業校友
                          </span>
                          <span className="font-mono text-stone-500 text-xs">{g.studentId || '-'}</span>
                          <div className="leading-tight">
                            <strong className="text-stone-900 text-sm">{g.name}</strong>
                            {g.englishName && (
                              <div className="text-xs text-stone-500 font-sans mt-0.5">{g.englishName}</div>
                            )}
                          </div>
                          <span className="text-stone-400 text-xs">現班別：{g.currentClass}</span>
                        </div>

                        <div className="text-amber-800 font-medium">
                          新名單未見此社員，將歸檔為「畢業校友 (Alumni)」
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 貢獻活動積分標準設定 (Set contribution points) */}
      {/* ========================================================================= */}
      {activeTab === 'points_rules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-700" />
                  社際活動貢獻積分標準設定
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  系統管理員可設定各項社際貢獻（體育、文藝、啦啦隊、義工）的基準分與上限，維持全社評分公正性。
                </p>
              </div>
            </div>
          </div>

          {/* Contribution Category Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-stone-700">社際貢獻積分設定一覽：</div>
              <button
                id="btn-add-contrib-rule"
                onClick={() => setShowAddContribModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> 新增貢獻類別
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contributionRules.map((rule) => (
                <div
                  key={rule.key}
                  className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-emerald-400 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm">{rule.label}</h3>
                          <span className="text-[11px] text-stone-400 font-mono">key: {rule.key}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-800">
                          {rule.defaultPoints} 分
                        </span>
                        <div className="text-[10px] text-stone-400">
                          區間: {rule.minPoints}-{rule.maxPoints}分
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => setEditingContribRule(rule)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 調整分值與說明
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`確定刪除類別【${rule.label}】嗎？`)) {
                          deleteContributionRule(rule.key);
                        }
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                      title="刪除類別"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Contribution Rule */}
      {editingContribRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-stone-900">調整社際貢獻積分設定</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">類別名稱</label>
                <input
                  type="text"
                  value={editingContribRule.label}
                  onChange={(e) => setEditingContribRule({ ...editingContribRule, label: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">預設分值</label>
                  <input
                    type="number"
                    value={editingContribRule.defaultPoints}
                    onChange={(e) => setEditingContribRule({ ...editingContribRule, defaultPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">最低限制</label>
                  <input
                    type="number"
                    value={editingContribRule.minPoints}
                    onChange={(e) => setEditingContribRule({ ...editingContribRule, minPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">最高上限</label>
                  <input
                    type="number"
                    value={editingContribRule.maxPoints}
                    onChange={(e) => setEditingContribRule({ ...editingContribRule, maxPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">評核準則與活動說明</label>
                <textarea
                  rows={2}
                  value={editingContribRule.description}
                  onChange={(e) => setEditingContribRule({ ...editingContribRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingContribRule(null)}
                className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateContributionRule(editingContribRule.key, editingContribRule);
                  setEditingContribRule(null);
                }}
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                儲存設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Award Rule */}
      {editingAwardRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-stone-900">修改嘉許項目範本與分值</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">獎項名稱</label>
                <input
                  type="text"
                  value={editingAwardRule.title}
                  onChange={(e) => setEditingAwardRule({ ...editingAwardRule, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">頒發獎勵積分 (+Points)</label>
                <input
                  type="number"
                  value={editingAwardRule.defaultPoints}
                  onChange={(e) => setEditingAwardRule({ ...editingAwardRule, defaultPoints: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">嘉許標準與說明</label>
                <textarea
                  rows={2}
                  value={editingAwardRule.description}
                  onChange={(e) => setEditingAwardRule({ ...editingAwardRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingAwardRule(null)}
                className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateAwardRule(editingAwardRule.id, editingAwardRule);
                  setEditingAwardRule(null);
                }}
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                儲存獎勵分
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: 全權限帳號管理 (Manage Accounts of All Levels) */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          {/* Header & Stats Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                  全權限帳號管理 (Accounts of All Levels)
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  系統管理員可手動開立並即時維護全社所有層級帳號（系統管理員、老師顧問、學生幹事、普通社員），支援即時指派幹事職銜、分配初始積分、設定專屬登入代碼並同步至雲端 Firestore。
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  id="btn-master-create-teacher-account"
                  onClick={() => {
                    setAccountForm({
                      ...initialAccountFormState,
                      role: 'teacher',
                      class: 'STAFF',
                      committeeTitle: '敬社顧問老師',
                      passcode: 'teach888',
                      email: 'teacher@nlsipess.edu.hk',
                    });
                    setShowCreateAccountModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  title="由系統管理員開立老師管理員帳號"
                >
                  <Shield className="w-4 h-4 text-blue-200" />
                  開立老師管理員帳號 (Teacher Account)
                </button>
                <button
                  id="btn-master-batch-import"
                  onClick={() => {
                    setMasterBatchText('');
                    setMasterBatchResultMsg(null);
                    setShowMasterBatchModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  批次匯入名冊 (CSV / Excel)
                </button>
                <button
                  id="btn-add-account-modal"
                  onClick={() => {
                    setAccountForm(initialAccountFormState);
                    setShowCreateAccountModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  手動建立新帳號 (開立所有等級)
                </button>
              </div>
            </div>

            {/* Account Role Distribution Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-semibold text-stone-500 mr-1">社務帳號統計：</span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-700">
                總帳號數：{members.length}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900">
                系統管理員：{members.filter((m) => m.role === 'master').length}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900">
                老師顧問：{members.filter((m) => m.role === 'teacher').length}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-900">
                學生幹事：{members.filter((m) => m.role === 'committee').length}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900">
                普通社員：{members.filter((m) => m.role === 'member').length}
              </span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'all', label: `全部 (${members.length})` },
                  {
                    key: 'master',
                    label: `系統管理員 (${members.filter((m) => m.role === 'master').length})`,
                  },
                  {
                    key: 'teacher',
                    label: `老師顧問 (${members.filter((m) => m.role === 'teacher').length})`,
                  },
                  {
                    key: 'committee',
                    label: `學生幹事 (${members.filter((m) => m.role === 'committee').length})`,
                  },
                  {
                    key: 'member',
                    label: `普通社員 (${members.filter((m) => m.role === 'member').length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAccountRoleFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    accountRoleFilter === tab.key
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="搜尋姓名、學號、班級、電郵..."
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold">
                  <tr>
                    <th className="py-3 px-4">姓名 (中/英)</th>
                    <th className="py-3 px-4">學號 / 編號</th>
                    <th className="py-3 px-4">角色權限等級</th>
                    <th className="py-3 px-4">班級 / 職銜</th>
                    <th className="py-3 px-4">累積積分</th>
                    <th className="py-3 px-4">聯絡電郵 / 電話</th>
                    <th className="py-3 px-4">登入密碼</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {members
                    .filter((m) => {
                      const matchesRole =
                        accountRoleFilter === 'all' || m.role === accountRoleFilter;
                      const q = accountSearchQuery.trim().toLowerCase();
                      const matchesSearch =
                        !q ||
                        m.name.toLowerCase().includes(q) ||
                        (m.englishName && m.englishName.toLowerCase().includes(q)) ||
                        (m.studentId && m.studentId.toLowerCase().includes(q)) ||
                        m.class.toLowerCase().includes(q) ||
                        (m.email && m.email.toLowerCase().includes(q)) ||
                        (m.committeeTitle && m.committeeTitle.toLowerCase().includes(q));
                      return matchesRole && matchesSearch;
                    })
                    .map((member) => (
                      <tr key={member.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4">
                          <div className="leading-tight">
                            <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                              {member.name}
                              {member.id === currentUser.id && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                  當前登入
                                </span>
                              )}
                            </div>
                            {member.englishName && (
                              <div className="text-[11px] text-stone-400 font-sans mt-0.5">
                                {member.englishName}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                          {member.studentId || '-'}
                        </td>

                        <td className="py-3 px-4">
                          {member.role === 'master' && (
                            <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px] inline-flex items-center gap-1">
                              <Shield className="w-3 h-3 text-amber-700" />
                              系統管理員 (Master)
                            </span>
                          )}
                          {member.role === 'teacher' && (
                            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-bold text-[11px] inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-700" />
                              老師顧問 (Teacher)
                            </span>
                          )}
                          {member.role === 'committee' && (
                            <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-900 font-bold text-[11px] inline-flex items-center gap-1">
                              <Award className="w-3 h-3 text-purple-700" />
                              學生幹事 (Committee)
                            </span>
                          )}
                          {member.role === 'member' && (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-semibold text-[11px]">
                              普通社員 (Member)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-stone-800">
                              {member.class} {member.classNumber ? `(${member.classNumber})` : ''}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {member.committeeTitle || '普通社員'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-emerald-800">
                          {member.totalPoints} 分
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5 text-stone-500">
                            <span>{member.email || '-'}</span>
                            <span className="font-mono text-[11px]">{member.phone || '-'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-stone-600">
                          <span className="bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                            {member.passcode || '-'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-switch-user-${member.id}`}
                              onClick={() => {
                                setCurrentUserById(member.id);
                                triggerCelebration();
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold cursor-pointer transition-colors"
                              title="切換為此帳號登入體驗"
                            >
                              切換登入
                            </button>

                            <button
                              onClick={() => setEditingMember(member)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-700 hover:bg-stone-100 cursor-pointer transition-colors"
                              title="修改帳號資料"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteMemberAccount(member)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="移除帳號"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 系統操作審計日誌與版本快照還原 (Activity Log & Version Snapshot) */}
      {/* ========================================================================= */}
      {activeTab === 'activity_logs' && (
        <div className="pt-2">
          <ActivityLogView />
        </div>
      )}

      {/* MODAL: Create Account of Any Level */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-stone-800 my-8">
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">手動開立新帳號 (支援所有權限層級)</h3>
              </div>
              <button
                onClick={() => setShowCreateAccountModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="p-6 space-y-4 text-xs">
              {/* Role Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  選擇帳號權限層級 *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { role: 'master' as UserRole, label: '系統管理員', desc: '全社最高決策' },
                      { role: 'teacher' as UserRole, label: '老師顧問', desc: '指導與特權審核' },
                      { role: 'committee' as UserRole, label: '學生幹事', desc: '幹事社務職務' },
                      { role: 'member' as UserRole, label: '普通社員', desc: '參與社務積分' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleRoleChangeInForm(item.role)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        accountForm.role === item.role
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30 text-emerald-950'
                          : 'border-stone-200 hover:border-stone-300 bg-white text-stone-600'
                      }`}
                    >
                      <div className="font-bold text-xs">{item.label}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Role explanation callout */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-600">
                {accountForm.role === 'master' && (
                  <p className="leading-relaxed">
                    <strong className="text-amber-800">系統管理員 (Master Admin)：</strong>
                    享有社務最高特權，可維護全社徽章體系、一鍵跨學年交接與資料核對、增設老師/幹事/社員帳號。
                  </p>
                )}
                {accountForm.role === 'teacher' && (
                  <p className="leading-relaxed">
                    <strong className="text-blue-800">老師顧問 (Teacher Admin)：</strong>
                    代表社務顧問老師，負責統籌各級社務幹事名單、審批大額積分及頒發特別榮譽徽章。
                  </p>
                )}
                {accountForm.role === 'committee' && (
                  <p className="leading-relaxed">
                    <strong className="text-purple-800">學生管理員 / 敬社幹事 (Committee)：</strong>
                    負責登記社員出賽、協助紀錄日常貢獻與各項敬社活動，並可推薦社員領取徽章。
                  </p>
                )}
                {accountForm.role === 'member' && (
                  <p className="leading-relaxed">
                    <strong className="text-emerald-800">普通社員 (House Member)：</strong>
                    開立專屬社員身份，享有個人積分儀表板、徽章牆及社務出賽履歷記錄。
                  </p>
                )}
              </div>

              {/* Name & English Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    中文姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例：張樂天 / 杜秀慧 老師"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    英文姓名 (選填，無則為 -)
                  </label>
                  <input
                    type="text"
                    placeholder="例：Cheung Lok Tin / Ms. S.W. To"
                    value={accountForm.englishName}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, englishName: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Student ID & Class */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    學號 / 編號 (選填，無則為 -)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      accountForm.role === 'master'
                        ? 'SYS-ADMIN'
                        : accountForm.role === 'teacher'
                        ? 'TEA-098'
                        : 'S40212'
                    }
                    value={accountForm.studentId}
                    onChange={(e) => {
                      const sid = e.target.value;
                      const updates: Partial<typeof accountForm> = { studentId: sid };
                      if (
                        accountForm.role !== 'teacher' &&
                        accountForm.role !== 'master' &&
                        (!accountForm.email || accountForm.email.includes('@nlsipess.edu.hk'))
                      ) {
                        if (sid.trim()) {
                          updates.email = `${sid.trim().toLowerCase()}@nlsipess.edu.hk`;
                        }
                      }
                      setAccountForm({ ...accountForm, ...updates });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    班別 (Class)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      accountForm.role === 'master'
                        ? 'ADMIN'
                        : accountForm.role === 'teacher'
                        ? 'STAFF'
                        : '1A'
                    }
                    value={accountForm.class}
                    onChange={(e) => setAccountForm({ ...accountForm, class: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    班號 (選填)
                  </label>
                  <input
                    type="text"
                    placeholder="例：12"
                    value={accountForm.classNumber}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, classNumber: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Committee Role selection (for committee) or Committee Title */}
              <div className="grid grid-cols-2 gap-3">
                {accountForm.role === 'committee' ? (
                  <div>
                    <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                      敬社幹事職位 *
                    </label>
                    <select
                      value={accountForm.committeeRoleKey}
                      onChange={(e) => {
                        const key = e.target.value as CommitteeRoleKey;
                        const titleMap: Record<string, string> = {
                          chairperson: '敬社主席',
                          vice_chairperson: '敬社副主席',
                          sports_captain: '體育幹事',
                          treasurer: '財政司庫',
                          secretary: '文書秘書',
                          recreation: '康樂活動幹事',
                          publicity: '宣傳美工幹事',
                          general: '總務幹事',
                        };
                        setAccountForm({
                          ...accountForm,
                          committeeRoleKey: key,
                          committeeTitle: titleMap[key] || '敬社幹事',
                        });
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                    >
                      <option value="chairperson">敬社主席 (Chairperson)</option>
                      <option value="vice_chairperson">敬社副主席 (Vice Chairperson)</option>
                      <option value="sports_captain">體育幹事 (Sports Captain)</option>
                      <option value="treasurer">財政司庫 (Treasurer)</option>
                      <option value="secretary">文書秘書 (Secretary)</option>
                      <option value="recreation">康樂活動幹事 (Recreation)</option>
                      <option value="publicity">宣傳美工幹事 (Publicity)</option>
                      <option value="general">總務幹事 (General Affairs)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                      職位頭銜 (Title)
                    </label>
                    <input
                      type="text"
                      placeholder="例：敬社顧問老師 / 系統管理員 / 普通社員"
                      value={accountForm.committeeTitle}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, committeeTitle: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    初始社員積分 (Points)
                  </label>
                  <input
                    type="number"
                    value={accountForm.totalPoints}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        totalPoints: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    聯絡電郵
                  </label>
                  <input
                    type="email"
                    placeholder="user@nlsipess.edu.hk"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    預設登入密碼 / 代碼
                  </label>
                  <input
                    type="text"
                    value={accountForm.passcode}
                    onChange={(e) => setAccountForm({ ...accountForm, passcode: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  id="btn-submit-create-account"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md cursor-pointer transition-all"
                >
                  確認建立並同步雲端
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Member Account */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4 my-8 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-stone-900">
                編輯帳號資料：{editingMember.name} ({editingMember.studentId})
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">中文姓名</label>
                  <input
                    type="text"
                    value={editingMember.name}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">英文姓名 (選填，無則為 -)</label>
                  <input
                    type="text"
                    placeholder="無則為 -"
                    value={editingMember.englishName || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, englishName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">學號 / 編號 (選填，無則為 -)</label>
                  <input
                    type="text"
                    placeholder="無則為 -"
                    value={editingMember.studentId || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, studentId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">班級 (Class)</label>
                  <input
                    type="text"
                    value={editingMember.class}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, class: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">角色等級</label>
                  <select
                    value={editingMember.role}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white"
                  >
                    <option value="master">系統管理員 (Master)</option>
                    <option value="teacher">老師顧問 (Teacher)</option>
                    <option value="committee">學生幹事 (Committee)</option>
                    <option value="member">普通社員 (Member)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">社務職銜</label>
                  <input
                    type="text"
                    value={editingMember.committeeTitle || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, committeeTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">累積社員積分</label>
                  <input
                    type="number"
                    value={editingMember.totalPoints}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        totalPoints: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">電郵</label>
                  <input
                    type="email"
                    value={editingMember.email || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">登入密碼 / 代碼</label>
                  <input
                    type="text"
                    value={editingMember.passcode || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, passcode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  儲存修改並同步
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MASTER ADMIN BATCH CSV UPLOAD */}
      {showMasterBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">批次匯入社員名冊 (CSV / Excel)</h3>
                  <p className="text-xs text-stone-500">支援學號、姓名、班別、社職位全自動解析</p>
                </div>
              </div>
              <button
                onClick={() => setShowMasterBatchModal(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">支援檔案格式說明：</span>
                  <button
                    type="button"
                    onClick={downloadMasterSampleCSV}
                    className="text-emerald-700 hover:text-emerald-800 underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    下載 CSV 範本檔案
                  </button>
                </div>
                <p className="text-stone-600">
                  請上傳由校務系統（如 WebSAMS）或 Excel 導出的 CSV 檔案，或直接複製表格文字貼在下方文字框中。
                </p>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60 font-mono text-[11px] text-stone-700">
                  學號,姓名,英文名,班別,社職位<br />
                  s2611004,黎殷彤,,1A,社員<br />
                  s2611013,傅詠琳,Fufu Fu,1A,副社長
                </div>
              </div>

              {/* Upload zone */}
              <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-stone-50 hover:bg-emerald-50/30 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleMasterFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-700">點擊此處選取 CSV 檔案 或 拖曳檔案至此</p>
                <p className="text-[11px] text-stone-400 mt-1">支援 .csv 及 .txt UTF-8 編碼格式</p>
              </div>

              {/* Direct Paste */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  或直接貼上名冊資料 (支援逗號或 Tab 分隔)：
                </label>
                <textarea
                  rows={6}
                  value={masterBatchText}
                  onChange={(e) => setMasterBatchText(e.target.value)}
                  placeholder="學號,姓名,英文名,班別,社職位&#10;s2611004,黎殷彤,,1A,社員&#10;s2611008,鄧雯濋,,1A,社員"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-stone-50/50"
                />
              </div>

              {masterBatchResultMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    masterBatchResultMsg.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-red-100 text-red-900 border border-red-300'
                  }`}
                >
                  {masterBatchResultMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                  )}
                  <span>{masterBatchResultMsg.text}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowMasterBatchModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isMasterBatchImporting || !masterBatchText.trim()}
                onClick={() => handleMasterBatchParse(masterBatchText)}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isMasterBatchImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>處理匯入中...</span>
                  </>
                ) : (
                  <span>確認匯入名冊</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
