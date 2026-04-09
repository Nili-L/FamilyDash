import { useState, useEffect, useCallback } from 'react';
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
  const addFamilyMember = useCallback(async (member) => {
    const created = await familyMembersApi.create(member);
    setFamilyMembers((prev) => [...prev, created]);
    return created;
  }, []);

  const updateFamilyMember = useCallback(async (id, updates) => {
    const updated = await familyMembersApi.update(id, updates);
    setFamilyMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, []);

  const deleteFamilyMember = useCallback(async (id) => {
    await familyMembersApi.remove(id);
    // Server cascade-deletes associated data; mirror locally
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    setMedications((prev) => prev.filter((m) => m.person !== id));
    setAppointments((prev) => prev.filter((a) => a.person !== id));
    setTasks((prev) => prev.filter((t) => t.person !== id));
  }, []);

  // ── Medications ─────────────────────────────────────────────────────
  const addMedication = useCallback(async (medication) => {
    const created = await medicationsApi.create(medication);
    setMedications((prev) => [...prev, created]);
    return created;
  }, []);

  const updateMedication = useCallback(async (id, updates) => {
    const updated = await medicationsApi.update(id, updates);
    setMedications((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, []);

  const deleteMedication = useCallback(async (id) => {
    await medicationsApi.remove(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const toggleMedicationTaken = useCallback(async (id) => {
    const med = medications.find((m) => m.id === id);
    if (!med) return;
    const updates = { taken: !med.taken, takenAt: !med.taken ? new Date().toISOString() : null };
    const updated = await medicationsApi.update(id, updates);
    setMedications((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, [medications]);

  // ── Appointments ────────────────────────────────────────────────────
  const addAppointment = useCallback(async (appointment) => {
    const created = await appointmentsApi.create(appointment);
    setAppointments((prev) => [...prev, created]);
    return created;
  }, []);

  const updateAppointment = useCallback(async (id, updates) => {
    const updated = await appointmentsApi.update(id, updates);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }, []);

  const deleteAppointment = useCallback(async (id) => {
    await appointmentsApi.remove(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Tasks ───────────────────────────────────────────────────────────
  const addTask = useCallback(async (task) => {
    const created = await tasksApi.create(task);
    setTasks((prev) => [...prev, created]);
    return created;
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    const updated = await tasksApi.update(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const deleteTask = useCallback(async (id) => {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTaskCompleted = useCallback(async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updates = { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null };
    const updated = await tasksApi.update(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, [tasks]);

  // ── Bulk operations ─────────────────────────────────────────────────
  const exportData = useCallback(async () => {
    const exported = await dataApi.exportAll();
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const result = await dataApi.importAll(parsed);
          await fetchAll(); // Refresh local state from server
          resolve(result);
        } catch (err) {
          reject({ success: false, message: err.message || 'Invalid file format' });
        }
      };
      reader.onerror = () => reject({ success: false, message: 'Error reading file' });
      reader.readAsText(file);
    });
  }, [fetchAll]);

  const clearAllData = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) return;
    await dataApi.clearAll();
    setFamilyMembers([]);
    setMedications([]);
    setAppointments([]);
    setTasks([]);
  }, []);

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
