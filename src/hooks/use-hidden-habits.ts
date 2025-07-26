
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

const LOCAL_STORAGE_KEY = 'hiddenHabits';

type StoredHiddenHabits = {
  date: string; // 'yyyy-MM-dd'
  hiddenHabitIds: string[];
};

export function useHiddenHabits(selectedDate?: Date) {
  const [hiddenHabitIds, setHiddenHabitIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Effect to initialize and load from localStorage when date changes
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedDate) {
      return;
    }

    // Mark as initialized on the first run with a valid date on the client
    if (!isInitialized) {
      setIsInitialized(true);
    }

    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

      if (item) {
        const storedData: StoredHiddenHabits = JSON.parse(item);
        // If the date in storage matches the selected date, load the hidden habits.
        // Otherwise, reset the hidden list for the new day.
        if (storedData.date === selectedDateKey) {
          setHiddenHabitIds(storedData.hiddenHabitIds);
        } else {
          setHiddenHabitIds([]);
        }
      } else {
        // If there's no item in localStorage, ensure the state is empty.
        setHiddenHabitIds([]);
      }
    } catch (error) {
      console.error('Failed to parse hidden habits from localStorage', error);
      setHiddenHabitIds([]); // Reset on error
    }
  }, [selectedDate]); // This effect runs only when the selectedDate changes.

  // Effect to save to localStorage whenever hiddenHabitIds or selectedDate changes
  useEffect(() => {
    // We don't save to localStorage until the hook is initialized from the client.
    // This prevents writing empty data to localStorage on the initial server render.
    if (typeof window === 'undefined' || !selectedDate || !isInitialized) {
      return;
    }
    
    try {
      const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
      
      // If there are habits to hide for the current date, store them.
      if (hiddenHabitIds.length > 0) {
        const dataToStore: StoredHiddenHabits = {
          date: selectedDateKey,
          hiddenHabitIds,
        };
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
      } else {
        // If there are no hidden habits, we should clear localStorage *only if* it's currently storing data for the selected date.
        // This prevents unnecessarily clearing localStorage when viewing a new day that has no hidden habits yet.
        const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (item) {
          const storedData: StoredHiddenHabits = JSON.parse(item);
          if (storedData.date === selectedDateKey) {
            window.localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save hidden habits to localStorage', error);
    }
  }, [hiddenHabitIds, selectedDate, isInitialized]); // This effect runs whenever the data to be saved changes.

  const hideHabit = useCallback((habitId: string) => {
    setHiddenHabitIds((prev) => {
      if (prev.includes(habitId)) {
        return prev;
      }
      return [...prev, habitId];
    });
  }, []);

  const showAllHabits = useCallback(() => {
    setHiddenHabitIds([]);
  }, []);

  return { hiddenHabitIds, hideHabit, showAllHabits };
}
