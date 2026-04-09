export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export const getPriorityClass = (priority) => {
  switch (priority) {
    case 'high':
      return 'bg-danger-100 text-danger-800 border-danger-300';
    case 'medium':
      return 'bg-warning-100 text-warning-800 border-warning-300';
    case 'low':
      return 'bg-success-100 text-success-800 border-success-300';
    default:
      return '';
  }
};
