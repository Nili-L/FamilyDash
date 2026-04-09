import React, { useState } from 'react';

const AppointmentsPage = ({ appointments, familyMembers, onAdd, onUpdate, onDelete }) => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', person: '', date: '', time: '', location: '', notes: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.person || !formData.date) return;
        onAdd(formData);
        setFormData({ title: '', person: '', date: '', time: '', location: '', notes: '' });
        setShowForm(false);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this appointment?')) {
            onDelete(id);
        }
    };

    const getMemberName = (id) => {
        const member = familyMembers.find(m => m.id === id);
        return member ? member.name : 'Unknown';
    };

    const sortedAppointments = [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA - dateB;
    });

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Appointments</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    {showForm ? 'Cancel' : 'Add Appointment'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded bg-white shadow-sm space-y-3">
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Appointment title"
                        className="border p-2 rounded w-full"
                        required
                    />
                    <select
                        value={formData.person}
                        onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    >
                        <option value="">Select family member</option>
                        {familyMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="border p-2 rounded"
                            required
                        />
                        <input
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="border p-2 rounded"
                        />
                    </div>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Location (optional)"
                        className="border p-2 rounded w-full"
                    />
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notes (optional)"
                        className="border p-2 rounded w-full"
                        rows={2}
                    />
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                        Save Appointment
                    </button>
                </form>
            )}

            {familyMembers.length === 0 && (
                <p className="text-gray-500">Add family members first to create appointments.</p>
            )}

            {sortedAppointments.length === 0 && familyMembers.length > 0 && (
                <p className="text-gray-500">No appointments yet.</p>
            )}

            <div className="space-y-4">
                {sortedAppointments.map(apt => (
                    <div key={apt.id} className="border p-4 rounded shadow-sm bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold">{apt.title}</h3>
                                <p className="text-gray-600">
                                    {new Date(apt.date).toLocaleDateString()}
                                    {apt.time && ` at ${apt.time}`}
                                </p>
                                <p className="text-sm text-gray-500">For: {getMemberName(apt.person)}</p>
                                {apt.location && <p className="text-sm text-gray-500">Location: {apt.location}</p>}
                                {apt.notes && <p className="text-sm text-gray-400 mt-1">{apt.notes}</p>}
                            </div>
                            <button
                                onClick={() => handleDelete(apt.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm"
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

export default AppointmentsPage;
