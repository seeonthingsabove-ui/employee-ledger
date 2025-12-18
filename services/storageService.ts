import { LeaveRequest, LeaveStatus } from '../types';

const STORAGE_KEY = 'swiftleave_data_v1';

export const getRequests = (): LeaveRequest[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveRequest = (request: LeaveRequest): void => {
  const current = getRequests();
  const updated = [request, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateRequestStatus = (id: string, status: LeaveStatus, managerComment?: string): void => {
  const current = getRequests();
  const updated = current.map((req) =>
    req.id === id ? { ...req, status, managerComment } : req
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Seed some data if empty for demo purposes
export const seedData = () => {
  if (getRequests().length === 0) {
    const mockData: LeaveRequest[] = [
      {
        id: 'mock-1',
        employeeName: 'John Doe',
        employeeEmail: 'john.doe@company.com',
        employeeId: 'EMP001',
        permissionType: 'leave',
        leaveType: 'Casual Leave',
        requestedInTime: '',
        requestedOutTime: '',
        startDate: '2023-11-10',
        endDate: '2023-11-12',
        reason: 'Personal family matter',
        aiGeneratedEmail: 'Dear Manager,\n\nI request leave from Nov 10 to Nov 12 due to a personal family matter.',
        status: LeaveStatus.PENDING,
        timestamp: Date.now() - 1000000,
      },
      {
        id: 'mock-2',
        employeeName: 'Jane Smith',
        employeeEmail: 'jane.smith@company.com',
        employeeId: 'EMP004',
        permissionType: 'leave',
        leaveType: 'Sick Leave',
        requestedInTime: '',
        requestedOutTime: '',
        startDate: '2023-10-01',
        endDate: '2023-10-05',
        reason: 'Medical recovery',
        aiGeneratedEmail: 'Dear Manager,\n\nI request sick leave...',
        status: LeaveStatus.APPROVED,
        managerComment: 'Take care, Jane.',
        timestamp: Date.now() - 50000000,
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));
  }
};