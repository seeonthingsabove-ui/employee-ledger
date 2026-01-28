import React, { useState, useEffect } from "react";
import LeaveForm from "./components/LeaveForm";
import LeaveHistory from "./components/LeaveHistory";
import ManagerDashboard from "./components/ManagerDashboard";
import { seedData } from "./services/storageService";
import { fetchEmployeeDirectory, fetchUserRole } from "./services/sheetService";
import { AuthenticatedUser, EmployeeRecord, UserProfile } from "./types";

enum View {
  EMPLOYEE = "EMPLOYEE",
  MANAGER = "MANAGER",
}

enum EmployeeScreen {
  ACTIONS = "ACTIONS",
  APPLY = "APPLY",
  HISTORY = "HISTORY",
}

interface LeaveManagerAppProps {
  user: AuthenticatedUser;
}

const LeaveManagerApp: React.FC<LeaveManagerAppProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<View>(View.EMPLOYEE);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [roleMessage, setRoleMessage] = useState("");
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [employeeScreen, setEmployeeScreen] = useState<EmployeeScreen>(
    EmployeeScreen.ACTIONS
  );
  const [selfRecord, setSelfRecord] = useState<EmployeeRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deepLinkRid, setDeepLinkRid] = useState<string | null>(null);

  const isManager =
    userProfile?.role === "manager" || userProfile?.role === "admin";

  useEffect(() => {
     // Trigger lookup when user prop changes (or initial load)
     handleLookup(user.email);
  }, [user]);

  useEffect(() => {
    seedData(); // Populate some fake data if empty
  }, []);

  useEffect(() => {
    // Capture deep-link params from manager email (e.g. ?view=manager&rid=REQ-XXXX)
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid");
    if (rid) setDeepLinkRid(rid);
  }, []);

  const handleLookup = async (email: string) => {
    if (!email) {
      setRoleMessage("Enter an email to load your role.");
      return;
    }

    setIsCheckingRole(true);
    setRoleMessage("");
    const result = await fetchUserRole(email);

    if (result) {
      const nextIsManager =
        result.role === "manager" || result.role === "admin";
      setUserProfile(result);
      setRoleMessage(
        `Signed in as ${result.name ?? result.email} (${result.role})`
      );
      localStorage.setItem("swiftleave_last_email", email);
      if (!nextIsManager && currentView === View.MANAGER)
        setCurrentView(View.EMPLOYEE);
    } else {
      const fallback: UserProfile = { email: email, role: "employee" };
      setUserProfile(fallback);
      setRoleMessage(
        "Could not verify role from Sheets; defaulting to employee access."
      );
      setCurrentView(View.EMPLOYEE);
    }
    setIsCheckingRole(false);
  };

  useEffect(() => {
    // If manager clicks the email link, route them to Manage Leave after role is known.
    if (!deepLinkRid) return;
    if (!userProfile) return;
    if (userProfile.role !== "manager" && userProfile.role !== "admin") return;

    const params = new URLSearchParams(window.location.search);
    const view = (params.get("view") || "").toLowerCase();
    if (view === "manager") {
      setEmployeeScreen(EmployeeScreen.ACTIONS);
      setCurrentView(View.MANAGER);
    }
  }, [deepLinkRid, userProfile]);

  useEffect(() => {
    const loadSelf = async () => {
      if (!user.email) {
        setSelfRecord(null);
        return;
      }
      const directory = await fetchEmployeeDirectory();
      const match = directory.find(
        (emp) => emp.email.toLowerCase() === user.email.toLowerCase()
      );
      setSelfRecord(match || null);
    };
    loadSelf();
  }, [user]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              {currentView === View.EMPLOYEE &&
                (employeeScreen === EmployeeScreen.APPLY
                  ? "New Leave Request"
                  : employeeScreen === EmployeeScreen.HISTORY
                  ? "Leave History"
                  : "Apply Leave")}
              {currentView === View.MANAGER && "Manage Leave"}
            </h2>
            <p className="text-gray-500 mt-1">
              {currentView === View.EMPLOYEE &&
                (employeeScreen === EmployeeScreen.APPLY
                  ? "Fill in the form to submit your leave request."
                  : employeeScreen === EmployeeScreen.HISTORY
                  ? "Review your submitted requests from the Logs sheet."
                  : "Choose an action to get started.")}
              {currentView === View.MANAGER &&
                "Approve or reject requests and track the live sheet."}
            </p>
          </div>
        </header>

        {/* Action cards based on role (home screen) */}
        {currentView === View.EMPLOYEE &&
          employeeScreen === EmployeeScreen.ACTIONS && (
            <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <button
                type="button"
                onClick={() => {
                  if (!selfRecord) {
                    setToast(
                      "No user details available in the employee sheet for your login. Please contact the administrator."
                    );
                    return;
                  }
                  setCurrentView(View.EMPLOYEE);
                  setEmployeeScreen(EmployeeScreen.APPLY);
                }}
                className="text-left rounded-xl border p-5 shadow-sm transition hover:shadow-md border-emerald-500 bg-emerald-50 hover:border-emerald-600"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  Apply Leave
                </h3>
                <p className="text-sm text-slate-600">
                  {isManager
                    ? "Create a new leave request for yourself."
                    : "Submit a new leave request to your manager."}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user.email) return;
                  setCurrentView(View.EMPLOYEE);
                  setEmployeeScreen(EmployeeScreen.HISTORY);
                }}
                className="text-left rounded-xl border p-5 shadow-sm transition hover:shadow-md border-slate-200 bg-white hover:border-slate-700"
              >
                <h3 className="text-lg font-semibold mb-1">Leave History</h3>
                <p className="text-sm text-slate-600">
                  View your request history from the Logs sheet.
                </p>
              </button>

              {isManager && (
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeScreen(EmployeeScreen.ACTIONS);
                    setCurrentView(View.MANAGER);
                  }}
                  className="text-left rounded-xl border p-5 shadow-sm transition hover:shadow-md border-slate-200 bg-white hover:border-slate-700"
                >
                  <h3 className="text-lg font-semibold mb-1">Manage Leave</h3>
                  <p className="text-sm text-slate-600">
                    Review and approve/reject pending leave requests as a
                    manager.
                  </p>
                </button>
              )}
            </section>
          )}

        <div className="pb-20">
          {currentView === View.EMPLOYEE &&
            employeeScreen !== EmployeeScreen.ACTIONS && (
              <div className="min-w-3xl">
                <button
                  type="button"
                  onClick={() => setEmployeeScreen(EmployeeScreen.ACTIONS)}
                  className="mb-4 inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
                >
                  <span className="mr-1">←</span> Back to actions
                </button>

                {employeeScreen === EmployeeScreen.APPLY && selfRecord && (
                  <LeaveForm
                    onSuccess={() => setEmployeeScreen(EmployeeScreen.ACTIONS)}
                    initialEmployee={{
                      name: selfRecord.name,
                      email: selfRecord.email,
                      employeeId: selfRecord.employeeId,
                    }}
                  />
                )}

                {employeeScreen === EmployeeScreen.HISTORY &&
                  user.email && (
                    <LeaveHistory employeeEmail={user.email} />
                  )}
              </div>
            )}
          {currentView === View.MANAGER &&
            (isManager ? (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView(View.EMPLOYEE);
                    setEmployeeScreen(EmployeeScreen.ACTIONS);
                  }}
                  className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
                >
                  <span className="mr-1">←</span> Back to actions
                </button>
                <ManagerDashboard focusRequestId={deepLinkRid || undefined} />
              </div>
            ) : (
              <div className="max-w-xl mx-auto bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg mb-2">
                  Manager access required
                </h3>
                <p className="text-sm mb-3">
                  Sign in with an email whose role is "manager" or "admin" in
                  the Sheet to view approvals.
                </p>
                <button
                  onClick={() => {
                    setCurrentView(View.EMPLOYEE);
                    setEmployeeScreen(EmployeeScreen.ACTIONS);
                  }}
                  className="text-sm text-slate-900 underline"
                >
                  Go back to Apply Leave
                </button>
              </div>
            ))}
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-red-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
            <div className="flex justify-between items-start gap-3">
              <span>{toast}</span>
              <button
                className="text-xs underline"
                onClick={() => setToast(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaveManagerApp;
