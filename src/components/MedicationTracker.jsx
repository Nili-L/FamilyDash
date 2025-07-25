import React, { useState, useMemo } from 'react';
import { Pill, Plus, Check, X, Clock, AlertCircle } from 'lucide-react';
import AddItemForm from './AddItemForm';
import { formatTime, getCurrentDate, isOverdue } from '../utils/dateHelpers';
import { validateMedication } from '../utils/dataValidation';
import { getTimeSlots } from '../utils/dateHelpers';

const MedicationTracker = ({ 
  medications, 
  familyMembers, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onToggleTaken 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('all'); // all, today, overdue
  
  const today = getCurrentDate();
  const timeSlots = useMemo(() => getTimeSlots(15), []);
  
  const filteredMedications = useMemo(() => {
    let filtered = [...medications];
    
    if (filter === 'today') {
      filtered = filtered.filter(med => !med.taken);
    } else if (filter === 'overdue') {
      filtered = filtered.filter(med => !med.taken && isOverdue(today, med.time));
    }
    
    return filtered.sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });
  }, [medications, filter, today]);
  
  const handleSubmit = (data) => {
    const validation = validateMedication(data);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    const medicationData = {
      ...data,
      person: parseInt(data.person)
    };
    
    if (editingMedication) {
      onUpdate(editingMedication.id, medicationData);
    } else {
      onAdd(medicationData);
    }
    
    setIsFormOpen(false);
    setEditingMedication(null);
    setErrors({});
  };
  
  const handleEdit = (medication) => {
    setEditingMedication(medication);
    setIsFormOpen(true);
  };
  
  const getMemberName = (personId) => {
    const member = familyMembers.find(m => m.id === personId);
    return member?.name || 'Unknown';
  };
  
  const fields = [
    {
      name: 'name',
      label: 'Medication Name',
      type: 'text',
      placeholder: 'e.g., Vitamin D, Insulin',
      required: true,
      error: errors.name,
      defaultValue: editingMedication?.name
    },
    {
      name: 'person',
      label: 'Family Member',
      type: 'select',
      required: true,
      options: familyMembers.map(member => ({
        value: member.id,
        label: member.name
      })),
      error: errors.person,
      defaultValue: editingMedication?.person
    },
    {
      name: 'time',
      label: 'Time',
      type: 'select',
      required: true,
      options: timeSlots,
      error: errors.time,
      defaultValue: editingMedication?.time
    },
    {
      name: 'recurrenceType',
      label: 'Repeats',
      type: 'select',
      required: true,
      options: [
        { value: 'once', label: 'Once' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
      ],
      error: errors.recurrenceType,
      defaultValue: editingMedication?.recurrenceType || 'once'
    },
    {
      name: 'recurrenceDetails',
      label: 'Recurrence Details (e.g., "Mon, Wed, Fri" or "15th of month")',
      type: 'text',
      placeholder: 'Optional details for recurrence',
      defaultValue: editingMedication?.recurrenceDetails || ''
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Special instructions, dosage, etc.',
      rows: 2,
      defaultValue: editingMedication?.notes
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-semibold">Medications</h2>
        </div>
        <button
          onClick={() => {
            setEditingMedication(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
          disabled={familyMembers.length === 0}
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </button>
      </div>
      
      {familyMembers.length === 0 ? (
        <div className="card p-8 text-center">
          <AlertCircle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Add Family Members First</h3>
          <p className="text-gray-500">You need to add family members before tracking medications</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({medications.length})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'today' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending ({medications.filter(m => !m.taken).length})
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'overdue' 
                  ? 'bg-danger-100 text-danger-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Overdue ({medications.filter(m => !m.taken && isOverdue(today, m.time)).length})
            </button>
          </div>
          
          {filteredMedications.length === 0 ? (
            <div className="card p-8 text-center">
              <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {filter === 'all' ? 'No Medications Yet' : 'No Medications Found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {filter === 'all' 
                  ? 'Add medications to track daily doses' 
                  : 'No medications match the current filter'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="btn btn-primary px-6 py-2 mx-auto"
                >
                  Add First Medication
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedications.map((medication) => {
                const isOverdueMed = !medication.taken && isOverdue(today, medication.time);
                
                return (
                  <div
                    key={medication.id}
                    className={`card p-4 border-l-4 ${
                      medication.taken 
                        ? 'opacity-75 bg-gray-50' 
                        : isOverdueMed 
                          ? 'border-danger-500 bg-danger-50' 
                          : ''
                    }`}
                    style={{ 
                      borderLeftColor: medication.taken || isOverdueMed 
                        ? undefined 
                        : getMemberColor(medication.person) 
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{medication.name}</h3>
                        <p className="text-sm text-gray-600">
                          For {getMemberName(medication.person)}
                        </p>
                        {medication.recurrenceType && medication.recurrenceType !== 'once' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Repeats: {medication.recurrenceType}
                            {medication.recurrenceDetails && ` (${medication.recurrenceDetails})`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onToggleTaken(medication.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          medication.taken
                            ? 'bg-success-100 text-success-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                        aria-label={medication.taken ? 'Mark as not taken' : 'Mark as taken'}
                      >
                        {medication.taken ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className={isOverdueMed ? 'text-danger-600 font-medium' : ''}>
                        {formatTime(medication.time)}
                        {isOverdueMed && ' - Overdue!'}
                      </span>
                    </div>
                    
                    {medication.notes && (
                      <p className="text-sm text-gray-500 mb-2">{medication.notes}</p>
                    )}
                    
                    {medication.taken && medication.takenAt && (
                      <p className="text-sm text-success-600">
                        Taken at {formatTime(new Date(medication.takenAt).toTimeString().slice(0, 5))}
                      </p>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEdit(medication)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${medication.name}?`)) {
                            onDelete(medication.id);
                          }
                        }}
                        className="text-sm text-danger-600 hover:text-danger-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      
      <AddItemForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMedication(null);
          setErrors({});
        }}
        onSubmit={handleSubmit}
        title={editingMedication ? 'Edit Medication' : 'Add Medication'}
        fields={fields}
        submitText={editingMedication ? 'Update' : 'Add'}
      />
    </div>
  );
};

export default MedicationTracker;