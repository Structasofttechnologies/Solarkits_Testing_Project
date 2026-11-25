import React, { useState } from "react";
import {
  FaClipboardList,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaUserCheck,
  FaUsers,
  FaArrowRight,
  FaFilter,
  FaBolt
} from "react-icons/fa";
import { FiCheckSquare, FiPlay, FiClock } from "react-icons/fi";

export default function DailyTasksSection({
  tasks = [],
  onUpdateStatus,
  onTaskAction
}) {
  const [activeTab, setActiveTab] = useState("Today");

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const tabs = [
    { id: "Today", label: "Today's Tasks" },
    { id: "Overdue", label: "Overdue" },
    { id: "Upcoming", label: "Upcoming" },
    { id: "Completed", label: "Completed" },
    { id: "My Tasks", label: "My Tasks" },
    { id: "Team Tasks", label: "Team Tasks" }
  ];

  const filteredTasks = tasks.filter((t) => {
    const isCompleted = t.status === "Completed";
    const dueDate = t.due_date ? new Date(t.due_date) : null;
    const isOverdue = dueDate && dueDate < now && !isCompleted;
    const isToday = dueDate && dueDate <= todayEnd && !isOverdue && !isCompleted;
    const isUpcoming = dueDate && dueDate > todayEnd && !isCompleted;

    switch (activeTab) {
      case "Today":
        return isToday || (!dueDate && !isCompleted);
      case "Overdue":
        return isOverdue;
      case "Upcoming":
        return isUpcoming;
      case "Completed":
        return isCompleted;
      case "My Tasks":
        return !isCompleted && (t.assigned_to || "").includes("Warehouse Manager");
      case "Team Tasks":
        return !isCompleted && !(t.assigned_to || "").includes("Warehouse Manager");
      default:
        return true;
    }
  });

  const getPriorityBadge = (p) => {
    switch ((p || "").toLowerCase()) {
      case "high":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300";
      case "medium":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300";
      default:
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-300";
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "Inward":
        return "bg-sky-500/10 text-sky-600";
      case "Preparation":
        return "bg-cyan-500/10 text-cyan-600";
      case "Booking":
        return "bg-amber-500/10 text-amber-600";
      case "Dispatch":
        return "bg-purple-500/10 text-purple-600";
      case "Ticket":
        return "bg-rose-500/10 text-rose-600";
      default:
        return "bg-slate-500/10 text-slate-600";
    }
  };

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaClipboardList className="text-primary text-xl" />
            <span>Daily Tasks & Action Required</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black">
              Primary Action Queue
            </span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Operational activities the Delivery Manager and Warehouse teams must execute today. Status transitions update in real-time.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs border border-dashed rounded-xl">
            <FaCheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            All tasks under <strong className="text-text-primary">{activeTab}</strong> are cleared!
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "Completed";
            const isInProgress = task.status === "In Progress";

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-300/40 opacity-70"
                    : "bg-bg/40 border-border hover:border-primary/40 hover:bg-bg/70"
                }`}
              >
                {/* Task Details */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getTypeBadge(task.task_type)}`}>
                      {task.task_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getPriorityBadge(task.priority)}`}>
                      {task.priority} Priority
                    </span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {task.order_number}
                    </span>
                  </div>

                  <h3 className={`text-sm font-bold ${isCompleted ? "line-through text-text-muted" : "text-text-primary"}`}>
                    {task.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span>
                      Assigned: <strong className="text-text-primary">{task.assigned_to}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FaClock className="w-3 h-3 text-text-muted" />
                      Due: {task.due_date ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today"}
                    </span>
                    {task.details && (
                      <>
                        <span>•</span>
                        <span className="text-text-muted">{task.details}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {!isCompleted && !isInProgress && (
                    <button
                      onClick={() => onUpdateStatus && onUpdateStatus(task.id, "In Progress")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-bg border border-border text-text-primary hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <FiPlay className="w-3.5 h-3.5" />
                      <span>Start</span>
                    </button>
                  )}

                  {!isCompleted && (
                    <button
                      onClick={() => onUpdateStatus && onUpdateStatus(task.id, "Completed")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <FiCheckSquare className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      onClick={() => onUpdateStatus && onUpdateStatus(task.id, "Pending")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-bg border border-border text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Reopen
                    </button>
                  )}

                  <button
                    onClick={() => onTaskAction && onTaskAction(task)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all flex items-center gap-1"
                  >
                    <span>Take Action</span>
                    <FaArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

