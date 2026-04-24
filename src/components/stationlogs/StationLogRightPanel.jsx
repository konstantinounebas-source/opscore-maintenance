import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function StationLogRightPanel({
  blockingItems,
  pendingItems,
  approvals,
  instructions,
  activities,
  milestones,
}) {
  return (
    <div className="space-y-4">
      {/* Blocking Items */}
      {blockingItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Blocking Items ({blockingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockingItems.map((item, idx) => (
              <div key={idx} className="text-xs p-2 bg-white rounded border border-red-200">
                <p className="font-medium text-red-700">{item.type}</p>
                <p className="text-gray-600 mt-1">{item.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending ({pendingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingItems.slice(0, 5).map((item, idx) => (
              <div key={idx} className="text-xs p-2 bg-white rounded">
                <p className="font-medium text-gray-700">{item.description || item.approval_type}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approvals Summary */}
      {approvals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvals.map(approval => (
              <div key={approval.id} className="text-xs">
                <p className="font-medium">{approval.approval_type}</p>
                <Badge
                  variant="outline"
                  className={
                    approval.status === "Approved"
                      ? "bg-green-100 text-green-800"
                      : approval.status === "Rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {approval.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activity & Milestones Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity" className="text-xs">Recent Activity</TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs">Milestones</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="mt-2">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {activities.slice(0, 5).map(activity => (
                <div key={activity.id} className="text-xs border-l-2 border-gray-300 pl-2 py-1">
                  <p className="font-medium text-gray-700">{activity.action_type}</p>
                  <p className="text-gray-500 text-[11px]">{activity.action_date}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="milestones" className="mt-2">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {milestones.slice(0, 5).map(milestone => (
                <div key={milestone.id} className="text-xs border-l-2 border-blue-300 pl-2 py-1">
                  <p className="font-medium text-gray-700">{milestone.name}</p>
                  <p className="text-gray-500 text-[11px]">{milestone.category}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}