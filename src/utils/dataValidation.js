const validationResult = (errors) => ({
  isValid: Object.keys(errors).length === 0,
  errors
});

export const validateFamilyMember = (member) => {
  const errors = {};
  
  if (!member.name || member.name.trim() === '') {
    errors.name = 'Name is required';
  } else if (member.name.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }
  
  if (!member.color) {
    errors.color = 'Color is required';
  }
  
  return validationResult(errors);
};

export const validateMedication = (medication) => {
  const errors = {};
  
  if (!medication.name || medication.name.trim() === '') {
    errors.name = 'Medication name is required';
  }
  
  if (!medication.person) {
    errors.person = 'Please select a family member';
  }
  
  if (!medication.time) {
    errors.time = 'Time is required';
  }
  
  return validationResult(errors);
};

export const validateAppointment = (appointment) => {
  const errors = {};
  
  if (!appointment.title || appointment.title.trim() === '') {
    errors.title = 'Appointment title is required';
  }
  
  if (!appointment.person) {
    errors.person = 'Please select a family member';
  }
  
  if (!appointment.date) {
    errors.date = 'Date is required';
  }
  
  if (!appointment.time) {
    errors.time = 'Time is required';
  }
  
  if (appointment.location && appointment.location.length > 100) {
    errors.location = 'Location must be less than 100 characters';
  }
  
  return validationResult(errors);
};

export const validateTask = (task) => {
  const errors = {};
  
  if (!task.task || task.task.trim() === '') {
    errors.task = 'Task description is required';
  } else if (task.task.length > 200) {
    errors.task = 'Task must be less than 200 characters';
  }
  
  if (!task.person) {
    errors.person = 'Please select a family member';
  }
  
  if (!task.priority) {
    errors.priority = 'Priority is required';
  }
  
  return validationResult(errors);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 500);
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[\d\s\-\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
};