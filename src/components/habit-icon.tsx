'use client';

import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  BookOpen,
  Clock,
  Dumbbell,
  Leaf,
  Target,
  Carrot,
  Languages,
  GraduationCap,
  FolderKanban,
} from 'lucide-react';

const iconMap: { [key: string]: LucideIcon } = {
  Dumbbell,
  BookOpen,
  Leaf,
  Target,
  Clock,
  Carrot,
  Languages,
  GraduationCap,
  FolderKanban,
};

interface HabitIconProps extends LucideProps {
  name: string;
}

export function HabitIcon({ name, ...props }: HabitIconProps) {
  const Icon = iconMap[name];
  if (!Icon) {
    return null;
  }
  return <Icon {...props} />;
}
