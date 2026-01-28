import React, { useState, useEffect } from "react";
import { fetchAllTaskLogs, TaskLogRecord } from "../services/sheetService";
import * as XLSX from "xlsx";

const TaskReport: React.FC = () => {
  const [tasks, setTasks] = useState<TaskLogRecord[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      const data = await fetchAllTaskLogs();
      setTasks(data);
      setFilteredTasks(data);
      setLoading(false);
    };
    loadTasks();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...tasks];

    // Search filter (employee name or email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.employeeName.toLowerCase().includes(term) ||
          task.employeeEmail.toLowerCase().includes(term)
      );
    }

    // Company filter
    if (selectedCompany) {
      filtered = filtered.filter((task) => task.company === selectedCompany);
    }

    // Platform filter
    if (selectedPlatform) {
      filtered = filtered.filter((task) => task.platform === selectedPlatform);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.timestamp).getTime();
        return taskDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // Add 1 day to include end date
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.timestamp).getTime();
        return taskDate < end;
      });
    }

    setFilteredTasks(filtered);
  }, [searchTerm, selectedCompany, selectedPlatform, startDate, endDate, tasks]);

  // Get unique values for dropdowns
  const companies = Array.from(new Set(tasks.map((t) => t.company))).filter(Boolean);
  const platforms = Array.from(new Set(tasks.map((t) => t.platform))).filter(Boolean);

  const handleExportToExcel = () => {
    const header = [
      "Date",
      "Employee Name",
      "Employee Email",
      "Company",
      "Platform",
      "Fulfillment",
      "Task",
      "Quantity",
    ];

    const rows = filteredTasks.map((task) => [
      new Date(task.timestamp).toLocaleDateString(),
      task.employeeName,
      task.employeeEmail,
      task.company,
      task.platform,
      task.fulfillment || "-",
      task.task,
      task.quantity,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaskLogs");

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `task-logs-${stamp}.xlsx`);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCompany("");
    setSelectedPlatform("");
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading task reports...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">
              Search Employee
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name or email..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">
              Company
            </label>
            <select
              id="company"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Platform */}
          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-slate-700 mb-1">
              Platform
            </label>
            <select
              id="platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={handleExportToExcel}
              disabled={filteredTasks.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-lg transition-colors"
            >
              Export to Excel
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tasks found matching the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Employee
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTasks.map((task, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(task.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{task.employeeName}</div>
                      <div className="text-sm text-slate-500">{task.employeeEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {task.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {task.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {task.fulfillment || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {task.task}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {task.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskReport;
