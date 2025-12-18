import React, { useEffect, useMemo, useState } from "react";
import { LeaveStatus } from "../types";
import {
  fetchLogRecords,
  LogSheetRecord,
  submitDecisionToLogs,
} from "../services/sheetService";
import * as XLSX from "xlsx";

const ManagerDashboard: React.FC<{ focusRequestId?: string }> = ({
  focusRequestId,
}) => {
  const [records, setRecords] = useState<LogSheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshSeq, setRefreshSeq] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rows = await fetchLogRecords();
        if (!cancelled) setRecords(rows);
      } catch (e) {
        console.error(e);
        if (!cancelled)
          setError("Unable to load pending approvals from Logs sheet.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [refreshSeq]);

  const pendingRequests = useMemo(
    () =>
      records.filter(
        (r) =>
          (r.status || "").toUpperCase() === "PENDING" &&
          (r.type || "").toLowerCase() === "request"
      ),
    [records]
  );
  const historyRequests = useMemo(
    () => records.filter((r) => (r.status || "").toUpperCase() !== "PENDING"),
    [records]
  );

  const handleAction = async (requestId: string, status: LeaveStatus) => {
    setProcessingId(requestId);
    const comment = prompt(
      status === LeaveStatus.APPROVED
        ? "Optional approval message:"
        : "Reason for rejection:"
    );
    if (comment === null) {
      setProcessingId(null);
      return;
    }

    await submitDecisionToLogs({
      requestId,
      status: status === LeaveStatus.APPROVED ? "APPROVED" : "REJECTED",
      managerComment: comment || "",
    });

    // Refresh list from sheet
    setRefreshSeq((v) => v + 1);
    setProcessingId(null);
  };

  const handleDownloadLogs = () => {
    // Export whatever is currently loaded from the Logs sheet.
    const header = [
      "Timestamp",
      "Request ID",
      "Type",
      "Status",
      "Employee Name",
      "Employee Email",
      "Employee ID",
      "Dates",
      "Reason",
      "Manager Comment",
      "Manager Action",
      "Permission Type",
      "Leave Type",
      "Requested InTime",
      "Requested OutTime",
    ];

    const rows = records.map((r) => [
      r.timestamp || "",
      r.requestId || "",
      r.type || "",
      r.status || "",
      r.employeeName || "",
      r.employeeEmail || "",
      r.employeeId || "",
      r.dates || "",
      r.reason || "",
      r.managerComment || "",
      r.managerAction || "",
      r.permissionType || "",
      r.leaveType || "",
      r.requestedInTime || "",
      r.requestedOutTime || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `leave-logs-${stamp}.xlsx`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Pending Approvals
          </h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleDownloadLogs}
              disabled={isLoading || records.length === 0}
              className="text-sm text-slate-700 hover:text-slate-900 underline disabled:opacity-50"
              title="Download Logs as Excel"
            >
              Download Logs
            </button>
            <button
              type="button"
              onClick={() => setRefreshSeq((v) => v + 1)}
              disabled={isLoading}
              className="text-sm text-slate-700 hover:text-slate-900 underline disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
            Loading pending approvals…
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
            No pending leave requests. Good job!
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.requestId}
                className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
                  focusRequestId && req.requestId === focusRequestId
                    ? "border-emerald-500 ring-2 ring-emerald-200"
                    : "border-yellow-400"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {req.employeeName}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        ({req.employeeId})
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500">{req.dates}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Request ID: {req.requestId}
                    </p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">
                    PENDING
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm text-gray-700">
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase mb-1">
                      Permission Type
                    </p>
                    <p className="font-medium">{req.permissionType || "-"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase mb-1">
                      Leave Type
                    </p>
                    <p className="font-medium">{req.leaveType || "-"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase mb-1">
                      Requested InTime
                    </p>
                    <p className="font-medium">{req.requestedInTime || "-"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase mb-1">
                      Requested OutTime
                    </p>
                    <p className="font-medium">{req.requestedOutTime || "-"}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4 text-sm text-gray-700 border border-gray-100">
                  <p className="font-semibold text-xs text-gray-400 uppercase mb-1">
                    Reason
                  </p>
                  {req.reason || "-"}
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() =>
                      handleAction(req.requestId, LeaveStatus.REJECTED)
                    }
                    disabled={!!processingId}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition disabled:opacity-50"
                  >
                    {processingId === req.requestId ? "..." : "Deny"}
                  </button>
                  <button
                    onClick={() =>
                      handleAction(req.requestId, LeaveStatus.APPROVED)
                    }
                    disabled={!!processingId}
                    className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow transition disabled:opacity-50"
                  >
                    {processingId === req.requestId
                      ? "Sending..."
                      : "Approve & Email"}
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
              {historyRequests.map((req) => (
                <tr key={`${req.requestId}-${req.timestamp}`}>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {req.employeeName}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{req.dates}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        (req.status || "").toUpperCase() === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 truncate max-w-xs">
                    {req.managerComment || "-"}
                  </td>
                </tr>
              ))}
              {historyRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-gray-400"
                  >
                    No history yet.
                  </td>
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
