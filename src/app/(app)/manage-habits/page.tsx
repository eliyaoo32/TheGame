'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Habit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddHabitDialog } from '@/components/dashboard/add-habit-dialog';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getHabits, addHabit, updateHabit, deleteHabit } from '@/services/habits';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManageHabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [habitToEdit, setHabitToEdit] = useState<Habit | undefined>(undefined);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const { toast } = useToast();

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedHabits = await getHabits();
      setHabits(fetchedHabits);
    } catch (error) {
      console.error("Failed to fetch habits:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch your habits. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleSaveHabit = async (savedHabitData: Omit<Habit, 'id' | 'progress' | 'completed' | 'feedback'> & { id?: string }) => {
    try {
      if (savedHabitData.id) {
        const { id, ...dataToUpdate } = savedHabitData;
        await updateHabit(id, dataToUpdate);
        toast({
            title: 'Habit updated!',
            description: `"${savedHabitData.name}" has been saved.`,
        });
      } else {
        await addHabit(savedHabitData);
        toast({
            title: 'Habit added!',
            description: `"${savedHabitData.name}" has been saved.`,
        });
      }
      await fetchHabits();
    } catch (error) {
        console.error("Failed to save habit:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save habit. Please try again.',
        });
    }
  };

  const openEditDialog = (habit: Habit) => {
    setHabitToEdit(habit);
    setAddDialogOpen(true);
  };

  const openDeleteDialog = (habit: Habit) => {
    setHabitToDelete(habit);
    setDeleteDialogOpen(true);
  };

  const handleDeleteHabit = async () => {
    if (habitToDelete) {
      try {
        await deleteHabit(habitToDelete.id);
        toast({
          title: 'Habit deleted',
          description: `"${habitToDelete.name}" has been removed.`,
        });
        await fetchHabits();
      } catch (error) {
        console.error("Failed to delete habit:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete habit. Please try again.',
        });
      } finally {
        setHabitToDelete(null);
        setDeleteDialogOpen(false);
      }
    }
  };

  const handleAddDialogStateChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setHabitToEdit(undefined);
    }
  };

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">
          Manage Habits
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Create Habit
            </span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Habits</CardTitle>
          <CardDescription>
            Here you can create, view, edit, and delete your habits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : habits.length > 0 ? (
                habits.map(habit => (
                  <TableRow key={habit.id}>
                    <TableCell className="font-medium">{habit.name}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{habit.type}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{habit.frequency}</TableCell>
                    <TableCell>{habit.goal}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(habit)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(habit)} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No habits found. Get started by creating one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddHabitDialog
        open={isAddDialogOpen}
        onOpenChange={handleAddDialogStateChange}
        onSave={handleSaveHabit}
        habitToEdit={habitToEdit}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              habit "{habitToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
