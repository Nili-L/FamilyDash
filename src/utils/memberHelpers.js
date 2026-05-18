export const getMemberById = (personId, familyMembers) => {
  const member = familyMembers.find(m => m.id === personId);
  return {
    name: member?.name || 'Unknown',
    color: member?.color || '#6b7280',
    initial: member?.name?.charAt(0).toUpperCase() || '?'
  };
};

export const getMemberColor = (personId, familyMembers) =>
  getMemberById(personId, familyMembers).color;

export const getMemberName = (personId, familyMembers) =>
  getMemberById(personId, familyMembers).name;
