import React, { useState, useEffect } from "react";
import { AuthenticatedUser } from "../types";
import { fetchTaskLookups, submitTask, TaskLookups, TaskLogEntry } from "../services/sheetService";

interface TaskFormProps {
  user: AuthenticatedUser;
  onSuccess: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ user, onSuccess }) => {
  const [lookups, setLookups] = useState<TaskLookups>({
    companies: [],
    platforms: [],
    fulfillments: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [company, setCompany] = useState("");
  const [platform, setPlatform] = useState("");
  const [fulfillment, setFulfillment] = useState("");
  const [task, setTask] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    const loadLookups = async () => {
      setLoading(true);
      const data = await fetchTaskLookups();
      setLookups(data);
      setLoading(false);
    };
    loadLookups();
  }, []);

  // Conditional logic: Enable fulfillment only if platform is Amazon or Flipkart
  const isFulfillmentEnabled = platform === "Amazon" || platform === "Flipkart";

  // Auto-set task to "Inward" if platform is "Material"
  useEffect(() => {
    if (platform === "Material") {
      setTask("Inward");
    }
  }, [platform]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company || !platform || !task || !quantity) {
      alert("Please fill in all required fields.");
      return;
    }

    if (isFulfillmentEnabled && !fulfillment) {
      alert("Please select a fulfillment type.");
      return;
    }

    setSubmitting(true);

    const entry: TaskLogEntry = {
      employeeEmail: user.email,
      employeeName: user.name || user.email,
      company,
      platform,
      fulfillment: isFulfillmentEnabled ? fulfillment : "",
      task,
      quantity: parseInt(quantity, 10),
      timestamp: Date.now(),
    };

    const success = await submitTask(entry);

    if (success) {
      alert("Task submitted successfully!");
      // Reset form
      setCompany("");
      setPlatform("");
      setFulfillment("");
      setTask("");
      setQuantity("");
      onSuccess();
    } else {
      alert("Failed to submit task. Please try again.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading form...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        {/* Company */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">
            Company <span className="text-red-500">*</span>
          </label>
          <select
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Select Company</option>
            {lookups.companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Platform */}
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-slate-700 mb-1">
            Platform <span className="text-red-500">*</span>
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              // Reset fulfillment when platform changes
              if (e.target.value !== "Amazon" && e.target.value !== "Flipkart") {
                setFulfillment("");
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Select Platform</option>
            {lookups.platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Fulfillment (conditional) */}
        <div>
          <label htmlFor="fulfillment" className="block text-sm font-medium text-slate-700 mb-1">
            Fulfillment {isFulfillmentEnabled && <span className="text-red-500">*</span>}
          </label>
          <select
            id="fulfillment"
            value={fulfillment}
            onChange={(e) => setFulfillment(e.target.value)}
            disabled={!isFulfillmentEnabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              !isFulfillmentEnabled ? "bg-slate-100 cursor-not-allowed" : ""
            }`}
            required={isFulfillmentEnabled}
          >
            <option value="">Select Fulfillment</option>
            {lookups.fulfillments.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {!isFulfillmentEnabled && (
            <p className="text-xs text-slate-500 mt-1">
              Fulfillment is only required for Amazon or Flipkart platforms.
            </p>
          )}
        </div>

        {/* Task */}
        <div>
          <label htmlFor="task" className="block text-sm font-medium text-slate-700 mb-1">
            Task <span className="text-red-500">*</span>
          </label>
          <select
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={platform === "Material"}
            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              platform === "Material" ? "bg-slate-100 cursor-not-allowed" : ""
            }`}
            required
          >
            <option value="">Select Task</option>
            {lookups.tasks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {platform === "Material" && (
            <p className="text-xs text-slate-500 mt-1">
              Task is automatically set to "Inward" for Material platform.
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Enter quantity"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Task"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
