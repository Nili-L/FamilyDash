import React, { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const FamilyPage = ({ familyMembers, onAdd, onDelete }) => {
    const [newMemberName, setNewMemberName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    const handleAddMember = (e) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;
        onAdd({ name: newMemberName.trim() });
        setNewMemberName('');
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Family Members</h1>

            <form onSubmit={handleAddMember} className="mb-6 flex gap-2">
                <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Add new family member"
                    className="border p-2 rounded w-full md:w-1/2"
                />
                <button type="submit" className="btn btn-primary p-2 rounded">
                    Add Member
                </button>
            </form>

            {familyMembers.length === 0 && (
                <p className="text-gray-500">No family members yet. Add someone above to get started.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyMembers.map((member) => (
                    <div key={member.id} className="card p-4">
                        <h2 className="text-xl font-semibold mb-2">{member.name}</h2>
                        <button
                            onClick={() => setConfirmDelete(member)}
                            className="btn btn-danger p-2 text-sm"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {confirmDelete && (
                <ConfirmDialog
                    message={`Delete ${confirmDelete.name}? Their medications, appointments, and tasks will also be removed.`}
                    confirmText="Delete"
                    danger
                    onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
};

export default FamilyPage;
