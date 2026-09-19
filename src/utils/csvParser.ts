import { UserRole, CommitteeRoleKey } from '../types';

export interface ParsedRosterItem {
  studentId: string;
  name: string;
  englishName: string;
  class: string;
  classNumber: string;
  role: UserRole;
  committeeTitle: string;
  committeeRoleKey: CommitteeRoleKey;
}

/**
 * Universal CSV/TSV parser for school house member rosters.
 * Supports:
 * - BOM header stripping (\ufeff)
 * - Auto-detecting and skipping header rows (學號, 姓名, English Name, etc.)
 * - Formats:
 *   1. 學號, 姓名, 英文名, 班別, 社職位 (e.g. s2611004,黎殷彤,,1A,社員)
 *   2. 學號, 姓名, 英文名, 班別, 班號, 社職位
 *   3. 學號, 姓名, 班別, 班號, 社職位
 *   4. 學號, 姓名, 班別, 社職位
 *   5. 姓名, 班別, 班號/社職位
 */
export function parseRosterCSV(content: string): ParsedRosterItem[] {
  if (!content) return [];

  // Strip BOM if present and split into clean lines
  const rawLines = content
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) return [];

  const isHeaderLine = (line: string): boolean => {
    const l = line.toLowerCase();
    return (
      l.includes('學號') ||
      l.includes('姓名') ||
      l.includes('student') ||
      l.includes('name') ||
      l.includes('班別') ||
      l.includes('班級') ||
      l.includes('class') ||
      l.includes('職位')
    );
  };

  const startIndex = isHeaderLine(rawLines[0]) ? 1 : 0;
  const items: ParsedRosterItem[] = [];

  for (let i = startIndex; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line.startsWith('#')) continue;

    // Split by tab or comma, and strip any surrounding single/double quotes
    const stripQuotes = (val: string) => val.replace(/^["']|["']$/g, '').trim();
    const parts = line.includes('\t')
      ? line.split('\t').map(stripQuotes)
      : line.split(/[,，]/).map(stripQuotes);

    if (parts.length === 0 || !parts.some((p) => p.length > 0)) continue;

    let studentId = '-';
    let name = '';
    let englishName = '-';
    let className = '1A';
    let classNumber = '';
    let committeeTitle = '社員';

    const isClassFormat = (s: string) =>
      /^[1-6][A-Za-z]$|^S[1-6][A-Za-z]$|^F[1-6][A-Za-z]$/i.test(
        s.replace(/[^0-9a-zA-Z]/g, '')
      );

    if (parts.length === 5) {
      // 5-column cases:
      // A) 學號, 姓名, 英文名, 班別, 社職位 (User format!)
      // B) 學號, 姓名, 班別, 班號, 社職位
      // C) 學號, 姓名, 英文名, 班別, 班號
      studentId = parts[0] || '-';
      name = parts[1] || '';

      const part2 = parts[2] || '';
      const part3 = parts[3] || '';
      const part4 = parts[4] || '';

      if (isClassFormat(part3)) {
        // studentId, name, englishName, class, (title or classNumber)
        englishName = part2 || '-';
        className = part3.toUpperCase();
        if (/^\d+$/.test(part4)) {
          classNumber = part4;
          committeeTitle = '社員';
        } else {
          committeeTitle = part4 || '社員';
        }
      } else if (isClassFormat(part2)) {
        // studentId, name, class, classNumber, title
        className = part2.toUpperCase();
        classNumber = part3;
        committeeTitle = part4 || '社員';
      } else {
        englishName = part2 || '-';
        className = part3 || '1A';
        committeeTitle = part4 || '社員';
      }
    } else if (parts.length >= 6) {
      // 學號, 姓名, 英文名, 班別, 班號, 社職位
      studentId = parts[0] || '-';
      name = parts[1] || '';
      englishName = parts[2] || '-';
      className = parts[3] || '1A';
      classNumber = parts[4] || '';
      committeeTitle = parts[5] || '社員';
    } else if (parts.length === 4) {
      // 學號, 姓名, 班別, 社職位 OR 姓名, 英文名, 班別, 班號
      if (/^[sS]?\d/.test(parts[0])) {
        studentId = parts[0];
        name = parts[1];
        className = parts[2] || '1A';
        if (/^\d+$/.test(parts[3])) {
          classNumber = parts[3];
          committeeTitle = '社員';
        } else {
          committeeTitle = parts[3] || '社員';
        }
      } else {
        name = parts[0];
        englishName = parts[1] || '-';
        className = parts[2] || '1A';
        if (/^\d+$/.test(parts[3])) {
          classNumber = parts[3];
          committeeTitle = '社員';
        } else {
          committeeTitle = parts[3] || '社員';
        }
      }
    } else if (parts.length === 3) {
      // 姓名, 班別, 班號/職位 OR 學號, 姓名, 班別
      if (/^[sS]?\d/.test(parts[0])) {
        studentId = parts[0];
        name = parts[1];
        className = parts[2] || '1A';
      } else {
        name = parts[0];
        className = parts[1] || '1A';
        if (/^\d+$/.test(parts[2])) {
          classNumber = parts[2];
        } else {
          committeeTitle = parts[2] || '社員';
        }
      }
    } else if (parts.length <= 2) {
      name = parts[0] || '';
      className = parts[1] || '1A';
    }

    // Sanitize values: if name is empty but studentId looks like Chinese name
    if (!name && studentId !== '-' && /[\u4e00-\u9fa5]/.test(studentId)) {
      name = studentId;
      studentId = '-';
    }

    if (name) {
      let role: UserRole = 'member';
      let committeeRoleKey: CommitteeRoleKey = 'none';

      const titleClean = committeeTitle.trim();
      if (
        titleClean &&
        !titleClean.includes('社員') &&
        titleClean !== '普通' &&
        titleClean !== '-'
      ) {
        role = 'committee';
        if (titleClean.includes('副社長') || titleClean.includes('副主席')) {
          committeeRoleKey = 'vice_chairperson';
        } else if (
          titleClean.includes('社長') ||
          titleClean.includes('主席') ||
          titleClean.includes('社監')
        ) {
          committeeRoleKey = 'chairperson';
        } else if (titleClean.includes('財政') || titleClean.includes('司庫')) {
          committeeRoleKey = 'treasurer';
        } else if (titleClean.includes('秘書')) {
          committeeRoleKey = 'secretary';
        } else if (titleClean.includes('體育') || titleClean.includes('隊長')) {
          committeeRoleKey = 'sports_captain';
        } else if (titleClean.includes('宣傳') || titleClean.includes('美工')) {
          committeeRoleKey = 'publicity';
        } else if (titleClean.includes('康樂') || titleClean.includes('活動')) {
          committeeRoleKey = 'recreation';
        } else {
          committeeRoleKey = 'general';
        }
      }

      items.push({
        studentId: studentId.trim() || '-',
        name: name.trim(),
        englishName: englishName.trim() || '-',
        class: className.trim() || '1A',
        classNumber: classNumber.trim() || '',
        role,
        committeeTitle:
          committeeTitle.trim() || (role === 'committee' ? '學生幹事' : '普通社員'),
        committeeRoleKey,
      });
    }
  }

  return items;
}
