export type UserRole = 'master' | 'teacher' | 'committee' | 'member';

// Role hierarchy level: higher number means higher privilege
export const ROLE_LEVELS: Record<UserRole, number> = {
  master: 4,     // 系統最高管理員
  teacher: 3,    // 老師管理員
  committee: 2,  // 學生管理員 (幹事會)
  member: 1,     // 敬社社員
};

/**
 * Check if a user's role has the authority of requiredRole or higher
 * (e.g. master has all teacher, committee, member rights; teacher has all committee, member rights)
 */
export const hasRoleOrHigher = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[requiredRole] ?? 0);
};

export type CommitteeRoleKey =
  | 'chairperson'        // 主席
  | 'vice_chairperson'   // 副主席
  | 'treasurer'          // 財政/司庫
  | 'secretary'          // 秘書
  | 'sports_captain'     // 體育幹事
  | 'recreation'         // 康樂與活動幹事
  | 'publicity'          // 宣傳美工幹事
  | 'general'            // 總務幹事
  | 'none';              // 普通社員

export interface Member {
  id: string;
  studentId?: string;
  name: string;
  englishName?: string;
  class: string;
  classNumber?: string;
  role: UserRole;
  committeeRoleKey: CommitteeRoleKey;
  committeeTitle: string; // 例如: "總社監", "主席", "副主席", "財政", "體育幹事", "普通社員"
  avatar?: string;
  joinedYear: number;
  totalPoints: number;
  phone?: string;
  email?: string;
  status: 'active' | 'graduated' | 'inactive';
  passcode?: string; // 登入密碼/代碼
}

export type RewardCategory = 'leadership' | 'academic' | 'sports' | 'arts' | 'service' | 'special';

export interface AwardRule {
  id: string;
  title: string;
  category: RewardCategory;
  defaultPoints: number;
  description: string;
  badgeAwardedId?: string;
}

export interface RewardRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberClass: string;
  memberRole: UserRole;
  title: string;
  category: RewardCategory;
  points: number;
  date: string;
  awardedBy: string; // 頒發老師姓名
  comment: string;
  badgeAwardedId?: string;
}

export type ContributionCategory =
  | 'sports'         // 社際體育（陸運會、水運會、球賽）
  | 'arts'           // 文藝比賽（歌唱、戲劇、演講、辯論）
  | 'cheering'       // 啦啦隊與助威
  | 'service'        // 社際義工與校園服務
  | 'organization'   // 活動籌備與執行
  | 'academic'       // 學術與問答比賽
  | string;          // 允許自訂擴展

export interface ContributionRule {
  key: string;
  label: string;
  description: string;
  defaultPoints: number;
  minPoints: number;
  maxPoints: number;
  iconName: string;
}

export interface ContributionRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberClass: string;
  title: string;
  category: ContributionCategory;
  points: number;
  date: string;
  recordedBy: string; // 記錄幹事姓名與職位
  recordedByRole: string;
  description: string;
  status: 'verified' | 'pending';
}

export type BadgeCategory = 'member' | 'committee' | 'both';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Badge {
  id: string;
  name: string;
  category: BadgeCategory;
  tier: BadgeTier;
  iconName: string; // Lucide icon identifier
  description: string;
  requirement: string;
  pointsReward: number;
  isSpecialTeacherOnly?: boolean;
}

export interface MemberBadgeRecord {
  id: string;
  memberId: string;
  badgeId: string;
  awardedAt: string;
  reason: string;
  awardedBy: string;
}

export interface SchoolYearInfo {
  currentYear: string; // 例: "2025-2026"
  rolloverHistory: Array<{
    id: string;
    fromYear: string;
    toYear: string;
    date: string;
    promotedCount: number;
    graduatedCount: number;
    performedBy: string;
    note?: string;
  }>;
}

export type ActivityActionType =
  | 'add_contribution'
  | 'delete_contribution'
  | 'add_reward'
  | 'delete_reward'
  | 'award_badge'
  | 'revoke_badge'
  | 'add_member'
  | 'update_member'
  | 'delete_member'
  | 'batch_delete_members'
  | 'batch_upload_members'
  | 'batch_import'
  | 'update_committee_role'
  | 'update_committee'
  | 'update_school_year'
  | 'rollover_year'
  | 'reconciliation'
  | 'update_rules'
  | 'undo_action'
  | 'revert_snapshot';

export type ActivityEntityType =
  | 'contribution'
  | 'reward'
  | 'badge'
  | 'member'
  | 'committee'
  | 'school_year'
  | 'rule'
  | 'system';

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  displayTime: string; // e.g. "2026-09-15 15:45:20"
  operatorId: string;
  operatorName: string;
  operatorRole: UserRole;
  actionType: ActivityActionType;
  entityType: ActivityEntityType;
  title: string;
  details: string;
  canUndo: boolean;
  isReverted?: boolean;
  revertedAt?: string;
  revertedBy?: string;
  undoPayload?: {
    actionToTake:
      | 'delete_created_contribution'
      | 'restore_deleted_contribution'
      | 'delete_created_reward'
      | 'restore_deleted_reward'
      | 'revoke_awarded_badge'
      | 'restore_revoked_badge'
      | 'delete_created_member'
      | 'restore_deleted_member'
      | 'restore_batch_deleted_members'
      | 'restore_member_state'
      | 'restore_committee_role';
    targetId?: string;
    previousData?: any;
    previousMembers?: Member[];
    newData?: any;
  };
}

export interface SystemVersionSnapshot {
  id: string;
  versionName: string; // e.g. "2026-09-15 15:30 (批次匯入前自動存檔)"
  timestamp: string;
  displayTime: string;
  createdBy: string;
  creatorRole: UserRole;
  note: string;
  membersCount: number;
  contributionsCount: number;
  rewardsCount: number;
  memberBadgesCount: number;
  totalPointsSum: number;
  snapshotData: {
    members: Member[];
    contributions: ContributionRecord[];
    rewards: RewardRecord[];
    memberBadges: MemberBadgeRecord[];
    schoolYear: SchoolYearInfo;
  };
}

