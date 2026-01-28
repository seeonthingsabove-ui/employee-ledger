import React, { useState, useEffect } from "react";
import TaskForm from "./components/TaskForm";
import TaskTracker from "./components/TaskTracker";
import TaskReport from "./components/TaskReport";
import { AuthenticatedUser } from "./types";
import { fetchUserRole } from "./services/sheetService";

enum TaskScreen {
  ACTIONS = "ACTIONS",
  ENTER_TASK = "ENTER_TASK",
  TASK_TRACKER = "TASK_TRACKER",
  TASK_REPORT = "TASK_REPORT",
}

interface TaskManagerAppProps {
  user: AuthenticatedUser;
}

const TaskManagerApp: React.FC<TaskManagerAppProps> = ({ user }) => {
  const [taskScreen, setTaskScreen] = useState<TaskScreen>(TaskScreen.ACTIONS);
  const [isManager, setIsManager] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      setRoleLoading(true);
      const userProfile = await fetchUserRole(user.email);
      console.log('TaskManager - User Profile:', userProfile);
      console.log('TaskManager - Is Manager:', userProfile?.role === "manager" || userProfile?.role === "admin");
      setIsManager(userProfile?.role === "manager" || userProfile?.role === "admin");
      setRoleLoading(false);
    };
    loadRole();
  }, [user.email]);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-auto">
      <main className="flex-1 p-6 md:p-12">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            {taskScreen === TaskScreen.ENTER_TASK
              ? "Enter Task"
              : taskScreen === TaskScreen.TASK_TRACKER
              ? "Task Tracker"
              : taskScreen === TaskScreen.TASK_REPORT
              ? "Task Report"
              : "Task Manager"}
          </h2>
          <p className="text-gray-500 mt-1">
            {taskScreen === TaskScreen.ENTER_TASK
              ? "Fill in the form to log your task."
              : taskScreen === TaskScreen.TASK_TRACKER
              ? "View your task history."
              : taskScreen === TaskScreen.TASK_REPORT
              ? "View all task logs with filtering and export options."
              : "Choose an action to get started."}
          </p>
        </header>

        {/* Action cards */}
        {taskScreen === TaskScreen.ACTIONS && (
          <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <button
              type="button"
              onClick={() => setTaskScreen(TaskScreen.ENTER_TASK)}
              className="text-left rounded-xl border p-5 shadow-sm transition hover:shadow-md border-emerald-500 bg-emerald-50 hover:border-emerald-600"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Enter Task
              </h3>
              <p className="text-sm text-slate-600">
                Log a new task entry with company, platform, and task details.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTaskScreen(TaskScreen.TASK_TRACKER)}
              className="text-left rounded-xl border p-5 shadow-sm transition hover:shadow-md border-slate-200 bg-white hover:border-slate-700"
            >
              <h3 className="text-lg font-semibold mb-1">Task Tracker</h3>
              <p className="text-sm text-slate-600">
                View your task history and logged entries.
              </p>
            </button>

            {/* Task Report - Only for Managers */}
            {isManager && (
              <button
                type="button"
                onClick={() => setTaskScreen(TaskScreen.TASK_REPORT)}
                className="text-left rounded-xl border p-5 shadow-sm transition hover:shadow-md border-blue-500 bg-blue-50 hover:border-blue-600"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  Task Report
                </h3>
                <p className="text-sm text-slate-600">
                  View all task logs with filtering and export to Excel.
                </p>
              </button>
            )}
          </section>
        )}

        {/* Task Form or Tracker */}
        <div className="pb-20">
          {taskScreen !== TaskScreen.ACTIONS && (
            <button
              type="button"
              onClick={() => setTaskScreen(TaskScreen.ACTIONS)}
              className="mb-4 inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
            >
              <span className="mr-1">←</span> Back to actions
            </button>
          )}

          {taskScreen === TaskScreen.ENTER_TASK && (
            <TaskForm
              user={user}
              onSuccess={() => setTaskScreen(TaskScreen.ACTIONS)}
            />
          )}

          {taskScreen === TaskScreen.TASK_TRACKER && (
            <TaskTracker userEmail={user.email} />
          )}

          {taskScreen === TaskScreen.TASK_REPORT && (
            <TaskReport />
          )}
        </div>
      </main>
    </div>
  );
};

export default TaskManagerApp;
