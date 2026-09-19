import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  Shield,
  Crown,
  UserCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
  Award,
  Sparkles,
  Trophy,
  RefreshCw,
  Info,
  ChevronRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { ActivityLogEntry, SystemVersionSnapshot, UserRole } from '../types';

export const ActivityLogView: React.FC = () => {
  const {
    currentUser,
    activityLogs,
    snapshots,
    undoActivity,
    createSnapshot,
    revertToSnapshot,
    deleteSnapshot,
    clearActivityLogs,
    isCloudSynced,
  } = useHouse();

  const [activeTab, setActiveTab] = useState<'logs' | 'snapshots'>('logs');

  // Logs Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'reverted'>('all');

  // Modal States
  const [isCreateSnapshotOpen, setIsCreateSnapshotOpen] = useState(false);
  const [snapshotNameInput, setSnapshotNameInput] = useState('');
  const [snapshotNoteInput, setSnapshotNoteInput] = useState('');
  const [isSubmittingSnapshot, setIsSubmittingSnapshot] = useState(false);

  // Undo Confirmation Modal
  const [logToUndo, setLogToUndo] = useState<ActivityLogEntry | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  // Revert Snapshot Confirmation Modal
  const [snapshotToRevert, setSnapshotToRevert] = useState<SystemVersionSnapshot | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter logs
  const filteredLogs = activityLogs.filter((log) => {
    if (roleFilter !== 'all' && log.operatorRole !== roleFilter) return false;
    if (actionFilter !== 'all' && log.actionType !== actionFilter) return false;
    if (statusFilter === 'active' && log.isReverted) return false;
    if (statusFilter === 'reverted' && !log.isReverted) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = log.title.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchOp = log.operatorName.toLowerCase().includes(q);
      if (!matchTitle && !matchDetails && !matchOp) return false;
    }

    return true;
  });

  const handleConfirmUndo = async () => {
    if (!logToUndo) return;
    setIsUndoing(true);
    try {
      const res = await undoActivity(logToUndo.id);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('撤銷失敗：' + String(err), 'error');
    } finally {
      setIsUndoing(false);
      setLogToUndo(null);
    }
  };

  const handleConfirmRevertSnapshot = async () => {
    if (!snapshotToRevert) return;
    setIsReverting(true);
    try {
      const res = await revertToSnapshot(snapshotToRevert.id);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('版本還原失敗：' + String(err), 'error');
    } finally {
      setIsReverting(false);
      setSnapshotToRevert(null);
    }
  };

  const handleCreateSnapshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSnapshot(true);
    try {
      const snap = await createSnapshot(
        snapshotNameInput.trim() || undefined,
        snapshotNoteInput.trim() || undefined
      );
      showToast(`已成功建立系統版本快照【${snap.versionName}】！`, 'success');
      setSnapshotNameInput('');
      setSnapshotNoteInput('');
      setIsCreateSnapshotOpen(false);
    } catch (err) {
      showToast('建立快照失敗：' + String(err), 'error');
    } finally {
      setIsSubmittingSnapshot(false);
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'add_contribution':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">登記貢獻</span>;
      case 'delete_contribution':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">刪除貢獻</span>;
      case 'add_reward':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">頒發嘉許狀</span>;
      case 'delete_reward':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">刪除嘉許狀</span>;
      case 'award_badge':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">特批勳章</span>;
      case 'revoke_badge':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">收回勳章</span>;
      case 'update_committee':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">幹事任命</span>;
      case 'add_member':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">新增社員</span>;
      case 'delete_member':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-800">刪除社員</span>;
      case 'batch_import':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">批次匯入</span>;
      case 'rollover_year':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">學年交接</span>;
      case 'revert_snapshot':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-200 text-rose-900">歷史版本還原</span>;
      case 'undo_action':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">單步撤銷操作</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">{actionType}</span>;
    }
  };

  const getRoleIcon = (role: UserRole) => {
    if (role === 'master') return <Crown className="w-4 h-4 text-amber-500" />;
    if (role === 'teacher') return <Shield className="w-4 h-4 text-emerald-600" />;
    if (role === 'committee') return <UserCheck className="w-4 h-4 text-blue-600" />;
    return <UserCheck className="w-4 h-4 text-stone-500" />;
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'master') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
          <Crown className="w-3 h-3 text-amber-500" />
          系統管理員
        </span>
      );
    }
    if (role === 'teacher') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <Shield className="w-3 h-3 text-emerald-600" />
          老師管理員
        </span>
      );
    }
    if (role === 'committee') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
          <UserCheck className="w-3 h-3 text-blue-600" />
          學生幹事
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-semibold">
        社員
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border animate-in slide-in-from-top duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-700/60 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800/80 border border-emerald-600 text-emerald-200 mb-3">
              <History className="w-4 h-4 text-amber-300" />
              <span>系統操作審計日誌與歷史版本還原中心</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              操作日誌與系統備份還原
            </h2>
            <p className="text-emerald-200/90 text-sm mt-1 max-w-2xl">
              專為系統管理員（Wong Yin Keung 👑）與老師管理員提供完整審計軌跡。支援任意日常變更之「單步撤銷 (Undo)」，以及全社「歷史版本快照 (Snapshot) 完整還原」，確保敬社資料百分之百安全與可追溯。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="btn-create-snapshot"
              onClick={() => setIsCreateSnapshotOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>即時建立系統版本快照</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-700/40 text-center">
          <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-700/30">
            <div className="text-xs text-emerald-300/80">操作日誌總計</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {activityLogs.length} <span className="text-xs font-normal text-emerald-300">筆</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-700/30">
            <div className="text-xs text-emerald-300/80">已單步撤銷操作</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
              {activityLogs.filter((l) => l.isReverted).length} <span className="text-xs font-normal text-emerald-300">項</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-700/30">
            <div className="text-xs text-emerald-300/80">可還原歷史版本</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-200 mt-0.5">
              {snapshots.length} <span className="text-xs font-normal text-emerald-300">個</span>
            </div>
          </div>
          <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-700/30">
            <div className="text-xs text-emerald-300/80">雲端同步狀態</div>
            <div className="text-sm sm:text-base font-bold text-emerald-300 flex items-center justify-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {isCloudSynced ? 'Firestore 即時連線' : '本機安全快取'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-2xl border border-stone-200 p-1.5 shadow-sm flex flex-wrap gap-1">
        <button
          id="tab-activity-logs"
          onClick={() => setActiveTab('logs')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>即時操作審計日誌與單步撤銷 ({activityLogs.length})</span>
        </button>
        <button
          id="tab-system-snapshots"
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'snapshots'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>歷史版本快照庫與全社還原 ({snapshots.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVITY AUDIT LOGS & UNDO */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋操作者、社員姓名、標題或詳細內容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
              </div>

              {/* Role filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> 角色：
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">全部角色</option>
                  <option value="master">系統管理員 (Master)</option>
                  <option value="teacher">老師管理員 (Teacher)</option>
                  <option value="committee">學生管理員 (Committee)</option>
                </select>

                {/* Action filter */}
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">全部操作類型</option>
                  <option value="add_contribution">登記社員貢獻</option>
                  <option value="delete_contribution">刪除社員貢獻</option>
                  <option value="add_reward">頒發嘉許狀</option>
                  <option value="delete_reward">刪除嘉許狀</option>
                  <option value="award_badge">特批勳章</option>
                  <option value="update_committee">幹事職務任命</option>
                  <option value="add_member">新增社員</option>
                  <option value="delete_member">刪除社員</option>
                  <option value="batch_import">批次匯入</option>
                  <option value="rollover_year">學年交接</option>
                  <option value="revert_snapshot">版本還原</option>
                  <option value="undo_action">單步撤銷紀錄</option>
                </select>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">全部狀態</option>
                  <option value="active">正常生效中</option>
                  <option value="reverted">已撤銷 (Reverted)</option>
                </select>
              </div>
            </div>

            {/* Quick Helper Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>單步撤銷 (Undo) 指引：</strong>
                  點擊右側「單步撤銷」按鈕，系統將自動反向執行復原操作（例如：扣除已加積分、還原被刪紀錄或恢復原職務），並將操作狀態標記為「已撤銷」。
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 shrink-0 ml-2">
                共篩選出 {filteredLogs.length} 筆
              </span>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isReversible = log.canUndo && !log.isReverted;

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-2xl border transition-all p-4 shadow-sm hover:shadow-md ${
                    log.isReverted
                      ? 'border-stone-200 opacity-75 bg-stone-50/60'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      {/* Top Chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.actionType)}
                        {getRoleBadge(log.operatorRole)}
                        <span className="text-xs font-bold text-stone-800">
                          {log.operatorName}
                        </span>
                        <span className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.displayTime}
                        </span>
                        {log.isReverted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5" />
                            已於 {log.revertedAt} 經 {log.revertedBy} 撤銷
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                        <span>{log.title}</span>
                      </h4>

                      {/* Details */}
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {log.details}
                      </p>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {isReversible ? (
                        <button
                          id={`btn-undo-${log.id}`}
                          onClick={() => setLogToUndo(log)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>單步撤銷 (Undo)</span>
                        </button>
                      ) : log.isReverted ? (
                        <span className="px-3 py-1 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium">
                          此操作已被撤銷
                        </span>
                      ) : (
                        <span
                          title="此項目涉及結構性或全體變動，請使用歷史版本快照進行整體還原"
                          className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-500 text-xs font-medium cursor-help"
                        >
                          需快照還原
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500">
                <History className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="font-bold text-stone-700">找不到符合條件的操作日誌</p>
                <p className="text-xs text-stone-400 mt-1">請嘗試變更搜尋關鍵字或角色篩選條件</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM VERSION SNAPSHOTS & REVERT */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          {/* Explanation Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950">全社版本快照還原運作說明</h4>
              <p>
                系統於<strong>重大操作前（如名冊批次匯入、新學年交接、手動建立）</strong>皆會自動捕捉當下全社社員資料、所有貢獻點數、嘉許狀與徽章庫。
                當您點選<strong>「還原至此版本」</strong>時，系統將把整套敬社資料庫精確回復至該時間點。
                <strong>為策安全，還原時系統亦會自動先將當前狀態備份一次</strong>，隨時可再次切換，萬無一失。
              </p>
            </div>
          </div>

          {/* Snapshots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshots.map((snap, index) => {
              const isFirst = index === 0;

              return (
                <div
                  key={snap.id}
                  className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          v{snapshots.length - index}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-stone-900 text-sm">
                            {snap.versionName}
                          </h4>
                          <span className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {snap.displayTime}
                          </span>
                        </div>
                      </div>

                      {isFirst && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          最新版本
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <strong>備份備註：</strong>{snap.note}
                    </p>

                    <div className="text-[11px] text-stone-500">
                      建立者：<strong>{snap.createdBy}</strong>
                    </div>

                    {/* Snapshot Data Metrics */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center">
                      <div className="bg-stone-50 rounded-xl p-2">
                        <div className="text-[10px] text-stone-400">社員人數</div>
                        <div className="text-xs font-bold text-stone-800">
                          {snap.membersCount} 人
                        </div>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-2">
                        <div className="text-[10px] text-stone-400">貢獻紀錄</div>
                        <div className="text-xs font-bold text-stone-800">
                          {snap.contributionsCount} 筆
                        </div>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-2">
                        <div className="text-[10px] text-stone-400">全社總積分</div>
                        <div className="text-xs font-bold text-emerald-700">
                          {snap.totalPointsSum} 分
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`確定要刪除版本快照【${snap.versionName}】嗎？`)) {
                          deleteSnapshot(snap.id);
                          showToast('已刪除該筆快照記錄', 'success');
                        }
                      }}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 text-xs transition-all cursor-pointer"
                      title="刪除此歷史快照"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      id={`btn-revert-${snap.id}`}
                      type="button"
                      onClick={() => setSnapshotToRevert(snap)}
                      className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>還原至此歷史版本</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {snapshots.length === 0 && (
              <div className="col-span-2 bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500">
                <Database className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <p className="font-bold text-stone-700">尚未建立任何版本快照</p>
                <p className="text-xs text-stone-400 mt-1">點擊上方「即時建立系統版本快照」即可手動備份全社當前狀態</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE SNAPSHOT */}
      {isCreateSnapshotOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    建立系統版本快照
                  </h3>
                  <p className="text-xs text-stone-500">備份全社名單、積分與獎項狀態</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateSnapshotOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSnapshotSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  版本名稱 / 備份標題：
                </label>
                <input
                  type="text"
                  placeholder="例如：2025陸運會完結結算備份 / 10月社大會前存檔"
                  value={snapshotNameInput}
                  onChange={(e) => setSnapshotNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  備份備註 / 執行原因：
                </label>
                <textarea
                  rows={3}
                  placeholder="例如：完成全年中六幹事交接與運動會積分登錄，留存重要歷史紀錄點。"
                  value={snapshotNoteInput}
                  onChange={(e) => setSnapshotNoteInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                將備份當前社員名單、全部貢獻紀錄、嘉許狀與徽章分佈，建立後可隨時一鍵還原。
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateSnapshotOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSnapshot}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSnapshot ? '儲存快照中...' : '確認建立快照'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM UNDO */}
      {logToUndo && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-800 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">
                  確認執行單步撤銷？
                </h3>
                <p className="text-xs text-stone-500">系統將自動反向復原此項操作</p>
              </div>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="font-bold text-stone-800">{logToUndo.title}</div>
              <p className="text-stone-600 leading-relaxed">{logToUndo.details}</p>
              <div className="text-[11px] text-stone-400">
                記錄時間：{logToUndo.displayTime} · 操作者：{logToUndo.operatorName}
              </div>
            </div>

            <p className="text-xs text-stone-500">
              撤銷後，所影響的社員積分、徽章或名冊資料將即時回復原狀，日誌將留存撤銷軌跡。
            </p>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 mt-4">
              <button
                type="button"
                onClick={() => setLogToUndo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isUndoing}
                onClick={handleConfirmUndo}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isUndoing ? '撤銷執行中...' : '確認撤銷此操作'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM REVERT TO SNAPSHOT */}
      {snapshotToRevert && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-700 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">
                  確認還原全社系統至此歷史版本？
                </h3>
                <p className="text-xs text-stone-500">全社名冊、積分與各項紀錄將精準回復</p>
              </div>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-950">
              <div className="font-extrabold text-sm">{snapshotToRevert.versionName}</div>
              <p>備份時間：{snapshotToRevert.displayTime}</p>
              <p>備忘備註：{snapshotToRevert.note}</p>
              <div className="pt-2 border-t border-amber-200/60 text-[11px] flex items-center gap-4">
                <span>社員數：<strong>{snapshotToRevert.membersCount}人</strong></span>
                <span>貢獻數：<strong>{snapshotToRevert.contributionsCount}筆</strong></span>
                <span>總積分：<strong>{snapshotToRevert.totalPointsSum}分</strong></span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>安全保障：</strong>系統在執行還原前，會<strong>自動先為您當前的資料庫建立一份安全存檔</strong>，確保若有需要隨時可復原。
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 mt-4">
              <button
                type="button"
                onClick={() => setSnapshotToRevert(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isReverting}
                onClick={handleConfirmRevertSnapshot}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-md cursor-pointer disabled:opacity-50"
              >
                {isReverting ? '版本還原中，請稍候...' : '確認還原至此版本'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
