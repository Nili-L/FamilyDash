import React, { useState } from 'react';

const FamilyPage = ({ familyMembers, onAdd, onDelete }) => {
    const [newMemberName, setNewMemberName] = useState('');

    const handleAddMember = (e) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;
        onAdd({ name: newMemberName.trim() });
        setNewMemberName('');
    };

    const handleDeleteMember = (id) => {
        if (window.confirm('Delete this family member? Their medications, appointments, and tasks will also be removed.')) {
            onDelete(id);
        }
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
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    Add Member
                </button>
            </form>

            {familyMembers.length === 0 && (
                <p className="text-gray-500">No family members yet. Add someone above to get started.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyMembers.map((member) => (
                    <div key={member.id} className="border p-4 rounded shadow-md">
                        <h2 className="text-xl font-semibold mb-2">{member.name}</h2>
                        <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="bg-red-500 text-white p-2 rounded text-sm"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FamilyPage;
