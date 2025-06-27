'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Habit, Category } from '@/lib/types';
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
import { AddCategoryDialog } from '@/components/dashboard/add-category-dialog';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getHabits, addHabit, updateHabit, deleteHabit, getCategories, addCategory, updateCategory, deleteCategory } from '@/services/habits';
import { Skeleton } from '@/components/ui/skeleton';
import { HabitIcon } from '@/components/habit-icon';

export default function ManageHabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Habit Dialog State
  const [habitToEdit, setHabitToEdit] = useState<Habit | undefined>(undefined);
  const [isAddHabitDialogOpen, setAddHabitDialogOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [isDeleteHabitDialogOpen, setDeleteHabitDialogOpen] = useState(false);
  
  // Category Dialog State
  const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>(undefined);
  const [isAddCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedHabits, fetchedCategories] = await Promise.all([getHabits(), getCategories()]);
      setHabits(fetchedHabits);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        variant: 'destructive',
        title: 'Error fetching data',
        description: 'Could not fetch your habits and categories. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  // ========== HABIT HANDLERS ==========

  const handleSaveHabit = async (savedHabitData: Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue' | 'categoryName'> & { id?: string }) => {
    try {
      if (savedHabitData.id) {
        await updateHabit(savedHabitData.id, savedHabitData);
        toast({ title: 'Habit updated!', description: `"${savedHabitData.name}" has been saved.` });
      } else {
        await addHabit(savedHabitData);
        toast({ title: 'Habit added!', description: `"${savedHabitData.name}" has been saved.` });
      }
      fetchData(); // Refetch all data to keep UI in sync
    } catch (error) {
        console.error("Failed to save habit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save habit. Please try again.' });
    }
  };

  const handleDeleteHabit = async () => {
    if (habitToDelete) {
      try {
        await deleteHabit(habitToDelete.id);
        toast({ title: 'Habit deleted', description: `"${habitToDelete.name}" has been removed.` });
        fetchData();
      } catch (error) {
        console.error("Failed to delete habit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete habit. Please try again.' });
      } finally {
        setDeleteHabitDialogOpen(false);
        setHabitToDelete(null);
      }
    }
  };
  
  const handleAddHabitDialogStateChange = (open: boolean) => {
    setAddHabitDialogOpen(open);
    if (!open) setHabitToEdit(undefined);
  };

  // ========== CATEGORY HANDLERS ==========
  
  const handleSaveCategory = async (savedCategoryData: { id?: string, name: string }) => {
    try {
      if (savedCategoryData.id) {
        await updateCategory(savedCategoryData.id, savedCategoryData.name);
        toast({ title: 'Category updated!', description: `"${savedCategoryData.name}" has been saved.` });
      } else {
        await addCategory(savedCategoryData.name);
        toast({ title: 'Category added!', description: `"${savedCategoryData.name}" has been saved.` });
      }
      fetchData(); // Refetch all data
    } catch (error) {
      console.error("Failed to save category:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save category.' });
    }
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete.id);
        toast({ title: 'Category deleted', description: `"${categoryToDelete.name}" has been removed.` });
        fetchData(); // Refetch
      } catch (error) {
        console.error("Failed to delete category:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete category.' });
      } finally {
        setDeleteCategoryDialogOpen(false);
        setCategoryToDelete(null);
      }
    }
  };
  
  const handleAddCategoryDialogStateChange = (open: boolean) => {
    setAddCategoryDialogOpen(open);
    if (!open) setCategoryToEdit(undefined);
  };

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Manage Habits & Categories</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Habits</CardTitle>
              <CardDescription>Create, view, edit, and delete your habits.</CardDescription>
              <Button size="sm" className="h-8 gap-1 w-fit" onClick={() => setAddHabitDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create Habit</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden md:table-cell">Frequency</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-5 w-28" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : habits.length > 0 ? (
                    habits.map(habit => (
                      <TableRow key={habit.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <HabitIcon name={habit.icon} className="h-4 w-4 text-muted-foreground" />
                            <span>{habit.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{habit.categoryId ? categoryMap.get(habit.categoryId) : '—'}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{habit.frequency}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setHabitToEdit(habit); setAddHabitDialogOpen(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setHabitToDelete(habit); setDeleteHabitDialogOpen(true); }} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No habits found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize your habits into groups.</CardDescription>
               <Button size="sm" className="h-8 gap-1 w-fit" onClick={() => setAddCategoryDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Create Category</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : categories.length > 0 ? (
                    categories.map(category => (
                        <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setCategoryToEdit(category); setAddCategoryDialogOpen(true); }}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setCategoryToDelete(category); setDeleteCategoryDialogOpen(true); }} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                  ) : (
                     <TableRow><TableCell colSpan={2} className="h-24 text-center">No categories found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddHabitDialog open={isAddHabitDialogOpen} onOpenChange={handleAddHabitDialogStateChange} onSave={handleSaveHabit} habitToEdit={habitToEdit} categories={categories} />
      <AddCategoryDialog open={isAddCategoryDialogOpen} onOpenChange={handleAddCategoryDialogStateChange} onSave={handleSaveCategory} categoryToEdit={categoryToEdit} />

      <AlertDialog open={isDeleteHabitDialogOpen} onOpenChange={setDeleteHabitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the habit "{habitToDelete?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the category "{categoryToDelete?.name}". Habits in this category will become uncategorized. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
