import React, { useState, useMemo } from "react";
import {
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaSearch,
  FaFilter,
  FaChevronRight,
  FaUserCheck,
  FaFileInvoice,
  FaCoins,
  FaTools,
  FaWarehouse,
  FaUndoAlt,
  FaUserShield,
  FaCheck,
} from "react-icons/fa";

export default function DailyTasksSection({
  tasks = [],
  onOpenTaskAction,
  onQuickCompleteTask,
  onSelectOrder,
}) {
  const [activeTab, setActiveTab] = useState("today"); // 'today' | 'overdue' | 'upcoming' | 'completed'
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      today: tasks.filter((t) => t.tab === "today" && t.status !== "Completed").length,
      overdue: tasks.filter((t) => t.tab === "overdue" && t.status !== "Completed").length,
      upcoming: tasks.filter((t) => t.tab === "upcoming" && t.status !== "Completed").length,
      completed: tasks.filter((t) => t.status === "Completed" || t.tab === "completed").length,
    };
  }, [tasks]);

  // Filtered task items
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab matching
      if (activeTab === "completed") {
        if (task.status !== "Completed" && task.tab !== "completed") return false;
      } else {
        if (task.status === "Completed") return false;
        if (task.tab !== activeTab) return false;
      }

      // Priority matching
      if (priorityFilter !== "all" && task.priority?.toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }

      // Type matching
      if (typeFilter !== "all" && task.task_type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // Search matching
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = (task.title || "").toLowerCase().includes(query);
        const matchOrder = (task.order_number || "").toLowerCase().includes(query);
        const matchAssignee = (task.assigned_to || "").toLowerCase().includes(query);
        if (!matchTitle && !matchOrder && !matchAssignee) return false;
      }

      return true;
    });
  }, [tasks, activeTab, priorityFilter, typeFilter, searchTerm]);

  const getTaskTypeIcon = (type = "") => {
    switch (type.toLowerCase()) {
      case "po":
        return <FaFileInvoice className="text-indigo-500" />;
      case "payment":
        return <FaCoins className="text-emerald-500" />;
      case "production":
        return <FaTools className="text-amber-500" />;
      case "inward":
        return <FaWarehouse className="text-teal-500" />;
      case "return":
        return <FaUndoAlt className="text-rose-500" />;
      case "admin approval":
        return <FaUserShield className="text-purple-500" />;
      default:
        return <FaTasks className="text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority = "") => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "low":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div id="daily-tasks-section" className="card p-5 space-y-4 border border-border/80 shadow-xs w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary text-sm">
              <FaTasks />
            </span>
            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase">
              Daily Tasks & Action Required
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
              Core Operational Queue
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Tasks assigned to Account Managers, Admin approvals, and cross-team dependencies requiring action.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-surface-hover border border-border p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "today"
                ? "bg-primary text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary"
              }`}
          >
            <span>Today</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "today" ? "bg-white/20 text-white" : "bg-border text-text-muted"
                }`}
            >
              {tabCounts.today}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "overdue"
                ? "bg-red-600 text-white shadow-xs"
                : "text-text-secondary hover:text-red-600"
              }`}
          >
            <span>Overdue</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "overdue" ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
                }`}
            >
              {tabCounts.overdue}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "upcoming"
                ? "bg-primary text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary"
              }`}
          >
            <span>Upcoming</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "upcoming" ? "bg-white/20 text-white" : "bg-border text-text-muted"
                }`}
            >
              {tabCounts.upcoming}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-text-secondary hover:text-emerald-600"
              }`}
          >
            <span>Completed</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "completed" ? "bg-white/20 text-white" : "bg-border text-text-muted"
                }`}
            >
              {tabCounts.completed}
            </span>
          </button>
        </div>
      </div>

      {/* Search & Sub-filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by task title, order #, or assignee..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="payment">Payment Tasks</option>
            <option value="po">PO Creation</option>
            <option value="inward">Inward Verification</option>
            <option value="production">Production Follow-up</option>
            <option value="return">Return Cases</option>
            <option value="admin approval">Admin Approvals</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-surface overflow-hidden">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "Completed";
            return (
              <div
                key={task.id}
                className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-surface-hover/70 transition-colors ${isCompleted ? "opacity-70 bg-surface-hover/30" : ""
                  }`}
              >
                {/* Left: Type Icon + Title + Meta */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-surface border border-border/60 text-sm mt-0.5">
                    {getTaskTypeIcon(task.task_type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        onClick={() => onSelectOrder?.(task.order_number)}
                        className="font-mono text-xs font-bold text-primary hover:underline cursor-pointer"
                        title="Filter this order"
                      >
                        {task.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority} Priority
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-hover border border-border text-text-secondary">
                        {task.task_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.assigned_team === "Account"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                            : task.assigned_team === "Admin"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                          }`}
                      >
                        Team: {task.assigned_team || "Account"}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold ${isCompleted ? "line-through text-text-muted" : "text-text-primary"
                        }`}
                    >
                      {task.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                      <span className="flex items-center gap-1 font-medium">
                        <FaUserCheck size={11} className="text-text-muted" />
                        <span>Assigned to: {task.assigned_to}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono font-medium">
                        <FaClock size={11} className="text-text-muted" />
                        <span>Due: {task.due_date}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!isCompleted && (
                    <button
                      onClick={() => onQuickCompleteTask?.(task.id)}
                      className="p-1.5 rounded-lg border border-border text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-300 transition-all text-xs font-bold flex items-center gap-1"
                      title="Quick Mark Done"
                    >
                      <FaCheck size={11} />
                      <span className="hidden sm:inline">Done</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenTaskAction?.(task)}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span>{task.action_label || "Open Task"}</span>
                    <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-text-muted text-xs italic">
            No tasks found in this view! All operations running smoothly.
          </div>
        )}
      </div>
    </div>
  );
}

