import React, { useState, useEffect } from 'react';

const FamilyPage = () => {
    const [familyMembers, setFamilyMembers] = useState([]);
    const [newMemberName, setNewMemberName] = useState('');

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

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;

        try {
            const response = await fetch('/api/family-members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newMemberName }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const newMember = await response.json();
            setFamilyMembers([...familyMembers, newMember]);
            setNewMemberName('');
        } catch (error) {
            console.error("Error adding family member:", error);
        }
    };

    const handleDeleteMember = async (id) => {
        try {
            const response = await fetch(`/api/family-members/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setFamilyMembers(familyMembers.filter(member => member.id !== id));
        } catch (error) {
            console.error("Error deleting family member:", error);
        }
    };

    const handleConnectGoogle = async (memberId) => {
        try {
            const response = await fetch(`/auth/google?memberId=${memberId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            window.location.href = data.authorizationUrl;
        } catch (error) {
            console.error("Error connecting Google account:", error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Family Members</h1>

            <form onSubmit={handleAddMember} className="mb-6">
                <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Add new family member"
                    className="border p-2 rounded w-full md:w-1/2 mr-2"
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    Add Member
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyMembers.map((member) => (
                    <div key={member.id} className="border p-4 rounded shadow-md">
                        <h2 className="text-xl font-semibold mb-2">{member.name}</h2>
                        <div className="flex items-center mb-2">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${member.googleConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span>{member.googleConnected ? 'Google Connected' : 'Google Not Connected'}</span>
                        </div>
                        <div className="flex space-x-2">
                            {!member.googleConnected && (
                                <button
                                    onClick={() => handleConnectGoogle(member.id)}
                                    className="bg-green-500 text-white p-2 rounded text-sm"
                                >
                                    Connect Google
                                </button>
                            )}
                            <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="bg-red-500 text-white p-2 rounded text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FamilyPage;
