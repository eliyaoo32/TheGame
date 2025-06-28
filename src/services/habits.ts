
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Habit, HabitFrequency, HabitReport, Category } from '@/lib/types';
import { startOfDay, startOfWeek, startOfMonth, endOfMonth, format, parse, endOfWeek, endOfDay, subDays } from 'date-fns';

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


const mapDocToHabit = (doc: QueryDocumentSnapshot<DocumentData, DocumentData>): Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'> => {
    const data = doc.data();
    // Destructure to remove non-serializable fields like Timestamps before sending to client
    const { createdAt, ...serializableData } = data;
    return {
      id: doc.id,
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

    return habitsData;
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
        
        const goalValue = (habit.type === 'boolean' || habit.type === 'time' || habit.type === 'options') 
          ? 1 
          : parseInt(habit.goal.match(/\d+/)?.[0] || '1', 10);
        
        const completed = progress >= goalValue;
        
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
    return habitsWithReports;

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
            ...serializableData
        } as Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'>;
    } catch (error) {
        console.error(`Error fetching habit by ID ${habitId}:`, error);
        return null;
    }
}

export const addHabit = async (userId: string, habitData: Partial<Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue' | 'categoryName'>>) => {
  const habitsCollectionRef = collection(db, 'users', userId, 'habits');
  // The incoming habitData can have `id: undefined` when a new habit is created
  // from a form that also handles editing. Firestore rejects `undefined` values.
  // We destructure here to ensure `id` is not passed to Firestore.
  const { id, ...dataToSave } = habitData;
  const newHabit = {
    ...dataToSave,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(habitsCollectionRef, newHabit);
  return docRef.id;
};

export const addHabitReport = async (userId: string, habitId: string, value: any, date: Date = new Date()) => {
    const habit = await getHabitById(userId, habitId);
    if (!habit) {
        throw new Error(`Habit with ID ${habitId} not found.`);
    }

    let validatedValue: string | number | boolean = value;
    let validationError: string | null = null;

    switch (habit.type) {
        case 'boolean':
            if (value === true || value === 'true') {
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
                validationError = `Invalid value for time habit. Expected a string in HH:MM format, but received "${value}".`;
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
        throw new Error(validationError);
    }
    
    const report = {
        value: validatedValue,
        reportedAt: Timestamp.fromDate(date),
    };
    const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitId, 'reports');
    await addDoc(reportsCollectionRef, report);
};


export const updateHabit = async (userId: string, habitId: string, habitData: Partial<Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue' | 'categoryName'>>) => {
  const habitDoc = doc(db, 'users', userId, 'habits', habitId);
  
  const updateData: { [key: string]: any } = {};
  for (const key in habitData) {
    if ((habitData as any)[key] !== undefined) {
      updateData[key] = (habitData as any)[key];
    }
  }

  await updateDoc(habitDoc, updateData);
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

        const habitsData = habitsSnapshot.docs.map(mapDocToHabit);

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
        if (error instanceof Error && error.message.includes('permission-denied')) {
            console.error("Firestore permission denied.");
        }
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
        const habitsData = habitsSnapshot.docs.map(mapDocToHabit);

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
                progress: 0, // Not relevant for this view
                completed: false, // Not relevant for this view
                categoryName: habit.categoryId ? categoriesMap.get(habit.categoryId) : undefined,
            } as Habit;
            })
        );
        return habitsWithReports;

    } catch (error) {
        console.error("Error fetching habits for week: ", error);
        if (error instanceof Error && error.message.includes('permission-denied')) {
            console.error("Firestore permission denied.");
        }
        return [];
    }
};

export const getUniqueReportMonths = async (userId: string): Promise<Date[]> => {
    if (!userId) return [];
    const habitsCollectionRef = collection(db, 'users', userId, 'habits');
    const habitsSnapshot = await getDocs(query(habitsCollectionRef));
    const allReportsTimestamps: Timestamp[] = [];

    // This can be slow if there are many habits and reports.
    // For a large-scale app, this data would be pre-aggregated.
    for (const habitDoc of habitsSnapshot.docs) {
        const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitDoc.id, 'reports');
        const reportsSnapshot = await getDocs(query(reportsCollectionRef));
        reportsSnapshot.forEach(reportDoc => {
            const reportedAt = reportDoc.data().reportedAt;
            // Check if reportedAt is a valid Firestore Timestamp before pushing
            if (reportedAt && typeof reportedAt.toDate === 'function') {
                allReportsTimestamps.push(reportedAt as Timestamp);
            }
        });
    }

    const uniqueMonths = new Set<string>(); // 'YYYY-MM'
    allReportsTimestamps.forEach(ts => {
        const date = ts.toDate();
        uniqueMonths.add(format(date, 'yyyy-MM'));
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

export const getHabitsWithLastWeekReports = async (userId: string): Promise<{habits: Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue' | 'categoryName'>[], reports: {habitName: string, value: any, reportedAt: string}[]}> => {
    if (!userId) return { habits: [], reports: [] };
    try {
        const habitsCollectionRef = collection(db, 'users', userId, 'habits');
        const habitsSnapshot = await getDocs(query(habitsCollectionRef));
        const habitsData = habitsSnapshot.docs.map(mapDocToHabit);

        const sevenDaysAgo = startOfDay(subDays(new Date(), 7));
        const now = new Date();

        const allReports: {habitName: string, value: any, reportedAt: string}[] = [];

        for (const habit of habitsData) {
            const reportsCollectionRef = collection(db, 'users', userId, 'habits', habit.id, 'reports');
            const reportsQuery = query(
                reportsCollectionRef,
                where('reportedAt', '>=', sevenDaysAgo),
                where('reportedAt', '<=', now)
            );
            const reportsSnapshot = await getDocs(reportsQuery);

            reportsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.reportedAt && typeof data.reportedAt.toDate === 'function') {
                    allReports.push({
                        habitName: habit.name,
                        value: data.value,
                        reportedAt: format((data.reportedAt as Timestamp).toDate(), 'yyyy-MM-dd'),
                    });
                }
            });
        }
        
        allReports.sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());

        return { habits: habitsData, reports: allReports };
    } catch (error) {
        console.error("Error fetching habits with last week reports: ", error);
        return { habits: [], reports: [] };
    }
};
