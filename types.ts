export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  permissionType?: string;
  leaveType?: string;
  requestedInTime?: string;
  requestedOutTime?: string;
  startDate: string;
  endDate: string;
  reason: string;
  aiGeneratedEmail: string;
  status: LeaveStatus;
  managerComment?: string;
  timestamp: number;
}

export type UserRoleType = 'employee' | 'manager' | 'admin';

export interface UserProfile {
  email: string;
  name?: string;
  role: UserRoleType;
}

export interface EmployeeRecord {
  email: string;
  name: string;
  employeeId: string;
  role: UserRoleType;
}

export interface LogEntry {
  type: 'request' | 'decision';
  status: LeaveStatus;
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  permissionType?: string;
  leaveType?: string;
  requestedInTime?: string;
  requestedOutTime?: string;
  startDate: string;
  endDate: string;
  reason: string;
  managerComment?: string;
  timestamp: number;
}

export interface AuthenticatedUser {
  email: string;
  name?: string;
  picture?: string;
}
