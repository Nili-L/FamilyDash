import { useState, useEffect, useCallback, useRef } from 'react';
import {
  familyMembersApi,
  medicationsApi,
  appointmentsApi,
  tasksApi,
  dataApi,
} from '../api/client';

export const useFamilyData = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('familyDashboard_settings');
      return stored ? JSON.parse(stored) : { theme: 'light', notifications: true, language: 'en' };
    } catch {
      return { theme: 'light', notifications: true, language: 'en' };
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs for current state — avoids stale closures in toggle callbacks
  const medicationsRef = useRef(medications);
  medicationsRef.current = medications;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Wrap an async operation with error state management.
  // Uses a ref so the wrapper itself has a stable identity and doesn't
  // force every callback that uses it to re-render on error changes.
  const setErrorRef = useRef(setError);
  setErrorRef.current = setError;

  const withErrorHandling = useCallback((fn) => {
    return async (...args) => {
      try {
        setErrorRef.current(null);
        return await fn(...args);
      } catch (err) {
        setErrorRef.current(err.message);
        throw err;
      }
    };
  }, []);

  // ── Initial data fetch ──────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [members, meds, apts, tks] = await Promise.all([
        familyMembersApi.getAll(),
        medicationsApi.getAll(),
        appointmentsApi.getAll(),
        tasksApi.getAll(),
      ]);
      setFamilyMembers(members);
      setMedications(meds);
      setAppointments(apts);
      setTasks(tks);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Settings (stays in localStorage — purely UI preferences) ────────
  const updateSettings = useCallback((value) => {
    const next = typeof value === 'function' ? value(settings) : value;
    setSettings(next);
    try { localStorage.setItem('familyDashboard_settings', JSON.stringify(next)); } catch {}
  }, [settings]);

  // ── Family Members ──────────────────────────────────────────────────
  const addFamilyMember = useCallback((member) => withErrorHandling(async () => {
    const created = await familyMembersApi.create(member);
    setFamilyMembers((prev) => [...prev, created]);
    return created;
  })(), [withErrorHandling]);

  const updateFamilyMember = useCallback((id, updates) => withErrorHandling(async () => {
    const updated = await familyMembersApi.update(id, updates);
    setFamilyMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
  })(), [withErrorHandling]);

  const deleteFamilyMember = useCallback((id) => withErrorHandling(async () => {
    await familyMembersApi.remove(id);
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    setMedications((prev) => prev.filter((m) => m.person !== id));
    setAppointments((prev) => prev.filter((a) => a.person !== id));
    setTasks((prev) => prev.filter((t) => t.person !== id));
  })(), [withErrorHandling]);

  // ── Medications ─────────────────────────────────────────────────────
  const addMedication = useCallback((medication) => withErrorHandling(async () => {
    const created = await medicationsApi.create(medication);
    setMedications((prev) => [...prev, created]);
    return created;
  })(), [withErrorHandling]);

  const updateMedication = useCallback((id, updates) => withErrorHandling(async () => {
    const updated = await medicationsApi.update(id, updates);
    setMedications((prev) => prev.map((m) => (m.id === id ? updated : m)));
  })(), [withErrorHandling]);

  const deleteMedication = useCallback((id) => withErrorHandling(async () => {
    await medicationsApi.remove(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
  })(), [withErrorHandling]);

  const toggleMedicationTaken = useCallback((id) => withErrorHandling(async () => {
    const med = medicationsRef.current.find((m) => m.id === id);
    if (!med) return;
    const updates = { taken: !med.taken, takenAt: !med.taken ? new Date().toISOString() : null };
    const updated = await medicationsApi.update(id, updates);
    setMedications((prev) => prev.map((m) => (m.id === id ? updated : m)));
  })(), [withErrorHandling]);

  // ── Appointments ────────────────────────────────────────────────────
  const addAppointment = useCallback((appointment) => withErrorHandling(async () => {
    const created = await appointmentsApi.create(appointment);
    setAppointments((prev) => [...prev, created]);
    return created;
  })(), [withErrorHandling]);

  const updateAppointment = useCallback((id, updates) => withErrorHandling(async () => {
    const updated = await appointmentsApi.update(id, updates);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  })(), [withErrorHandling]);

  const deleteAppointment = useCallback((id) => withErrorHandling(async () => {
    await appointmentsApi.remove(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  })(), [withErrorHandling]);

  // ── Tasks ───────────────────────────────────────────────────────────
  const addTask = useCallback((task) => withErrorHandling(async () => {
    const created = await tasksApi.create(task);
    setTasks((prev) => [...prev, created]);
    return created;
  })(), [withErrorHandling]);

  const updateTask = useCallback((id, updates) => withErrorHandling(async () => {
    const updated = await tasksApi.update(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  })(), [withErrorHandling]);

  const deleteTask = useCallback((id) => withErrorHandling(async () => {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  })(), [withErrorHandling]);

  const toggleTaskCompleted = useCallback((id) => withErrorHandling(async () => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) return;
    const updates = { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null };
    const updated = await tasksApi.update(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  })(), [withErrorHandling]);

  // ── Bulk operations ─────────────────────────────────────────────────
  const exportData = useCallback(() => withErrorHandling(async () => {
    const exported = await dataApi.exportAll();
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  })(), [withErrorHandling]);

  const importData = useCallback(async (file) => {
    setError(null);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const result = await dataApi.importAll(parsed);
          await fetchAll();
          resolve(result);
        } catch (err) {
          setError(err.message);
          reject({ success: false, message: err.message || 'Invalid file format' });
        }
      };
      reader.onerror = () => reject({ success: false, message: 'Error reading file' });
      reader.readAsText(file);
    });
  }, [fetchAll]);

  const clearAllData = useCallback(() => withErrorHandling(async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) return;
    await dataApi.clearAll();
    setFamilyMembers([]);
    setMedications([]);
    setAppointments([]);
    setTasks([]);
  })(), [withErrorHandling]);

  return {
    familyMembers,
    medications,
    appointments,
    tasks,
    settings,
    loading,
    error,

    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,

    addMedication,
    updateMedication,
    deleteMedication,
    toggleMedicationTaken,

    addAppointment,
    updateAppointment,
    deleteAppointment,

    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompleted,

    updateSettings,
    exportData,
    importData,
    clearAllData,
  };
};
