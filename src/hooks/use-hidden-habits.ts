
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

  // Load from localStorage on mount and when date changes
  useEffect(() => {
    // Prevent running on the server or without a selected date
    if (typeof window === 'undefined' || !selectedDate) {
      return;
    }
    
    // Mark as initialized once we have a date on the client
    if (!isInitialized) {
        setIsInitialized(true);
    }

    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');

      if (item) {
        const storedData: StoredHiddenHabits = JSON.parse(item);
        
        // If the date in storage matches the selected date, load the hidden habits
        if (storedData.date === selectedDateKey) {
          setHiddenHabitIds(storedData.hiddenHabitIds);
        } else {
          // If the date is different, the user is viewing a new day, so clear the local state.
          // The localStorage for the *new* day will be set by the other useEffect when a habit is hidden.
          setHiddenHabitIds([]);
        }
      } else {
         // No data in storage, ensure local state is clear
         setHiddenHabitIds([]);
      }
    } catch (error) {
      console.error('Failed to parse hidden habits from localStorage', error);
      // Clear state on error
      setHiddenHabitIds([]);
    }
  }, [selectedDate, isInitialized]); // Rerun when the selectedDate changes

  // Save to localStorage whenever hiddenHabitIds changes
  useEffect(() => {
    // Don't save until initialized and running on the client
    if (typeof window === 'undefined' || !selectedDate || !isInitialized) {
        return;
    }
    
    try {
      const dataToStore: StoredHiddenHabits = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        hiddenHabitIds,
      };
      // Only write to localStorage if there are hidden habits for the current date.
      // Or if there were habits and now there are none (to clear it).
      // This prevents creating empty entries for every day the user visits.
      const existingData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (hiddenHabitIds.length > 0) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
      } else if (existingData) {
        const storedData = JSON.parse(existingData);
        if (storedData.date === format(selectedDate, 'yyyy-MM-dd')) {
            window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
      
    } catch (error) {
      console.error('Failed to save hidden habits to localStorage', error);
    }
  }, [hiddenHabitIds, selectedDate, isInitialized]);

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
