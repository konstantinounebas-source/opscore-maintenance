import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkflowProgressBar({ stages, currentStage }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase">Workflow Progress</p>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {stages.map(stage => {
              const isCompleted = stage.id < currentStage;
              const isCurrent = stage.id === currentStage;
              const isPending = stage.id > currentStage;

              let bgColor = "bg-gray-200";
              let textColor = "text-gray-600";

              if (isCompleted) {
                bgColor = "bg-green-500";
                textColor = "text-white";
              } else if (isCurrent) {
                bgColor = "bg-blue-500";
                textColor = "text-white";
              }

              return (
                <div
                  key={stage.id}
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${bgColor} ${textColor} text-sm transition-all hover:shadow-md`}
                  title={stage.name}
                >
                  {stage.id}
                </div>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Stages: Completed (green) | Current (blue) | Pending (gray)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}