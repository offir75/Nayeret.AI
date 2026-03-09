import { useEffect, useState } from 'react';

const STREAK_KEY = 'nayeret_streak';
const LAST_VISIT_KEY = 'nayeret_last_visit';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function useStreak() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today = getToday();
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    let currentStreak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);

    if (lastVisit === today) {
      // Already visited today
      setStreak(currentStreak);
      return;
    }

    if (lastVisit && daysBetween(lastVisit, today) === 1) {
      // Consecutive day
      currentStreak += 1;
    } else if (!lastVisit || daysBetween(lastVisit, today) > 1) {
      // Streak broken or first visit
      currentStreak = 1;
    }

    localStorage.setItem(STREAK_KEY, currentStreak.toString());
    localStorage.setItem(LAST_VISIT_KEY, today);
    setStreak(currentStreak);
  }, []);

  return streak;
}
