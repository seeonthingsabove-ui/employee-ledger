import React, { useState, useEffect } from "react";
import LeaveManagerApp from "./LeaveManagerApp";
import TaskManagerApp from "./TaskManagerApp";
import GoogleLogin from "./components/GoogleLogin";
import { AuthenticatedUser } from "./types";
import { seedData } from "./services/storageService";

enum Module {
  LEAVE_MANAGER = "LEAVE_MANAGER",
  TASK_MANAGER = "TASK_MANAGER",
}

const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<Module>(Module.LEAVE_MANAGER);
  const [authedUser, setAuthedUser] = useState<AuthenticatedUser | null>(null);

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
        }
      } catch (e) {
        console.error("Failed to parse stored auth user", e);
        localStorage.removeItem("swiftleave_auth_user");
      }
    }
  }, []);

  const handleGoogleLogin = (user: AuthenticatedUser) => {
    setAuthedUser(user);
    localStorage.setItem("swiftleave_auth_user", JSON.stringify(user));
  };

  const handleSignOut = () => {
    setAuthedUser(null);
    setCurrentModule(Module.LEAVE_MANAGER);

    // Clear all localStorage data
    localStorage.clear();

    // Alternative: Clear specific keys if you want to preserve some data
    // localStorage.removeItem("swiftleave_last_email");
    // localStorage.removeItem("swiftleave_auth_user");
    // localStorage.removeItem("swiftleave_user_roles_cache");
    // localStorage.removeItem("swiftleave_employee_directory_cache");
    // localStorage.removeItem("swiftleave_lookup_cache_v1");
    // localStorage.removeItem("task_lookup_cache");
    // localStorage.removeItem("task_logs_cache");
  };

  if (!authedUser) {
    return <GoogleLogin onLogin={handleGoogleLogin} />;
  }

  return (
    <div className="min-h-screen flex font-sans text-slate-900 bg-slate-50">
      {/* Left Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col">
        {/* Profile Section */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex flex-col items-center text-center">
            {authedUser.picture ? (
              <img
                src={authedUser.picture}
                alt="avatar"
                className="w-16 h-16 rounded-full border-2 border-emerald-400 mb-3"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold mb-3">
                {authedUser.email.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-sm font-semibold truncate w-full">
              {authedUser.name || authedUser.email}
            </p>
            <p className="text-xs text-slate-400 truncate w-full mb-3">
              {authedUser.email}
            </p>
            <button
              onClick={handleSignOut}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Module Tabs */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setCurrentModule(Module.LEAVE_MANAGER)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                currentModule === Module.LEAVE_MANAGER
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Leave Manager</span>
              </div>
            </button>

            <button
              onClick={() => setCurrentModule(Module.TASK_MANAGER)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                currentModule === Module.TASK_MANAGER
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="font-medium">Task Manager</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            DataPower Internal
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {currentModule === Module.LEAVE_MANAGER ? (
          <LeaveManagerApp user={authedUser} />
        ) : (
          <TaskManagerApp user={authedUser} />
        )}
      </main>
    </div>
  );
};

export default App;
