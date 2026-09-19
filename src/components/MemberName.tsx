import React from 'react';

interface MemberNameProps {
  name: string;
  englishName?: string;
  className?: string;
  nameClassName?: string;
  englishClassName?: string;
  badge?: React.ReactNode;
}

/**
 * Standardized component for displaying member names:
 * Chinese name and English name in the same field/cell, with a line break after Chinese.
 */
export const MemberName: React.FC<MemberNameProps> = ({
  name,
  englishName,
  className = '',
  nameClassName = 'font-bold text-stone-900',
  englishClassName = 'text-xs text-stone-500 font-sans',
  badge,
}) => {
  const hasEnglish = Boolean(englishName && englishName.trim() !== '');

  return (
    <div className={`flex flex-col text-left leading-tight ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={nameClassName}>{name}</span>
        {badge}
      </div>
      {hasEnglish && (
        <span className={`${englishClassName} mt-0.5`}>
          {englishName}
        </span>
      )}
    </div>
  );
};
