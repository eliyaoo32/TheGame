
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  writeBatch,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Habit, HabitFrequency, HabitReport } from '@/lib/types';
import { startOfDay, startOfWeek, startOfMonth, endOfMonth, format, parse, endOfWeek } from 'date-fns';

// Hardcoded user ID for now, until we have authentication
const userId = 'test-user';

const habitsCollectionRef = collection(db, 'users', userId, 'habits');

const mapDocToHabit = (doc: QueryDocumentSnapshot<DocumentData, DocumentData>): Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue'> => {
    const data = doc.data();
    // Destructure to remove non-serializable fields like Timestamps before sending to client
    const { createdAt, ...serializableData } = data;
    return {
      id: doc.id,
      ...serializableData
    } as Omit<Habit, 'reports' | 'progress' | 'completed' | 'lastReportedValue'>;
};

export const getHabits = async (): Promise<Habit[]> => {
  try {
    const habitsSnapshot = await getDocs(query(habitsCollectionRef));
    const habitsData = habitsSnapshot.docs.map(mapDocToHabit);

    const habitsWithReports = await Promise.all(
      habitsData.map(async (habit) => {
        const now = new Date();
        let startDate: Date;

        if (habit.frequency === 'daily') {
          startDate = startOfDay(now);
        } else { // weekly
          startDate = startOfWeek(now, { weekStartsOn: 0 }); // 0 for Sunday
        }
        
        const reportsCollectionRef = collection(db, 'users', userId, 'habits', habit.id, 'reports');
        const reportsQuery = query(reportsCollectionRef, where('reportedAt', '>=', startDate));
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
        } as Habit;
      })
    );
    return habitsWithReports;

  } catch (error) {
    console.error("Error fetching habits: ", error);
    if (error instanceof Error && error.message.includes('permission-denied')) {
        console.error("Firestore permission denied. Check your Firestore security rules and ensure the API keys in .env are correct.");
    }
    return [];
  }
};


export const addHabit = async (habitData: Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue' | 'options'> & { options?: string }) => {
  const newHabit = {
    ...habitData,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(habitsCollectionRef, newHabit);
  return docRef.id;
};

export const addHabitReport = async (habitId: string, value: any) => {
    const report = {
        value,
        reportedAt: Timestamp.now(),
    };
    const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitId, 'reports');
    await addDoc(reportsCollectionRef, report);
};


export const updateHabit = async (habitId: string, habitData: Partial<Omit<Habit, 'id' | 'progress' | 'completed' | 'reports' | 'lastReportedValue'>>) => {
  const habitDoc = doc(db, 'users', userId, 'habits', habitId);
  
  // Construct an update object, removing any undefined values
  const updateData: { [key: string]: any } = {};
  for (const key in habitData) {
    if ((habitData as any)[key] !== undefined) {
      updateData[key] = (habitData as any)[key];
    }
  }

  await updateDoc(habitDoc, updateData);
};

export const deleteHabit = async (habitId: string) => {
  const habitDoc = doc(db, 'users', userId, 'habits', habitId);
  // Note: This does not delete the subcollection of reports. A cloud function is needed for that.
  await deleteDoc(habitDoc);
};

export const deleteHabitReportsForPeriod = async (habitId: string, frequency: HabitFrequency) => {
  const now = new Date();
  let startDate: Date;

  if (frequency === 'daily') {
    startDate = startOfDay(now);
  } else { // weekly
    startDate = startOfWeek(now, { weekStartsOn: 0 }); // 0 for Sunday
  }

  const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitId, 'reports');
  const q = query(reportsCollectionRef, where('reportedAt', '>=', startDate));
  
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

export const getHabitsWithReportsForMonth = async (date: Date): Promise<Habit[]> => {
    try {
        const habitsSnapshot = await getDocs(query(habitsCollectionRef));
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

export const getHabitsWithReportsForWeek = async (date: Date): Promise<Habit[]> => {
    try {
        const habitsSnapshot = await getDocs(query(habitsCollectionRef));
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

export const getUniqueReportMonths = async (): Promise<Date[]> => {
    const habitsSnapshot = await getDocs(query(habitsCollectionRef));
    const allReportsTimestamps: Timestamp[] = [];

    // This can be slow if there are many habits and reports.
    // For a large-scale app, this data would be pre-aggregated.
    for (const habitDoc of habitsSnapshot.docs) {
        const reportsCollectionRef = collection(db, 'users', userId, 'habits', habitDoc.id, 'reports');
        const reportsSnapshot = await getDocs(query(reportsCollectionRef));
        reportsSnapshot.forEach(reportDoc => {
            allReportsTimestamps.push(reportDoc.data().reportedAt as Timestamp);
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

export const seedInitialHabits = async () => {
    const firstHabitCheckRef = doc(db, 'users', userId, 'habits', 'habit-arabic-words');
    const docSnap = await getDoc(firstHabitCheckRef);

    if (docSnap.exists()) {
        console.log("Initial data already exists. Skipping seeding.");
        return;
    }

    console.log("No initial data found. Seeding database...");
    
    const habitsToSeed = [
        // Arabic
        { id: "habit-arabic-words", name: "Arabic Words", description: "Track reviewing words in Arabic every day", frequency: "daily", type: "boolean", goal: "Review 10 words", icon: "Languages" },
        { id: "habit-arabic-speaking", name: "Arabic Speaking", description: "Track total time I spent speaking Arabic in a week", frequency: "weekly", type: "duration", goal: "60 minutes", icon: "Languages" },
        { id: "habit-arabic-studying", name: "Arabic Studying", description: "Track total time I spent studying Arabic in a week", frequency: "weekly", type: "duration", goal: "120 minutes", icon: "BookOpen" },
        // Nutrition
        { id: "habit-morning-eating", name: "Morning Eating", description: "Tracking eating habit, very very important for my diet", frequency: "daily", type: "options", goal: "Eat a non-junky breakfast", options: "skipped,healthy,junky", icon: "Carrot" },
        { id: "habit-lunch-eating", name: "Lunch Eating", description: "Tracking eating habit, very very important for my diet", frequency: "daily", type: "options", goal: "Eat a non-junky lunch", options: "skipped,healthy,junky", icon: "Carrot" },
        { id: "habit-dinner-eating", name: "Dinner Eating", description: "Tracking eating habit, very very important for my diet", frequency: "daily", type: "options", goal: "Eat a non-junky dinner", options: "skipped,healthy,junky", icon: "Carrot" },
        { id: "habit-afternoon-snack", name: "Afternoon Snack", description: "Tracking eating habit, very very important for my diet", frequency: "daily", type: "options", goal: "Eat a non-junky snack", options: "skipped,healthy,junky", icon: "Carrot" },
        // Fitness
        { id: "habit-training-gym", name: "Gym Training", description: "Track weekly gym sessions", frequency: "weekly", type: "number", goal: "4 sessions", icon: "Dumbbell" },
        { id: "habit-training-muay-thai", name: "Muay Thai Training", description: "Track weekly muay thai sessions", frequency: "weekly", type: "number", goal: "2 sessions", icon: "Dumbbell" },
        { id: "habit-nutrition-supplements", name: "Nutrition Supplements", description: "Track daily supplement intake", frequency: "daily", type: "boolean", goal: "Take supplements", icon: "Leaf" },
        { id: "habit-weight", name: "Weight Tracking", description: "Track my weight in kg daily", frequency: "daily", type: "number", goal: "1 entry", icon: "Dumbbell" },
        // Self-improvement
        { id: "habit-projects", name: "Work on projects", description: "Track time I spend on personal projects", frequency: "daily", type: "duration", goal: "60 minutes", icon: "FolderKanban" },
        { id: "habit-smoking", name: "Smoking", description: "Track daily cigarette consumption", frequency: "daily", type: "number", goal: "5 cigarettes", icon: "Leaf" },
        { id: "habit-reading", name: "Reading", description: "Track daily reading progress", frequency: "daily", type: "number", goal: "10 pages", icon: "BookOpen" },
        { id: "habit-waking-up", name: "Waking Up", description: "Track daily wake up time", frequency: "daily", type: "time", goal: "07:00", icon: "Clock" },
        { id: "habit-studying", name: "General Studying", description: "Track weekly study duration", frequency: "weekly", type: "duration", goal: "120 minutes", icon: "GraduationCap" },
    ];

    const batch = writeBatch(db);

    habitsToSeed.forEach(habit => {
        const { id, ...habitData } = habit;
        const habitRef = doc(db, 'users', userId, 'habits', id);
        batch.set(habitRef, {
            ...habitData,
            createdAt: Timestamp.now()
        });
    });

    await batch.commit();
    console.log("Database seeded successfully with initial habits.");
};
