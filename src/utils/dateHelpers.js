import { format, isToday, isTomorrow, isYesterday, parseISO, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';

export const formatDate = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  
  return format(d, 'MMM d, yyyy');
};

export const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const formatDateTime = (date, time) => {
  const dateStr = formatDate(date);
  const timeStr = formatTime(time);
  return `${dateStr} at ${timeStr}`;
};

export const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getCurrentDate = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const isOverdue = (date, time) => {
  const now = new Date();
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!time) {
    return isBefore(endOfDay(targetDate), now);
  }
  
  const [hours, minutes] = time.split(':');
  const withTime = new Date(targetDate);
  withTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return isBefore(withTime, now);
};

export const getDaysUntil = (date) => {
  const now = startOfDay(new Date());
  const target = startOfDay(typeof date === 'string' ? parseISO(date) : date);
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `In ${diffDays} days`;
};

export const sortByDateTime = (items, dateField = 'date', timeField = 'time') => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a[dateField]);
    const dateB = new Date(b[dateField]);
    
    if (a[timeField] && b[timeField]) {
      const [hoursA, minutesA] = a[timeField].split(':');
      const [hoursB, minutesB] = b[timeField].split(':');
      dateA.setHours(parseInt(hoursA), parseInt(minutesA));
      dateB.setHours(parseInt(hoursB), parseInt(minutesB));
    }
    
    return dateA - dateB;
  });
};

export const groupByDate = (items, dateField = 'date') => {
  const groups = {};
  
  items.forEach(item => {
    const date = item[dateField];
    const key = formatDate(date);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(item);
  });
  
  return groups;
};

const timeSlotsCache = {};
export const getTimeSlots = (interval = 30) => {
  if (timeSlotsCache[interval]) return timeSlotsCache[interval];
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({ value: time, label: formatTime(time) });
    }
  }
  timeSlotsCache[interval] = slots;
  return slots;
};