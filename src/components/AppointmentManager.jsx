import React, { useState, useMemo } from 'react';
import { Calendar, Plus, MapPin, Clock, User, AlertCircle } from 'lucide-react';
import AddItemForm from './AddItemForm';
import { formatDate, formatTime, getDaysUntil, sortByDateTime, getCurrentDate } from '../utils/dateHelpers';
import { validateAppointment } from '../utils/dataValidation';
import { getTimeSlots } from '../utils/dateHelpers';

const AppointmentManager = ({ 
  appointments, 
  familyMembers, 
  onAdd, 
  onUpdate, 
  onDelete 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('upcoming'); // all, upcoming, past
  
  const today = getCurrentDate();
  const timeSlots = useMemo(() => getTimeSlots(15), []);
  
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];
    
    if (filter === 'upcoming') {
      filtered = filtered.filter(apt => apt.date >= today);
    } else if (filter === 'past') {
      filtered = filtered.filter(apt => apt.date < today);
    }
    
    return sortByDateTime(filtered);
  }, [appointments, filter, today]);
  
  const handleSubmit = (data) => {
    const validation = validateAppointment(data);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    const appointmentData = {
      ...data,
      person: parseInt(data.person)
    };
    
    if (editingAppointment) {
      onUpdate(editingAppointment.id, appointmentData);
    } else {
      onAdd(appointmentData);
    }
    
    setIsFormOpen(false);
    setEditingAppointment(null);
    setErrors({});
  };
  
  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
  };
  
  const getMemberColor = (personId) => {
    const member = familyMembers.find(m => m.id === parseInt(personId));
    return member?.color || '#6b7280';
  };
  
  const getMemberName = (personId) => {
    const member = familyMembers.find(m => m.id === parseInt(personId));
    return member?.name || 'Unknown';
  };
  
  const fields = [
    {
      name: 'title',
      label: 'Appointment Title',
      type: 'text',
      placeholder: 'e.g., Therapy Session, Doctor Visit',
      required: true,
      error: errors.title,
      defaultValue: editingAppointment?.title
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
      defaultValue: editingAppointment?.person
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      min: today,
      error: errors.date,
      defaultValue: editingAppointment?.date
    },
    {
      name: 'time',
      label: 'Time',
      type: 'select',
      required: true,
      options: timeSlots,
      error: errors.time,
      defaultValue: editingAppointment?.time
    },
    {
      name: 'location',
      label: 'Location',
      type: 'text',
      placeholder: 'e.g., Children\'s Hospital, Room 203',
      error: errors.location,
      defaultValue: editingAppointment?.location
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Additional information or reminders',
      rows: 2,
      defaultValue: editingAppointment?.notes
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-semibold">Appointments</h2>
        </div>
        <button
          onClick={() => {
            setEditingAppointment(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
          disabled={familyMembers.length === 0}
        >
          <Plus className="w-4 h-4" />
          Add Appointment
        </button>
      </div>
      
      {familyMembers.length === 0 ? (
        <div className="card p-8 text-center">
          <AlertCircle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Add Family Members First</h3>
          <p className="text-gray-500">You need to add family members before scheduling appointments</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'upcoming' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Upcoming ({appointments.filter(a => a.date >= today).length})
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'past' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Past ({appointments.filter(a => a.date < today).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({appointments.length})
            </button>
          </div>
          
          {filteredAppointments.length === 0 ? (
            <div className="card p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {filter === 'all' ? 'No Appointments Yet' : `No ${filter} appointments`}
              </h3>
              <p className="text-gray-500 mb-4">
                {filter === 'all' 
                  ? 'Schedule appointments to keep track of important dates' 
                  : 'No appointments match the current filter'}
              </p>
              {filter === 'upcoming' && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="btn btn-primary px-6 py-2 mx-auto"
                >
                  Schedule First Appointment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const daysUntil = getDaysUntil(appointment.date);
                const isPast = appointment.date < today;
                
                return (
                  <div
                    key={appointment.id}
                    className={`card p-4 border-l-4 ${isPast ? 'opacity-75 bg-gray-50' : ''}`}
                    style={{ borderLeftColor: getMemberColor(appointment.person) }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-lg">{appointment.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>{getMemberName(appointment.person)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(appointment.date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(appointment.time)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {appointment.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                            <MapPin className="w-4 h-4" />
                            <span>{appointment.location}</span>
                          </div>
                        )}
                        
                        {appointment.notes && (
                          <p className="text-sm text-gray-500 mt-2">{appointment.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${
                          isPast ? 'text-gray-500' : 
                          daysUntil === 'Today' ? 'text-danger-600' :
                          daysUntil === 'Tomorrow' ? 'text-warning-600' :
                          'text-gray-600'
                        }`}>
                          {daysUntil}
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete appointment "${appointment.title}"?`)) {
                                onDelete(appointment.id);
                              }
                            }}
                            className="text-sm text-danger-600 hover:text-danger-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
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
          setEditingAppointment(null);
          setErrors({});
        }}
        onSubmit={handleSubmit}
        title={editingAppointment ? 'Edit Appointment' : 'Schedule Appointment'}
        fields={fields}
        submitText={editingAppointment ? 'Update' : 'Schedule'}
      />
    </div>
  );
};

export default AppointmentManager;