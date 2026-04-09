import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFamilyData } from './useFamilyData';

// Mock the API client
vi.mock('../api/client', () => ({
  familyMembersApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  medicationsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  appointmentsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  tasksApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  dataApi: {
    exportAll: vi.fn(),
    importAll: vi.fn(),
    clearAll: vi.fn(),
  },
}));

import {
  familyMembersApi,
  medicationsApi,
  appointmentsApi,
  tasksApi,
  dataApi,
} from '../api/client';

beforeEach(() => {
  vi.clearAllMocks();
  // Default: all getAll return empty arrays
  familyMembersApi.getAll.mockResolvedValue([]);
  medicationsApi.getAll.mockResolvedValue([]);
  appointmentsApi.getAll.mockResolvedValue([]);
  tasksApi.getAll.mockResolvedValue([]);
});

describe('useFamilyData', () => {
  describe('initial fetch', () => {
    it('fetches all data on mount', async () => {
      const members = [{ id: '1', name: 'Alice' }];
      const meds = [{ id: 'm1', name: 'Aspirin', person: '1' }];
      familyMembersApi.getAll.mockResolvedValue(members);
      medicationsApi.getAll.mockResolvedValue(meds);

      const { result } = renderHook(() => useFamilyData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.familyMembers).toEqual(members);
      expect(result.current.medications).toEqual(meds);
      expect(result.current.error).toBeNull();
    });

    it('sets error on fetch failure', async () => {
      familyMembersApi.getAll.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFamilyData());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Network error');
    });

    it('starts in loading state', () => {
      const { result } = renderHook(() => useFamilyData());
      expect(result.current.loading).toBe(true);
    });
  });

  describe('family members', () => {
    it('adds a family member', async () => {
      const created = { id: '1', name: 'Alice' };
      familyMembersApi.create.mockResolvedValue(created);

      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.addFamilyMember({ name: 'Alice' });
      });

      expect(result.current.familyMembers).toContainEqual(created);
    });

    it('deletes a family member and refetches', async () => {
      familyMembersApi.getAll.mockResolvedValueOnce([{ id: '1', name: 'Alice' }]);
      familyMembersApi.remove.mockResolvedValue(null);
      // After delete, refetch returns empty
      familyMembersApi.getAll.mockResolvedValueOnce([]);
      medicationsApi.getAll.mockResolvedValue([]);
      appointmentsApi.getAll.mockResolvedValue([]);
      tasksApi.getAll.mockResolvedValue([]);

      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.familyMembers).toHaveLength(1));

      await act(async () => {
        await result.current.deleteFamilyMember('1');
      });

      await waitFor(() => expect(result.current.familyMembers).toHaveLength(0));
    });
  });

  describe('medications', () => {
    it('adds a medication', async () => {
      const created = { id: 'm1', name: 'Aspirin', taken: false };
      medicationsApi.create.mockResolvedValue(created);

      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.addMedication({ name: 'Aspirin' });
      });

      expect(result.current.medications).toContainEqual(created);
    });

    it('toggles medication taken', async () => {
      const med = { id: 'm1', name: 'Aspirin', taken: false, takenAt: null };
      medicationsApi.getAll.mockResolvedValue([med]);
      medicationsApi.update.mockResolvedValue({ ...med, taken: true, takenAt: '2026-04-09T12:00:00Z' });

      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.medications).toHaveLength(1));

      await act(async () => {
        await result.current.toggleMedicationTaken('m1');
      });

      expect(result.current.medications[0].taken).toBe(true);
    });
  });

  describe('error handling', () => {
    it('sets error state on CRUD failure', async () => {
      familyMembersApi.create.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.addFamilyMember({ name: 'Alice' });
        } catch {}
      });

      expect(result.current.error).toBe('Server error');
    });

    it('clears error on next successful operation', async () => {
      familyMembersApi.create
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ id: '1', name: 'Alice' });

      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // First call fails
      await act(async () => {
        try { await result.current.addFamilyMember({ name: 'Alice' }); } catch {}
      });
      expect(result.current.error).toBe('Server error');

      // Second call succeeds, error cleared
      await act(async () => {
        await result.current.addFamilyMember({ name: 'Alice' });
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('bulk operations', () => {
    it('clearAllData empties all collections', async () => {
      familyMembersApi.getAll.mockResolvedValue([{ id: '1', name: 'Alice' }]);
      dataApi.clearAll.mockResolvedValue(null);

      // Mock window.confirm removal — clearAllData no longer confirms
      const { result } = renderHook(() => useFamilyData());
      await waitFor(() => expect(result.current.familyMembers).toHaveLength(1));

      await act(async () => {
        await result.current.clearAllData();
      });

      expect(result.current.familyMembers).toHaveLength(0);
      expect(result.current.medications).toHaveLength(0);
      expect(dataApi.clearAll).toHaveBeenCalled();
    });
  });
});
