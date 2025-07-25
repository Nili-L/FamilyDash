# Family Dashboard

A comprehensive family management dashboard designed specifically for families with special needs children. This production-ready React application helps manage medications, appointments, daily tasks, and family member information all in one place.

![Family Dashboard](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.3-38bdf8.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### Core Functionality

- **Family Member Management** - Add, edit, and remove family members with custom color themes
- **Medication Tracking** - Schedule medications, mark as taken, and receive visual reminders for overdue doses
- **Appointment Management** - Schedule and track medical/therapy appointments with location details
- **Daily Task Management** - Create and track daily routines and therapy tasks with priority levels
- **Dashboard Overview** - Get a comprehensive view of today's activities at a glance
- **Real-time Updates** - Live clock and automatic status updates
- **Data Persistence** - All data saved locally using localStorage

### Special Features for Special Needs Families

- Visual schedules with color-coded family member identification
- Priority levels for tasks (high/medium/low)
- Medication compliance tracking with overdue alerts
- Therapy session and appointment management
- Easy-to-read daily overview
- Print-friendly schedules
- Mobile-responsive design for on-the-go access

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/family-dashboard.git
cd family-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage Guide

### Getting Started

1. **Add Family Members**: Navigate to the "Family" tab and add each family member with a name and color theme
2. **Schedule Medications**: Go to "Medications" to add daily medication schedules
3. **Book Appointments**: Use the "Appointments" tab to track upcoming medical visits
4. **Create Tasks**: Add daily tasks and therapy activities in the "Tasks" section
5. **Monitor Dashboard**: Return to "Dashboard" for a complete daily overview

### Navigation

- Use the top navigation bar to switch between sections
- Keyboard shortcuts available:
  - `Alt + D` - Dashboard
  - `Alt + F` - Family
  - `Alt + M` - Medications
  - `Alt + A` - Appointments
  - `Alt + T` - Tasks

### Data Management

- **Export Data**: Settings > Export Data to download a backup JSON file
- **Import Data**: Settings > Import Data to restore from a backup
- **Clear All Data**: Settings > Clear All Data (use with caution)

## Project Structure

```
family-dashboard/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── DashboardOverview.jsx
│   │   ├── FamilyManager.jsx
│   │   ├── MedicationTracker.jsx
│   │   ├── AppointmentManager.jsx
│   │   ├── TaskManager.jsx
│   │   └── AddItemForm.jsx
│   ├── hooks/          # Custom React hooks
│   │   ├── useLocalStorage.js
│   │   └── useFamilyData.js
│   ├── utils/          # Utility functions
│   │   ├── dateHelpers.js
│   │   └── dataValidation.js
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # App entry point
│   └── index.css       # Global styles
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── README.md          # This file
```

## Deployment

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

### Deploy to Netlify

1. Build the project: `npm run build`
2. Drag and drop the `dist` folder to Netlify
3. Or use Netlify CLI: `netlify deploy --prod --dir=dist`

### Deploy to GitHub Pages

1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json:
```json
"homepage": "https://yourusername.github.io/family-dashboard",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```
3. Run: `npm run deploy`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Technology Stack

- **React 18** - UI framework with hooks
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **date-fns** - Date manipulation utilities
- **localStorage** - Client-side data persistence

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Use functional components with hooks
- Follow React best practices
- Keep components small and focused
- Use meaningful variable and function names
- Add comments for complex logic

## Accessibility

- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast color schemes
- Screen reader friendly
- Responsive text sizing

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### Common Issues

**Data not saving**: Ensure localStorage is enabled in your browser

**Import failing**: Check that the JSON file is valid and from this application

**Performance issues**: Clear old data periodically, especially completed tasks

**Print layout issues**: Use the browser's print preview to adjust settings

### Getting Help

- Check the [Issues](https://github.com/yourusername/family-dashboard/issues) page
- Submit a bug report with browser and version information
- Include console errors if any

## Privacy & Security

- All data is stored locally in your browser
- No data is sent to external servers
- No account or login required
- Export your data regularly for backup
- Use browser privacy mode for shared computers

## Future Enhancements

- [ ] PWA support for offline use
- [ ] Dark mode theme
- [ ] Multiple language support
- [ ] Medication reminder notifications
- [ ] Calendar integration
- [ ] Data sync across devices
- [ ] Customizable dashboard widgets
- [ ] Medication history tracking
- [ ] Report generation

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 Family Dashboard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Acknowledgments

- Designed with families with special needs children in mind
- Icons by [Lucide](https://lucide.dev/)
- Built with [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Date handling by [date-fns](https://date-fns.org/)

---

Made with ❤️ for special families everywhere