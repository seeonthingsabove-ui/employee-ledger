import React, { useState, useEffect } from "react";
import { fetchUserTasks, TaskLogRecord } from "../services/sheetService";

interface TaskTrackerProps {
  userEmail: string;
}

const TaskTracker: React.FC<TaskTrackerProps> = ({ userEmail }) => {
  const [tasks, setTasks] = useState<TaskLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      const data = await fetchUserTasks(userEmail);
      setTasks(data);
      setLoading(false);
    };
    loadTasks();
  }, [userEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading task history...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-slate-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No tasks logged yet</h3>
        <p className="text-sm text-slate-600">
          Your task entries will appear here once you submit them.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Fulfillment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Claimed Qty
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tasks.map((task, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {new Date(task.timestamp).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {task.company}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {task.platform}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {task.fulfillment || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {task.task}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {task.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {task.claimedQuantity || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          Total entries: <span className="font-semibold">{tasks.length}</span>
        </p>
      </div>
    </div>
  );
};

export default TaskTracker;
