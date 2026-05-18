import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import MedicationTracker from './MedicationTracker';

afterEach(() => cleanup());

const members = [
  { id: 'p1', name: 'Alice', color: '#ff0000' },
  { id: 'p2', name: 'Bob', color: '#0000ff' },
];

const medications = [
  { id: 'm1', name: 'Aspirin', person: 'p1', time: '08:00', taken: false, notes: null, createdAt: '2026-04-09T00:00:00Z' },
  { id: 'm2', name: 'Vitamin D', person: 'p2', time: '09:00', taken: true, takenAt: '2026-04-09T09:05:00Z', notes: null, createdAt: '2026-04-09T00:00:00Z' },
];

let onAdd, onUpdate, onDelete, onToggleTaken;

beforeEach(() => {
  onAdd = vi.fn();
  onUpdate = vi.fn();
  onDelete = vi.fn();
  onToggleTaken = vi.fn();
});

function renderTracker(overrides = {}) {
  const props = {
    medications,
    familyMembers: members,
    onAdd,
    onUpdate,
    onDelete,
    onToggleTaken,
    ...overrides,
  };
  return render(<MedicationTracker {...props} />);
}

describe('MedicationTracker', () => {
  it('renders medication names', () => {
    renderTracker();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Vitamin D')).toBeInTheDocument();
  });

  it('filter buttons have aria-pressed', () => {
    renderTracker();
    const filterGroups = screen.getAllByRole('group', { name: /medication filters/i });
    const allBtn = within(filterGroups[0]).getByText(/All/);
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens add form dialog', () => {
    renderTracker();
    const addButtons = screen.getAllByRole('button', { name: /add medication/i });
    fireEvent.click(addButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onToggleTaken', () => {
    const single = [medications[0]];
    renderTracker({ medications: single });
    const toggleButtons = screen.getAllByLabelText('Mark as taken');
    fireEvent.click(toggleButtons[0]);
    expect(onToggleTaken).toHaveBeenCalledWith('m1');
  });

  it('shows and confirms delete dialog', () => {
    const single = [medications[0]];
    renderTracker({ medications: single });
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteButtons[0]);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledWith('m1');
  });

  it('cancels delete dialog', () => {
    renderTracker();
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteButtons[0]);
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByText('Cancel'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows empty state', () => {
    renderTracker({ medications: [] });
    expect(screen.getByText(/No Medications Yet/)).toBeInTheDocument();
  });
});
