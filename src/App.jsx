import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Home, Users, Pill, Calendar, CheckSquare, Settings, Download, Upload, AlertCircle, LogOut } from 'lucide-react';

const DashboardOverview = lazy(() => import('./components/DashboardOverview'));
const MedicationTracker = lazy(() => import('./components/MedicationTracker'));
const TaskManager = lazy(() => import('./components/TaskManager'));
const FamilyPage = lazy(() => import('./pages/FamilyPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
import { useFamilyData } from './hooks/useFamilyData';
import { useFocusTrap } from './hooks/useFocusTrap';
import { authApi } from './api/client';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [importError, setImportError] = useState('');
  const [authenticated, setAuthenticated] = useState(null); // null = checking
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const settingsDialogRef = useFocusTrap(showSettings);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // Check auth on mount, poll every 15 min, listen for 401 events
  useEffect(() => {
    const checkAuth = () => authApi.status().then((s) => {
      if (!s.authenticated) setAuthenticated(false);
    }).catch(() => setAuthenticated(false));

    checkAuth();
    const interval = setInterval(checkAuth, 15 * 60 * 1000);
    const onAuthRequired = () => setAuthenticated(false);
    window.addEventListener('auth:required', onAuthRequired);
    return () => {
      clearInterval(interval);
      window.removeEventListener('auth:required', onAuthRequired);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await authApi.login(loginPassword);
      setLoginPassword('');
      setAuthenticated(true);
    } catch {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAuthenticated(false);
    }
  };

  const {
    familyMembers,
    medications,
    appointments,
    tasks,
    settings,
    
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
    loading,
    error,
  } = useFamilyData();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        const keyMap = { d: 'dashboard', f: 'family', m: 'medications', a: 'appointments', t: 'tasks' };
        const tab = keyMap[e.key.toLowerCase()];
        if (tab) { e.preventDefault(); setActiveTab(tab); }
      }
      if (e.key === 'Escape' && showSettings) setShowSettings(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings]);
  
  const handleImport = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const result = await importData(file);
      if (result.success) {
        setImportError('');
        setToast({ message: 'Data imported successfully!', type: 'success' });
      }
    } catch (error) {
      setImportError(error.message || 'Failed to import data');
    } finally {
      input.value = '';
    }
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
        return (
          <FamilyPage
            familyMembers={familyMembers}
            onAdd={addFamilyMember}
            onDelete={deleteFamilyMember}
          />
        );
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
        return (
          <AppointmentsPage
            appointments={appointments}
            familyMembers={familyMembers}
            onAdd={addAppointment}
            onUpdate={updateAppointment}
            onDelete={deleteAppointment}
          />
        );
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
  
  if (authenticated === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full space-y-4">
          <h1 className="text-2xl font-bold text-center text-primary-600">Family Dashboard</h1>
          <p className="text-sm text-gray-500 text-center">Enter the family password to continue</p>
          <label htmlFor="login-password" className="sr-only">Password</label>
          <input
            id="login-password"
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Password"
            className="border p-2 rounded w-full"
            autoFocus
          />
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button type="submit" className="btn btn-primary w-full py-2">Log In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-primary-600 hidden sm:block">
                Family Dashboard
              </h1>
              <div className="flex space-x-1" role="tablist" aria-label="Main navigation">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`tabpanel-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      aria-label={tab.name}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main id={`tabpanel-${activeTab}`} role="tabpanel" aria-label={activeTab} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            <span className="ml-3 text-gray-500">Loading...</span>
          </div>
        ) : (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><span className="text-gray-500">Loading...</span></div>}>
            {renderContent()}
          </Suspense>
        )}
      </main>
      
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={settingsDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-dialog-title"
            className="bg-white rounded-lg shadow-xl max-w-md w-full animate-slide-in"
          >
            <div className="p-6">
              <h2 id="settings-dialog-title" className="text-2xl font-semibold mb-4">Settings</h2>
              
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
                      onClick={() => setConfirmAction({
                        message: 'Are you sure you want to clear all data? This action cannot be undone.',
                        onConfirm: () => { clearAllData(); setConfirmAction(null); },
                      })}
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

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          confirmText="Delete"
          danger
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default App;