'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-provider';
import { getHiddenHabitsForDate, updateHiddenHabitsForDate } from '@/services/habits';

/**
 * A React hook for managing hidden habits associated with a specific date, stored in Firestore.
 *
 * @param {Date} [selectedDate] - The date for which to manage hidden habits.
 * @param {boolean} [isReadOnly=false] - If true, the hook will only fetch data and not allow modifications.
 * @returns {{
 * hiddenHabits: string[];
 * hideHabit: (habitId: string) => void;
 * showAllHabits: () => void;
 * isLoading: boolean;
 * }} An object containing the list of hidden habits and functions to manipulate them.
 */
export const useHiddenHabits = (selectedDate?: Date, isReadOnly = false) => {
  const { user } = useAuth();
  const [hiddenHabits, setHiddenHabits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to fetch hidden habits when the date or user changes.
  useEffect(() => {
    if (!user || !selectedDate) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchHiddenHabits = async () => {
      setIsLoading(true);
      try {
        const habits = await getHiddenHabitsForDate(user.uid, selectedDate);
        if (isMounted) {
          setHiddenHabits(habits);
        }
      } catch (error) {
        console.error("Failed to fetch hidden habits from Firestore:", error);
        if (isMounted) {
          setHiddenHabits([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHiddenHabits();
    
    return () => { isMounted = false; };
  }, [selectedDate, user]);

  const updateRemoteHabits = async (newHabits: string[]) => {
    if (isReadOnly || !user || !selectedDate) return;
    try {
      await updateHiddenHabitsForDate(user.uid, selectedDate, newHabits);
    } catch (error) {
      console.error("Failed to update hidden habits in Firestore:", error);
      // Optional: Add toast notification for the user
    }
  };

  const hideHabit = useCallback((habitToHide: string) => {
    if (isReadOnly) return;
    setHiddenHabits(prevHabits => {
      if (!prevHabits.includes(habitToHide)) {
        const newHabits = [...prevHabits, habitToHide];
        updateRemoteHabits(newHabits);
        return newHabits;
      }
      return prevHabits;
    });
  }, [user, selectedDate, isReadOnly]);

  const showAllHabits = useCallback(() => {
    if (isReadOnly) return;
    setHiddenHabits([]);
    updateRemoteHabits([]);
  }, [user, selectedDate, isReadOnly]);

  return {
    hiddenHabits,
    hideHabit,
    showAllHabits,
    isLoading,
  };
};
