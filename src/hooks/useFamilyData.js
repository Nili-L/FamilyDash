import { useLocalStorage } from './useLocalStorage';
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEYS = {
  MEDICATIONS: 'familyDashboard_medications',
  APPOINTMENTS: 'familyDashboard_appointments',
  TASKS: 'familyDashboard_tasks',
  SETTINGS: 'familyDashboard_settings'
};

export const useFamilyData = () => {
  const [medications, setMedications] = useLocalStorage(STORAGE_KEYS.MEDICATIONS, []);
  const [appointments, setAppointments] = useLocalStorage(STORAGE_KEYS.APPOINTMENTS, []);
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.TASKS, []);
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, {
    theme: 'light',
    notifications: true,
    language: 'en'
  });
  
  const [nextId, setNextId] = useState(1);
  
  useEffect(() => {
    const maxId = Math.max(
      ...medications.map(m => parseInt(m.id) || 0),
      ...appointments.map(a => parseInt(a.id) || 0),
      ...tasks.map(t => parseInt(t.id) || 0),
      0
    );
    setNextId(maxId + 1);
  }, [medications, appointments, tasks]);
  
  const getNextId = useCallback(() => {
    const id = nextId.toString(); // Ensure ID is a string
    setNextId(prev => prev + 1);
    return id;
  }, [nextId]);
  
  const addMedication = useCallback((medication) => {
    const newMedication = { 
      ...medication, 
      id: getNextId(),
      person: String(medication.person), // Ensure person ID is a string
      taken: false,
      createdAt: new Date().toISOString(),
      recurrenceType: medication.recurrenceType || 'once',
      recurrenceDetails: medication.recurrenceDetails || null,
    };
    setMedications(prev => [...prev, newMedication]);
    return newMedication;
  }, [getNextId, setMedications]);
  
  const updateMedication = useCallback((id, updates) => {
    setMedications(prev => 
      prev.map(med => med.id === id ? { ...med, ...updates } : med)
    );
  }, [setMedications]);
  
  const deleteMedication = useCallback((id) => {
    setMedications(prev => prev.filter(med => med.id !== id));
  }, [setMedications]);
  
  const toggleMedicationTaken = useCallback((id) => {
    setMedications(prev => 
      prev.map(med => 
        med.id === id 
          ? { ...med, taken: !med.taken, takenAt: !med.taken ? new Date().toISOString() : null }
          : med
      )
    );
  }, [setMedications]);
  
  const addAppointment = useCallback((appointment) => {
    const newAppointment = { 
      ...appointment, 
      id: getNextId(),
      person: String(appointment.person), // Ensure person ID is a string
      createdAt: new Date().toISOString()
    };
    setAppointments(prev => [...prev, newAppointment]);
    return newAppointment;
  }, [getNextId, setAppointments]);
  
  const updateAppointment = useCallback((id, updates) => {
    setAppointments(prev => 
      prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
    );
  }, [setAppointments]);
  
  const deleteAppointment = useCallback((id) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
  }, [setAppointments]);
  
  const addTask = useCallback((task) => {
    const newTask = { 
      ...task, 
      id: getNextId(),
      person: String(task.person), // Ensure person ID is a string
      completed: false,
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, [getNextId, setTasks]);
  
  const updateTask = useCallback((id, updates) => {
    setTasks(prev => 
      prev.map(task => task.id === id ? { ...task, ...updates } : task)
    );
  }, [setTasks]);
  
  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, [setTasks]);
  
  const toggleTaskCompleted = useCallback((id) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
          : task
      )
    );
  }, [setTasks]);
  
  const exportData = useCallback(() => {
    const data = {
      medications,
      appointments,
      tasks,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [medications, appointments, tasks, settings]);
  
  const importData = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.medications) setMedications(data.medications);
          if (data.appointments) setAppointments(data.appointments);
          if (data.tasks) setTasks(data.tasks);
          if (data.settings) setSettings(data.settings);
          
          resolve({ success: true, message: 'Data imported successfully' });
        } catch (error) {
          reject({ success: false, message: 'Invalid file format' });
        }
      };
      reader.onerror = () => reject({ success: false, message: 'Error reading file' });
      reader.readAsText(file);
    });
  }, [setMedications, setAppointments, setTasks, setSettings]);
  
  const clearAllData = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      setMedications([]);
      setAppointments([]);
      setTasks([]);
      setSettings({
        theme: 'light',
        notifications: true,
        language: 'en'
      });
    }
  }, [setMedications, setAppointments, setTasks, setSettings]);
  
  return {
    medications,
    appointments,
    tasks,
    settings,
    
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
    
    updateSettings: setSettings,
    exportData,
    importData,
    clearAllData
  };
};