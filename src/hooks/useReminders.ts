'use client';
import { useEffect, useState } from 'react';

export function useReminders() {
  const [reminders, setReminders] = useState({ urgent: [], upcoming: [], total: 0 });
  useEffect(() => {
    fetch('/api/reminders', { credentials: 'include' }).then(r => r.json()).then(setReminders);
  }, []);
  return { reminders };
}