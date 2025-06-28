
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isToday,
  getDate,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import {
  getHabitsWithReportsForMonth,
  getHabitsWithReportsForWeek,
  getUniqueReportMonths,
} from '@/services/habits';
import type { Habit, HabitReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HabitIcon } from '@/components/habit-icon';

type WeeklyTableItem =
  | { isHeader: true; categoryName: string }
  | { isHeader: false; habit: Habit; reports: Map<string, string> };

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthsLoading, setIsMonthsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('table');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMonths() {
      if (!user) return;
      setIsMonthsLoading(true);
      try {
        const months = await getUniqueReportMonths(user.uid);
        const monthStrings = months.map(m => format(m, 'yyyy-MM'));
        setAvailableMonths(monthStrings);
        if (monthStrings.length > 0) {
          if (!selectedMonth) {
            setSelectedMonth(monthStrings[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch report months:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load available months for reports.',
        });
      } finally {
        setIsMonthsLoading(false);
      }
    }
    fetchMonths();
  }, [toast, selectedMonth, user]);

  useEffect(() => {
    async function fetchReports() {
      if (!user) return;
      setIsLoading(true);
      try {
        if (activeTab === 'calendar') {
          if (!selectedMonth) {
            setHabits([]);
            setIsLoading(false);
            return;
          }
          const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
          const fetchedHabits = await getHabitsWithReportsForMonth(user.uid, monthDate);
          setHabits(fetchedHabits);
        } else if (activeTab === 'table') {
          const fetchedHabits = await getHabitsWithReportsForWeek(user.uid, new Date());
          setHabits(fetchedHabits);
        }
      } catch (error) {
        console.error(`Failed to fetch reports for ${activeTab}:`, error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load report data.',
        });
        setHabits([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReports();
  }, [selectedMonth, activeTab, toast, user]);

  const { calendarGrid, reportsByDate } = useMemo(() => {
    if (!selectedMonth || activeTab !== 'calendar') return { calendarGrid: [], reportsByDate: new Map() };

    const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startingDayIndex = getDay(monthStart); // 0 for Sunday

    const grid: (Date | null)[] = Array(startingDayIndex).fill(null);
    grid.push(...daysInMonth);
    
    // Map<dayKey, Map<habitId, { habit, aggregatedValue }>>
    const aggregatedReportsByDay = new Map<string, Map<string, { habit: Habit; value: any }>>();

    habits.forEach(habit => {
        habit.reports.forEach(report => {
            const dayKey = format(report.reportedAt, 'yyyy-MM-dd');

            if (!aggregatedReportsByDay.has(dayKey)) {
                aggregatedReportsByDay.set(dayKey, new Map());
            }
            const dayReports = aggregatedReportsByDay.get(dayKey)!;

            if (dayReports.has(habit.id)) {
                const existingEntry = dayReports.get(habit.id)!;
                if (habit.type === 'number' || habit.type === 'duration') {
                    existingEntry.value = (Number(existingEntry.value) || 0) + (Number(report.value) || 0);
                } else {
                    // For boolean, time, options: last one wins
                    existingEntry.value = report.value;
                }
            } else {
                dayReports.set(habit.id, {
                    habit: habit,
                    value: report.value
                });
            }
        });
    });

    // Convert inner map to array for easier rendering
    const finalReportsByDate = new Map<string, { habit: Habit; value: any; }[]>();
    for (const [dayKey, dayReportsMap] of aggregatedReportsByDay.entries()) {
        finalReportsByDate.set(dayKey, Array.from(dayReportsMap.values()));
    }

    return { calendarGrid: grid, reportsByDate: finalReportsByDate };
  }, [selectedMonth, habits, activeTab]);

  const weeks = useMemo(() => {
    const weeksArray = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      weeksArray.push(calendarGrid.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarGrid]);

  const { weeklyTableData, daysOfWeek } = useMemo(() => {
    if (activeTab !== 'table' || isLoading) return { weeklyTableData: [], daysOfWeek: [] };

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // 1. Process reports for each habit
    const processedHabits = habits.map(habit => {
        const reportsMap = new Map<string, string>();
        habit.reports.forEach(report => {
            const dayKey = format(report.reportedAt, 'yyyy-MM-dd');
            if (habit.type === 'number' || habit.type === 'duration') {
                const existingValue = Number(reportsMap.get(dayKey) || '0');
                reportsMap.set(dayKey, String(existingValue + Number(report.value)));
            } else {
                reportsMap.set(dayKey, String(report.value));
            }
        });
        return {
            habit: habit,
            reports: reportsMap
        };
    });
    
    // 2. Group by category
    const groupedData = processedHabits.reduce((acc, current) => {
        const category = current.habit.categoryName || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(current);
        return acc;
    }, {} as Record<string, typeof processedHabits>);

    // 3. Sort categories and habits, then flatten into a list for rendering
    const sortedCategories = Object.keys(groupedData).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const finalTableData: WeeklyTableItem[] = [];
    
    sortedCategories.forEach(categoryName => {
        finalTableData.push({ isHeader: true, categoryName: categoryName });

        const habitsInCategory = groupedData[categoryName].sort((a, b) =>
            a.habit.name.localeCompare(b.habit.name)
        );

        habitsInCategory.forEach(item => {
            finalTableData.push({ isHeader: false, habit: item.habit, reports: item.reports });
        });
    });

    return { weeklyTableData: finalTableData, daysOfWeek: days };
  }, [habits, activeTab, isLoading]);

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center">
        <div>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
                Reports
            </h1>
            <p className="text-sm text-muted-foreground">
                Review your habit history by month or for the current week.
            </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
            {activeTab === 'calendar' && (
                isMonthsLoading ? (
                    <Skeleton className="h-10 w-48" />
                ) : (
                    <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={availableMonths.length === 0}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a month" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => (
                                <SelectItem key={month} value={month}>
                                    {format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            )}
        </div>
      </div>

      <Tabs defaultValue="table" onValueChange={setActiveTab}>
        <div className="flex justify-end">
            <TabsList className="grid w-[280px] grid-cols-2">
                <TabsTrigger value="table">Current Week Table</TabsTrigger>
                <TabsTrigger value="calendar">Monthly Calendar</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="calendar" className="mt-4">
            <Card>
                <CardContent className="p-4 md:p-6">
                    {isLoading ? (
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 35 }).map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full" />
                            ))}
                        </div>
                    ) : !selectedMonth ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No reports found. Start tracking your habits!</p>
                        </div>
                    ) : (
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <TableHead key={day} className="text-center h-10">{day}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weeks.map((week, weekIndex) => (
                                    <TableRow key={weekIndex}>
                                        {week.map((day, dayIndex) => {
                                            const dayKey = day ? format(day, 'yyyy-MM-dd') : '';
                                            const reportsForDay = reportsByDate.get(dayKey) || [];
                                            return (
                                                <TableCell key={dayIndex} className={cn("h-40 p-1 align-top relative border", day && !isSameMonth(day, parse(selectedMonth, 'yyyy-MM', new Date())) && "bg-muted/50")}>
                                                    {day && (
                                                        <>
                                                            <div className={cn("text-xs text-right p-1", isToday(day) && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-bold")}>
                                                                {getDate(day)}
                                                            </div>
                                                            <div className="space-y-1 mt-1">
                                                                {reportsForDay.map(({ habit, value }) => (
                                                                    <div key={habit.id} className="p-1 rounded-md bg-secondary/50 text-secondary-foreground text-xs leading-tight">
                                                                        <div className="flex items-start gap-1.5">
                                                                            <HabitIcon name={habit.icon} className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                                            <div>
                                                                                <p className="font-medium">{habit.name}</p>
                                                                                <p className="text-muted-foreground">Value: {value}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                        {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                                            <TableCell key={`empty-${i}`} className="border"></TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Current Week's Reports</CardTitle>
                    <CardDescription>
                        A summary of your reports for the current week, starting on Sunday.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2 p-4">
                             <Skeleton className="h-8 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                        </div>
                    ) : weeklyTableData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Habit</TableHead>
                                    {daysOfWeek.map(day => (
                                        <TableHead key={day.toISOString()} className="text-center">{format(day, 'EEE')}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weeklyTableData.map((item) =>
                                    item.isHeader ? (
                                        <TableRow key={`header-${item.categoryName}`} className="bg-muted/50 hover:bg-muted/50">
                                            <TableCell className="font-semibold">{item.categoryName}</TableCell>
                                            {/* Render empty cells for the rest of the columns */}
                                            {daysOfWeek.map(day => (
                                                <TableCell key={`empty-${item.categoryName}-${day.toISOString()}`}></TableCell>
                                            ))}
                                        </TableRow>
                                    ) : (
                                        <TableRow key={item.habit.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <HabitIcon name={item.habit.icon} className="h-4 w-4 text-muted-foreground" />
                                                    <span>{item.habit.name}</span>
                                                </div>
                                            </TableCell>
                                            {daysOfWeek.map(day => {
                                                const dayKey = format(day, 'yyyy-MM-dd');
                                                const value = item.reports.get(dayKey);
                                                return <TableCell key={day.toISOString()} className="text-center">{value || '—'}</TableCell>
                                            })}
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No habits created yet. Go to "Manage Habits" to get started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
