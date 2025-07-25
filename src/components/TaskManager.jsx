import React, { useState, useMemo } from 'react';
import { CheckSquare, Plus, Check, AlertCircle, Flag } from 'lucide-react';
import AddItemForm from './AddItemForm';
import { validateTask } from '../utils/dataValidation';

const TaskManager = ({ 
  tasks, 
  familyMembers, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onToggleCompleted 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('active'); // all, active, completed
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, high, medium, low
  
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    
    if (filter === 'active') {
      filtered = filtered.filter(task => !task.completed);
    } else if (filter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
      return 0;
    });
  }, [tasks, filter, priorityFilter]);
  
  const handleSubmit = (data) => {
    const validation = validateTask(data);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    const taskData = {
      ...data,
      person: parseInt(data.person)
    };
    
    if (editingTask) {
      onUpdate(editingTask.id, taskData);
    } else {
      onAdd(taskData);
    }
    
    setIsFormOpen(false);
    setEditingTask(null);
    setErrors({});
  };
  
  const handleEdit = (task) => {
    setEditingTask(task);
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
  
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };
  
  const fields = [
    {
      name: 'task',
      label: 'Task Description',
      type: 'text',
      placeholder: 'e.g., Complete speech therapy exercises',
      required: true,
      error: errors.task,
      defaultValue: editingTask?.task
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
      defaultValue: editingTask?.person
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      options: [
        { value: 'high', label: 'High Priority' },
        { value: 'medium', label: 'Medium Priority' },
        { value: 'low', label: 'Low Priority' }
      ],
      error: errors.priority,
      defaultValue: editingTask?.priority || 'medium'
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Additional details or instructions',
      rows: 2,
      defaultValue: editingTask?.notes
    }
  ];
  
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const highPriority = tasks.filter(t => !t.completed && t.priority === 'high').length;
    
    return { total, completed, active, highPriority };
  }, [tasks]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-semibold">Daily Tasks</h2>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
          disabled={familyMembers.length === 0}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
      
      {familyMembers.length === 0 ? (
        <div className="card p-8 text-center">
          <AlertCircle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Add Family Members First</h3>
          <p className="text-gray-500">You need to add family members before creating tasks</p>
        </div>
      ) : (
        <>
          {taskStats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{taskStats.active}</p>
                <p className="text-sm text-gray-600">Active Tasks</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-success-600">{taskStats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-danger-600">{taskStats.highPriority}</p>
                <p className="text-sm text-gray-600">High Priority</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-gray-600">
                  {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Progress</p>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'active' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'completed' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
            </div>
            
            <div className="border-l pl-2 flex gap-2">
              <button
                onClick={() => setPriorityFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  priorityFilter === 'all' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Priorities
              </button>
              <button
                onClick={() => setPriorityFilter('high')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  priorityFilter === 'high' 
                    ? 'bg-danger-600 text-white' 
                    : 'bg-danger-100 text-danger-700 hover:bg-danger-200'
                }`}
              >
                High
              </button>
              <button
                onClick={() => setPriorityFilter('medium')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  priorityFilter === 'medium' 
                    ? 'bg-warning-600 text-white' 
                    : 'bg-warning-100 text-warning-700 hover:bg-warning-200'
                }`}
              >
                Medium
              </button>
              <button
                onClick={() => setPriorityFilter('low')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  priorityFilter === 'low' 
                    ? 'bg-success-600 text-white' 
                    : 'bg-success-100 text-success-700 hover:bg-success-200'
                }`}
              >
                Low
              </button>
            </div>
          </div>
          
          {filteredTasks.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {tasks.length === 0 ? 'No Tasks Yet' : 'No Tasks Found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {tasks.length === 0 
                  ? 'Create tasks to manage daily activities and routines' 
                  : 'No tasks match the current filters'}
              </p>
              {tasks.length === 0 && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="btn btn-primary px-6 py-2 mx-auto"
                >
                  Create First Task
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`card p-4 border-l-4 ${task.completed ? 'opacity-75 bg-gray-50' : ''}`}
                  style={{ borderLeftColor: getMemberColor(task.person) }}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleCompleted(task.id)}
                      className={`mt-0.5 p-1 rounded transition-colors ${
                        task.completed
                          ? 'bg-success-100 text-success-700'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      <Check className={`w-4 h-4 ${task.completed ? '' : 'opacity-0'}`} />
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.task}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600">
                              {getMemberName(task.person)}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getPriorityClass(task.priority)}`}>
                              <Flag className="w-3 h-3" />
                              {task.priority}
                            </span>
                          </div>
                          {task.notes && (
                            <p className="text-sm text-gray-500 mt-2">{task.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete task "${task.task}"?`)) {
                                onDelete(task.id);
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
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      <AddItemForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
          setErrors({});
        }}
        onSubmit={handleSubmit}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        fields={fields}
        submitText={editingTask ? 'Update' : 'Add'}
      />
    </div>
  );
};

export default TaskManager;