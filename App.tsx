import React, { useState, useEffect } from "react";
import LeaveForm from "./components/LeaveForm";
import LeaveHistory from "./components/LeaveHistory";
import ManagerDashboard from "./components/ManagerDashboard";
import GoogleLogin from "./components/GoogleLogin";
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.EMPLOYEE);
  const [userEmail, setUserEmail] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [roleMessage, setRoleMessage] = useState("");
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [authedUser, setAuthedUser] = useState<AuthenticatedUser | null>(null);
  const [employeeScreen, setEmployeeScreen] = useState<EmployeeScreen>(
    EmployeeScreen.ACTIONS
  );
  const [selfRecord, setSelfRecord] = useState<EmployeeRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deepLinkRid, setDeepLinkRid] = useState<string | null>(null);

  const isManager =
    userProfile?.role === "manager" || userProfile?.role === "admin";

  useEffect(() => {
    seedData(); // Populate some fake data if empty
  }, []);

  useEffect(() => {
    // Restore authenticated user from localStorage on refresh
    const raw = localStorage.getItem("swiftleave_auth_user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthenticatedUser;
        if (parsed.email) {
          setAuthedUser(parsed);
          setUserEmail(parsed.email);
          handleLookup(parsed.email);
        }
      } catch (e) {
        console.error("Failed to parse stored auth user", e);
        localStorage.removeItem("swiftleave_auth_user");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Capture deep-link params from manager email (e.g. ?view=manager&rid=REQ-XXXX)
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid");
    if (rid) setDeepLinkRid(rid);
  }, []);

  const handleLookup = async (emailOverride?: string) => {
    const emailToLookup = (emailOverride ?? userEmail).trim();
    if (!emailToLookup) {
      setRoleMessage("Enter an email to load your role.");
      return;
    }

    setIsCheckingRole(true);
    setRoleMessage("");
    const result = await fetchUserRole(emailToLookup);

    if (result) {
      const nextIsManager =
        result.role === "manager" || result.role === "admin";
      setUserProfile(result);
      setRoleMessage(
        `Signed in as ${result.name ?? result.email} (${result.role})`
      );
      localStorage.setItem("swiftleave_last_email", emailToLookup);
      if (!nextIsManager && currentView === View.MANAGER)
        setCurrentView(View.EMPLOYEE);
    } else {
      const fallback: UserProfile = { email: emailToLookup, role: "employee" };
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

  const handleGoogleLogin = (user: AuthenticatedUser) => {
    setAuthedUser(user);
    setUserEmail(user.email);
    localStorage.setItem("swiftleave_auth_user", JSON.stringify(user));
    handleLookup(user.email);
  };

  const handleSignOut = () => {
    setAuthedUser(null);
    setUserProfile(null);
    setUserEmail("");
    setRoleMessage("");
    setCurrentView(View.EMPLOYEE);
    setEmployeeScreen(EmployeeScreen.ACTIONS);
    localStorage.removeItem("swiftleave_last_email");
    localStorage.removeItem("swiftleave_auth_user");
  };

  useEffect(() => {
    const loadSelf = async () => {
      if (!authedUser?.email) {
        setSelfRecord(null);
        return;
      }
      const directory = await fetchEmployeeDirectory();
      const match = directory.find(
        (emp) => emp.email.toLowerCase() === authedUser.email.toLowerCase()
      );
      setSelfRecord(match || null);
    };
    loadSelf();
  }, [authedUser]);

  if (!authedUser) {
    return <GoogleLogin onLogin={handleGoogleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
            SwiftLeaveManager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Cost Approval System
          </p>
          <div className="mt-4 flex items-center gap-3 bg-slate-800/70 border border-slate-700 rounded-lg p-3">
            {authedUser.picture ? (
              <img
                src={authedUser.picture}
                alt="avatar"
                className="w-10 h-10 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">
                {authedUser.email.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {authedUser.name || authedUser.email}
              </p>
              <p className="text-[11px] text-emerald-300 truncate">
                {authedUser.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[11px] text-amber-300 hover:text-amber-200 underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-auto h-screen relative">
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
                  if (!authedUser?.email) return;
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

        <div className="h-full pb-20">
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
                  authedUser?.email && (
                    <LeaveHistory employeeEmail={authedUser.email} />
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

export default App;
