import { Member, ContributionRecord, RewardRecord } from '../types';

/**
 * Standardize student email: [studentId]@nlsipess.edu.hk
 * e.g. s2500123 -> s2500123@nlsipess.edu.hk
 * e.g. 2500123 -> s2500123@nlsipess.edu.hk
 */
export function getStandardStudentEmail(studentId?: string): string {
  if (!studentId || studentId === '-' || studentId.trim() === '') return '';
  const clean = studentId.trim().toLowerCase();
  const withPrefix = clean.startsWith('s') ? clean : `s${clean}`;
  return `${withPrefix}@nlsipess.edu.hk`;
}

/**
 * Extract student ID from input, which can be an email or student ID.
 * e.g. "s2500123@nlsipess.edu.hk" -> "s2500123"
 */
export function normalizeStudentIdOrEmail(input: string): {
  isEmail: boolean;
  cleanInput: string;
  studentIdCandidate: string;
} {
  const cleanInput = input.trim().toLowerCase();
  const isEmail = cleanInput.includes('@');
  let studentIdCandidate = cleanInput;

  if (isEmail) {
    studentIdCandidate = cleanInput.split('@')[0];
  }

  return { isEmail, cleanInput, studentIdCandidate };
}

/**
 * Robust comparator for Class and Class Number.
 * Examples:
 *  "1A" #01 < "1A" #02 < "1A" #25 < "1B" #01 < "2A" #01 < "6D" #30 < "STAFF" < "ADMIN"
 */
export function compareClassAndNumber(
  a: { class: string; classNumber?: string; name?: string; studentId?: string },
  b: { class: string; classNumber?: string; name?: string; studentId?: string }
): number {
  const parseClass = (cls: string) => {
    const clean = (cls || '').trim().toUpperCase();
    const match = clean.match(/^([1-6]|S[1-6]|F[1-6])([A-Z]+)$/);
    if (match) {
      const gradeDigit = parseInt(match[1].replace(/[^0-9]/g, ''), 10);
      return { grade: gradeDigit, section: match[2], isForm: true, raw: clean };
    }
    // Special non-form classes like STAFF, ADMIN, ALUMNI
    return { grade: 999, section: clean, isForm: false, raw: clean };
  };

  const classA = parseClass(a.class);
  const classB = parseClass(b.class);

  // Form classes come before non-form classes
  if (classA.isForm && classB.isForm) {
    if (classA.grade !== classB.grade) {
      return classA.grade - classB.grade;
    }
    if (classA.section !== classB.section) {
      return classA.section.localeCompare(classB.section);
    }
  } else if (classA.isForm !== classB.isForm) {
    return classA.isForm ? -1 : 1;
  } else {
    // Both non-form
    if (classA.raw !== classB.raw) {
      return classA.raw.localeCompare(classB.raw);
    }
  }

  // Parse class numbers
  const parseNum = (numStr?: string) => {
    if (!numStr) return 999;
    const n = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 999 : n;
  };

  const numA = parseNum(a.classNumber);
  const numB = parseNum(b.classNumber);

  if (numA !== numB) {
    return numA - numB;
  }

  // Secondary fallback: studentId then name
  const idA = a.studentId || '';
  const idB = b.studentId || '';
  if (idA && idB && idA !== idB) {
    return idA.localeCompare(idB);
  }

  return (a.name || '').localeCompare(b.name || '');
}

export type MemberSortField =
  | 'classAndNumber'
  | 'studentId'
  | 'sportsPoints'
  | 'nonSportsPoints'
  | 'totalPoints';

export interface MemberPointsBreakdown {
  sportsPoints: number;
  nonSportsPoints: number;
  totalPoints: number;
}

/**
 * Calculate sports vs non-sports points for each member
 */
export function computeAllMembersPoints(
  members: Member[],
  contributions: ContributionRecord[],
  rewards: RewardRecord[]
): Map<string, MemberPointsBreakdown> {
  const map = new Map<string, MemberPointsBreakdown>();

  for (const m of members) {
    map.set(m.id, {
      sportsPoints: 0,
      nonSportsPoints: 0,
      totalPoints: m.totalPoints || 0,
    });
  }

  for (const c of contributions) {
    const existing = map.get(c.memberId);
    if (existing) {
      if (c.category === 'sports') {
        existing.sportsPoints += c.points || 0;
      } else {
        existing.nonSportsPoints += c.points || 0;
      }
    }
  }

  for (const r of rewards) {
    const existing = map.get(r.memberId);
    if (existing) {
      if (r.category === 'sports') {
        existing.sportsPoints += r.points || 0;
      } else {
        existing.nonSportsPoints += r.points || 0;
      }
    }
  }

  // Calculate final accurate totalPoints for each member
  for (const m of members) {
    const existing = map.get(m.id);
    if (existing) {
      const isTeacherOrAdmin = m.role === 'teacher' || m.role === 'master';
      if (isTeacherOrAdmin) {
        existing.totalPoints = 0;
        continue;
      }

      const basePoints = 10;
      let roleBonus = 0;
      const title = (m.committeeTitle || '').replace(/^["']|["']$/g, '').trim();
      if (title === '社長') roleBonus = 60;
      else if (title === '副社長') roleBonus = 50;
      else if (title === '社職員') roleBonus = 40;

      const recordedContribSum = existing.sportsPoints + existing.nonSportsPoints;
      
      // If no separate contribution records for post bonus, reflect role bonus in non-sports
      if (roleBonus > 0 && recordedContribSum === 0) {
        existing.nonSportsPoints += roleBonus;
      }

      const calculatedTotal = basePoints + existing.sportsPoints + existing.nonSportsPoints;
      existing.totalPoints = Math.max(m.totalPoints || 0, calculatedTotal, basePoints + roleBonus);
    }
  }

  return map;
}

/**
 * Sorts an array of members based on sort field and order
 */
export function sortMembersList(
  membersList: Member[],
  sortBy: MemberSortField,
  sortOrder: 'asc' | 'desc',
  pointsMap: Map<string, MemberPointsBreakdown>
): Member[] {
  const copy = [...membersList];

  copy.sort((a, b) => {
    let result = 0;

    switch (sortBy) {
      case 'classAndNumber':
        result = compareClassAndNumber(a, b);
        break;

      case 'studentId': {
        const idA = (a.studentId || '').toLowerCase();
        const idB = (b.studentId || '').toLowerCase();
        result = idA.localeCompare(idB);
        break;
      }

      case 'sportsPoints': {
        const ptsA = pointsMap.get(a.id)?.sportsPoints ?? 0;
        const ptsB = pointsMap.get(b.id)?.sportsPoints ?? 0;
        result = ptsA - ptsB;
        break;
      }

      case 'nonSportsPoints': {
        const ptsA = pointsMap.get(a.id)?.nonSportsPoints ?? 0;
        const ptsB = pointsMap.get(b.id)?.nonSportsPoints ?? 0;
        result = ptsA - ptsB;
        break;
      }

      case 'totalPoints': {
        const ptsA = pointsMap.get(a.id)?.totalPoints ?? (a.totalPoints || 0);
        const ptsB = pointsMap.get(b.id)?.totalPoints ?? (b.totalPoints || 0);
        result = ptsA - ptsB;
        break;
      }

      default:
        result = compareClassAndNumber(a, b);
    }

    // If primary sort is tie and not already classAndNumber, break tie with classAndNumber
    if (result === 0 && sortBy !== 'classAndNumber') {
      return compareClassAndNumber(a, b);
    }

    return sortOrder === 'asc' ? result : -result;
  });

  return copy;
}
