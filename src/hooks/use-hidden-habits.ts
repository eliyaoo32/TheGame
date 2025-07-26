
'use client';

import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY_PREFIX = 'hiddenHabits_';

/**
 * A React hook for managing hidden habits associated with a specific date.
 * Habits are stored in local storage.
 *
 * @param {Date} [selectedDate] - The date for which to manage hidden habits. Defaults to today's date if not provided.
 * @returns {{
 * hiddenHabits: string[];
 * hideHabit: (habit: string) => void;
 * showAllHabits: () => void;
 * }} An object containing the list of hidden habits and functions to manipulate them.
 */
export const useHiddenHabits = (selectedDate?: Date) => {
  const dateKey = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const localStorageKey = `${LOCAL_STORAGE_KEY_PREFIX}${dateKey}`;

  const [hiddenHabits, setHiddenHabits] = useState<string[]>(() => {
    if (typeof window === 'undefined' || !dateKey) {
      return [];
    }
    try {
      const storedHabits = localStorage.getItem(localStorageKey);
      return storedHabits ? JSON.parse(storedHabits) : [];
    } catch (error) {
      console.error("Failed to parse hidden habits from local storage:", error);
      return [];
    }
  });

  // When the date changes, we need to re-read from local storage for the new key.
  useEffect(() => {
    if (!dateKey) return;
    try {
      const storedHabits = localStorage.getItem(localStorageKey);
      setHiddenHabits(storedHabits ? JSON.parse(storedHabits) : []);
    } catch (error) {
      console.error("Failed to parse hidden habits from local storage:", error);
      setHiddenHabits([]);
    }
  }, [dateKey, localStorageKey]);

  // Effect to update local storage whenever hiddenHabits for the current date changes.
  useEffect(() => {
    if (!dateKey) return;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(hiddenHabits));
    } catch (error) {
      console.error("Failed to save hidden habits to local storage:", error);
    }
  }, [hiddenHabits, localStorageKey, dateKey]);

  const hideHabit = useCallback((habitToHide: string) => {
    setHiddenHabits(prevHabits => {
      if (!prevHabits.includes(habitToHide)) {
        return [...prevHabits, habitToHide];
      }
      return prevHabits;
    });
  }, []);

  const showAllHabits = useCallback(() => {
    setHiddenHabits([]);
  }, []);

  return {
    hiddenHabits,
    hideHabit,
    showAllHabits,
  };
};
