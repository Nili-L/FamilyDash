# Contributing to Family Dashboard

First off, thank you for considering contributing to Family Dashboard! It's people like you that make this tool better for families with special needs children.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and considerate of others, especially given the sensitive nature of this application's target audience.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps to reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed and what behavior you expected
* Include screenshots if possible
* Include your browser version and operating system

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a detailed description of the suggested enhancement
* Explain why this enhancement would be useful to families using the dashboard
* List any alternative solutions you've considered

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code follows the existing code style
5. Issue that pull request!

## Development Process

1. Clone your fork:
```bash
git clone https://github.com/your-username/family-dashboard.git
cd family-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create a branch:
```bash
git checkout -b feature/your-feature-name
```

4. Make your changes and commit:
```bash
git add .
git commit -m "Add your meaningful commit message"
```

5. Push to your fork:
```bash
git push origin feature/your-feature-name
```

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

* Use ES6+ features
* Prefer functional components and hooks in React
* Use meaningful variable names
* Add comments for complex logic
* Keep functions small and focused

### CSS Styleguide

* Use Tailwind utility classes when possible
* Create custom components in index.css for reusable styles
* Follow mobile-first responsive design
* Ensure good contrast ratios for accessibility

## Testing

Run the linter before submitting:
```bash
npm run lint
```

Test your changes thoroughly:
* Test with different family configurations
* Test on mobile devices
* Test with keyboard navigation
* Test with screen readers if possible

## Accessibility Guidelines

This application serves families with special needs, so accessibility is crucial:

* All interactive elements must be keyboard accessible
* Use semantic HTML elements
* Provide appropriate ARIA labels
* Ensure color contrast meets WCAG AA standards
* Test with screen readers

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for helping make Family Dashboard better for everyone! 🙏