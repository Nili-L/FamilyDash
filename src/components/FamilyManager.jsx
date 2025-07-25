import React, { useState } from 'react';
import { Users, UserPlus, Edit2, Trash2, User } from 'lucide-react';
import AddItemForm from './AddItemForm';
import { validateFamilyMember } from '../utils/dataValidation';

const FamilyManager = ({ familyMembers, onAdd, onUpdate, onDelete }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [errors, setErrors] = useState({});
  
  const presetColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];
  
  const handleSubmit = (data) => {
    const validation = validateFamilyMember(data);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    if (editingMember) {
      onUpdate(editingMember.id, data);
    } else {
      onAdd(data);
    }
    
    setIsFormOpen(false);
    setEditingMember(null);
    setErrors({});
  };
  
  const handleEdit = (member) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };
  
  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name}? This will also delete all their medications, appointments, and tasks.`)) {
      onDelete(id);
    }
  };
  
  const fields = [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Enter family member name',
      required: true,
      error: errors.name,
      defaultValue: editingMember?.name
    },
    {
      name: 'color',
      label: 'Color Theme',
      type: 'color',
      required: true,
      presetColors,
      error: errors.color,
      defaultValue: editingMember?.color
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-semibold">Family Members</h2>
        </div>
        <button
          onClick={() => {
            setEditingMember(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>
      
      {familyMembers.length === 0 ? (
        <div className="card p-8 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Family Members Yet</h3>
          <p className="text-gray-500 mb-4">Add your first family member to get started</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn btn-primary px-6 py-2 mx-auto"
          >
            Add First Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyMembers.map((member) => (
            <div
              key={member.id}
              className="card p-4 border-l-4 hover:shadow-md transition-shadow"
              style={{ borderLeftColor: member.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-medium text-lg">{member.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label={`Edit ${member.name}`}
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id, member.name)}
                    className="p-2 hover:bg-danger-50 rounded-lg transition-colors"
                    aria-label={`Delete ${member.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-danger-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <AddItemForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMember(null);
          setErrors({});
        }}
        onSubmit={handleSubmit}
        title={editingMember ? 'Edit Family Member' : 'Add Family Member'}
        fields={fields}
        submitText={editingMember ? 'Update' : 'Add'}
      />
    </div>
  );
};

export default FamilyManager;