import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkflowProgressBar({ stages, currentStage }) {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase">Workflow Progress (18 Stages)</p>
          
          <div className="flex gap-1 overflow-x-auto pb-3 flex-wrap">
            {stages.map(stage => {
              const isCompleted = stage.id < currentStage;
              const isCurrent = stage.id === currentStage;

              let bgColor = "bg-gray-200";
              let textColor = "text-gray-700";
              let borderColor = "border-gray-300";

              if (isCompleted) {
                bgColor = "bg-green-500";
                textColor = "text-white";
                borderColor = "border-green-600";
              } else if (isCurrent) {
                bgColor = "bg-blue-600";
                textColor = "text-white";
                borderColor = "border-blue-700";
              }

              return (
                <div
                  key={stage.id}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${bgColor} ${textColor} text-xs transition-all hover:shadow-lg border-2 ${borderColor} cursor-help`}
                  title={stage.name}
                >
                  {stage.id}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 flex gap-6 pt-2">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></span>Completed</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-700"></span>Current</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300"></span>Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}