
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Habit, HabitFrequency, HabitReport } from '@/lib/types';
import { startOfDay, startOfWeek, startOfMonth, endOfMonth, format, parse } from 'date-fns';

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
