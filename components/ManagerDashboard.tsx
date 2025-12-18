import React, { useState, useEffect } from 'react';
import { LeaveRequest, LeaveStatus } from '../types';
import { getRequests, updateRequestStatus } from '../services/storageService';
import { appendLogEntry } from '../services/sheetService';

const ManagerDashboard: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setRequests(getRequests());
    const interval = setInterval(() => setRequests(getRequests()), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, status: LeaveStatus, employeeName: string) => {
    setProcessingId(id);
    const comment = prompt(status === LeaveStatus.APPROVED ? "Optional approval message:" : "Reason for rejection:");
    if (comment === null) {
      setProcessingId(null);
      return;
    }

    updateRequestStatus(id, status, comment);
    const updated = getRequests();
    setRequests(updated); // Refresh

    const acted = updated.find(r => r.id === id);
    if (acted) {
      appendLogEntry({
        type: 'decision',
        status,
        employeeName: acted.employeeName,
        employeeEmail: acted.employeeEmail,
        employeeId: acted.employeeId,
        startDate: acted.startDate,
        endDate: acted.endDate,
        reason: acted.reason,
        managerComment: comment || '',
        timestamp: Date.now(),
      });
    }

    setProcessingId(null);
  };

  const pendingRequests = requests.filter(r => r.status === LeaveStatus.PENDING);
  const historyRequests = requests.filter(r => r.status !== LeaveStatus.PENDING);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pending Approvals</h2>
        {pendingRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
            No pending leave requests. Good job!
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-400">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{req.employeeName} <span className="text-sm font-normal text-gray-500">({req.employeeId})</span></h3>
                    <p className="text-sm text-gray-500">{req.startDate} — {req.endDate}</p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">PENDING</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4 text-sm text-gray-700 italic border border-gray-100">
                  <p className="font-semibold text-xs text-gray-400 uppercase mb-1">Email Content Received:</p>
                  "{req.aiGeneratedEmail}"
                </div>

                <div className="flex gap-3 justify-end">
                   <button
                     onClick={() => handleAction(req.id, LeaveStatus.REJECTED, req.employeeName)}
                     disabled={!!processingId}
                     className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition disabled:opacity-50"
                   >
                     {processingId === req.id ? '...' : 'Deny'}
                   </button>
                   <button
                     onClick={() => handleAction(req.id, LeaveStatus.APPROVED, req.employeeName)}
                     disabled={!!processingId}
                     className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow transition disabled:opacity-50"
                   >
                     {processingId === req.id ? 'Sending...' : 'Approve & Email'}
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="opacity-75">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent History</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Dates</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Manager Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyRequests.map(req => (
                <tr key={req.id}>
                  <td className="px-6 py-3 font-medium text-gray-900">{req.employeeName}</td>
                  <td className="px-6 py-3 text-gray-500">{req.startDate} - {req.endDate}</td>
                  <td className="px-6 py-3">
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                       req.status === LeaveStatus.APPROVED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                     }`}>
                       {req.status}
                     </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 truncate max-w-xs">{req.managerComment}</td>
                </tr>
              ))}
              {historyRequests.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-6 py-4 text-center text-gray-400">No history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
