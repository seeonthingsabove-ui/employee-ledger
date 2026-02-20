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
  alternateStaff?: string;
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
  timestamp: number;
  // Optional fields for request logging
  status?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeId?: string;
  permissionType?: string;
  leaveType?: string;
  requestedInTime?: string;
  requestedOutTime?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  managerComment?: string;
  alternateStaff?: string;
  requestId?: string;
}

export interface AuthenticatedUser {
  email: string;
  name?: string;
  picture?: string;
}

// Task Manager Types
export interface TaskLookups {
  companies: string[];
  platforms: string[];
  fulfillments: string[];
  tasks: string[];
}

export interface TaskFormData {
  company: string;
  platform: string;
  fulfillment: string;
  task: string;
  quantity: number;
  claimedQuantity: number;
}

export interface TaskEntry {
  id: string;
  employeeEmail: string;
  employeeName: string;
  company: string;
  platform: string;
  fulfillment: string;
  task: string;
  quantity: number;
  claimedQuantity: number;
  timestamp: string;
}
