import React, { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeeLogHistory,
  deleteLogEntry,
  LogSheetRecord,
} from "../services/sheetService";
import LeaveForm from "./LeaveForm";

const LeaveHistory: React.FC<{ employeeEmail: string }> = ({
  employeeEmail,
}) => {
  const [rows, setRows] = useState<LogSheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [editingRecord, setEditingRecord] = useState<LogSheetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this leave request?")) return;
    setIsDeleting(true);
    try {
      await deleteLogEntry(requestId);
      setRefreshSeq(s => s + 1);
    } catch (e) {
      console.error(e);
      alert("Failed to delete the request.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchEmployeeLogHistory(employeeEmail);
        if (!cancelled) setRows(data);
      } catch (e) {
        console.error(e);
        if (!cancelled)
          setError("Unable to load Leave History from Logs sheet.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [employeeEmail, refreshSeq]);

  const columns = useMemo(
    () => [
      { key: "timestamp", label: "Timestamp" },
      { key: "status", label: "Status" },
      { key: "permissionType", label: "Permission Type" },
      { key: "leaveType", label: "Leave Type" },
      { key: "requestedInTime", label: "InTime" },
      { key: "requestedOutTime", label: "OutTime" },
      { key: "dates", label: "Dates" },
      { key: "alternateStaff", label: "Alternate Staff" },
      { key: "reason", label: "Reason" },
      { key: "managerComment", label: "Manager Comment" },
      { key: "managerAction", label: "Manager Action" },
      { key: "actions", label: "Actions" },
    ],
    []
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Leave History</h3>
          <p className="text-sm text-slate-500">
            From Logs sheet for {employeeEmail}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshSeq((v) => v + 1)}
          disabled={isLoading}
          className="text-sm text-slate-700 hover:text-slate-900 underline disabled:opacity-50"
          title="Refresh list"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-10 text-center text-slate-500">Loading history…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          No history found in Logs for your account.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 text-gray-600 font-medium">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="border-b border-gray-200 px-4 py-2 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, idx) => (
                <tr
                  key={`${r.requestId || "row"}-${idx}`}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.timestamp || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status?.toUpperCase() === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : r.status?.toUpperCase() === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {r.status || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.permissionType || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.leaveType || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.requestedInTime || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.requestedOutTime || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.dates || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.alternateStaff || "-"}
                  </td>
                  <td className="px-4 py-2 min-w-[260px]">
                    <span title={r.reason || ""}>{r.reason || "-"}</span>
                  </td>
                  <td className="px-4 py-2 min-w-[200px]">
                    {r.managerComment || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.managerAction || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap space-x-2">
                    {(r.status?.toUpperCase() === "PENDING" || !r.status) && (
                      <>
                        <button
                          onClick={() => setEditingRecord(r)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.requestId)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <LeaveForm
              initialEmployee={{ email: employeeEmail }}
              initialData={editingRecord}
              onSuccess={() => {
                setEditingRecord(null);
                setRefreshSeq((s) => s + 1);
              }}
              onCancel={() => setEditingRecord(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveHistory;
