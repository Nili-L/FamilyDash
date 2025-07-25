
const express = require('express');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

dotenv.config();
console.log('Environment variables loaded.');

const app = express();
const PORT = process.env.PORT || 3001;
console.log(`Server attempting to run on port: ${PORT}`);
console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'Loaded' : 'Not Loaded'}`);
console.log(`GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? 'Loaded' : 'Not Loaded'}`);

app.use(express.json());

// In-memory store for family members (for simplicity, replace with a database later)
const familyMembersFilePath = path.join(__dirname, 'familyMembers.json');
let familyMembers = [];

// Load family members from file if it exists
try {
    if (fs.existsSync(familyMembersFilePath)) {
        const data = fs.readFileSync(familyMembersFilePath, 'utf8');
        familyMembers = JSON.parse(data);
    }
} catch (err) {
    console.error('Error loading family members:', err);
}

// Helper to save family members to file
const saveFamilyMembers = () => {
    fs.writeFileSync(familyMembersFilePath, JSON.stringify(familyMembers, null, 2), 'utf8');
};

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Routes for family member management
app.get('/api/family-members', (req, res) => {
    res.json(familyMembers.map(member => ({
        id: member.id,
        name: member.name,
        googleConnected: !!member.tokens // Indicate if Google is connected
    })));
});

app.post('/api/family-members', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const newMember = { id: Date.now().toString(), name, tokens: null };
    familyMembers.push(newMember);
    saveFamilyMembers();
    res.status(201).json(newMember);
});

app.delete('/api/family-members/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = familyMembers.length;
    familyMembers = familyMembers.filter(member => member.id !== id);
    if (familyMembers.length < initialLength) {
        saveFamilyMembers();
        res.status(204).send();
    } else {
        res.status(404).json({ error: 'Family member not found' });
    }
});

// Google OAuth routes
app.get('/auth/google', (req, res) => {
    const { memberId } = req.query;
    if (!memberId) {
        return res.status(400).json({ error: 'memberId is required' });
    }

    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: memberId, // Use state to pass memberId back
        prompt: 'consent'
    });
    res.json({ authorizationUrl });
});

app.get('/auth/google/callback', async (req, res) => {
    const { code, state: memberId } = req.query;

    if (!code || !memberId) {
        return res.status(400).send('Missing code or memberId');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const memberIndex = familyMembers.findIndex(m => m.id === memberId);
        if (memberIndex > -1) {
            familyMembers[memberIndex].tokens = tokens;
            saveFamilyMembers();
            // Redirect back to the frontend, perhaps to the family tab
            res.redirect(`${process.env.FRONTEND_URL}/family?status=success`);
        } else {
            res.status(404).send('Family member not found');
        }
    } catch (error) {
        console.error('Error retrieving access token', error);
        res.status(500).send('Authentication failed');
    }
});

// Route to get calendar events for a specific family member
app.get('/api/family-members/:memberId/calendar-events', async (req, res) => {
    const { memberId } = req.params;
    const member = familyMembers.find(m => m.id === memberId);

    if (!member || !member.tokens) {
        return res.status(404).json({ error: 'Family member not found or Google not connected' });
    }

    try {
        oauth2Client.setCredentials(member.tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const now = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(now.getMonth() + 1);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: oneMonthLater.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        res.json(response.data.items);
    } catch (error) {
        console.error('Error fetching calendar events:', error.message);
        // If tokens are expired or invalid, clear them and prompt re-auth
        if (error.code === 401 || error.code === 403) {
            const memberIndex = familyMembers.findIndex(m => m.id === memberId);
            if (memberIndex > -1) {
                familyMembers[memberIndex].tokens = null;
                saveFamilyMembers();
            }
            return res.status(401).json({ error: 'Google authentication expired. Please re-authenticate.' });
        }
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
