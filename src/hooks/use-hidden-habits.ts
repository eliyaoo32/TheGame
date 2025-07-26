
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
    // Prevent running on the server
    if (typeof window === 'undefined' || !selectedDate) {
      return;
    }
    
    setIsInitialized(true);

    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (item) {
        const storedData: StoredHiddenHabits = JSON.parse(item);
        const todayKey = format(selectedDate, 'yyyy-MM-dd');
        
        // If the stored date is today, load the hidden habits
        if (storedData.date === todayKey) {
          setHiddenHabitIds(storedData.hiddenHabitIds);
        } else {
          // If the date is different, clear the storage for the new day
          window.localStorage.removeItem(LOCAL_STORAGE_KEY);
          setHiddenHabitIds([]);
        }
      } else {
         setHiddenHabitIds([]);
      }
    } catch (error) {
      console.error('Failed to parse hidden habits from localStorage', error);
      setHiddenHabitIds([]);
    }
  }, [selectedDate]);

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
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
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
