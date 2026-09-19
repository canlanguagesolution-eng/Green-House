import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Member,
  RewardRecord,
  ContributionRecord,
  Badge,
  MemberBadgeRecord,
  CommitteeRoleKey,
  UserRole,
  ContributionRule,
  AwardRule,
  SchoolYearInfo,
  ActivityLogEntry,
  SystemVersionSnapshot,
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_BADGES,
  INITIAL_REWARDS,
  INITIAL_CONTRIBUTIONS,
  INITIAL_MEMBER_BADGES,
  INITIAL_SCHOOL_YEAR,
  INITIAL_CONTRIBUTION_RULES,
  INITIAL_AWARD_RULES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SNAPSHOTS,
} from '../data/initialData';

const STORAGE_KEY_MEMBERS = 'hor_members_v3';
const STORAGE_KEY_REWARDS = 'hor_rewards_v3';
const STORAGE_KEY_CONTRIBUTIONS = 'hor_contributions_v3';
const STORAGE_KEY_BADGES = 'hor_badges_v3';
const STORAGE_KEY_MEMBER_BADGES = 'hor_member_badges_v3';
const STORAGE_KEY_CURRENT_USER = 'hor_current_user_id_v3';
const STORAGE_KEY_SCHOOL_YEAR = 'hor_school_year_v3';
const STORAGE_KEY_CONTRIBUTION_RULES = 'hor_contribution_rules_v3';
const STORAGE_KEY_AWARD_RULES = 'hor_award_rules_v3';
const STORAGE_KEY_ACTIVITY_LOGS = 'hor_activity_logs_v4';
const STORAGE_KEY_SNAPSHOTS = 'hor_snapshots_v4';
const STORAGE_VERSION_KEY = 'hor_firebase_v4_sysadmin_tykwong';

const DEFAULT_FALLBACK_USER: Member = {
  id: 'ADM001',
  studentId: 'SYS-ADMIN',
  name: 'Wong Yin Keung',
  englishName: 'Wong Yin Keung',
  class: 'ADMIN',
  role: 'master',
  committeeRoleKey: 'none',
  committeeTitle: '系統管理員',
  avatar: '',
  joinedYear: 2020,
  totalPoints: 0,
  phone: '2812-9988',
  email: 'tykwong@nlsipess.edu.hk',
  status: 'active',
  passcode: 'ADMIN2026',
};

interface HouseContextType {
  currentUser: Member | null;
  isLoggedIn: boolean;
  logout: () => void;
  deleteMembersBatch: (ids: string[]) => Promise<{ deletedCount: number }>;
  setMemberPasscode: (memberId: string, passcode: string) => Promise<void>;
  members: Member[];
  rewards: RewardRecord[];
  contributions: ContributionRecord[];
  badges: Badge[];
  memberBadges: MemberBadgeRecord[];
  schoolYear: SchoolYearInfo;
  contributionRules: ContributionRule[];
  awardRules: AwardRule[];
  isCloudSynced: boolean;
  setCurrentUserById: (id: string | null) => void;
  addMember: (data: Omit<Member, 'id' | 'totalPoints' | 'status'>) => Promise<void>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  clearAllAccounts: () => Promise<void>;
  batchUploadMembers: (
    items: Array<{
      studentId?: string;
      name: string;
      englishName?: string;
      class: string;
      classNumber?: string;
      role?: UserRole;
      committeeTitle?: string;
      committeeRoleKey?: CommitteeRoleKey;
    }>
  ) => Promise<{ addedCount: number; updatedCount: number }>;
  updateCommitteeRole: (
    memberId: string,
    roleKey: CommitteeRoleKey,
    title: string
  ) => Promise<void>;
  addReward: (data: Omit<RewardRecord, 'id' | 'date'> & { date?: string }) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  addContribution: (
    data: Omit<ContributionRecord, 'id' | 'date' | 'status'> & {
      date?: string;
      status?: 'verified' | 'pending';
    }
  ) => Promise<void>;
  deleteContribution: (id: string) => Promise<void>;
  awardBadge: (
    memberId: string,
    badgeId: string,
    reason: string,
    awardedBy: string
  ) => Promise<void>;
  revokeMemberBadge: (id: string) => Promise<void>;
  getMemberBadges: (memberId: string) => MemberBadgeRecord[];
  getMemberRewards: (memberId: string) => RewardRecord[];
  getMemberContributions: (memberId: string) => ContributionRecord[];
  getRankTitle: (points: number) => { title: string; level: number; nextTarget: number };
  showBadgeLibrary: boolean;
  toggleBadgeLibraryVisibility: (show?: boolean) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  triggerCelebration: () => void;

  // Master Admin Right 1: Badges management & renaming
  renameBadge: (id: string, newName: string) => Promise<void>;
  updateBadge: (id: string, updates: Partial<Badge>) => Promise<void>;
  addBadge: (newBadge: Badge) => Promise<void>;
  deleteBadge: (id: string) => Promise<void>;

  // Master Admin Right 2: Roll over to new school year
  rolloverSchoolYear: (targetYear: string, note?: string) => Promise<{ promotedCount: number; graduatedCount: number }>;

  // Master Admin Right 3: Member list discrepancy reconciliation
  applyMemberReconciliation: (actions: {
    promotions: Array<{ id: string; newClass: string; newClassNumber?: string }>;
    graduations: string[];
    newStudents: Array<{
      studentId: string;
      name: string;
      englishName?: string;
      class: string;
      classNumber?: string;
    }>;
  }) => Promise<{ updatedCount: number; graduatedCount: number; addedCount: number }>;

  // Master Admin Right 4: Set contribution & awards reward points
  updateContributionRule: (key: string, updates: Partial<ContributionRule>) => Promise<void>;
  addContributionRule: (rule: ContributionRule) => Promise<void>;
  deleteContributionRule: (key: string) => Promise<void>;
  updateAwardRule: (id: string, updates: Partial<AwardRule>) => Promise<void>;
  addAwardRule: (rule: AwardRule) => Promise<void>;
  deleteAwardRule: (id: string) => Promise<void>;

  // Master Admin Right 5: Add & manage teacher admin accounts
  addTeacherAdmin: (data: {
    name: string;
    englishName?: string;
    studentId?: string;
    committeeTitle?: string;
    email?: string;
    phone?: string;
    passcode?: string;
    avatar?: string;
  }) => Promise<Member>;
  updateTeacherAdmin: (id: string, updates: Partial<Member>) => Promise<void>;
  deleteTeacherAdmin: (id: string) => Promise<void>;

  // Master Admin Right 6: Manually create accounts of ALL levels
  createManualAccount: (data: {
    role: UserRole;
    name: string;
    englishName?: string;
    studentId?: string;
    class?: string;
    classNumber?: string;
    committeeRoleKey?: CommitteeRoleKey;
    committeeTitle?: string;
    email?: string;
    phone?: string;
    passcode?: string;
    totalPoints?: number;
    avatar?: string;
    status?: 'active' | 'graduated' | 'inactive';
  }) => Promise<Member>;

  // Activity Log & Version Revert (For Master Admin and Teacher Admin)
  activityLogs: ActivityLogEntry[];
  snapshots: SystemVersionSnapshot[];
  logActivity: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'displayTime'>) => Promise<string>;
  undoActivity: (logId: string) => Promise<{ success: boolean; message: string }>;
  createSnapshot: (versionName?: string, note?: string) => Promise<SystemVersionSnapshot>;
  revertToSnapshot: (snapshotId: string) => Promise<{ success: boolean; message: string }>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  clearActivityLogs: () => Promise<void>;
}

const HouseContext = createContext<HouseContextType | undefined>(undefined);

export const HouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [rewards, setRewards] = useState<RewardRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REWARDS);
      return saved ? JSON.parse(saved) : INITIAL_REWARDS;
    } catch {
      return INITIAL_REWARDS;
    }
  });

  const [contributions, setContributions] = useState<ContributionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTRIBUTIONS);
      return saved ? JSON.parse(saved) : INITIAL_CONTRIBUTIONS;
    } catch {
      return INITIAL_CONTRIBUTIONS;
    }
  });

  const [badges, setBadges] = useState<Badge[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BADGES);
      return saved ? JSON.parse(saved) : INITIAL_BADGES;
    } catch {
      return INITIAL_BADGES;
    }
  });

  const [memberBadges, setMemberBadges] = useState<MemberBadgeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMBER_BADGES);
      return saved ? JSON.parse(saved) : INITIAL_MEMBER_BADGES;
    } catch {
      return INITIAL_MEMBER_BADGES;
    }
  });

  const [schoolYear, setSchoolYear] = useState<SchoolYearInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHOOL_YEAR);
      return saved ? JSON.parse(saved) : INITIAL_SCHOOL_YEAR;
    } catch {
      return INITIAL_SCHOOL_YEAR;
    }
  });

  const [contributionRules, setContributionRules] = useState<ContributionRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTRIBUTION_RULES);
      if (!saved) return INITIAL_CONTRIBUTION_RULES;
      const parsed: ContributionRule[] = JSON.parse(saved);
      const existingKeys = new Set(parsed.map((r) => r.key));
      const missing = INITIAL_CONTRIBUTION_RULES.filter((r) => !existingKeys.has(r.key));
      return missing.length > 0 ? [...parsed, ...missing] : parsed;
    } catch {
      return INITIAL_CONTRIBUTION_RULES;
    }
  });

  const [awardRules, setAwardRules] = useState<AwardRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AWARD_RULES);
      return saved ? JSON.parse(saved) : INITIAL_AWARD_RULES;
    } catch {
      return INITIAL_AWARD_RULES;
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVITY_LOGS);
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
    } catch {
      return INITIAL_ACTIVITY_LOGS;
    }
  });

  const [snapshots, setSnapshots] = useState<SystemVersionSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      return saved ? JSON.parse(saved) : INITIAL_SNAPSHOTS;
    } catch {
      return INITIAL_SNAPSHOTS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return saved && saved.trim() !== '' && saved !== 'M000' ? saved : null;
  });

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Badge Library Visibility (System Admin feature switch - default hidden)
  const [showBadgeLibrary, setShowBadgeLibrary] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hor_show_badge_library');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleBadgeLibraryVisibility = async (show?: boolean) => {
    const nextVal = typeof show === 'boolean' ? show : !showBadgeLibrary;
    setShowBadgeLibrary(nextVal);
    try {
      localStorage.setItem('hor_show_badge_library', JSON.stringify(nextVal));
    } catch {
      // ignore
    }
    try {
      await setDoc(doc(db, 'config', 'features'), { showBadgeLibrary: nextVal }, { merge: true });
    } catch (e) {
      console.warn('Error saving badge library visibility to firestore:', e);
    }
  };

  // Sync to local storage for quick cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REWARDS, JSON.stringify(rewards));
  }, [rewards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTRIBUTIONS, JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(badges));
  }, [badges]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MEMBER_BADGES, JSON.stringify(memberBadges));
  }, [memberBadges]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, currentUserId);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCHOOL_YEAR, JSON.stringify(schoolYear));
  }, [schoolYear]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONTRIBUTION_RULES, JSON.stringify(contributionRules));
  }, [contributionRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AWARD_RULES, JSON.stringify(awardRules));
  }, [awardRules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVITY_LOGS, JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
  }, [snapshots]);

  // Real-time Firestore Synchronization & Seed on Empty
  useEffect(() => {
    // Check local storage version; if older version, clear stale multi-account data
    if (localStorage.getItem('hor_version_marker') !== STORAGE_VERSION_KEY) {
      localStorage.clear();
      localStorage.setItem('hor_version_marker', STORAGE_VERSION_KEY);
      setMembers(INITIAL_MEMBERS);
      setRewards(INITIAL_REWARDS);
      setContributions(INITIAL_CONTRIBUTIONS);
      setBadges(INITIAL_BADGES);
      setMemberBadges(INITIAL_MEMBER_BADGES);
      setSchoolYear(INITIAL_SCHOOL_YEAR);
      setContributionRules(INITIAL_CONTRIBUTION_RULES);
      setAwardRules(INITIAL_AWARD_RULES);
      setCurrentUserId('ADM001');
    }

    let isSubscribed = true;

    const initializeFirestore = async () => {
      try {
        const membersSnap = await getDocs(collection(db, 'members'));

        // Check and purge the dummy account 黃國樑 if stored previously in Firestore
        for (const docSnap of membersSnap.docs) {
          const data = docSnap.data() as Member;
          if (
            docSnap.id === 'M000' ||
            data.name === '黃國樑' ||
            data.email === 'kl.wong@school.edu.hk'
          ) {
            console.log('Firebase: Purging dummy account 黃國樑 / M000...');
            await deleteDoc(docSnap.ref);
          }
        }

        // Check and ensure Wong Yin Keung system admin account is present
        const adminDoc = await getDoc(doc(db, 'members', 'ADM001'));
        if (!adminDoc.exists()) {
          console.log('Firebase: Creating system admin Wong Yin Keung...');
          await setDoc(doc(db, 'members', 'ADM001'), DEFAULT_FALLBACK_USER);
        }

        if (membersSnap.empty && isSubscribed) {
          console.log('Firebase: Seeding initial 1-entry demo structure to Firestore...');
          const batch = writeBatch(db);

          INITIAL_MEMBERS.forEach((m) => {
            batch.set(doc(db, 'members', m.id), m);
          });
          INITIAL_REWARDS.forEach((r) => {
            batch.set(doc(db, 'rewards', r.id), r);
          });
          INITIAL_CONTRIBUTIONS.forEach((c) => {
            batch.set(doc(db, 'contributions', c.id), c);
          });
          INITIAL_BADGES.forEach((b) => {
            batch.set(doc(db, 'badges', b.id), b);
          });
          INITIAL_MEMBER_BADGES.forEach((mb) => {
            batch.set(doc(db, 'memberBadges', mb.id), mb);
          });

          batch.set(doc(db, 'config', 'school_year'), INITIAL_SCHOOL_YEAR);
          batch.set(doc(db, 'config', 'contribution_rules'), { rules: INITIAL_CONTRIBUTION_RULES });
          batch.set(doc(db, 'config', 'award_rules'), { rules: INITIAL_AWARD_RULES });

          INITIAL_ACTIVITY_LOGS.forEach((log) => {
            batch.set(doc(db, 'activityLogs', log.id), log);
          });
          INITIAL_SNAPSHOTS.forEach((snap) => {
            batch.set(doc(db, 'snapshots', snap.id), snap);
          });

          await batch.commit();
          console.log('Firebase: Seeding complete.');
        }
        if (isSubscribed) setIsCloudSynced(true);
      } catch (err) {
        console.warn('Firebase initialization notice:', err);
      }
    };

    initializeFirestore();

    // Listen to members
    const unsubMembers = onSnapshot(
      collection(db, 'members'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Member[] = [];
          snapshot.forEach((d) => {
            const raw = d.data() as Member;
            // Never load dummy account
            if (
              d.id !== 'M000' &&
              raw.name !== '黃國樑' &&
              raw.email !== 'kl.wong@school.edu.hk'
            ) {
              const cleanTitle = (raw.committeeTitle || '社員').replace(/^["']|["']$/g, '').trim();
              const displayTitle = cleanTitle === '普通社員' || !cleanTitle ? '社員' : cleanTitle;
              const isCommitteePost = ['社長', '副社長', '社職員'].includes(displayTitle);

              loaded.push({
                ...raw,
                id: d.id,
                name: (raw.name || '').replace(/^["']|["']$/g, '').trim(),
                englishName: (raw.englishName || '').replace(/^["']|["']$/g, '').trim(),
                studentId: (raw.studentId || '').replace(/^["']|["']$/g, '').trim(),
                class: (raw.class || '').replace(/^["']|["']$/g, '').trim(),
                committeeTitle: displayTitle,
                role: raw.role === 'master' || raw.role === 'teacher'
                  ? raw.role
                  : isCommitteePost ? 'committee' : raw.role || 'member',
              });
            }
          });
          setMembers(loaded);
        }
        setIsCloudSynced(true);
      },
      (err) => console.warn('Firestore members listener:', err)
    );

    // Listen to rewards
    const unsubRewards = onSnapshot(
      collection(db, 'rewards'),
      (snapshot) => {
        const loaded: RewardRecord[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as RewardRecord));
        setRewards(loaded);
      },
      (err) => console.warn('Firestore rewards listener:', err)
    );

    // Listen to contributions
    const unsubContributions = onSnapshot(
      collection(db, 'contributions'),
      (snapshot) => {
        const loaded: ContributionRecord[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as ContributionRecord));
        setContributions(loaded);
      },
      (err) => console.warn('Firestore contributions listener:', err)
    );

    // Listen to badges
    const unsubBadges = onSnapshot(
      collection(db, 'badges'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Badge[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as Badge));
          setBadges(loaded);
        }
      },
      (err) => console.warn('Firestore badges listener:', err)
    );

    // Listen to member badges
    const unsubMemberBadges = onSnapshot(
      collection(db, 'memberBadges'),
      (snapshot) => {
        const loaded: MemberBadgeRecord[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as MemberBadgeRecord));
        setMemberBadges(loaded);
      },
      (err) => console.warn('Firestore memberBadges listener:', err)
    );

    // Listen to school year
    const unsubSchoolYear = onSnapshot(
      doc(db, 'config', 'school_year'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSchoolYear(docSnap.data() as SchoolYearInfo);
        }
      },
      (err) => console.warn('Firestore school_year listener:', err)
    );

    // Listen to contribution rules
    const unsubContribRules = onSnapshot(
      doc(db, 'config', 'contribution_rules'),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().rules) {
          const remoteRules = docSnap.data().rules as ContributionRule[];
          const existingKeys = new Set(remoteRules.map((r) => r.key));
          const missing = INITIAL_CONTRIBUTION_RULES.filter((r) => !existingKeys.has(r.key));
          setContributionRules(missing.length > 0 ? [...remoteRules, ...missing] : remoteRules);
        }
      },
      (err) => console.warn('Firestore contribution_rules listener:', err)
    );

    // Listen to award rules
    const unsubAwardRules = onSnapshot(
      doc(db, 'config', 'award_rules'),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().rules) {
          setAwardRules(docSnap.data().rules as AwardRule[]);
        }
      },
      (err) => console.warn('Firestore award_rules listener:', err)
    );

    // Listen to activity logs
    const unsubActivityLogs = onSnapshot(
      collection(db, 'activityLogs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ActivityLogEntry[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as ActivityLogEntry));
          loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setActivityLogs(loaded);
        }
      },
      (err) => console.warn('Firestore activityLogs listener:', err)
    );

    // Listen to system version snapshots
    const unsubSnapshots = onSnapshot(
      collection(db, 'snapshots'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: SystemVersionSnapshot[] = [];
          snapshot.forEach((d) => loaded.push(d.data() as SystemVersionSnapshot));
          loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setSnapshots(loaded);
        }
      },
      (err) => console.warn('Firestore snapshots listener:', err)
    );

    // Listen to system features (e.g. badge library visibility)
    const unsubFeatures = onSnapshot(
      doc(db, 'config', 'features'),
      (docSnap) => {
        if (docSnap.exists() && typeof docSnap.data().showBadgeLibrary === 'boolean') {
          const remoteVal = docSnap.data().showBadgeLibrary;
          setShowBadgeLibrary(remoteVal);
          localStorage.setItem('hor_show_badge_library', JSON.stringify(remoteVal));
        }
      },
      (err) => console.warn('Firestore features listener:', err)
    );

    return () => {
      isSubscribed = false;
      unsubMembers();
      unsubRewards();
      unsubContributions();
      unsubBadges();
      unsubMemberBadges();
      unsubSchoolYear();
      unsubContribRules();
      unsubAwardRules();
      unsubActivityLogs();
      unsubSnapshots();
      unsubFeatures();
    };
  }, []);

  const currentUser = currentUserId
    ? members.find((m) => m.id === currentUserId) || null
    : null;

  const isLoggedIn = currentUser !== null;

  const logout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#059669', '#10b981', '#34d399', '#f59e0b', '#fbbf24'],
    });
  };

  const getRankTitle = (_points: number) => {
    return { title: '社員', level: 1, nextTarget: 0 };
  };

  const setCurrentUserById = (id: string | null) => {
    if (!id) {
      setCurrentUserId(null);
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      return;
    }
    const found = members.find((m) => m.id === id);
    if (found) {
      setCurrentUserId(id);
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, id);
    }
  };

  // Helper to ensure objects passed to Firestore never contain undefined values
  const cleanFirestoreData = <T extends Record<string, any>>(obj: T): T => {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  };

  // Helper to safely commit batch operations in chunks (Firestore limit is 500 ops per batch)
  const commitInBatches = async (ops: Array<(b: ReturnType<typeof writeBatch>) => void>) => {
    const CHUNK_SIZE = 350;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      chunk.forEach((fn) => fn(batch));
      await batch.commit();
    }
  };

  // --- Activity Logging System (For 系統管理員 & 老師管理員) ---
  const logActivity = async (
    entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'displayTime'>
  ): Promise<string> => {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();
    const timestamp = now.toISOString();
    const displayTime = now
      .toLocaleString('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/\//g, '-');

    const newLog: ActivityLogEntry = {
      ...entry,
      id,
      timestamp,
      displayTime,
      isReverted: false,
    };

    setActivityLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'activityLogs', id), cleanFirestoreData(newLog));
    } catch (err) {
      console.error('Firebase logActivity error:', err);
    }

    return id;
  };

  // --- Snapshot Backup & Restore System ---
  const createSnapshot = async (
    versionName?: string,
    note?: string
  ): Promise<SystemVersionSnapshot> => {
    const now = new Date();
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = now.toISOString();
    const displayTime = now
      .toLocaleString('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/\//g, '-');

    const calculatedTotalPoints = members.reduce(
      (sum, m) => sum + (m.totalPoints || 0),
      0
    );

    const snapshot: SystemVersionSnapshot = {
      id,
      versionName: versionName || `${displayTime} (系統版本快照)`,
      timestamp,
      displayTime,
      createdBy: currentUser
        ? `${currentUser.name} (${currentUser.committeeTitle || (currentUser.role === 'master' ? '系統管理員' : '老師管理員')})`
        : '系統管理員',
      creatorRole: currentUser ? currentUser.role : 'master',
      note: note || '手動建立之全社歷史備份版本',
      membersCount: members.length,
      contributionsCount: contributions.length,
      rewardsCount: rewards.length,
      memberBadgesCount: memberBadges.length,
      totalPointsSum: calculatedTotalPoints,
      snapshotData: {
        members: JSON.parse(JSON.stringify(members)),
        contributions: JSON.parse(JSON.stringify(contributions)),
        rewards: JSON.parse(JSON.stringify(rewards)),
        memberBadges: JSON.parse(JSON.stringify(memberBadges)),
        schoolYear: JSON.parse(JSON.stringify(schoolYear)),
      },
    };

    setSnapshots((prev) => [snapshot, ...prev]);

    try {
      await setDoc(doc(db, 'snapshots', id), cleanFirestoreData(snapshot));
    } catch (err) {
      console.error('Firebase createSnapshot error:', err);
    }

    return snapshot;
  };

  const revertToSnapshot = async (
    snapshotId: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetSnap = snapshots.find((s) => s.id === snapshotId);
    if (!targetSnap) return { success: false, message: '找不到指定的版本快照' };

    try {
      // 1. First take a safety snapshot of the current state so user can rollback if needed
      await createSnapshot(
        `還原前自動安全存檔 (${new Date().toLocaleTimeString('zh-HK', { hour12: false })})`,
        `系統執行還原至版本【${targetSnap.versionName}】前之自動留存安全點`
      );

      // 2. Extract snapshot data
      const {
        members: snapMembers,
        contributions: snapContributions,
        rewards: snapRewards,
        memberBadges: snapBadges,
        schoolYear: snapSchoolYear,
      } = targetSnap.snapshotData;

      // 3. Update React States
      setMembers(snapMembers);
      setContributions(snapContributions);
      setRewards(snapRewards);
      setMemberBadges(snapBadges);
      if (snapSchoolYear) setSchoolYear(snapSchoolYear);

      // 4. Update localStorage
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(snapMembers));
      localStorage.setItem(STORAGE_KEY_CONTRIBUTIONS, JSON.stringify(snapContributions));
      localStorage.setItem(STORAGE_KEY_REWARDS, JSON.stringify(snapRewards));
      localStorage.setItem(STORAGE_KEY_MEMBER_BADGES, JSON.stringify(snapBadges));
      if (snapSchoolYear) {
        localStorage.setItem(STORAGE_KEY_SCHOOL_YEAR, JSON.stringify(snapSchoolYear));
      }

      // 5. Overwrite Firestore via batch operations
      const batchOps: Array<(b: ReturnType<typeof writeBatch>) => void> = [];

      const [curMembers, curContribs, curRewards, curBadges] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'contributions')),
        getDocs(collection(db, 'rewards')),
        getDocs(collection(db, 'memberBadges')),
      ]);

      const snapMemberIds = new Set(snapMembers.map((m) => m.id));
      const snapContribIds = new Set(snapContributions.map((c) => c.id));
      const snapRewardIds = new Set(snapRewards.map((r) => r.id));
      const snapBadgeIds = new Set(snapBadges.map((b) => b.id));

      curMembers.forEach((d) => {
        if (!snapMemberIds.has(d.id)) batchOps.push((batch) => batch.delete(d.ref));
      });
      curContribs.forEach((d) => {
        if (!snapContribIds.has(d.id)) batchOps.push((batch) => batch.delete(d.ref));
      });
      curRewards.forEach((d) => {
        if (!snapRewardIds.has(d.id)) batchOps.push((batch) => batch.delete(d.ref));
      });
      curBadges.forEach((d) => {
        if (!snapBadgeIds.has(d.id)) batchOps.push((batch) => batch.delete(d.ref));
      });

      // Write snapshot items
      snapMembers.forEach((m) => {
        batchOps.push((batch) => batch.set(doc(db, 'members', m.id), cleanFirestoreData(m)));
      });
      snapContributions.forEach((c) => {
        batchOps.push((batch) => batch.set(doc(db, 'contributions', c.id), cleanFirestoreData(c)));
      });
      snapRewards.forEach((r) => {
        batchOps.push((batch) => batch.set(doc(db, 'rewards', r.id), cleanFirestoreData(r)));
      });
      snapBadges.forEach((mb) => {
        batchOps.push((batch) => batch.set(doc(db, 'memberBadges', mb.id), cleanFirestoreData(mb)));
      });

      if (snapSchoolYear) {
        batchOps.push((batch) =>
          batch.set(doc(db, 'config', 'school_year'), cleanFirestoreData(snapSchoolYear))
        );
      }

      await commitInBatches(batchOps);

      // 6. Log activity
      await logActivity({
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        actionType: 'revert_snapshot',
        entityType: 'system',
        title: `全社系統還原至歷史版本【${targetSnap.versionName}】`,
        details: `由 ${currentUser.name} 執行歷史版本還原。還原後社員數：${snapMembers.length}人，紀錄數：${snapContributions.length}筆。`,
        canUndo: false,
      });

      triggerCelebration();
      return {
        success: true,
        message: `系統已成功還原至歷史版本【${targetSnap.versionName}】！`,
      };
    } catch (err) {
      console.error('revertToSnapshot error:', err);
      return { success: false, message: '版本還原失敗：' + String(err) };
    }
  };

  // --- Single-Step Undo Functionality ---
  const undoActivity = async (
    logId: string
  ): Promise<{ success: boolean; message: string }> => {
    const log = activityLogs.find((l) => l.id === logId);
    if (!log) return { success: false, message: '找不到該筆操作日誌' };
    if (!log.canUndo) return { success: false, message: '此項操作不支援單步撤銷，請使用歷史版本快照進行整體還原' };
    if (log.isReverted) return { success: false, message: '此項操作先前已經被撤銷' };

    const payload = log.undoPayload;
    if (!payload) return { success: false, message: '日誌中缺少撤銷所需之還原數據' };

    let successMessage = '操作已成功撤銷';

    try {
      if (payload.actionToTake === 'delete_created_contribution') {
        const contribId = payload.targetId;
        if (contribId) {
          const contrib = contributions.find((c) => c.id === contribId);
          const pts = contrib ? contrib.points : payload.newData?.points || 0;
          const mId = contrib ? contrib.memberId : payload.newData?.memberId;

          setContributions((prev) => prev.filter((c) => c.id !== contribId));
          if (mId && pts > 0) {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === mId ? { ...m, totalPoints: Math.max(0, m.totalPoints - pts) } : m
              )
            );
          }

          const batch = writeBatch(db);
          batch.delete(doc(db, 'contributions', contribId));
          if (mId && pts > 0) {
            const cur = members.find((m) => m.id === mId);
            if (cur) {
              batch.update(doc(db, 'members', mId), {
                totalPoints: Math.max(0, cur.totalPoints - pts),
              });
            }
          }
          await batch.commit();
          successMessage = `已撤銷貢獻紀錄，扣除 ${pts} 分`;
        }
      } else if (payload.actionToTake === 'restore_deleted_contribution') {
        const prevContrib = payload.previousData as ContributionRecord;
        if (prevContrib) {
          setContributions((prev) => [prevContrib, ...prev]);
          if (prevContrib.memberId && prevContrib.points) {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === prevContrib.memberId
                  ? { ...m, totalPoints: m.totalPoints + prevContrib.points }
                  : m
              )
            );
          }

          const batch = writeBatch(db);
          batch.set(doc(db, 'contributions', prevContrib.id), cleanFirestoreData(prevContrib));
          if (prevContrib.memberId && prevContrib.points) {
            const cur = members.find((m) => m.id === prevContrib.memberId);
            if (cur) {
              batch.update(doc(db, 'members', prevContrib.memberId), {
                totalPoints: cur.totalPoints + prevContrib.points,
              });
            }
          }
          await batch.commit();
          successMessage = `已還原被刪除之貢獻紀錄【${prevContrib.title}】(+${prevContrib.points}分)`;
        }
      } else if (payload.actionToTake === 'delete_created_reward') {
        const rewardId = payload.targetId;
        if (rewardId) {
          const reward = rewards.find((r) => r.id === rewardId);
          const pts = reward ? reward.points : payload.newData?.points || 0;
          const mId = reward ? reward.memberId : payload.newData?.memberId;

          setRewards((prev) => prev.filter((r) => r.id !== rewardId));
          if (mId && pts > 0) {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === mId ? { ...m, totalPoints: Math.max(0, m.totalPoints - pts) } : m
              )
            );
          }

          const batch = writeBatch(db);
          batch.delete(doc(db, 'rewards', rewardId));
          if (mId && pts > 0) {
            const cur = members.find((m) => m.id === mId);
            if (cur) {
              batch.update(doc(db, 'members', mId), {
                totalPoints: Math.max(0, cur.totalPoints - pts),
              });
            }
          }
          await batch.commit();
          successMessage = `已撤銷所頒發之嘉許狀，扣除 ${pts} 分`;
        }
      } else if (payload.actionToTake === 'restore_deleted_reward') {
        const prevReward = payload.previousData as RewardRecord;
        if (prevReward) {
          setRewards((prev) => [prevReward, ...prev]);
          if (prevReward.memberId && prevReward.points) {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === prevReward.memberId
                  ? { ...m, totalPoints: m.totalPoints + prevReward.points }
                  : m
              )
            );
          }

          const batch = writeBatch(db);
          batch.set(doc(db, 'rewards', prevReward.id), cleanFirestoreData(prevReward));
          if (prevReward.memberId && prevReward.points) {
            const cur = members.find((m) => m.id === prevReward.memberId);
            if (cur) {
              batch.update(doc(db, 'members', prevReward.memberId), {
                totalPoints: cur.totalPoints + prevReward.points,
              });
            }
          }
          await batch.commit();
          successMessage = `已還原嘉許狀【${prevReward.title}】(+${prevReward.points}分)`;
        }
      } else if (payload.actionToTake === 'revoke_awarded_badge') {
        const mbId = payload.targetId;
        if (mbId) {
          const mb = memberBadges.find((b) => b.id === mbId);
          const badge = mb ? badges.find((b) => b.id === mb.badgeId) : null;
          const pts = badge ? badge.pointsReward : 0;
          const mId = mb ? mb.memberId : undefined;

          setMemberBadges((prev) => prev.filter((b) => b.id !== mbId));
          if (mId && pts > 0) {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === mId ? { ...m, totalPoints: Math.max(0, m.totalPoints - pts) } : m
              )
            );
          }

          const batch = writeBatch(db);
          batch.delete(doc(db, 'memberBadges', mbId));
          if (mId && pts > 0) {
            const cur = members.find((m) => m.id === mId);
            if (cur) {
              batch.update(doc(db, 'members', mId), {
                totalPoints: Math.max(0, cur.totalPoints - pts),
              });
            }
          }
          await batch.commit();
          successMessage = `已撤銷特批頒發之徽章，並校正點數`;
        }
      } else if (payload.actionToTake === 'restore_committee_role') {
        const mId = payload.targetId;
        const prevRole = payload.previousData;
        if (mId && prevRole) {
          setMembers((prev) =>
            prev.map((m) => (m.id === mId ? { ...m, ...prevRole } : m))
          );
          await updateDoc(doc(db, 'members', mId), prevRole);
          successMessage = `已還原該社員之幹事職務`;
        }
      } else if (payload.actionToTake === 'delete_created_member') {
        const mId = payload.targetId;
        if (mId) {
          setMembers((prev) => prev.filter((m) => m.id !== mId));
          await deleteDoc(doc(db, 'members', mId));
          successMessage = `已撤銷新增該社員帳號`;
        }
      } else if (payload.actionToTake === 'restore_deleted_member') {
        const prevMember = payload.previousData as Member;
        if (prevMember) {
          setMembers((prev) => [prevMember, ...prev]);
          await setDoc(doc(db, 'members', prevMember.id), cleanFirestoreData(prevMember));
          successMessage = `已復原被刪除社員【${prevMember.name}】`;
        }
      } else if (payload.actionToTake === 'restore_batch_deleted_members') {
        const prevMembers = (payload.previousMembers || payload.previousData) as Member[];
        if (prevMembers && prevMembers.length > 0) {
          setMembers((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const toAdd = prevMembers.filter((m) => !existingIds.has(m.id));
            return [...toAdd, ...prev];
          });
          for (const m of prevMembers) {
            try {
              await setDoc(doc(db, 'members', m.id), cleanFirestoreData(m));
            } catch (err) {
              console.error('Error restoring member in batch:', err);
            }
          }
          successMessage = `已批次復原 ${prevMembers.length} 位被刪除之社員`;
        }
      }

      // Mark the log as reverted
      const nowStr = new Date().toLocaleString('zh-HK', { hour12: false });
      setActivityLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                isReverted: true,
                revertedAt: nowStr,
                revertedBy: currentUser.name,
              }
            : l
        )
      );

      try {
        await updateDoc(doc(db, 'activityLogs', logId), {
          isReverted: true,
          revertedAt: nowStr,
          revertedBy: currentUser.name,
        });
      } catch (err) {
        console.error('Firebase update log error:', err);
      }

      // Log the undo action itself
      await logActivity({
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        actionType: 'undo_action',
        entityType: log.entityType,
        title: `撤銷操作：${log.title}`,
        details: `由 ${currentUser.name} (${currentUser.role === 'master' ? '系統管理員' : '老師管理員'}) 成功執行撤銷。`,
        canUndo: false,
      });

      return { success: true, message: successMessage };
    } catch (err) {
      console.error('Undo execution error:', err);
      return { success: false, message: '撤銷過程中發生錯誤：' + String(err) };
    }
  };

  const deleteSnapshot = async (snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    try {
      await deleteDoc(doc(db, 'snapshots', snapshotId));
    } catch (err) {
      console.error('Firebase deleteSnapshot error:', err);
    }
  };

  const clearActivityLogs = async () => {
    try {
      const snap = await getDocs(collection(db, 'activityLogs'));
      const batchOps: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
      snap.forEach((d) => batchOps.push((b) => b.delete(d.ref)));
      await commitInBatches(batchOps);
    } catch (err) {
      console.error('Firebase clearActivityLogs error:', err);
    }
    setActivityLogs([]);
    localStorage.removeItem(STORAGE_KEY_ACTIVITY_LOGS);
  };

  const addMember = async (data: Omit<Member, 'id' | 'totalPoints' | 'status'>) => {
    const newId = `M${Date.now().toString().slice(-4)}`;
    const newMember: Member = {
      ...data,
      id: newId,
      studentId: data.studentId && data.studentId.trim() ? data.studentId.trim() : '-',
      englishName: data.englishName && data.englishName.trim() ? data.englishName.trim() : '-',
      totalPoints: 10,
      status: 'active',
      avatar: data.avatar || '',
    };

    setMembers((prev) => [newMember, ...prev]);

    // Automatically award new member badge
    const newMemberBadge: MemberBadgeRecord = {
      id: `mb_${Date.now()}`,
      memberId: newId,
      badgeId: 'badge_new_reverence',
      awardedAt: new Date().toISOString().split('T')[0],
      reason: '新入社註冊認證',
      awardedBy: '敬社系統',
    };
    setMemberBadges((prev) => [...prev, newMemberBadge]);

    // Cloud persistence
    try {
      await setDoc(doc(db, 'members', newId), newMember);
      await setDoc(doc(db, 'memberBadges', newMemberBadge.id), newMemberBadge);
    } catch (err) {
      console.error('Firebase addMember error:', err);
    }

    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'add_member',
      entityType: 'member',
      title: `新增社員：${newMember.name} (${newMember.class})`,
      details: `學號：${newMember.studentId}，賦予新入社認證徽章與起始積分 10 分。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'delete_created_member',
        targetId: newId,
      },
    });

    triggerCelebration();
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );

    try {
      await updateDoc(doc(db, 'members', id), updates);
    } catch (err) {
      console.error('Firebase updateMember error:', err);
    }
  };

  const deleteMember = async (id: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;

    setMembers((prev) => prev.filter((m) => m.id !== id));
    setRewards((prev) => prev.filter((r) => r.memberId !== id));
    setContributions((prev) => prev.filter((c) => c.memberId !== id));
    setMemberBadges((prev) => prev.filter((b) => b.memberId !== id));

    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (err) {
      console.error('Firebase deleteMember error:', err);
    }

    await logActivity({
      operatorId: currentUser?.id || 'SYSTEM',
      operatorName: currentUser?.name || '管理員',
      operatorRole: currentUser?.role || 'teacher',
      actionType: 'delete_member',
      entityType: 'member',
      title: `刪除社員檔案：${target.name} (${target.class})`,
      details: `學號：${target.studentId}，原累積點數 ${target.totalPoints} 分，職銜：${target.committeeTitle}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'restore_deleted_member',
        targetId: id,
        previousData: target,
      },
    });
  };

  const deleteMembersBatch = async (ids: string[]): Promise<{ deletedCount: number }> => {
    if (!ids || ids.length === 0) return { deletedCount: 0 };

    // Safeguard: protect system master admin from accidental batch deletion
    const validIds = ids.filter((id) => {
      const m = members.find((mem) => mem.id === id);
      return m && m.role !== 'master';
    });

    if (validIds.length === 0) return { deletedCount: 0 };

    const targetMembers = members.filter((m) => validIds.includes(m.id));
    const targetNames = targetMembers.map((m) => `${m.name}(${m.class})`).slice(0, 5).join('、');
    const summarySuffix = targetMembers.length > 5 ? `等共 ${targetMembers.length} 位` : `（共 ${targetMembers.length} 位）`;

    // 1. Safety snapshot before batch deletion
    await createSnapshot(
      `批次刪除社員存檔 (${new Date().toLocaleTimeString('zh-HK', { hour12: false })})`,
      `批次刪除 ${targetMembers.length} 位成員前之自動安全備份`
    );

    // 2. Commit Firestore batch
    try {
      const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
      validIds.forEach((id) => {
        ops.push((batch) => batch.delete(doc(db, 'members', id)));
      });
      await commitInBatches(ops);
    } catch (err) {
      console.error('Firebase deleteMembersBatch error:', err);
    }

    // 3. Update local state
    setMembers((prev) => prev.filter((m) => !validIds.includes(m.id)));
    setRewards((prev) => prev.filter((r) => !validIds.includes(r.memberId)));
    setContributions((prev) => prev.filter((c) => !validIds.includes(c.memberId)));
    setMemberBadges((prev) => prev.filter((b) => !validIds.includes(b.memberId)));

    // 4. Log activity
    await logActivity({
      operatorId: currentUser?.id || 'SYSTEM',
      operatorName: currentUser?.name || '管理員',
      operatorRole: currentUser?.role || 'teacher',
      actionType: 'batch_delete_members',
      entityType: 'member',
      title: `批次刪除社員：${targetNames}${summarySuffix}`,
      details: `成功自名冊移除 ${targetMembers.length} 位社員及其關聯檔案資料。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'restore_batch_deleted_members',
        previousMembers: targetMembers,
      },
    });

    return { deletedCount: validIds.length };
  };

  const setMemberPasscode = async (memberId: string, passcode: string) => {
    const trimmed = passcode.trim();
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, passcode: trimmed } : m))
    );
    try {
      await updateDoc(doc(db, 'members', memberId), { passcode: trimmed });
    } catch (err) {
      console.error('Firebase setMemberPasscode error:', err);
    }
  };

  const clearAllAccounts = async () => {
    try {
      const snap = await getDocs(collection(db, 'members'));
      const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
      snap.forEach((d) => {
        ops.push((batch) => batch.delete(d.ref));
      });
      await commitInBatches(ops);
    } catch (err) {
      console.error('Firebase clearAllAccounts error:', err);
    }
    setMembers([]);
    localStorage.removeItem(STORAGE_KEY_MEMBERS);
  };

  const batchUploadMembers = async (
    items: Array<{
      studentId?: string;
      name: string;
      englishName?: string;
      class: string;
      classNumber?: string;
      role?: UserRole;
      committeeTitle?: string;
      committeeRoleKey?: CommitteeRoleKey;
      email?: string;
      phone?: string;
      passcode?: string;
    }>
  ): Promise<{ addedCount: number; updatedCount: number }> => {
    // Automatically create safety snapshot before batch upload
    await createSnapshot(
      `名單批次匯入前存檔 (${new Date().toLocaleTimeString('zh-HK', { hour12: false })})`,
      `匯入 ${items.length} 筆社員資料前之自動安全備份`
    );

    let addedCount = 0;
    let updatedCount = 0;

    const currentYear = new Date().getFullYear();
    const updatedMemberList = [...members];
    const newBadgesToAdd: MemberBadgeRecord[] = [];
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];

    items.forEach((item, index) => {
      const effectiveStudentId = item.studentId && item.studentId.trim() ? item.studentId.trim() : '-';
      const effectiveEnglishName = item.englishName && item.englishName.trim() ? item.englishName.trim() : '-';
      const effectiveClass = item.class && item.class.trim() ? item.class.trim() : '1A';
      const effectiveClassNumber = item.classNumber && item.classNumber.trim() ? item.classNumber.trim() : '';

      const existingIndex = effectiveStudentId !== '-'
        ? updatedMemberList.findIndex(
            (m) => m.studentId && m.studentId.trim().toLowerCase() === effectiveStudentId.toLowerCase()
          )
        : updatedMemberList.findIndex(
            (m) => m.name.trim().toLowerCase() === item.name.trim().toLowerCase() && m.class.trim().toUpperCase() === effectiveClass.toUpperCase()
          );

      if (existingIndex >= 0) {
        // Update existing member
        const existing = updatedMemberList[existingIndex];
        const updatedItem: Member = cleanFirestoreData({
          ...existing,
          name: item.name || existing.name,
          englishName: effectiveEnglishName !== '-' ? effectiveEnglishName : (existing.englishName || '-'),
          studentId: effectiveStudentId !== '-' ? effectiveStudentId : (existing.studentId || '-'),
          class: effectiveClass || existing.class,
          classNumber: effectiveClassNumber || existing.classNumber || '',
          role: item.role || existing.role,
          committeeRoleKey: item.committeeRoleKey || existing.committeeRoleKey || 'none',
          committeeTitle: item.committeeTitle || existing.committeeTitle || (item.role === 'committee' ? '學生幹事' : '普通社員'),
        });
        updatedMemberList[existingIndex] = updatedItem;
        ops.push((batch) => batch.set(doc(db, 'members', updatedItem.id), updatedItem));
        updatedCount++;
      } else {
        // Add new member
        const newId = effectiveStudentId !== '-'
          ? `M_${effectiveStudentId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
          : `M_${Date.now()}_${index}`;

        const newMember: Member = cleanFirestoreData({
          id: newId,
          studentId: effectiveStudentId,
          name: item.name,
          englishName: effectiveEnglishName,
          class: effectiveClass,
          classNumber: effectiveClassNumber,
          role: item.role || 'member',
          committeeRoleKey: item.committeeRoleKey || 'none',
          committeeTitle: item.committeeTitle || (item.role === 'committee' ? '學生幹事' : '普通社員'),
          avatar: '',
          joinedYear: currentYear,
          totalPoints: 10,
          status: 'active',
          email: item.email || '',
          phone: item.phone || '',
          passcode: item.passcode || '',
        });
        updatedMemberList.push(newMember);
        ops.push((batch) => batch.set(doc(db, 'members', newId), newMember));

        const newBadge: MemberBadgeRecord = {
          id: `mb_${Date.now()}_${index}`,
          memberId: newId,
          badgeId: 'badge_new_reverence',
          awardedAt: new Date().toISOString().split('T')[0],
          reason: '名單批次匯入新入社認證',
          awardedBy: '管理員批次匯入',
        };
        newBadgesToAdd.push(newBadge);
        ops.push((batch) => batch.set(doc(db, 'memberBadges', newBadge.id), newBadge));
        addedCount++;
      }
    });

    setMembers(updatedMemberList);
    if (newBadgesToAdd.length > 0) {
      setMemberBadges((prev) => [...prev, ...newBadgesToAdd]);
    }

    try {
      await commitInBatches(ops);
    } catch (err) {
      console.error('Firebase batchUploadMembers commit error:', err);
    }

    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'batch_import',
      entityType: 'member',
      title: `批次匯入社員名冊 (${items.length}筆)`,
      details: `新增社員：${addedCount} 人，更新資料：${updatedCount} 人。已於匯入前自動建立版本快照。`,
      canUndo: false,
    });

    triggerCelebration();
    return { addedCount, updatedCount };
  };

  const updateCommitteeRole = async (
    memberId: string,
    roleKey: CommitteeRoleKey,
    title: string
  ) => {
    const target = members.find((m) => m.id === memberId);
    const prevData = target
      ? {
          role: target.role,
          committeeRoleKey: target.committeeRoleKey,
          committeeTitle: target.committeeTitle,
        }
      : undefined;

    const isComm = roleKey !== 'none';
    const updates = {
      role: isComm ? ('committee' as const) : ('member' as const),
      committeeRoleKey: roleKey,
      committeeTitle: title,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
    );

    try {
      await updateDoc(doc(db, 'members', memberId), updates);
    } catch (err) {
      console.error('Firebase updateCommitteeRole error:', err);
    }

    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'update_committee',
      entityType: 'member',
      title: `任命幹事職位：${target?.name || memberId} -> ${title}`,
      details: `幹事職務代號：${roleKey}，原職位：${prevData?.committeeTitle || '普通社員'}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'restore_committee_role',
        targetId: memberId,
        previousData: prevData,
      },
    });
  };

  const addReward = async (data: Omit<RewardRecord, 'id' | 'date'> & { date?: string }) => {
    const id = `rew_${Date.now()}`;
    const date = data.date || new Date().toISOString().split('T')[0];
    const newReward: RewardRecord = {
      ...data,
      id,
      date,
    };

    setRewards((prev) => [newReward, ...prev]);

    let updatedPoints = 0;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === data.memberId) {
          updatedPoints = m.totalPoints + (data.points || 0);
          return { ...m, totalPoints: updatedPoints };
        }
        return m;
      })
    );

    let newBadgeRecord: MemberBadgeRecord | null = null;
    if (data.badgeAwardedId) {
      const alreadyHas = memberBadges.some(
        (b) => b.memberId === data.memberId && b.badgeId === data.badgeAwardedId
      );
      if (!alreadyHas) {
        newBadgeRecord = {
          id: `mb_${Date.now()}`,
          memberId: data.memberId,
          badgeId: data.badgeAwardedId!,
          awardedAt: date,
          reason: `隨獎項【${data.title}】頒授`,
          awardedBy: data.awardedBy,
        };
        setMemberBadges((prev) => [...prev, newBadgeRecord!]);
      }
    }

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'rewards', id), newReward);
      if (updatedPoints > 0) {
        batch.update(doc(db, 'members', data.memberId), { totalPoints: updatedPoints });
      }
      if (newBadgeRecord) {
        batch.set(doc(db, 'memberBadges', newBadgeRecord.id), newBadgeRecord);
      }
      await batch.commit();
    } catch (err) {
      console.error('Firebase addReward commit error:', err);
    }

    const targetMember = members.find((m) => m.id === data.memberId);
    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'add_reward',
      entityType: 'reward',
      title: `頒發嘉許狀：${data.title} -> ${targetMember?.name || data.memberId} (+${data.points || 0}分)`,
      details: `嘉許類別：${data.category}，頒發者：${data.awardedBy}，理由：${data.comment || '無'}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'delete_created_reward',
        targetId: id,
        newData: newReward,
      },
    });

    triggerCelebration();
  };

  const addContribution = async (
    data: Omit<ContributionRecord, 'id' | 'date' | 'status'> & {
      date?: string;
      status?: 'verified' | 'pending';
    }
  ) => {
    const id = `con_${Date.now()}`;
    const date = data.date || new Date().toISOString().split('T')[0];
    const newContribution: ContributionRecord = {
      ...data,
      id,
      date,
      status: data.status || 'verified',
    };

    setContributions((prev) => [newContribution, ...prev]);

    // Check if contribution title confers a house post
    let postUpdates: Partial<Member> = {};
    if (data.title.includes('社長') && !data.title.includes('副')) {
      postUpdates = { committeeTitle: '社長', role: 'committee', committeeRoleKey: 'chairperson' };
    } else if (data.title.includes('副社長')) {
      postUpdates = { committeeTitle: '副社長', role: 'committee', committeeRoleKey: 'vice_chairperson' };
    } else if (data.title.includes('社職員')) {
      postUpdates = { committeeTitle: '社職員', role: 'committee', committeeRoleKey: 'general' };
    }

    let newTotalPoints = 0;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === data.memberId) {
          newTotalPoints = (m.totalPoints || 0) + (data.points || 0);
          return { ...m, ...postUpdates, totalPoints: newTotalPoints };
        }
        return m;
      })
    );

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'contributions', id), newContribution);
      const memberDocUpdates: any = { ...postUpdates };
      if (newTotalPoints > 0) {
        memberDocUpdates.totalPoints = newTotalPoints;
      }
      if (Object.keys(memberDocUpdates).length > 0) {
        batch.update(doc(db, 'members', data.memberId), memberDocUpdates);
      }
      await batch.commit();
    } catch (err) {
      console.error('Firebase addContribution commit error:', err);
    }

    const targetMember = members.find((m) => m.id === data.memberId);
    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'add_contribution',
      entityType: 'contribution',
      title: `登記社員貢獻：${data.title} -> ${targetMember?.name || data.memberId} (+${data.points || 0}分)`,
      details: `類別：${data.category}，記錄者：${data.recordedBy}，日期：${date}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'delete_created_contribution',
        targetId: id,
        newData: newContribution,
      },
    });

    triggerCelebration();
  };

  const awardBadge = async (
    memberId: string,
    badgeId: string,
    reason: string,
    awardedBy: string
  ) => {
    const alreadyHas = memberBadges.some(
      (b) => b.memberId === memberId && b.badgeId === badgeId
    );
    if (alreadyHas) return;

    const badge = badges.find((b) => b.id === badgeId);
    const newBadgeRecord: MemberBadgeRecord = {
      id: `mb_${Date.now()}`,
      memberId,
      badgeId,
      awardedAt: new Date().toISOString().split('T')[0],
      reason: reason || '榮譽嘉獎',
      awardedBy,
    };

    setMemberBadges((prev) => [...prev, newBadgeRecord]);

    let newPoints = 0;
    if (badge && badge.pointsReward > 0) {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            newPoints = m.totalPoints + badge.pointsReward;
            return { ...m, totalPoints: newPoints };
          }
          return m;
        })
      );
    }

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'memberBadges', newBadgeRecord.id), newBadgeRecord);
      if (newPoints > 0) {
        batch.update(doc(db, 'members', memberId), { totalPoints: newPoints });
      }
      await batch.commit();
    } catch (err) {
      console.error('Firebase awardBadge commit error:', err);
    }

    const targetMember = members.find((m) => m.id === memberId);
    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'award_badge',
      entityType: 'badge',
      title: `特批頒授勳章：${badge?.name || badgeId} -> ${targetMember?.name || memberId}`,
      details: `頒授勳章等級：${badge?.tier || 'gold'}，獎勵加分：+${badge?.pointsReward || 0}分，頒發者：${awardedBy}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'revoke_awarded_badge',
        targetId: newBadgeRecord.id,
      },
    });

    triggerCelebration();
  };

  const deleteContribution = async (id: string) => {
    const target = contributions.find((c) => c.id === id);
    if (!target) return;

    setContributions((prev) => prev.filter((c) => c.id !== id));

    if (target.points && target.memberId) {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === target.memberId) {
            const updated = Math.max(0, m.totalPoints - target.points);
            return { ...m, totalPoints: updated };
          }
          return m;
        })
      );
    }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'contributions', id));
      if (target.points && target.memberId) {
        const currentMember = members.find((m) => m.id === target.memberId);
        if (currentMember) {
          const updated = Math.max(0, currentMember.totalPoints - target.points);
          batch.update(doc(db, 'members', target.memberId), { totalPoints: updated });
        }
      }
      await batch.commit();
    } catch (err) {
      console.error('Firebase deleteContribution error:', err);
    }

    const m = members.find((mem) => mem.id === target.memberId);
    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'delete_contribution',
      entityType: 'contribution',
      title: `刪除貢獻紀錄：${target.title} (${m?.name || target.memberId})`,
      details: `原登記貢獻扣回 ${target.points} 分，原記錄者：${target.recordedBy}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'restore_deleted_contribution',
        targetId: id,
        previousData: target,
      },
    });
  };

  const deleteReward = async (id: string) => {
    const target = rewards.find((r) => r.id === id);
    if (!target) return;

    setRewards((prev) => prev.filter((r) => r.id !== id));

    if (target.points && target.memberId) {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === target.memberId) {
            const updated = Math.max(0, m.totalPoints - target.points);
            return { ...m, totalPoints: updated };
          }
          return m;
        })
      );
    }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'rewards', id));
      if (target.points && target.memberId) {
        const currentMember = members.find((m) => m.id === target.memberId);
        if (currentMember) {
          const updated = Math.max(0, currentMember.totalPoints - target.points);
          batch.update(doc(db, 'members', target.memberId), { totalPoints: updated });
        }
      }
      await batch.commit();
    } catch (err) {
      console.error('Firebase deleteReward error:', err);
    }

    const m = members.find((mem) => mem.id === target.memberId);
    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'delete_reward',
      entityType: 'reward',
      title: `刪除嘉許狀紀錄：${target.title} (${m?.name || target.memberId})`,
      details: `扣回獎項積分 ${target.points} 分，原頒發者：${target.awardedBy}。`,
      canUndo: true,
      undoPayload: {
        actionToTake: 'restore_deleted_reward',
        targetId: id,
        previousData: target,
      },
    });
  };

  const revokeMemberBadge = async (id: string) => {
    const target = memberBadges.find((mb) => mb.id === id);
    if (!target) return;

    setMemberBadges((prev) => prev.filter((mb) => mb.id !== id));

    const badge = badges.find((b) => b.id === target.badgeId);
    if (badge && badge.pointsReward > 0 && target.memberId) {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === target.memberId) {
            const updated = Math.max(0, m.totalPoints - badge.pointsReward);
            return { ...m, totalPoints: updated };
          }
          return m;
        })
      );
    }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'memberBadges', id));
      if (badge && badge.pointsReward > 0 && target.memberId) {
        const currentMember = members.find((m) => m.id === target.memberId);
        if (currentMember) {
          const updated = Math.max(0, currentMember.totalPoints - badge.pointsReward);
          batch.update(doc(db, 'members', target.memberId), { totalPoints: updated });
        }
      }
      await batch.commit();
    } catch (err) {
      console.error('Firebase revokeMemberBadge error:', err);
    }

    const m = members.find((mem) => mem.id === target.memberId);
    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'revoke_badge',
      entityType: 'badge',
      title: `收回徽章紀錄：${badge?.name || target.badgeId} (${m?.name || target.memberId})`,
      details: `收回徽章並校正扣除 ${badge?.pointsReward || 0} 分。`,
      canUndo: false,
    });
  };

  const getMemberBadges = (memberId: string) => {
    return memberBadges.filter((b) => b.memberId === memberId);
  };

  const getMemberRewards = (memberId: string) => {
    return rewards.filter((r) => r.memberId === memberId);
  };

  const getMemberContributions = (memberId: string) => {
    return contributions.filter((c) => c.memberId === memberId);
  };

  // --- Master Admin Right 1: Badges renaming & editing ---
  const renameBadge = async (id: string, newName: string) => {
    setBadges((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b))
    );
    try {
      await updateDoc(doc(db, 'badges', id), { name: newName });
    } catch (err) {
      console.error('Firebase renameBadge error:', err);
    }
  };

  const updateBadge = async (id: string, updates: Partial<Badge>) => {
    setBadges((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    try {
      await updateDoc(doc(db, 'badges', id), updates);
    } catch (err) {
      console.error('Firebase updateBadge error:', err);
    }
  };

  const addBadge = async (newBadge: Badge) => {
    setBadges((prev) => [...prev, newBadge]);
    try {
      await setDoc(doc(db, 'badges', newBadge.id), newBadge);
    } catch (err) {
      console.error('Firebase addBadge error:', err);
    }
    triggerCelebration();
  };

  const deleteBadge = async (id: string) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteDoc(doc(db, 'badges', id));
    } catch (err) {
      console.error('Firebase deleteBadge error:', err);
    }
  };

  // --- Master Admin Right 2: Roll over to new school year ---
  const rolloverSchoolYear = async (targetYear: string, note?: string) => {
    // Automatically create a safety snapshot before rollover
    await createSnapshot(
      `學年交接前存檔 (${schoolYear.currentYear})`,
      `執行交接至【${targetYear}】前之自動安全版本快照`
    );

    let promotedCount = 0;
    let graduatedCount = 0;

    const promoteClass = (cls: string): { newClass: string; isGraduated: boolean } => {
      const trimmed = cls.trim();
      const isForm6 = /(?:^|\b)(?:S|F|FORM)?\s*6[A-Z0-9]*/i.test(trimmed);
      if (isForm6) {
        return { newClass: `中六畢業 (${trimmed})`, isGraduated: true };
      }

      const formMatch = trimmed.match(/^([A-Za-z\.]*?)([1-5])([A-Za-z0-9]*)$/);
      if (formMatch) {
        const prefix = formMatch[1] || '';
        const num = parseInt(formMatch[2], 10);
        const suffix = formMatch[3] || '';
        return { newClass: `${prefix}${num + 1}${suffix}`, isGraduated: false };
      }

      return { newClass: trimmed, isGraduated: false };
    };

    const batch = writeBatch(db);

    const updated = members.map((m) => {
      if (m.role === 'master' || m.role === 'teacher') return m;
      if (m.status === 'graduated') return m;

      const { newClass, isGraduated } = promoteClass(m.class);
      if (isGraduated) {
        graduatedCount++;
        const item = {
          ...m,
          class: newClass,
          status: 'graduated' as const,
          committeeRoleKey: 'none' as const,
          committeeTitle: '畢業校友 (Alumni)',
        };
        batch.set(doc(db, 'members', m.id), item);
        return item;
      } else {
        promotedCount++;
        const item = {
          ...m,
          class: newClass,
          role: 'member' as const,
          committeeRoleKey: 'none' as const,
          committeeTitle: '普通社員',
        };
        batch.set(doc(db, 'members', m.id), item);
        return item;
      }
    });

    setMembers(updated);

    const historyRecord = {
      id: `roll_${Date.now()}`,
      fromYear: schoolYear.currentYear,
      toYear: targetYear,
      date: new Date().toISOString().split('T')[0],
      promotedCount,
      graduatedCount,
      performedBy: currentUser.name,
      note: note || `學年交接至 ${targetYear}`,
    };

    const newSchoolYearState = {
      currentYear: targetYear,
      rolloverHistory: [historyRecord, ...schoolYear.rolloverHistory],
    };

    setSchoolYear(newSchoolYearState);
    batch.set(doc(db, 'config', 'school_year'), newSchoolYearState);

    try {
      await batch.commit();
    } catch (err) {
      console.error('Firebase rollover commit error:', err);
    }

    await logActivity({
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      actionType: 'rollover_year',
      entityType: 'system',
      title: `學年交接：${schoolYear.currentYear} ➜ ${targetYear}`,
      details: `升班成功：${promotedCount} 人，畢業校友：${graduatedCount} 人。已於執行前自動建立全社版本快照。`,
      canUndo: false,
    });

    triggerCelebration();
    return { promotedCount, graduatedCount };
  };

  // --- Master Admin Right 3: Reconcile member list discrepancies ---
  const applyMemberReconciliation = async (actions: {
    promotions: Array<{ id: string; newClass: string; newClassNumber?: string }>;
    graduations: string[];
    newStudents: Array<{
      studentId: string;
      name: string;
      englishName?: string;
      class: string;
      classNumber?: string;
    }>;
  }) => {
    let updatedCount = 0;
    let graduatedCount = 0;
    let addedCount = 0;

    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
    let list = [...members];

    // 1. Apply promotion / class updates
    actions.promotions.forEach((p) => {
      const idx = list.findIndex((m) => m.id === p.id);
      if (idx >= 0) {
        const updatedItem: Member = cleanFirestoreData({
          ...list[idx],
          class: p.newClass,
          classNumber: p.newClassNumber !== undefined ? p.newClassNumber : (list[idx].classNumber || ''),
          status: 'active' as const,
        });
        list[idx] = updatedItem;
        ops.push((batch) => batch.set(doc(db, 'members', list[idx].id), updatedItem));
        updatedCount++;
      }
    });

    // 2. Apply graduations
    actions.graduations.forEach((gId) => {
      const idx = list.findIndex((m) => m.id === gId);
      if (idx >= 0) {
        const updatedItem: Member = cleanFirestoreData({
          ...list[idx],
          status: 'graduated' as const,
          committeeRoleKey: 'none' as const,
          committeeTitle: '畢業校友 (Alumni)',
        });
        list[idx] = updatedItem;
        ops.push((batch) => batch.set(doc(db, 'members', list[idx].id), updatedItem));
        graduatedCount++;
      }
    });

    // 3. Add new students
    const newBadges: MemberBadgeRecord[] = [];
    const currentYearNum = new Date().getFullYear();
    actions.newStudents.forEach((ns, index) => {
      const effectiveStudentId = ns.studentId && ns.studentId.trim() ? ns.studentId.trim() : '-';
      const effectiveEnglishName = ns.englishName && ns.englishName.trim() ? ns.englishName.trim() : '-';
      const newId = effectiveStudentId !== '-'
        ? `M_${effectiveStudentId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
        : `M_${Date.now()}_${index}`;

      const newMember: Member = cleanFirestoreData({
        id: newId,
        studentId: effectiveStudentId,
        name: ns.name,
        englishName: effectiveEnglishName,
        class: ns.class || '1A',
        classNumber: ns.classNumber || '',
        role: 'member' as const,
        committeeRoleKey: 'none' as const,
        committeeTitle: '普通社員',
        avatar: '',
        joinedYear: currentYearNum,
        totalPoints: 10,
        status: 'active' as const,
        email: '',
        phone: '',
        passcode: '',
      });
      list.push(newMember);
      ops.push((batch) => batch.set(doc(db, 'members', newId), newMember));

      const newBadge: MemberBadgeRecord = {
        id: `mb_${Date.now()}_${index}`,
        memberId: newId,
        badgeId: 'badge_new_reverence',
        awardedAt: new Date().toISOString().split('T')[0],
        reason: '新學年名冊核對入社認證',
        awardedBy: '系統管理員名冊核對',
      };
      newBadges.push(newBadge);
      ops.push((batch) => batch.set(doc(db, 'memberBadges', newBadge.id), newBadge));
      addedCount++;
    });

    setMembers(list);
    if (newBadges.length > 0) {
      setMemberBadges((b) => [...b, ...newBadges]);
    }

    try {
      await commitInBatches(ops);
    } catch (err) {
      console.error('Firebase reconciliation commit error:', err);
    }

    triggerCelebration();
    return { updatedCount, graduatedCount, addedCount };
  };

  // --- Master Admin Right 4: Set contribution & awards reward points ---
  const updateContributionRule = async (key: string, updates: Partial<ContributionRule>) => {
    const updatedRules = contributionRules.map((r) =>
      r.key === key ? { ...r, ...updates } : r
    );
    setContributionRules(updatedRules);
    try {
      await setDoc(doc(db, 'config', 'contribution_rules'), { rules: updatedRules });
    } catch (err) {
      console.error('Firebase updateContributionRule error:', err);
    }
  };

  const addContributionRule = async (rule: ContributionRule) => {
    const updatedRules = [...contributionRules, rule];
    setContributionRules(updatedRules);
    try {
      await setDoc(doc(db, 'config', 'contribution_rules'), { rules: updatedRules });
    } catch (err) {
      console.error('Firebase addContributionRule error:', err);
    }
  };

  const deleteContributionRule = async (key: string) => {
    const updatedRules = contributionRules.filter((r) => r.key !== key);
    setContributionRules(updatedRules);
    try {
      await setDoc(doc(db, 'config', 'contribution_rules'), { rules: updatedRules });
    } catch (err) {
      console.error('Firebase deleteContributionRule error:', err);
    }
  };

  const updateAwardRule = async (id: string, updates: Partial<AwardRule>) => {
    const updatedRules = awardRules.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    setAwardRules(updatedRules);
    try {
      await setDoc(doc(db, 'config', 'award_rules'), { rules: updatedRules });
    } catch (err) {
      console.error('Firebase updateAwardRule error:', err);
    }
  };

  const addAwardRule = async (rule: AwardRule) => {
    const updatedRules = [...awardRules, rule];
    setAwardRules(updatedRules);
    try {
      await setDoc(doc(db, 'config', 'award_rules'), { rules: updatedRules });
    } catch (err) {
      console.error('Firebase addAwardRule error:', err);
    }
  };

  const deleteAwardRule = async (id: string) => {
    const updatedRules = awardRules.filter((r) => r.id !== id);
    setAwardRules(updatedRules);
    try {
      await setDoc(doc(db, 'config', 'award_rules'), { rules: updatedRules });
    } catch (err) {
      console.error('Firebase deleteAwardRule error:', err);
    }
  };

  // --- Master Admin Right 5: Add teacher admin account ---
  const addTeacherAdmin = async (data: {
    name: string;
    englishName?: string;
    studentId?: string;
    committeeTitle?: string;
    email?: string;
    phone?: string;
    passcode?: string;
    avatar?: string;
  }) => {
    const newId = `T${Date.now().toString().slice(-4)}`;
    const effectiveStudentId = data.studentId && data.studentId.trim() ? data.studentId.trim() : '-';
    const effectiveEnglishName = data.englishName && data.englishName.trim() ? data.englishName.trim() : '-';
    const newTeacher: Member = {
      id: newId,
      studentId: effectiveStudentId,
      name: data.name,
      englishName: effectiveEnglishName,
      class: 'STAFF',
      role: 'teacher',
      committeeRoleKey: 'none',
      committeeTitle: data.committeeTitle || '老師管理員',
      avatar: data.avatar || '',
      joinedYear: new Date().getFullYear(),
      totalPoints: 0,
      phone: data.phone || '2812-3400',
      email:
        data.email ||
        (effectiveEnglishName !== '-'
          ? `${effectiveEnglishName.toLowerCase().replace(/\s+/g, '.')}@school.edu.hk`
          : 'teacher@school.edu.hk'),
      status: 'active',
      passcode: data.passcode || 'TEA2026',
    };

    setMembers((prev) => [newTeacher, ...prev]);

    try {
      await setDoc(doc(db, 'members', newId), newTeacher);
    } catch (err) {
      console.error('Firebase addTeacherAdmin error:', err);
    }

    triggerCelebration();
    return newTeacher;
  };

  const updateTeacherAdmin = async (id: string, updates: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    try {
      await updateDoc(doc(db, 'members', id), updates);
    } catch (err) {
      console.error('Firebase updateTeacherAdmin error:', err);
    }
  };

  const deleteTeacherAdmin = async (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (err) {
      console.error('Firebase deleteTeacherAdmin error:', err);
    }
  };

  const createManualAccount = async (data: {
    role: UserRole;
    name: string;
    englishName?: string;
    studentId?: string;
    class?: string;
    classNumber?: string;
    committeeRoleKey?: CommitteeRoleKey;
    committeeTitle?: string;
    email?: string;
    phone?: string;
    passcode?: string;
    totalPoints?: number;
    avatar?: string;
    status?: 'active' | 'graduated' | 'inactive';
  }): Promise<Member> => {
    let prefix = 'M';
    if (data.role === 'master') prefix = 'ADM';
    else if (data.role === 'teacher') prefix = 'T';
    else if (data.role === 'committee') prefix = 'C';

    const newId = `${prefix}${Date.now().toString().slice(-4)}`;

    let defaultTitle = data.committeeTitle;
    if (!defaultTitle) {
      if (data.role === 'master') defaultTitle = '系統管理員';
      else if (data.role === 'teacher') defaultTitle = '敬社顧問老師';
      else if (data.role === 'committee') {
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
        defaultTitle = (data.committeeRoleKey && titleMap[data.committeeRoleKey]) || '敬社幹事';
      } else {
        defaultTitle = '普通社員';
      }
    }

    const effectiveStudentId = data.studentId && data.studentId.trim() ? data.studentId.trim() : '-';
    const effectiveEnglishName = data.englishName && data.englishName.trim() ? data.englishName.trim() : '-';

    const newAccount: Member = {
      id: newId,
      studentId: effectiveStudentId,
      name: data.name.trim(),
      englishName: effectiveEnglishName,
      class: data.class?.trim() || (data.role === 'master' ? 'ADMIN' : data.role === 'teacher' ? 'STAFF' : '1A'),
      classNumber: data.classNumber?.trim() || '',
      role: data.role,
      committeeRoleKey: data.committeeRoleKey || 'none',
      committeeTitle: defaultTitle,
      avatar: data.avatar?.trim() || '',
      joinedYear: new Date().getFullYear(),
      totalPoints:
        data.totalPoints !== undefined
          ? Number(data.totalPoints)
          : data.role === 'member' || data.role === 'committee'
          ? 10
          : 0,
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      status: data.status || 'active',
      passcode:
        data.passcode?.trim() ||
        (data.role === 'master'
          ? 'ADMIN2026'
          : data.role === 'teacher'
          ? 'TEA2026'
          : 'REVERENCE'),
    };

    let newMemberBadge: MemberBadgeRecord | null = null;
    if (data.role === 'member' || data.role === 'committee') {
      newMemberBadge = {
        id: `mb_${Date.now()}`,
        memberId: newId,
        badgeId: 'badge_new_reverence',
        awardedAt: new Date().toISOString().split('T')[0],
        reason: '系統管理員手動開戶註冊',
        awardedBy: '系統管理員',
      };
      setMemberBadges((prev) => [...prev, newMemberBadge!]);
    }

    setMembers((prev) => [newAccount, ...prev]);

    try {
      await setDoc(doc(db, 'members', newId), newAccount);
      if (newMemberBadge) {
        await setDoc(doc(db, 'memberBadges', newMemberBadge.id), newMemberBadge);
      }
    } catch (err) {
      console.error('Firebase createManualAccount error:', err);
    }

    triggerCelebration();
    return newAccount;
  };

  const resetToDefaults = async () => {
    try {
      const batch = writeBatch(db);
      const [mSnap, rSnap, cSnap, bSnap, mbSnap] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'rewards')),
        getDocs(collection(db, 'contributions')),
        getDocs(collection(db, 'badges')),
        getDocs(collection(db, 'memberBadges')),
      ]);

      mSnap.forEach((d) => batch.delete(d.ref));
      rSnap.forEach((d) => batch.delete(d.ref));
      cSnap.forEach((d) => batch.delete(d.ref));
      bSnap.forEach((d) => batch.delete(d.ref));
      mbSnap.forEach((d) => batch.delete(d.ref));

      INITIAL_MEMBERS.forEach((m) => batch.set(doc(db, 'members', m.id), m));
      INITIAL_REWARDS.forEach((r) => batch.set(doc(db, 'rewards', r.id), r));
      INITIAL_CONTRIBUTIONS.forEach((c) => batch.set(doc(db, 'contributions', c.id), c));
      INITIAL_BADGES.forEach((b) => batch.set(doc(db, 'badges', b.id), b));
      INITIAL_MEMBER_BADGES.forEach((mb) => batch.set(doc(db, 'memberBadges', mb.id), mb));

      batch.set(doc(db, 'config', 'school_year'), INITIAL_SCHOOL_YEAR);
      batch.set(doc(db, 'config', 'contribution_rules'), { rules: INITIAL_CONTRIBUTION_RULES });
      batch.set(doc(db, 'config', 'award_rules'), { rules: INITIAL_AWARD_RULES });

      await batch.commit();
    } catch (err) {
      console.error('Firebase resetToDefaults error:', err);
    }

    setMembers(INITIAL_MEMBERS);
    setRewards(INITIAL_REWARDS);
    setContributions(INITIAL_CONTRIBUTIONS);
    setBadges(INITIAL_BADGES);
    setMemberBadges(INITIAL_MEMBER_BADGES);
    setSchoolYear(INITIAL_SCHOOL_YEAR);
    setContributionRules(INITIAL_CONTRIBUTION_RULES);
    setAwardRules(INITIAL_AWARD_RULES);
    setCurrentUserId(null);
    localStorage.clear();
    localStorage.setItem('hor_version_marker', STORAGE_VERSION_KEY);
    triggerCelebration();
  };

  return (
    <HouseContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        logout,
        deleteMembersBatch,
        setMemberPasscode,
        members,
        rewards,
        contributions,
        badges,
        memberBadges,
        schoolYear,
        contributionRules,
        awardRules,
        isCloudSynced,
        setCurrentUserById,
        addMember,
        updateMember,
        deleteMember,
        clearAllAccounts,
        batchUploadMembers,
        updateCommitteeRole,
        addReward,
        deleteReward,
        addContribution,
        deleteContribution,
        awardBadge,
        revokeMemberBadge,
        getMemberBadges,
        getMemberRewards,
        getMemberContributions,
        getRankTitle,
        showBadgeLibrary,
        toggleBadgeLibraryVisibility,
        resetToDefaults,
        triggerCelebration,
        renameBadge,
        updateBadge,
        addBadge,
        deleteBadge,
        rolloverSchoolYear,
        applyMemberReconciliation,
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
        activityLogs,
        snapshots,
        logActivity,
        undoActivity,
        createSnapshot,
        revertToSnapshot,
        deleteSnapshot,
        clearActivityLogs,
      }}
    >
      {children}
    </HouseContext.Provider>
  );
};

export const useHouse = () => {
  const context = useContext(HouseContext);
  if (!context) {
    throw new Error('useHouse must be used within a HouseProvider');
  }
  return context;
};
