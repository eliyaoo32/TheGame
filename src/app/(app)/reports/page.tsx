
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
} from 'date-fns';
import {
  getHabitsWithReportsForMonth,
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
import { Badge } from '@/components/ui/badge';
import { HabitIcon } from '@/components/habit-icon';


export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthsLoading, setIsMonthsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMonths() {
      setIsMonthsLoading(true);
      try {
        const months = await getUniqueReportMonths();
        const monthStrings = months.map(m => format(m, 'yyyy-MM'));
        setAvailableMonths(monthStrings);
        if (monthStrings.length > 0) {
          setSelectedMonth(monthStrings[0]);
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
  }, [toast]);

  useEffect(() => {
    if (!selectedMonth) {
      setIsLoading(false);
      return;
    };

    async function fetchReports() {
      setIsLoading(true);
      try {
        const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
        const fetchedHabits = await getHabitsWithReportsForMonth(monthDate);
        setHabits(fetchedHabits);
      } catch (error) {
        console.error(`Failed to fetch reports for ${selectedMonth}:`, error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load reports for the selected month.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchReports();
  }, [selectedMonth, toast]);

  const { calendarGrid, reportsByDate } = useMemo(() => {
    if (!selectedMonth) return { calendarGrid: [], reportsByDate: new Map() };

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
  }, [selectedMonth, habits]);

  const weeks = useMemo(() => {
    const weeksArray = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      weeksArray.push(calendarGrid.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarGrid]);

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center">
        <div>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
                Monthly Report
            </h1>
            <p className="text-sm text-muted-foreground">
                Review your habit history at a glance.
            </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
            {isMonthsLoading ? (
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
            )}
        </div>
      </div>
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
                                {/* Fill remaining cells if week is not full */}
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
    </div>
  );
}
