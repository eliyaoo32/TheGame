
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Habit, Category, HabitType, HabitFrequency } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { AddHabitDialog } from '@/components/dashboard/add-habit-dialog';
import { AddCategoryDialog } from '@/components/dashboard/add-category-dialog';
import { UpdateCategoryDialog } from '@/components/dashboard/update-category-dialog';
import { MoreHorizontal, PlusCircle, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { getHabitDefinitions, addHabit, updateHabit, deleteHabit, getCategories, addCategory, updateCategory, deleteCategory, updateHabitsCategory, updateHabitOrder } from '@/services/habits';
import { Skeleton } from '@/components/ui/skeleton';
import { HabitIcon } from '@/components/habit-icon';
import { cn } from '@/lib/utils';


type HabitFormData = {
    id?: string;
    name: string;
    description: string;
    frequency: HabitFrequency;
    type: HabitType;
    goal: string;
    icon: string;
    options?: string;
    categoryId?: string;
};

export default function ManageHabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  
  // Drag and Drop state
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null);
  const [dragOverHabitId, setDragOverHabitId] = useState<string | null>(null);

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
  const [isUpdateCategoryDialogOpen, setUpdateCategoryDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedHabits, fetchedCategories] = await Promise.all([getHabitDefinitions(user.uid), getCategories(user.uid)]);
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
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData, user]);

  useEffect(() => {
    setSelectedHabits([]);
  }, [habits]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  // ========== DRAG & DROP HANDLERS ==========
  
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, habitId: string) => {
    setDraggedHabitId(habitId);
    // This makes the drag image less opaque.
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, habitId: string) => {
    e.preventDefault();
    if (habitId !== dragOverHabitId) {
        setDragOverHabitId(habitId);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, dropHabitId: string) => {
    e.preventDefault();
    if (!draggedHabitId || draggedHabitId === dropHabitId) {
      setDraggedHabitId(null);
      setDragOverHabitId(null);
      return;
    }

    const originalHabits = [...habits];
    const draggedIndex = originalHabits.findIndex(h => h.id === draggedHabitId);
    const dropIndex = originalHabits.findIndex(h => h.id === dropHabitId);

    const newHabits = [...originalHabits];
    const [draggedItem] = newHabits.splice(draggedIndex, 1);
    newHabits.splice(dropIndex, 0, draggedItem);

    // Optimistically update the UI
    setHabits(newHabits);

    setDraggedHabitId(null);
    setDragOverHabitId(null);
    
    if (user) {
      try {
        const orderedHabitIds = newHabits.map(h => h.id);
        await updateHabitOrder(user.uid, orderedHabitIds);
        toast({ title: 'Habit order updated!' });
      } catch (error) {
        console.error("Failed to update habit order:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update habit order.' });
        // Revert UI on failure
        setHabits(originalHabits);
      }
    }
  };
  
  const handleDragEnd = () => {
    setDraggedHabitId(null);
    setDragOverHabitId(null);
  }

  // ========== HABIT HANDLERS ==========

  const handleSaveHabit = async (savedHabitData: HabitFormData) => {
    if (!user) return;
    try {
      const { id, ...data } = savedHabitData;
      if (id) {
        await updateHabit(user.uid, id, data);
        toast({ title: 'Habit updated!', description: `"${data.name}" has been saved.` });
      } else {
        await addHabit(user.uid, data);
        toast({ title: 'Habit added!', description: `"${data.name}" has been saved.` });
      }
      fetchData(); // Refetch all data to keep UI in sync
    } catch (error: any) {
        console.error("Failed to save habit:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Error saving habit', 
            description: error.message || 'An unexpected error occurred. Please try again.'
        });
    }
  };

  const handleDeleteHabit = async () => {
    if (habitToDelete && user) {
      try {
        await deleteHabit(user.uid, habitToDelete.id);
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
  
  const handleUpdateCategory = async (categoryId: string) => {
    if (!user || selectedHabits.length === 0) return;
    try {
      await updateHabitsCategory(user.uid, selectedHabits, categoryId);
      toast({
        title: 'Habits updated!',
        description: `Category updated for ${selectedHabits.length} habit${selectedHabits.length > 1 ? 's' : ''}.`,
      });
      setSelectedHabits([]);
      fetchData();
    } catch (error) {
      console.error('Failed to update categories:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update habit categories.',
      });
    } finally {
      setUpdateCategoryDialogOpen(false);
    }
  };


  // ========== CATEGORY HANDLERS ==========
  
  const handleSaveCategory = async (savedCategoryData: { id?: string, name: string }) => {
    if (!user) return;
    try {
      if (savedCategoryData.id) {
        await updateCategory(user.uid, savedCategoryData.id, savedCategoryData.name);
        toast({ title: 'Category updated!', description: `"${savedCategoryData.name}" has been saved.` });
      } else {
        await addCategory(user.uid, savedCategoryData.name);
        toast({ title: 'Category added!', description: `"${savedCategoryData.name}" has been saved.` });
      }
      fetchData(); // Refetch all data
    } catch (error) {
      console.error("Failed to save category:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save category.' });
    }
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete && user) {
      try {
        await deleteCategory(user.uid, categoryToDelete.id);
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
              <CardDescription>Drag and drop to reorder. Create, view, edit, and delete your habits.</CardDescription>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 gap-1" onClick={() => setAddHabitDialogOpen(true)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create Habit</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  disabled={selectedHabits.length === 0}
                  onClick={() => setUpdateCategoryDialogOpen(true)}
                >
                  Update Category ({selectedHabits.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                       <Checkbox
                        checked={habits.length > 0 && selectedHabits.length === habits.length}
                        onCheckedChange={(checked) => {
                          setSelectedHabits(checked ? habits.map((h) => h.id) : []);
                        }}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
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
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
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
                    habits.map((habit) => (
                      <TableRow 
                        key={habit.id} 
                        data-state={selectedHabits.includes(habit.id) && 'selected'}
                        draggable
                        onDragStart={(e) => handleDragStart(e, habit.id)}
                        onDragOver={(e) => handleDragOver(e, habit.id)}
                        onDrop={(e) => handleDrop(e, habit.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'cursor-move transition-all',
                          draggedHabitId === habit.id && 'opacity-50',
                          dragOverHabitId === habit.id && 'border-t-2 border-t-primary'
                        )}
                      >
                        <TableCell>
                           <Checkbox
                            checked={selectedHabits.includes(habit.id)}
                            onCheckedChange={(checked) => {
                              setSelectedHabits((prev) =>
                                checked
                                  ? [...prev, habit.id]
                                  : prev.filter((id) => id !== habit.id)
                              );
                            }}
                            aria-label={`Select habit ${habit.name}`}
                          />
                        </TableCell>
                         <TableCell className="text-muted-foreground">
                            <GripVertical className="h-5 w-5" />
                        </TableCell>
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
                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No habits found.</TableCell></TableRow>
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
      <UpdateCategoryDialog
        open={isUpdateCategoryDialogOpen}
        onOpenChange={setUpdateCategoryDialogOpen}
        onUpdate={handleUpdateCategory}
        categories={categories}
        selectedCount={selectedHabits.length}
      />

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

    