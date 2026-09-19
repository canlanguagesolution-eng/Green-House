import React from 'react';
import {
  Sparkles,
  Flame,
  Trophy,
  Music,
  HeartHandshake,
  Award,
  Crown,
  ShieldCheck,
  Compass,
  Users,
  Coins,
  FileText,
  Activity,
  Star,
  Medal,
  Shield,
  Zap,
} from 'lucide-react';
import { BadgeTier } from '../types';

interface BadgeIconProps {
  iconName: string;
  tier: BadgeTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isUnlocked?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Flame,
  Trophy,
  Music,
  HeartHandshake,
  Award,
  Crown,
  ShieldCheck,
  Compass,
  Users,
  Coins,
  FileText,
  Activity,
  Star,
  Medal,
  Shield,
  Zap,
};

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  iconName,
  tier,
  size = 'md',
  isUnlocked = true,
}) => {
  const IconComponent = iconMap[iconName] || Shield;

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2.5',
    lg: 'w-16 h-16 p-3.5',
    xl: 'w-20 h-20 p-4',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-12 h-12',
  };

  const tierStyles = {
    bronze: isUnlocked
      ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-amber-100 shadow-md shadow-amber-900/20 border-2 border-amber-400/40'
      : 'bg-stone-200 text-stone-400 border border-stone-300 opacity-60',
    silver: isUnlocked
      ? 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-slate-900 shadow-md shadow-slate-900/15 border-2 border-slate-200'
      : 'bg-stone-200 text-stone-400 border border-stone-300 opacity-60',
    gold: isUnlocked
      ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-amber-950 shadow-md shadow-amber-500/25 border-2 border-yellow-200'
      : 'bg-stone-200 text-stone-400 border border-stone-300 opacity-60',
    diamond: isUnlocked
      ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-800 text-white shadow-lg shadow-emerald-600/30 border-2 border-emerald-200'
      : 'bg-stone-200 text-stone-400 border border-stone-300 opacity-60',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl transition-all duration-300 ${sizeClasses[size]} ${tierStyles[tier]}`}
    >
      <IconComponent className={iconSizes[size]} />
      {isUnlocked && tier === 'diamond' && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
        </span>
      )}
    </div>
  );
};
