'use client';

import type { Habit } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, TrendingUp, Zap } from 'lucide-react';
import { useMemo } from 'react';

interface DashboardSummaryProps {
    habits: Habit[];
}

export function DashboardSummary({ habits }: DashboardSummaryProps) {
    const { completedCount, totalCount, completionRate, streak } = useMemo(() => {
        const total = habits.length;
        const completed = habits.filter(h => h.completed).length;
        // Placeholder for streak logic
        const currentStreak = 5;
        return {
            completedCount: completed,
            totalCount: total,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            streak: currentStreak
        };
    }, [habits]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedCount} / {totalCount}</div>
                    <p className="text-xs text-muted-foreground">
                        {completionRate}% of your daily goals
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        +5% from last week
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{streak} days</div>
                    <p className="text-xs text-muted-foreground">
                        Keep up the great work!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
