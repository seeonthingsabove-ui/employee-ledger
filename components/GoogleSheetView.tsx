import React, { useEffect, useState } from 'react';
import { LeaveRequest, LeaveStatus } from '../types';
import { getRequests } from '../services/storageService';

const GoogleSheetView: React.FC = () => {
  const [data, setData] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    // Poll for updates every 2 seconds to simulate real-time sync
    const interval = setInterval(() => {
      setData(getRequests());
    }, 2000);
    setData(getRequests());
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
      {/* Fake Sheets Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex items-center space-x-4 text-xs text-gray-700 select-none">
        <div className="font-bold text-green-700 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
             <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
             {/* Simplified icon */}
          </svg>
          LeaveTracker_2024
        </div>
        <div className="flex space-x-3">
          <span className="cursor-pointer hover:bg-gray-200 px-1 rounded">File</span>
          <span className="cursor-pointer hover:bg-gray-200 px-1 rounded">Edit</span>
          <span className="cursor-pointer hover:bg-gray-200 px-1 rounded">View</span>
          <span className="cursor-pointer hover:bg-gray-200 px-1 rounded">Insert</span>
          <span className="cursor-pointer hover:bg-gray-200 px-1 rounded">Format</span>
        </div>
        <div className="flex-grow"></div>
        <div className="text-gray-500 italic">Last edit was seconds ago</div>
      </div>

      {/* Fake Formula Bar */}
      <div className="bg-white border-b border-gray-300 p-1 flex items-center text-sm">
        <div className="w-8 text-center text-gray-400 bg-gray-100 border-r border-gray-300 font-mono">fx</div>
        <div className="flex-grow px-2 text-gray-600 font-mono bg-white">=FILTER(Data, Status="PENDING")</div>
      </div>

      {/* Grid */}
      <div className="flex-grow overflow-auto sheet-scroll relative bg-white">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10 text-gray-600 font-medium">
            <tr>
              <th className="w-10 border border-gray-300 bg-gray-100 text-center text-xs p-1"></th>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((col) => (
                <th key={col} className="border border-gray-300 px-4 py-1 font-normal text-center min-w-[120px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
             {/* Header Row in the Sheet itself */}
             <tr>
               <td className="border border-gray-300 bg-gray-50 text-center text-xs text-gray-500 font-mono">1</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Timestamp</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Employee ID</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Name</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Permission Type</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Leave Type</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Requested InTime</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Requested OutTime</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Start Date</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">End Date</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Reason</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Status</td>
               <td className="border border-gray-300 px-2 py-1 font-bold bg-green-50">Manager Note</td>
             </tr>
             {data.map((row, index) => (
               <tr key={row.id} className="hover:bg-blue-50">
                 <td className="border border-gray-300 bg-gray-50 text-center text-xs text-gray-500 font-mono">{index + 2}</td>
                 <td className="border border-gray-300 px-2 py-1 truncate max-w-[150px]">{new Date(row.timestamp).toLocaleString()}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.employeeId}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.employeeName}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.permissionType || '-'}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.leaveType || '-'}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.requestedInTime || '-'}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.requestedOutTime || '-'}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.startDate}</td>
                 <td className="border border-gray-300 px-2 py-1">{row.endDate}</td>
                 <td className="border border-gray-300 px-2 py-1 truncate max-w-[200px]" title={row.reason}>{row.reason}</td>
                 <td className="border border-gray-300 px-2 py-1">
                   <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                     row.status === LeaveStatus.APPROVED ? 'bg-green-100 text-green-800' :
                     row.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-800' :
                     'bg-yellow-100 text-yellow-800'
                   }`}>
                     {row.status}
                   </span>
                 </td>
                 <td className="border border-gray-300 px-2 py-1 truncate max-w-[150px]">{row.managerComment || '-'}</td>
               </tr>
             ))}
             {/* Empty rows filler */}
             {Array.from({ length: Math.max(0, 15 - data.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td className="border border-gray-300 bg-gray-50 text-center text-xs text-gray-500 font-mono">{data.length + idx + 2}</td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                  <td className="border border-gray-300 px-2 py-1"></td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GoogleSheetView;
