import React, { useState, useEffect } from 'react';
import { Home, Users, Pill, Calendar, CheckSquare, Settings, Download, Upload, AlertCircle } from 'lucide-react';
import DashboardOverview from './components/DashboardOverview';
import MedicationTracker from './components/MedicationTracker';
import TaskManager from './components/TaskManager';
import FamilyPage from './pages/FamilyPage';
import AppointmentsPage from './pages/AppointmentsPage';
import { useFamilyData } from './hooks/useFamilyData';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [importError, setImportError] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]);

  const {
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
    
    updateSettings,
    exportData,
    importData,
    clearAllData
  } = useFamilyData();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    if (status === 'success') {
      alert('Google account connected successfully!');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const response = await fetch('/api/family-members');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFamilyMembers(data);
    } catch (error) {
      console.error("Error fetching family members:", error);
    }
  };
  
  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await importData(file);
      if (result.success) {
        setImportError('');
        alert('Data imported successfully!');
      }
    } catch (error) {
      setImportError(error.message || 'Failed to import data');
    }
    
    event.target.value = '';
  };
  
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'family', name: 'Family', icon: Users },
    { id: 'medications', name: 'Medications', icon: Pill },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare }
  ];
  
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            familyMembers={familyMembers}
            medications={medications}
            appointments={appointments}
            tasks={tasks}
          />
        );
      case 'family':
        return <FamilyPage />;
      case 'medications':
        return (
          <MedicationTracker
            medications={medications}
            familyMembers={familyMembers}
            onAdd={addMedication}
            onUpdate={updateMedication}
            onDelete={deleteMedication}
            onToggleTaken={toggleMedicationTaken}
          />
        );
      case 'appointments':
        return <AppointmentsPage />;
      case 'tasks':
        return (
          <TaskManager
            tasks={tasks}
            familyMembers={familyMembers}
            onAdd={addTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onToggleCompleted={toggleTaskCompleted}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-primary-600 hidden sm:block">
                Family Dashboard
              </h1>
              <div className="flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-slide-in">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Data Management</h3>
                  <div className="space-y-2">
                    <button
                      onClick={exportData}
                      className="btn btn-secondary w-full py-2 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                    
                    <label className="btn btn-secondary w-full py-2 flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Import Data
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                      />
                    </label>
                    
                    {importError && (
                      <div className="flex items-center gap-2 text-danger-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {importError}
                      </div>
                    )}
                    
                    <button
                      onClick={clearAllData}
                      className="btn btn-danger w-full py-2"
                    >
                      Clear All Data
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">About</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Family Dashboard v1.0.0</p>
                    <p>Designed for families with special needs children</p>
                    <p>All data is stored locally in your browser</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Keyboard Shortcuts</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><kbd>Alt + D</kbd> - Dashboard</p>
                    <p><kbd>Alt + F</kbd> - Family</p>
                    <p><kbd>Alt + M</kbd> - Medications</p>
                    <p><kbd>Alt + A</kbd> - Appointments</p>
                    <p><kbd>Alt + T</kbd> - Tasks</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(false)}
                className="btn btn-primary w-full py-2 mt-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;