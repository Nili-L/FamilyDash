import React, { useState, useEffect } from 'react';

const AppointmentsPage = () => {
    const [familyMembers, setFamilyMembers] = useState([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFamilyMembers();
    }, []);

    useEffect(() => {
        if (selectedMemberId) {
            fetchCalendarEvents(selectedMemberId);
        } else {
            setEvents([]); // Clear events if no member is selected
        }
    }, [selectedMemberId]);

    const fetchFamilyMembers = async () => {
        try {
            const response = await fetch('/api/family-members');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setFamilyMembers(data);
            // Optionally select the first member if available
            if (data.length > 0) {
                setSelectedMemberId(data[0].id);
            }
        } catch (err) {
            console.error("Error fetching family members:", err);
            setError("Failed to load family members.");
        }
    };

    const fetchCalendarEvents = async (memberId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/family-members/${memberId}/calendar-events`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setEvents(data);
        } catch (err) {
            console.error("Error fetching calendar events:", err);
            setError(err.message || "Failed to load calendar events.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Appointments</h1>

            <div className="mb-4">
                <label htmlFor="member-select" className="block text-lg font-medium text-gray-700">Select Family Member:</label>
                <select
                    id="member-select"
                    className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                    <option value="">-- Select a member --</option>
                    {familyMembers.map(member => (
                        <option key={member.id} value={member.id}>
                            {member.name} {member.googleConnected ? ' (Google Connected)' : ' (Google Not Connected)'}
                        </option>
                    ))}
                </select>
            </div>

            {loading && <p>Loading events...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}

            {!loading && !error && events.length === 0 && selectedMemberId && (
                <p>No upcoming events found for this family member.</p>
            )}

            {!loading && !error && events.length > 0 && (
                <div className="space-y-4">
                    {events.map(event => (
                        <div key={event.id} className="border p-4 rounded shadow-sm">
                            <h3 className="text-xl font-semibold">{event.summary}</h3>
                            <p className="text-gray-600">{event.start.dateTime ? new Date(event.start.dateTime).toLocaleString() : new Date(event.start.date).toDateString()}</p>
                            {event.location && <p className="text-gray-500">Location: {event.location}</p>}
                            {event.description && <p className="text-gray-500">{event.description}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AppointmentsPage;
