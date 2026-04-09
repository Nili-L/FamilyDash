import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Pill, CheckSquare, User, AlertCircle, Flag } from 'lucide-react';
import { formatDate, formatTime, getCurrentDate, getCurrentTime, isOverdue, getDaysUntil } from '../utils/dateHelpers';
import { getMemberById } from '../utils/memberHelpers';
import { getPriorityClass } from '../utils/priorityHelpers';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{formatDate(now)} &bull; {now.toLocaleTimeString()}</>;
}

const DashboardOverview = ({ familyMembers, medications, appointments, tasks }) => {
  const today = getCurrentDate();
  
  const todaysMedications = useMemo(() => {
    return medications
      .filter(med => !med.taken)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [medications]);
  
  const todaysAppointments = useMemo(() => {
    return appointments
      .filter(apt => apt.date === today)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [appointments, today]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(apt => apt.date > today)
      .sort((a, b) => {
        if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
        return (a.time || '').localeCompare(b.time || '');
      })
      .slice(0, 3);
  }, [appointments, today]);
  
  const activeTasks = useMemo(() => {
    return tasks
      .filter(task => !task.completed)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [tasks]);
  
  const overdueMedications = useMemo(() => {
    return todaysMedications.filter(med => isOverdue(today, med.time));
  }, [todaysMedications, today]);
  
  const getMemberInfo = (personId) => getMemberById(personId, familyMembers);
  
  if (familyMembers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Family Dashboard</h1>
          <p className="text-gray-600">
            <LiveClock />
          </p>
        </div>
        
        <div className="card p-12 text-center">
          <User className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to Family Dashboard!</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start by adding your family members to unlock all features and begin managing your family's daily activities.
          </p>
          <p className="text-sm text-gray-400">
            Navigate to the "Family" tab to add your first family member.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Family Dashboard</h1>
        <p className="text-gray-600">
          <LiveClock />
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              <h3 className="font-medium">Family Members</h3>
            </div>
            <span className="text-2xl font-bold text-primary-600">{familyMembers.length}</span>
          </div>
          <div className="flex -space-x-2">
            {familyMembers.slice(0, 5).map(member => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white"
                style={{ backgroundColor: member.color }}
                title={member.name}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {familyMembers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-semibold border-2 border-white">
                +{familyMembers.length - 5}
              </div>
            )}
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary-600" />
              <h3 className="font-medium">Today's Meds</h3>
            </div>
            <span className="text-2xl font-bold text-primary-600">{todaysMedications.length}</span>
          </div>
          {overdueMedications.length > 0 && (
            <p className="text-sm text-danger-600 font-medium">
              {overdueMedications.length} overdue!
            </p>
          )}
          <p className="text-sm text-gray-500">
            {medications.filter(m => m.taken).length} taken today
          </p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <h3 className="font-medium">Appointments</h3>
            </div>
            <span className="text-2xl font-bold text-primary-600">{todaysAppointments.length}</span>
          </div>
          <p className="text-sm text-gray-500">
            Today's appointments
          </p>
          <p className="text-sm text-gray-500">
            {upcomingAppointments.length} upcoming
          </p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary-600" />
              <h3 className="font-medium">Active Tasks</h3>
            </div>
            <span className="text-2xl font-bold text-primary-600">{activeTasks.length}</span>
          </div>
          <p className="text-sm text-gray-500">
            {tasks.filter(t => t.completed).length} completed
          </p>
          <p className="text-sm text-danger-600 font-medium">
            {activeTasks.filter(t => t.priority === 'high').length} high priority
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold">Medications Due Today</h2>
          </div>
          
          {todaysMedications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No medications scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todaysMedications.slice(0, 5).map(med => {
                const member = getMemberInfo(med.person);
                const overdue = isOverdue(today, med.time);
                
                return (
                  <div
                    key={med.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      overdue ? 'bg-danger-50 border-danger-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.initial}
                      </div>
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-gray-600">{member.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${overdue ? 'text-danger-600' : ''}`}>
                        {formatTime(med.time)}
                      </p>
                      {overdue && <p className="text-xs text-danger-600">Overdue</p>}
                    </div>
                  </div>
                );
              })}
              {todaysMedications.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{todaysMedications.length - 5} more medications
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold">Today's Schedule</h2>
          </div>
          
          {todaysAppointments.length === 0 && upcomingAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
          ) : (
            <div className="space-y-3">
              {todaysAppointments.length > 0 && (
                <>
                  <h3 className="font-medium text-gray-700">Today</h3>
                  {todaysAppointments.map(apt => {
                    const member = getMemberInfo(apt.person);
                    
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initial}
                          </div>
                          <div>
                            <p className="font-medium">{apt.title}</p>
                            <p className="text-sm text-gray-600">{member.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatTime(apt.time)}</p>
                          {apt.location && (
                            <p className="text-xs text-gray-600">{apt.location}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              
              {upcomingAppointments.length > 0 && (
                <>
                  <h3 className="font-medium text-gray-700 mt-4">Upcoming</h3>
                  {upcomingAppointments.map(apt => {
                    const member = getMemberInfo(apt.person);
                    const daysUntil = getDaysUntil(apt.date);
                    
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.initial}
                          </div>
                          <div>
                            <p className="font-medium">{apt.title}</p>
                            <p className="text-sm text-gray-600">{member.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{daysUntil}</p>
                          <p className="text-xs text-gray-600">{formatTime(apt.time)}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold">Priority Tasks</h2>
        </div>
        
        {activeTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active tasks</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTasks.slice(0, 6).map(task => {
              const member = getMemberInfo(task.person);
              
              return (
                <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initial}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.task}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{member.name}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityClass(task.priority)}`}>
                          <Flag className="w-3 h-3" />
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activeTasks.length > 6 && (
          <p className="text-sm text-gray-500 text-center mt-3">
            +{activeTasks.length - 6} more tasks
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;