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
      <p className="text-xs font-bold text-slate-700 uppercase">📅 Core Dates</p>
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        {dates.map((item, idx) => (
          <div
            key={item.label}
            className={`px-3 py-2 text-xs border-b border-slate-100 last:border-0 flex justify-between items-center ${
              idx % 2 === 0 ? "bg-white" : "bg-slate-50"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-slate-700 font-semibold">{item.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {item.value ? (
                  <span className="font-mono text-slate-700">{item.value}</span>
                ) : (
                  <span className="text-slate-400 italic">Not set</span>
                )}
              </p>
            </div>
            <span className="text-[9px] text-slate-500 font-semibold ml-2 flex-shrink-0 whitespace-nowrap">
              {item.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}