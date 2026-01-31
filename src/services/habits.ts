import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  writeBatch,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  orderBy,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Habit, HabitFrequency, HabitReport, Category, HabitType } from '@/lib/types';
import { startOfDay, startOfWeek, startOfMonth, endOfMonth, format, parse, endOfWeek, endOfDay } from 'date-fns';
import { parseDuration } from '@/lib/utils';

// ========== CATEGORY FUNCTIONS ==========

export const getCategories = async (userId: string): Promise<Category[]> => {
    if (!userId) return [];
    try {
        const categoriesCollectionRef = collection(db, 'users', userId, 'categories');
        const snapshot = await getDocs(query(categoriesCollectionRef));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Category));
    } catch (error) {
        console.error("Error fetching categories: ", error);
        return [];
    }
}

export const addCategory = async (userId: string, name: string): Promise<string> => {
    const categoriesCollectionRef = collection(db, 'users', userId, 'categories');
    const docRef = await addDoc(categoriesCollectionRef, { name });
    return docRef.id;
}

export const updateCategory = async (userId: string, id: string, name:string) => {
    const categoryDoc = doc(db, 'users', userId, 'categories', id);
    await updateDoc(categoryDoc, { name });
}

export const deleteCategory = async (userId: string, id: string) => {
    const categoryDoc = doc(db, 'users', userId, 'categories', id);
    await deleteDoc(categoryDoc);
}


// ========== HABIT FUNCTIONS ==========

type HabitInputData = {
    name: string;
    description: string;
    frequency: HabitFrequency;
    type: HabitType;
    goal?: string;
    icon: string;
    options?: string;
    categoryId?: string;
};

const mapDocToHabit = (doc: QueryDocumentSnapshot<DocumentData, DocumentData>): Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'> => {
    const data = doc.data();
    // Destructure to remove non-serializable fields like Timestamps before sending to client
    const { createdAt, ...serializableData } = data;
    return {
      id: doc.id,
      order: data.order ?? 0, // Assign default order if it's missing
      ...serializableData
    } as Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'>;
};

// This function will fetch habits without their report/progress details.
// Ideal for management pages where we just need the list.
export const getHabitDefinitions = async (userId: string): Promise<Habit[]> => {
  if (!userId) return [];
  try {
    const habitsCollectionRef = collection(db, 'users', userId, 'habits');
    const categoriesCollectionRef = collection(db, 'users', userId, 'categories');
    
    const [habitsSnapshot, categoriesSnapshot] = await Promise.all([
      getDocs(query(habitsCollectionRef)),
      getDocs(query(categoriesCollectionRef)),
    ]);

    const categoriesMap = new Map<string, string>();
    categoriesSnapshot.docs.forEach(doc => {
      categoriesMap.set(doc.id, doc.data().name);
    });

    const habitsData = habitsSnapshot.docs.map(doc => {
      const baseHabit = mapDocToHabit(doc);
      return {
        ...baseHabit,
        // Add default values to satisfy the Habit type for the UI
        reports: [],
        progress: 0,
        completed: false,
        categoryName: baseHabit.categoryId ? categoriesMap.get(baseHabit.categoryId) : undefined,
      } as Habit;
    });

    return habitsData.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error("Error fetching habit definitions: ", error);
    if (error instanceof Error && error.message.includes('permission-denied')) {
      console.error("Firestore permission denied. Check your Firestore security rules and ensure you are authenticated.");
    }
    return [];
  }
};


export const getHabits = async (userId: string, date: Date): Promise<Habit[]> => {
  if (!userId) return [];
  try {
    const habitsCollectionRef = collection(db, 'users', userId, 'habits');
    const categoriesCollectionRef = collection(db, 'users', userId, 'categories');
    const [habitsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(query(habitsCollectionRef)),
        getDocs(query(categoriesCollectionRef))
    ]);
    
    const categoriesMap = new Map<string, string>();
    categoriesSnapshot.docs.forEach(doc => {
        categoriesMap.set(doc.id, doc.data().name);
    });

    const habitsData = habitsSnapshot.docs.map(mapDocToHabit);

    const habitsWithReports = await Promise.all(
      habitsData.map(async (habit) => {
        let startDate: Date;
        let endDate: Date;

        if (habit.frequency === 'daily') {
          startDate = startOfDay(date);
          endDate = endOfDay(date);
        } else { // weekly
          startDate = startOfWeek(date, { weekStartsOn: 0 }); // 0 for Sunday
          endDate = endOfWeek(date, { weekStartsOn: 0 });
        }
        
        const reportsCollectionRef = collection(db, 'users', userId, 'habits', habit.id, 'reports');
        const reportsQuery = query(
            reportsCollectionRef,
            where('reportedAt', '>=', startDate),
            where('reportedAt', '<=', endDate)
        );
        const reportsSnapshot = await getDocs(reportsQuery);

        const reports: HabitReport[] = reportsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                value: data.value,
                reportedAt: (data.reportedAt as Timestamp).toDate(),
            };
        }).sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime());

        // Calculate progress and completed status from reports
        let progress = 0;
        if (habit.type === 'number' || habit.type === 'duration') {
          progress = reports.reduce((sum, report) => sum + Number(report.value || 0), 0);
        } else { // boolean, time, options
          progress = reports.length;
        }
        
        let lastReportedValue: string | undefined = undefined;
        if (reports.length > 0) {
            lastReportedValue = String(reports[reports.length - 1].value);
        }
        
        let completed = false;
        // A habit can only be completed if it has a goal.
        if (habit.goal) {
            const goalValue = (habit.type === 'boolean' || habit.type === 'time' || habit.type === 'options') 
              ? 1 
              : parseInt(habit.goal.match(/\d+/)?.[0] || '1', 10);
            
            if (goalValue > 0) {
              completed = progress >= goalValue;
            }
        } else {
          completed = false;
        }
        
        return {
            ...habit,
            reports,
            progress,
            completed,
            lastReportedValue,
            categoryName: habit.categoryId ? categoriesMap.get(habit.categoryId) : undefined,
        } as Habit;
      })
    );
    return habitsWithReports.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  } catch (error) {
    console.error("Error fetching habits: ", error);
    if (error instanceof Error && error.message.includes('permission-denied')) {
        console.error("Firestore permission denied. Check your Firestore security rules and ensure you are authenticated.");
    }
    return [];
  }
};

export const getHabitById = async (userId: string, habitId: string): Promise<Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'> | null> => {
    if (!userId) return null;
    try {
        const habitDocRef = doc(db, 'users', userId, 'habits', habitId);
        const habitDoc = await getDoc(habitDocRef);

        if (!habitDoc.exists()) {
            return null;
        }
        const data = habitDoc.data();
        const { createdAt, ...serializableData } = data;

        return {
            id: habitDoc.id,
            order: data.order ?? 0,
            ...serializableData
        } as Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'>;
    } catch (error) {
        console.error(`Error fetching habit by ID ${habitId}:`, error);
        return null;
    }
}

export const addHabit = async (userId: string, habitData: HabitInputData) => {
    console.log(`[Service: addHabit] Starting for user: ${userId}`);
    if (!userId) {
        throw new Error('User is not authenticated.');
    }
    // Basic validation for required fields
    if (!habitData.name?.trim()) throw new Error('Habit name is required.');
    if (!habitData.description?.trim()) throw new Error('Habit description is required.');
    if (!habitData.icon?.trim()) throw new Error('Habit icon is required.');

    const dataToSave: any = { ...habitData };

    // Type-specific goal validation and normalization
    switch (dataToSave.type) {
        case 'duration': {
            if (dataToSave.goal?.trim()) {
                const minutes = parseDuration(dataToSave.goal);
                if (minutes === null) {
                    throw new Error('Invalid goal for duration habit. Use format like "2h", "90m", or "1h 30m".');
                }
                dataToSave.goal = String(minutes); // Normalize to minutes
            }
            break;
        }
        case 'time':
            if (dataToSave.goal?.trim()) {
                if (!/^\d{2}:\d{2}$/.test(dataToSave.goal)) {
                    throw new Error('Invalid goal for time habit. Please use HH:MM format.');
                }
            }
            break;
        case 'number':
            if (dataToSave.goal?.trim()) {
                 if (!/^\d+/.test(dataToSave.goal)) {
                    throw new Error('Invalid goal for number habit. Must start with a number (e.g., "25 pages").');
                }
            }
            break;
        case 'options':
            if (!dataToSave.options?.trim()) {
                throw new Error('Options are required for this habit type.');
            }
            break;
        case 'boolean':
            break;
    }
    
    const habitsCollectionRef = collection(db, 'users', userId, 'habits');

    // To set the initial order, we need to know how many habits already exist.
    const snapshot = await getDocs(query(habitsCollectionRef));
    const currentCount = snapshot.size;
    const newHabit = {
        ...dataToSave,
        order: currentCount,
        createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(habitsCollectionRef, newHabit);
    console.log(`[Service: addHabit] Success. New ID: ${docRef.id}`);
    return docRef.id;
};

export const addHabitReport = async (userId: string, habitId: string, value: any, date: Date = new Date()) => {
    console.log(`[Service: addHabitReport] Request: user=${userId}, habit=${habitId}, val=${value}`);
    const habit = await getHabitById(userId, habitId);
    if (!habit) {
        console.error(`[Service: addHabitReport] Habit NOT FOUND: ${habitId}`);
        throw new Error(`Habit with ID ${habitId} not found.`);
    }

    let validatedValue: string | number | boolean = value;
    let validationError: string | null = null;

    switch (habit.type) {
        case 'boolean':
            if (value === true || value === 'true' || String(value).toLowerCase() === 'done' || String(value).toLowerCase() === 'yes') {
                validatedValue = true;
            } else {
                validationError = `Invalid value for boolean habit. Expected 'true', received ${value}.`;
            }
            break;
        case 'number':
        case 'duration':
            const num = Number(value);
            if (isNaN(num)) {
                validationError = `Invalid value for ${habit.type} habit. Expected a number, but received "${value}".`;
            } else {
                validatedValue = num;
            }
            break;
        case 'time':
            if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
                validationError = `Invalid value for time habit. Expected HH:MM, but received "${value}".`;
            }
            break;
        case 'options':
            const options = habit.options?.split(',').map(o => o.trim());
            if (!options || !options.includes(String(value))) {
                validationError = `Invalid value for options habit. Received "${value}", but expected one of [${options?.join(', ')}].`;
            }
            break;
        default:
            validationError = `Unknown habit type: ${habit.type}`;
    }

    if (validationError) {
        console.error(`[Service: addHabitReport] VALIDATION FAILED: ${validationError}`);
        throw new Error(validationError);
    }
    
    const report = {
        value: validatedValue,
        reportedAt: Timestamp.fromDate(date),
    };
    const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitId, 'reports');
    await addDoc(reportsCollectionRef, report);
    console.log(`[Service: addHabitReport] SUCCESS recorded.`);
};


export const updateHabit = async (userId: string, habitId: string, habitData: Partial<HabitInputData>) => {
    const habitDocRef = doc(db, 'users', userId, 'habits', habitId);
    const dataToUpdate: { [key: string]: any } = { ...habitData };

    if (dataToUpdate.goal !== undefined || dataToUpdate.type !== undefined) {
        const existingHabitSnap = await getDoc(habitDocRef);
        if (!existingHabitSnap.exists()) {
            throw new Error("Cannot update a habit that does not exist.");
        }
        const existingHabit = existingHabitSnap.data() as Habit;

        const newType = dataToUpdate.type || existingHabit.type;
        const newGoal = dataToUpdate.goal !== undefined ? dataToUpdate.goal : existingHabit.goal;

        switch (newType) {
            case 'duration': {
                if (newGoal?.trim()) {
                    const minutes = parseDuration(newGoal);
                    if (minutes === null) {
                        throw new Error('Invalid goal for duration habit.');
                    }
                    dataToUpdate.goal = String(minutes);
                }
                break;
            }
            case 'time':
                 if (newGoal?.trim()) {
                    if (!/^\d{2}:\d{2}$/.test(newGoal)) {
                       throw new Error('Invalid goal for time habit.');
                   }
                }
                break;
            case 'number':
                if (newGoal?.trim()) {
                    if (!/^\d+/.test(newGoal)) {
                       throw new Error('Invalid goal for number habit.');
                   }
                }
                break;
            case 'options':
                const newOptions = dataToUpdate.options !== undefined ? dataToUpdate.options : existingHabit.options;
                if (!newOptions?.trim()) {
                    throw new Error('Options are required.');
                }
                break;
            case 'boolean':
                break;
        }
    }
  
    for (const key in dataToUpdate) {
        if (dataToUpdate[key] === undefined) {
            delete dataToUpdate[key];
        }
    }

    if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(habitDocRef, dataToUpdate);
    }
};

export const deleteHabit = async (userId: string, habitId: string) => {
  const habitDoc = doc(db, 'users', userId, 'habits', habitId);
  await deleteDoc(habitDoc);
};

export const deleteHabitReportsForPeriod = async (userId: string, habitId: string, frequency: HabitFrequency, date: Date = new Date()) => {
  let startDate: Date;
  let endDate: Date;

  if (frequency === 'daily') {
    startDate = startOfDay(date);
    endDate = endOfDay(date);
  } else { // weekly
    startDate = startOfWeek(date, { weekStartsOn: 0 }); // 0 for Sunday
    endDate = endOfWeek(date, { weekStartsOn: 0 });
  }

  const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitId, 'reports');
  const q = query(
    reportsCollectionRef,
    where('reportedAt', '>=', startDate),
    where('reportedAt', '<=', endDate)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
      return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
  });

  await batch.commit();
};

export const getHabitsWithReportsForMonth = async (userId: string, date: Date): Promise<Habit[]> => {
    if (!userId) return [];
    try {
        const habitsCollectionRef = collection(db, 'users', userId, 'habits');
        const categoriesCollectionRef = collection(db, 'users', userId, 'categories');
        const [habitsSnapshot, categoriesSnapshot] = await Promise.all([
            getDocs(query(habitsCollectionRef)),
            getDocs(query(categoriesCollectionRef))
        ]);
        
        const categoriesMap = new Map<string, string>();
        categoriesSnapshot.docs.forEach(doc => {
            categoriesMap.set(doc.id, doc.data().name);
        });

        const habitsData = habitsSnapshot.docs.map(mapDocToHabit).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));

        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const habitsWithReports = await Promise.all(
            habitsData.map(async (habit) => {
            const reportsCollectionRef = collection(db, 'users', userId, 'habits', habit.id, 'reports');
            const reportsQuery = query(
                reportsCollectionRef,
                where('reportedAt', '>=', monthStart),
                where('reportedAt', '<=', monthEnd)
            );
            const reportsSnapshot = await getDocs(reportsQuery);

            const reports: HabitReport[] = reportsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    value: data.value,
                    reportedAt: (data.reportedAt as Timestamp).toDate(),
                };
            }).sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime());

            return {
                ...habit,
                reports,
                progress: 0,
                completed: false,
                categoryName: habit.categoryId ? categoriesMap.get(habit.categoryId) : undefined,
            } as Habit;
            })
        );
        return habitsWithReports.filter(h => h.reports.length > 0);

    } catch (error) {
        console.error("Error fetching habits for month: ", error);
        return [];
    }
};

export const getHabitsWithReportsForWeek = async (userId: string, date: Date): Promise<Habit[]> => {
    if (!userId) return [];
    try {
        const habitsCollectionRef = collection(db, 'users', userId, 'habits');
        const categoriesCollectionRef = collection(db, 'users', userId, 'categories');
        const [habitsSnapshot, categoriesSnapshot] = await Promise.all([
            getDocs(query(habitsCollectionRef)),
            getDocs(query(categoriesCollectionRef))
        ]);
        
        const categoriesMap = new Map<string, string>();
        categoriesSnapshot.docs.forEach(doc => {
            categoriesMap.set(doc.id, doc.data().name);
        });
        const habitsData = habitsSnapshot.docs.map(mapDocToHabit).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const weekStart = startOfWeek(date, { weekStartsOn: 0 });
        const weekEndValue = endOfWeek(date, { weekStartsOn: 0 });

        const habitsWithReports = await Promise.all(
            habitsData.map(async (habit) => {
            const reportsCollectionRef = collection(db, 'users', userId, 'habits', habit.id, 'reports');
            const reportsQuery = query(
                reportsCollectionRef,
                where('reportedAt', '>=', weekStart),
                where('reportedAt', '<=', weekEndValue)
            );
            const reportsSnapshot = await getDocs(reportsQuery);

            const reports: HabitReport[] = reportsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    value: data.value,
                    reportedAt: (data.reportedAt as Timestamp).toDate(),
                };
            }).sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime());

            return {
                ...habit,
                reports,
                progress: 0,
                completed: false,
                categoryName: habit.categoryId ? categoriesMap.get(habit.categoryId) : undefined,
            } as Habit;
            })
        );
        return habitsWithReports;

    } catch (error) {
        console.error("Error fetching habits for week: ", error);
        return [];
    }
};

export const getUniqueReportMonths = async (userId: string): Promise<Date[]> => {
    if (!userId) return [];
    const habitsCollectionRef = collection(db, 'users', userId, 'habits');
    const habitsSnapshot = await getDocs(query(habitsCollectionRef));
    const allReportsTimestamps: Timestamp[] = [];

    for (const habitDoc of habitsSnapshot.docs) {
        const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitDoc.id, 'reports');
        const reportsSnapshot = await getDocs(query(reportsCollectionRef));
        reportsSnapshot.forEach(reportDoc => {
            const reportedAt = reportDoc.data().reportedAt;
            if (reportedAt && typeof reportedAt.toDate === 'function') {
                allReportsTimestamps.push(reportedAt as Timestamp);
            }
        });
    }

    const uniqueMonths = new Set<string>();
    allReportsTimestamps.forEach(ts => {
        if (ts && typeof ts.toDate === 'function') {
            const date = ts.toDate();
            uniqueMonths.add(format(date, 'yyyy-MM'));
        }
    });

    return Array.from(uniqueMonths)
        .map(ym => parse(ym, 'yyyy-MM', new Date()))
        .sort((a, b) => b.getTime() - a.getTime());
};

export const updateHabitsCategory = async (userId: string, habitIds: string[], categoryId: string) => {
    if (!userId || habitIds.length === 0) return;
    const batch = writeBatch(db);
    habitIds.forEach(habitId => {
        const habitDocRef = doc(db, 'users', userId, 'habits', habitId);
        batch.update(habitDocRef, { categoryId });
    });
    await batch.commit();
};

export const updateHabitOrder = async (userId: string, habitIds: string[]) => {
    if (!userId) throw new Error("User not authenticated");
    const batch = writeBatch(db);
    habitIds.forEach((habitId, index) => {
        const habitRef = doc(db, 'users', userId, 'habits', habitId);
        batch.update(habitRef, { order: index });
    });
    await batch.commit();
};


// ========== HIDDEN HABITS FUNCTIONS ==========

export const getHiddenHabitsForDate = async (userId: string, date: Date): Promise<string[]> => {
    if (!userId) return [];
    try {
        const dateKey = format(date, 'yyyy-MM-dd');
        const docRef = doc(db, 'users', userId, 'hiddenHabits', dateKey);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().habitIds || [];
        }
        return [];
    } catch (error) {
        console.error("Error fetching hidden habits:", error);
        return [];
    }
};

export const updateHiddenHabitsForDate = async (userId: string, date: Date, habitIds: string[]): Promise<void> => {
    if (!userId) throw new Error("User not authenticated");
    try {
        const dateKey = format(date, 'yyyy-MM-dd');
        const docRef = doc(db, 'users', userId, 'hiddenHabits', dateKey);
        await setDoc(docRef, { habitIds });
    } catch (error) {
        console.error("Error updating hidden habits:", error);
        throw error;
    }
};