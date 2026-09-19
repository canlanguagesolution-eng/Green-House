import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  Award,
  Users,
  LogOut,
  ChevronDown,
  Sparkles,
  Smartphone,
  BookOpen,
  RotateCcw,
  Crown,
  Cloud,
  User,
  History,
  LogIn,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { UserRole } from '../types';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenLoginModal: () => void;
  onOpenBadgeLibrary: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenLoginModal,
  onOpenBadgeLibrary,
}) => {
  const {
    currentUser,
    members,
    setCurrentUserById,
    resetToDefaults,
    isCloudSynced,
    clearAllAccounts,
    logout,
    showBadgeLibrary,
  } = useHouse();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role?: UserRole, title?: string) => {
    if (!role) return null;
    switch (role) {
      case 'master':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-700 text-amber-100 border border-amber-500 shadow-sm">
            <Crown className="w-3 h-3 text-amber-300" />
            系統管理員
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-800 text-emerald-100 border border-emerald-600">
            <Shield className="w-3 h-3" />
            老師管理員
          </span>
        );
      case 'committee': {
        const displayPost = title && title !== '普通社員' && title !== '社員' && title !== 'none' ? title : '社職員';
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-800 text-teal-100 border border-teal-600">
            <UserCheck className="w-3 h-3" />
            {displayPost}
          </span>
        );
      }
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-950/80 text-emerald-200 border border-emerald-800/80">
            社員
          </span>
        );
    }
  };

  const masterAdmin = members.find((m) => m.role === 'master');
  const demoAccounts = [
    {
      id: masterAdmin ? masterAdmin.id : 'ADM001',
      label: masterAdmin ? `${masterAdmin.name} (系統管理員)` : 'Wong Yin Keung (系統管理員)',
      role: 'master',
    },
    { id: 'T001', label: '何敏儀 老師 (老師管理員)', role: 'teacher' },
    { id: 'C001', label: '陳一心 5A (社職員)', role: 'committee' },
    { id: 'M001', label: '張佩佩 3A (社員)', role: 'member' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-emerald-900/95 backdrop-blur-md border-b border-emerald-800 text-white shadow-lg shadow-emerald-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Motto */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 shadow-inner border border-emerald-300/40 text-white font-bold text-lg sm:text-xl">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-100 drop-shadow-sm" />
              <span className="absolute text-[11px] font-black text-white bottom-1 drop-shadow font-serif">敬</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  敬社 <span className="text-emerald-300 text-xs sm:text-sm font-normal">House of Reverence</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Center Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1 bg-emerald-950/50 p-1 rounded-xl border border-emerald-800/60">
            {!currentUser && (
              <button
                id="nav-public-leaderboard"
                onClick={() => setActiveView('member_portal')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'member_portal'
                    ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                敬社公開榮譽榜
              </button>
            )}

            {currentUser?.role === 'master' && (
              <>
                <button
                  id="nav-master-dashboard"
                  onClick={() => setActiveView('master_admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeView === 'master_admin'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-amber-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  系統管理員台
                </button>
                <button
                  id="nav-admin-dashboard"
                  onClick={() => setActiveView('teacher_admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'teacher_admin'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  老師管理台
                </button>
                <button
                  id="nav-activity-log"
                  onClick={() => setActiveView('activity_log')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeView === 'activity_log'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-amber-300" />
                  操作日誌與還原
                </button>
                <button
                  id="nav-comm-view"
                  onClick={() => setActiveView('committee_portal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'committee_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  學生管理員工作台
                </button>
                <button
                  id="nav-member-preview"
                  onClick={() => setActiveView('member_portal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'member_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  社員視角
                </button>
              </>
            )}

            {currentUser?.role === 'teacher' && (
              <>
                <button
                  id="nav-admin-dashboard"
                  onClick={() => setActiveView('teacher_admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'teacher_admin'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  老師管理台
                </button>
                <button
                  id="nav-activity-log"
                  onClick={() => setActiveView('activity_log')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeView === 'activity_log'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-amber-300" />
                  操作日誌與還原
                </button>
                <button
                  id="nav-comm-view"
                  onClick={() => setActiveView('committee_portal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'committee_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  學生管理員工作台
                </button>
                <button
                  id="nav-member-preview"
                  onClick={() => setActiveView('member_portal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'member_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  社員視角
                </button>
              </>
            )}

            {currentUser?.role === 'committee' && (
              <>
                <button
                  id="nav-comm-main"
                  onClick={() => setActiveView('committee_portal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'committee_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  學生管理員工作台
                </button>
                <button
                  id="nav-my-member-portal"
                  onClick={() => setActiveView('member_portal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'member_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  我的個人社員檔案
                </button>
              </>
            )}

            {currentUser?.role === 'member' && (
              <>
                <button
                  id="nav-member-home"
                  onClick={() => setActiveView('member_portal')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'member_portal'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  我的社員檔案
                </button>
              </>
            )}

            {(showBadgeLibrary || currentUser?.role === 'master') && (
              <button
                id="nav-badge-library"
                onClick={onOpenBadgeLibrary}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-200 hover:text-amber-200 hover:bg-emerald-800/50 flex items-center gap-1.5 transition-all"
              >
                <Award className="w-4 h-4 text-amber-300" />
                敬社徽章典藏
              </button>
            )}
          </nav>

          {/* Right: Current User & Quick Persona Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Firebase Live Cloud Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                isCloudSynced
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-stone-900/60 border-stone-700/50 text-stone-300'
              }`}
              title="已連接 Google Cloud Firestore 資料庫，社務資料即時雙向同步"
            >
              <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <Cloud className="w-3.5 h-3.5 text-emerald-300" />
              <span className="font-medium">Firebase 雲端已同步</span>
            </div>
            
            {/* User Profile / Quick Switcher or Login Button */}
            {!currentUser ? (
              <button
                id="btn-navbar-login"
                onClick={onOpenLoginModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>社員/教職員登入</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  id="btn-persona-switcher"
                  onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/80 border border-emerald-700/80 transition-all text-left"
                  title="切換登入身份 (系統管理員 / 老師管理員 / 學生管理員 / 社員)"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-900/90 flex items-center justify-center text-emerald-200 ring-2 ring-emerald-400/50 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="text-sm font-bold text-white">
                          {currentUser.name}
                        </span>
                        {currentUser.class && currentUser.class !== 'STAFF' && (
                          <span className="text-xs text-emerald-300 font-mono">
                            {currentUser.class}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {getRoleBadge(currentUser.role, currentUser.committeeTitle)}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-emerald-300 ml-0.5" />
                </button>

                {/* Persona Switch Menu */}
                {showSwitchMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSwitchMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden text-stone-800 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3 bg-emerald-900 text-white">
                        <div className="text-xs font-semibold text-emerald-200 uppercase tracking-wider mb-1">
                          當前登入身份
                        </div>
                        <div className="leading-tight mb-1">
                          <div className="font-bold text-base flex items-center justify-between">
                            <span>{currentUser.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-800 border border-emerald-600 font-mono">
                              {currentUser.studentId || '-'}
                            </span>
                          </div>
                          {currentUser.englishName && (
                            <div className="text-xs text-emerald-200 font-sans mt-0.5">
                              {currentUser.englishName}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-emerald-200 mt-0.5">
                          {currentUser.committeeTitle} · 貢獻分: {currentUser.totalPoints} 分
                        </div>
                      </div>

                      <div className="p-2 border-b border-stone-100">
                        <div className="text-[11px] font-semibold text-stone-500 px-2 py-1">
                          ⚡ 快速切換身份測試
                        </div>
                        <div className="space-y-1">
                          {demoAccounts.map((account) => {
                            const isSelected = account.id === currentUser.id;
                            return (
                              <button
                                key={account.id}
                                onClick={() => {
                                  setCurrentUserById(account.id);
                                  setShowSwitchMenu(false);
                                  if (account.role === 'master') setActiveView('master_admin');
                                  else if (account.role === 'teacher') setActiveView('teacher_admin');
                                  else if (account.role === 'committee') setActiveView('committee_portal');
                                  else setActiveView('member_portal');
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                                    : 'hover:bg-stone-50 text-stone-700'
                                }`}
                              >
                                <span>{account.label}</span>
                                {isSelected && (
                                  <span className="text-emerald-700 font-bold">✓ 當前</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-2 bg-stone-50 space-y-1 text-xs">
                        <button
                          onClick={() => {
                            setShowSwitchMenu(false);
                            logout();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-500" />
                          登出當前帳號 (Logout)
                        </button>
                        <button
                          onClick={() => {
                            setShowSwitchMenu(false);
                            onOpenLoginModal();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-stone-700 hover:bg-stone-200/70 flex items-center gap-2 font-medium"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          以其他學號/帳號登入...
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('確定要清空名冊中的所有帳號嗎？此操作將自 Firebase 雲端清除社員名冊，供您完全自行匯入或登錄全新名單。')) {
                              await clearAllAccounts();
                              setShowSwitchMenu(false);
                            }
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5 text-stone-400" />
                          清空名冊所有帳號 (Remove All Accounts)
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('確定重設為預設敬社示範資料嗎？所有手動變更將恢復為範例初始值。')) {
                              resetToDefaults();
                              setShowSwitchMenu(false);
                            }
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                          重設單筆示範數據 (Reset Demo - 1 Entry)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile menu toggle button */}
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
              aria-label="開啟導覽選單"
            >
              <Smartphone className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-emerald-800/80 space-y-1.5 animate-in fade-in slide-in-from-top-1">
            <div className="px-2 py-1 text-xs text-emerald-300 font-medium">
              {currentUser
                ? `登入者：${currentUser.name} (${currentUser.committeeTitle})`
                : '訪客模式 (未登入)'}
            </div>

            {!currentUser && (
              <>
                <button
                  onClick={() => {
                    setActiveView('member_portal');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm bg-emerald-700 font-bold"
                >
                  敬社公開榮譽榜
                </button>
                <button
                  onClick={() => {
                    onOpenLoginModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-amber-500 text-stone-900 font-bold text-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  登入系統 (Login)
                </button>
              </>
            )}

            {currentUser?.role === 'master' && (
              <>
                <button
                  onClick={() => {
                    setActiveView('master_admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    activeView === 'master_admin' ? 'bg-amber-600 font-bold text-white' : 'hover:bg-emerald-800'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  👑 系統管理員台 (最高控制台)
                </button>
                <button
                  onClick={() => {
                    setActiveView('teacher_admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'teacher_admin' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  📋 老師管理台 (名單與獎項)
                </button>
                <button
                  onClick={() => {
                    setActiveView('activity_log');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    activeView === 'activity_log' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  <History className="w-4 h-4 text-amber-300" />
                  📜 操作日誌與還原 (Undo / 快照)
                </button>
                <button
                  onClick={() => {
                    setActiveView('committee_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'committee_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  ✍️ 學生管理員工作台 (記錄成就)
                </button>
                <button
                  onClick={() => {
                    setActiveView('member_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'member_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  👤 社員視角
                </button>
              </>
            )}

            {currentUser?.role === 'teacher' && (
              <>
                <button
                  onClick={() => {
                    setActiveView('teacher_admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'teacher_admin' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  📋 老師管理台 (名單匯入與獎勵)
                </button>
                <button
                  onClick={() => {
                    setActiveView('activity_log');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    activeView === 'activity_log' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  <History className="w-4 h-4 text-amber-300" />
                  📜 操作日誌與還原 (Undo / 快照)
                </button>
                <button
                  onClick={() => {
                    setActiveView('committee_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'committee_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  ✍️ 學生管理員工作台 (記錄貢獻與成就)
                </button>
                <button
                  onClick={() => {
                    setActiveView('member_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'member_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  👤 社員視角預覽
                </button>
              </>
            )}

            {currentUser?.role === 'committee' && (
              <>
                <button
                  onClick={() => {
                    setActiveView('committee_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'committee_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  ✍️ 學生管理員工作台 (登記社員貢獻)
                </button>
                <button
                  onClick={() => {
                    setActiveView('member_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeView === 'member_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                  }`}
                >
                  👤 我的個人社員檔案
                </button>
              </>
            )}

            {currentUser?.role === 'member' && (
              <button
                onClick={() => {
                  setActiveView('member_portal');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  activeView === 'member_portal' ? 'bg-emerald-700 font-bold' : 'hover:bg-emerald-800'
                }`}
              >
                👤 我的個人社員檔案
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-900/40 flex items-center gap-2 font-bold"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                登出系統 (Logout)
              </button>
            )}

            {(showBadgeLibrary || currentUser?.role === 'master') && (
              <button
                onClick={() => {
                  onOpenBadgeLibrary();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-amber-200 hover:bg-emerald-800 flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-amber-300" />
                敬社徽章典藏庫
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
