import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StationLogRightPanel({
  log,
  blockingItems,
  pendingItems,
  approvals,
  instructions,
  activities,
  milestones,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-4">
      {/* BLOCKING ITEMS - Always Visible */}
      {blockingItems.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              🚫 BLOCKING ({blockingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockingItems.map((item, idx) => (
              <div key={idx} className="text-xs p-2.5 bg-white rounded border-l-2 border-red-500">
                <p className="font-bold text-red-700">{item.type}</p>
                <p className="text-gray-700 mt-1">{item.text}</p>
                {item.reason && <p className="text-gray-600 mt-1 italic">⚠️ {item.reason}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* PENDING ITEMS */}
      {pendingItems.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              ⏳ PENDING ({pendingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingItems.slice(0, 4).map((item, idx) => (
              <div key={idx} className="text-xs p-2.5 bg-white rounded border-l-2 border-yellow-500">
                <p className="font-semibold text-gray-800">{item.description || item.approval_type}</p>
                <p className="text-gray-600 mt-0.5">📌 {item.responsible || "Review needed"}</p>
              </div>
            ))}
            {pendingItems.length > 4 && (
              <p className="text-xs text-gray-600 p-2 text-center">+{pendingItems.length - 4} more pending</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-700">{approvals.filter(a => a.status === "Approved").length}/{approvals.length}</p>
            <p className="text-xs text-blue-600 font-semibold mt-1">APPROVALS</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-indigo-700">{activities.length}</p>
            <p className="text-xs text-indigo-600 font-semibold mt-1">ACTIONS</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">Approvals</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          {/* Current Status */}
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-slate-700">Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Status:</span>
                  <Badge className={`text-xs ${
                    log.current_status === "Completed" ? "bg-green-100 text-green-800" :
                    log.current_status === "Blocked" ? "bg-red-100 text-red-800" :
                    log.current_status === "In Progress" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {log.current_status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Can Proceed:</span>
                  <span className={`text-xs font-bold ${log.can_move_forward ? "text-green-600" : "text-red-600"}`}>
                    {log.can_move_forward ? "✓ YES" : "✗ NO"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Summary */}
          {instructions.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Authority Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {instructions.slice(0, 3).map(instr => (
                  <div key={instr.id} className="text-xs p-2 bg-white rounded border-l-2 border-orange-400">
                    <p className="font-medium text-gray-800">{instr.description.substring(0, 50)}...</p>
                    <Badge variant="outline" className="text-xs mt-1">{instr.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* APPROVALS TAB */}
        <TabsContent value="approvals" className="mt-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {approvals.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No approvals for this stage</p>
              ) : (
                approvals.map(approval => (
                  <div key={approval.id} className={`p-3 rounded-lg border-l-4 ${
                    approval.status === "Approved" ? "bg-green-50 border-l-green-500" :
                    approval.status === "Rejected" ? "bg-red-50 border-l-red-500" :
                    "bg-yellow-50 border-l-yellow-500"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-xs text-gray-900">{approval.approval_type}</p>
                        <p className="text-xs text-gray-600 mt-1">Submitted: {approval.submitted_date || "—"}</p>
                      </div>
                      <Badge className={`text-xs whitespace-nowrap ${
                        approval.status === "Approved" ? "bg-green-100 text-green-800" :
                        approval.status === "Rejected" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {approval.status}
                      </Badge>
                    </div>
                    {approval.approved_by && (
                      <p className="text-xs text-gray-600 mt-2">✓ Approved by: {approval.approved_by}</p>
                    )}
                    {approval.comments && (
                      <p className="text-xs text-gray-700 mt-2 italic p-2 bg-white rounded mt-2">💬 {approval.comments}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="mt-3 space-y-3">
          {/* Activity Log */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">📝 Activity Log</p>
            <Card>
              <CardContent className="pt-3 space-y-2">
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-3">No activities yet</p>
                ) : (
                  activities.slice(0, 5).map(activity => (
                    <div key={activity.id} className="text-xs border-l-2 border-blue-300 pl-2.5 py-1">
                      <p className="font-medium text-gray-800">{activity.action_type}</p>
                      <p className="text-gray-600">{activity.description}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{activity.action_date}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Milestone Log */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">🎯 Milestones</p>
            <Card>
              <CardContent className="pt-3 space-y-2">
                {milestones.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-3">No milestones recorded</p>
                ) : (
                  milestones.slice(0, 5).map(milestone => (
                    <div key={milestone.id} className="text-xs border-l-2 border-amber-300 pl-2.5 py-1">
                      <p className="font-bold text-gray-800">{milestone.name}</p>
                      <p className="text-gray-600 text-[11px]">{milestone.category}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{milestone.milestone_date}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* HELPFUL FOOTER */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-indigo-900 mb-2">📌 Quick Reference</p>
          <ul className="text-xs space-y-1 text-indigo-800">
            <li>🚫 Red items = Must resolve to proceed</li>
            <li>⏳ Yellow items = Action needed</li>
            <li>✓ Green items = Approved/Complete</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}