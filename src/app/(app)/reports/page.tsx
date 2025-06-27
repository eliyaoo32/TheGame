
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


export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthsLoading, setIsMonthsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('table');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMonths() {
      setIsMonthsLoading(true);
      try {
        const months = await getUniqueReportMonths();
        const monthStrings = months.map(m => format(m, 'yyyy-MM'));
        setAvailableMonths(monthStrings);
        if (monthStrings.length > 0) {
          // Set default month but don't trigger immediate data fetching for calendar
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
  }, [toast, selectedMonth]);

  useEffect(() => {
    async function fetchReports() {
      setIsLoading(true);
      try {
        if (activeTab === 'calendar') {
          if (!selectedMonth) {
            setHabits([]);
            setIsLoading(false);
            return;
          }
          const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
          const fetchedHabits = await getHabitsWithReportsForMonth(monthDate);
          setHabits(fetchedHabits);
        } else if (activeTab === 'table') {
          const fetchedHabits = await getHabitsWithReportsForWeek(new Date());
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
  }, [selectedMonth, activeTab, toast]);

  const { calendarGrid, reportsByDate } = useMemo(() => {
    if (!selectedMonth || activeTab !== 'calendar') return { calendarGrid: [], reportsByDate: new Map() };

    const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startingDayIndex = getDay(monthStart); // 0 for Sunday

    const grid: (Date | null)[] = Array(startingDayIndex).fill(null);
    grid.push(...daysInMonth);
    
    const reportsMap = new Map<string, { habit: Habit, report: HabitReport }[]>();
    habits.forEach(habit => {
        habit.reports.forEach(report => {
            const dayKey = format(report.reportedAt, 'yyyy-MM-dd');
            if (!reportsMap.has(dayKey)) {
                reportsMap.set(dayKey, []);
            }
            reportsMap.get(dayKey)!.push({ habit, report });
        });
    });

    return { calendarGrid: grid, reportsByDate: reportsMap };
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

    const tableData = new Map<string, { habit: Habit; reports: Map<string, string> }>();

    for (const habit of habits) {
      const habitRow = {
        habit: habit,
        reports: new Map<string, string>(),
      };

      habit.reports.forEach(report => {
        const dayKey = format(report.reportedAt, 'yyyy-MM-dd');
        if (habit.type === 'number' || habit.type === 'duration') {
          const existingValue = Number(habitRow.reports.get(dayKey) || '0');
          habitRow.reports.set(dayKey, String(existingValue + Number(report.value)));
        } else {
          habitRow.reports.set(dayKey, String(report.value));
        }
      });
      tableData.set(habit.id, habitRow);
    }
    return { weeklyTableData: Array.from(tableData.values()), daysOfWeek: days };
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
                                                                {reportsForDay.map(({ habit, report }) => (
                                                                    <div key={report.id} className="p-1 rounded-md bg-secondary/50 text-secondary-foreground text-xs leading-tight">
                                                                        <div className="flex items-start gap-1.5">
                                                                            <HabitIcon name={habit.icon} className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                                            <div>
                                                                                <p className="font-medium">{habit.name}</p>
                                                                                <p className="text-muted-foreground">Value: {report.value}</p>
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
                                {weeklyTableData.map(({ habit, reports }) => (
                                    <TableRow key={habit.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <HabitIcon name={habit.icon} className="h-4 w-4 text-muted-foreground" />
                                                <span>{habit.name}</span>
                                            </div>
                                        </TableCell>
                                        {daysOfWeek.map(day => {
                                            const dayKey = format(day, 'yyyy-MM-dd');
                                            const value = reports.get(dayKey);
                                            return <TableCell key={day.toISOString()} className="text-center">{value || '—'}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
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
