export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export const getPriorityClass = (priority) => {
  switch (priority) {
    case 'high':
      return 'priority-high';
    case 'medium':
      return 'priority-medium';
    case 'low':
      return 'priority-low';
    default:
      return '';
  }
};
