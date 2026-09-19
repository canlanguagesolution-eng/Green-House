import React, { useState, useEffect } from 'react';
import { HouseProvider, useHouse } from './context/HouseContext';
import { Navbar } from './components/Navbar';
import { MasterAdminView } from './components/MasterAdminView';
import { TeacherAdminView } from './components/TeacherAdminView';
import { CommitteeView } from './components/CommitteeView';
import { MemberPortalView } from './components/MemberPortalView';
import { ActivityLogView } from './components/ActivityLogView';
import { LoginPage } from './components/LoginPage';
import { LoginModal } from './components/LoginModal';
import { BadgeLibraryModal } from './components/BadgeLibraryModal';
import { Shield, Sparkles, Heart, Trophy, Award, UserCheck, Crown } from 'lucide-react';
import { UserRole, hasRoleOrHigher } from './types';

const AppContent: React.FC = () => {
  const { currentUser, showBadgeLibrary } = useHouse();

  const [guestMode, setGuestMode] = useState(false);

  // Active view state
  const [activeView, setActiveView] = useState<string>(() => {
    if (currentUser?.role === 'master') return 'master_admin';
    if (currentUser?.role === 'teacher') return 'teacher_admin';
    if (currentUser?.role === 'committee') return 'committee_portal';
    return 'member_portal';
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBadgeLibraryOpen, setIsBadgeLibraryOpen] = useState(false);

  // Keep view in sync when currentUser role changes
  useEffect(() => {
    if (!currentUser) {
      if (activeView !== 'member_portal') {
        setActiveView('member_portal');
      }
      return;
    }
    if (activeView === 'master_admin' && !hasRoleOrHigher(currentUser.role, 'master')) {
      if (hasRoleOrHigher(currentUser.role, 'teacher')) setActiveView('teacher_admin');
      else if (hasRoleOrHigher(currentUser.role, 'committee')) setActiveView('committee_portal');
      else setActiveView('member_portal');
    } else if (activeView === 'teacher_admin' && !hasRoleOrHigher(currentUser.role, 'teacher')) {
      if (hasRoleOrHigher(currentUser.role, 'committee')) setActiveView('committee_portal');
      else setActiveView('member_portal');
    } else if (activeView === 'activity_log' && !hasRoleOrHigher(currentUser.role, 'teacher')) {
      if (hasRoleOrHigher(currentUser.role, 'committee')) setActiveView('committee_portal');
      else setActiveView('member_portal');
    } else if (activeView === 'committee_portal' && !hasRoleOrHigher(currentUser.role, 'committee')) {
      setActiveView('member_portal');
    }
  }, [currentUser?.role, activeView]);

  // Sync view when role changes if not in valid view
  const handleRoleLoginSuccess = (role: UserRole) => {
    setGuestMode(false);
    if (role === 'master') setActiveView('master_admin');
    else if (role === 'teacher') setActiveView('teacher_admin');
    else if (role === 'committee') setActiveView('committee_portal');
    else setActiveView('member_portal');
  };

  // If user is not logged in and hasn't chosen guest mode, show clean login page requiring login input
  if (!currentUser && !guestMode) {
    return (
      <LoginPage
        onSuccess={handleRoleLoginSuccess}
        onContinueAsGuest={() => {
          setGuestMode(true);
          setActiveView('member_portal');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-['Noto_Sans_TC',sans-serif]">
      
      {/* Top Navigation */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenBadgeLibrary={() => setIsBadgeLibraryOpen(true)}
      />

      {/* Role Notice & Quick Status Banner on Top of Main */}
      <div className="bg-emerald-800/10 border-b border-emerald-700/20 py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-emerald-950 font-medium gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>
              {currentUser ? (
                <>
                  當前登入模式：
                  <strong className="text-emerald-900 font-bold ml-1">
                    {currentUser.role === 'master'
                      ? `👑 系統管理員模式 (${currentUser.name})`
                      : currentUser.role === 'teacher'
                      ? `老師管理員模式 (${currentUser.name} 老師)`
                      : currentUser.role === 'committee'
                      ? `學生管理員模式 (${currentUser.name} · ${currentUser.committeeTitle})`
                      : `社員模式 (${currentUser.name} · ${currentUser.class})`}
                  </strong>
                </>
              ) : (
                <>
                  當前模式：
                  <strong className="text-stone-700 font-bold ml-1">
                    👀 公開訪客模式 (未登入 · 請點擊右方登入社員或教職員帳號)
                  </strong>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-stone-500">
              社代表色：<strong>綠色 (GHouse Green)</strong>
            </span>
            {currentUser ? (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
              >
                切換登入身份 (系統管理員 / 老師管理員 / 學生管理員 / 社員)
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
              >
                社員及教職員登入
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grow">
        {activeView === 'master_admin' && <MasterAdminView />}
        {activeView === 'teacher_admin' && <TeacherAdminView />}
        {activeView === 'activity_log' && <ActivityLogView />}
        {activeView === 'committee_portal' && <CommitteeView />}
        {activeView === 'member_portal' && <MemberPortalView />}
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-200/80 border-t border-emerald-900 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center font-bold text-white border border-emerald-500/40">
              敬
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-wide">
                敬社 House of Reverence
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-emerald-300/70">
            <span>© Fruitful Wisdom 版權所有</span>
            {(showBadgeLibrary || currentUser?.role === 'master') && (
              <>
                <span>·</span>
                <button
                  onClick={() => setIsBadgeLibraryOpen(true)}
                  className="hover:text-amber-300 underline cursor-pointer"
                >
                  社榮譽徽章體系
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Login / Persona Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleRoleLoginSuccess}
      />

      {/* Badge Library Modal */}
      <BadgeLibraryModal
        isOpen={isBadgeLibraryOpen}
        onClose={() => setIsBadgeLibraryOpen(false)}
      />

    </div>
  );
};

export default function App() {
  return (
    <HouseProvider>
      <AppContent />
    </HouseProvider>
  );
}
