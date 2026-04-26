import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const greeceTime = new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  const greeceDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens", weekday: "short", day: "2-digit", month: "short", year: "numeric",
  }).format(now);

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
      <div>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{greeceTime}</span>
        <span className="text-xs text-slate-400 ml-2">{greeceDate} · Athens</span>
      </div>
    </div>
  );
}