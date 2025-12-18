import React, { useEffect, useState } from 'react';
import { LeaveRequest, LeaveStatus } from '../types';
import { saveRequest } from '../services/storageService';
import { appendLogEntry } from '../services/sheetService';

const LeaveForm: React.FC<{
  onSuccess: () => void;
  initialEmployee?: { name?: string; email?: string; employeeId?: string };
}> = ({ onSuccess, initialEmployee }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    empId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newRequest: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeName: formData.name,
      employeeEmail: formData.email,
      employeeId: formData.empId,
      startDate: formData.startDate,
      endDate: formData.endDate,
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
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        reason: newRequest.reason,
        timestamp: newRequest.timestamp,
      });
      setIsSubmitting(false);
      setFormData({ name: '', email: '', empId: '', startDate: '', endDate: '', reason: '' });
      alert("Request Submitted!");
      onSuccess();
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">New Leave Request</h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              value={formData.endDate}
              onChange={handleInputChange}
            />
          </div>
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
