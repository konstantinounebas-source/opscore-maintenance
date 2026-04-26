import React from "react";

export default function Stage3CoreDates({ currentData = {}, log = {} }) {
  const dates = [
    { label: "Work Start Date", value: currentData?.order_received_date, source: "Stage 1" },
    { label: "Final Deadline", value: currentData?.order_deadline_date, source: "Stage 1" },
    { label: "Priority Deadline", value: currentData?.order_priority_date, source: "Stage 1" },
    { label: "Execution Start", value: log?.stage_3_execution_date, source: "Stage 3" },
    { label: "Execution Finish", value: log?.stage_3_execution_finish, source: "Stage 3" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-800 uppercase">📅 Core Dates</p>
      <div className="grid grid-cols-2 gap-2">
        {dates.map((item) => (
          <div key={item.label} className="bg-white border border-slate-200 rounded p-2.5">
            <p className="text-xs font-semibold text-slate-700">{item.label}</p>
            <p className="text-xs text-slate-600 mt-1">
              {item.value ? (
                <span className="font-mono text-slate-800">{item.value}</span>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">{item.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}