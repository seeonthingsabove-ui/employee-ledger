import React, { useEffect, useState } from 'react';
import { LeaveRequest, LeaveStatus } from '../types';
import { saveRequest } from '../services/storageService';
import { appendLogEntry, fetchLookupOptions, fetchEmployeeDirectory } from '../services/sheetService';
import { EmployeeRecord } from '../types';

const PERMISSION_ONLY_LEAVE_TYPES = ['FN Permission', 'AN Permission', 'In Between Permission'];
const normalize = (v: string) => v.trim().toLowerCase();

const LeaveForm: React.FC<{
  onSuccess: () => void;
  initialEmployee?: { name?: string; email?: string; employeeId?: string };
}> = ({ onSuccess, initialEmployee }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    empId: '',
    permissionType: '',
    leaveType: '',
    requestedInTime: '',
    requestedOutTime: '',
    startDate: '',
    endDate: '',
    alternateStaff: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionTypeOptions, setPermissionTypeOptions] = useState<string[]>([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (initialEmployee) {
      setFormData((prev) => ({
        ...prev,
        name: initialEmployee.name || prev.name,
        email: initialEmployee.email || prev.email,
        empId: initialEmployee.employeeId || prev.empId,
      }));
    }
  }, [initialEmployee]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ permissionTypes, leaveTypes }, employeeList] = await Promise.all([
          fetchLookupOptions(),
          fetchEmployeeDirectory(),
        ]);

        setPermissionTypeOptions(permissionTypes);
        setLeaveTypeOptions(leaveTypes);
        setEmployees(employeeList.filter(e => e.role === 'employee')); // Filter for employees only
        setLookupError(null);
      } catch (e) {
        console.error(e);
        setLookupError('Failed to load form data.');
      }
    };
    loadData();
  }, []);

  const isPermission = normalize(formData.permissionType) === 'permission';
  const normalizedLeaveType = normalize(formData.leaveType);
  const showInTimeField =
    isPermission &&
    (normalizedLeaveType === normalize('FN Permission') ||
      normalizedLeaveType === normalize('In Between Permission'));
  const showOutTimeField =
    isPermission &&
    (normalizedLeaveType === normalize('AN Permission') ||
      normalizedLeaveType === normalize('In Between Permission'));

  const filteredLeaveTypeOptions = (() => {
    const normalizedPermissionOnly = new Set(PERMISSION_ONLY_LEAVE_TYPES.map((t) => normalize(t)));

    if (isPermission) {
      const fromSheet = leaveTypeOptions.filter((t) => normalizedPermissionOnly.has(normalize(t)));
      return fromSheet.length ? fromSheet : PERMISSION_ONLY_LEAVE_TYPES;
    }

    return leaveTypeOptions.filter((t) => !normalizedPermissionOnly.has(normalize(t)));
  })();

  useEffect(() => {
    // When switching away from "permission", clear requested times and disallow permission-only leave types.
    const normalizedPermissionOnly = new Set(PERMISSION_ONLY_LEAVE_TYPES.map((t) => normalize(t)));
    setFormData((prev) => {
      const next = { ...prev };
      if (normalize(prev.permissionType) !== 'permission') {
        next.requestedInTime = '';
        next.requestedOutTime = '';
        if (normalizedPermissionOnly.has(normalize(prev.leaveType))) {
          next.leaveType = '';
        }
      } else {
        if (prev.leaveType && !normalizedPermissionOnly.has(normalize(prev.leaveType))) {
          next.leaveType = '';
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.permissionType]);

  useEffect(() => {
    // When leave type changes within "permission", clear any time fields that are no longer needed.
    setFormData((prev) => {
      const isPerm = normalize(prev.permissionType) === 'permission';
      const lt = normalize(prev.leaveType);
      const needsIn =
        isPerm &&
        (lt === normalize('FN Permission') || lt === normalize('In Between Permission'));
      const needsOut =
        isPerm &&
        (lt === normalize('AN Permission') || lt === normalize('In Between Permission'));
      const next = { ...prev };
      if (!needsIn) next.requestedInTime = '';
      if (!needsOut) next.requestedOutTime = '';
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.permissionType, formData.leaveType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newRequest: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeName: formData.name,
      employeeEmail: formData.email,
      employeeId: formData.empId,
      permissionType: formData.permissionType,
      leaveType: formData.leaveType,
      requestedInTime: showInTimeField ? formData.requestedInTime : '',
      requestedOutTime: showOutTimeField ? formData.requestedOutTime : '',
      startDate: formData.startDate,
      endDate: formData.endDate,
      alternateStaff: formData.alternateStaff,
      reason: formData.reason,
      aiGeneratedEmail: formData.reason,
      status: LeaveStatus.PENDING,
      timestamp: Date.now(),
    };

    // Simulate network delay
    setTimeout(() => {
      saveRequest(newRequest);
      appendLogEntry({
        type: 'request',
        status: LeaveStatus.PENDING,
        employeeName: newRequest.employeeName,
        employeeEmail: newRequest.employeeEmail,
        employeeId: newRequest.employeeId,
        permissionType: newRequest.permissionType,
        leaveType: newRequest.leaveType,
        requestedInTime: newRequest.requestedInTime,
        requestedOutTime: newRequest.requestedOutTime,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        alternateStaff: newRequest.alternateStaff,
        reason: newRequest.reason,
        timestamp: newRequest.timestamp,
      });
      setIsSubmitting(false);
      setFormData({
        name: '',
        email: '',
        empId: '',
        permissionType: '',
        leaveType: '',
        requestedInTime: '',
        requestedOutTime: '',
        startDate: '',
        endDate: '',
        reason: '',
      });
      alert("Request Submitted!");
      onSuccess();
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">New Leave Request</h2>
      {lookupError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {lookupError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              readOnly={!!initialEmployee}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                initialEmployee ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-300'
              }`}
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
            <input
              type="text"
              name="empId"
              required
              readOnly={!!initialEmployee}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                initialEmployee ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-300'
              }`}
              value={formData.empId}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permission Type</label>
            <select
              name="permissionType"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
              value={formData.permissionType}
              onChange={handleSelectChange}
            >
              <option value="" disabled>
                Select Permission Type
              </option>
              {permissionTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              name="leaveType"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
              value={formData.leaveType}
              onChange={handleSelectChange}
            >
              <option value="" disabled>
                Select Leave Type
              </option>
              {filteredLeaveTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(showInTimeField || showOutTimeField) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showInTimeField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested InTime</label>
                <input
                  type="time"
                  name="requestedInTime"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  value={formData.requestedInTime}
                  onChange={handleInputChange}
                />
              </div>
            )}
            {showOutTimeField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested OutTime</label>
                <input
                  type="time"
                  name="requestedOutTime"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  value={formData.requestedOutTime}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            required
            readOnly={!!initialEmployee}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
              initialEmployee ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-300'
            }`}
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              required
              min={new Date().toLocaleDateString('en-CA')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              value={formData.startDate}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              required
              min={formData.startDate || new Date().toLocaleDateString('en-CA')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              value={formData.endDate}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Staff</label>
          <select
            name="alternateStaff"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
            value={formData.alternateStaff}
            onChange={handleSelectChange}
          >
            <option value="">Select Alternate Staff (Optional)</option>
            {employees.map((emp) => (
              <option key={emp.employeeId} value={emp.name}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</label>
          <textarea
            name="reason"
            required
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            placeholder="Briefly explain why you need leave..."
            value={formData.reason}
            onChange={handleInputChange}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-70"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default LeaveForm;
