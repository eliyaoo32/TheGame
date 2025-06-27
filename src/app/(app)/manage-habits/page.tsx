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
import { getHabits, addHabit, updateHabit, deleteHabit, seedInitialHabits } from '@/services/habits';
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
        title: 'Error fetching habits',
        description: 'Could not fetch your habits. Please ensure your Firebase configuration in .env is correct and check your Firestore security rules.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const seedAndFetch = async () => {
      // This will check and seed data if the database is empty.
      // It's safe to run on every page load as it won't add duplicates.
      await seedInitialHabits();
      await fetchHabits();
    };
    seedAndFetch();
  }, [fetchHabits]);

  const handleSaveHabit = async (savedHabitData: Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue'> & { id?: string }) => {
    const originalHabits = habits;

    try {
      if (savedHabitData.id) {
        // Optimistic Update
        const currentHabit = habits.find(h => h.id === savedHabitData.id)!;
        const updatedHabit: Habit = { ...currentHabit, ...savedHabitData };
        setHabits(habits.map(h => (h.id === savedHabitData.id ? updatedHabit : h)));
        
        const { id, ...dataToUpdate } = savedHabitData;
        await updateHabit(id, dataToUpdate);
        toast({
            title: 'Habit updated!',
            description: `"${savedHabitData.name}" has been saved.`,
        });
      } else {
        // Add
        const { id, ...dataToAdd } = savedHabitData;
        const newId = await addHabit(dataToAdd);
        const newHabit: Habit = {
            id: newId,
            progress: 0,
            completed: false,
            reports: [],
            ...dataToAdd,
        };
        setHabits(currentHabits => [...currentHabits, newHabit]);
        toast({
            title: 'Habit added!',
            description: `"${savedHabitData.name}" has been saved.`,
        });
      }
    } catch (error) {
        console.error("Failed to save habit:", error);
        setHabits(originalHabits); // Revert on error
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
      const habitIdToDelete = habitToDelete.id;
      const originalHabits = habits;
      const habitName = habitToDelete.name;

      // Optimistic delete
      setHabits(habits.filter(h => h.id !== habitIdToDelete));
      setDeleteDialogOpen(false);
      setHabitToDelete(null);

      try {
        await deleteHabit(habitIdToDelete);
        toast({
          title: 'Habit deleted',
          description: `"${habitName}" has been removed.`,
        });
      } catch (error) {
        console.error("Failed to delete habit:", error);
        setHabits(originalHabits); // Revert on error
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete habit. Please try again.',
        });
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
