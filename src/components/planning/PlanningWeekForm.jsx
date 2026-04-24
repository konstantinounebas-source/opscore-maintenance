import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function PlanningWeekForm({ open, onOpenChange, onWeekCreated }) {
  const queryClient = useQueryClient();
  const [weekCode, setWeekCode] = useState("");
  const [weekName, setWeekName] = useState("");
  const [planningTypeId, setPlanningTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: planningTypes = [] } = useQuery({
    queryKey: ["planningTypes"],
    queryFn: () => base44.entities.PlanningTypes.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanningWeeks.create(data),
    onSuccess: (newWeek) => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      resetForm();
      onOpenChange(false);
      if (onWeekCreated) onWeekCreated(newWeek);
    },
  });

  const resetForm = () => {
    setWeekCode("");
    setWeekName("");
    setPlanningTypeId("");
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weekCode.trim() || !weekName.trim() || !planningTypeId || !startDate || !endDate) {
      alert("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      week_code: weekCode.trim(),
      week_name: weekName.trim(),
      planning_type_id: planningTypeId,
      start_date: startDate,
      end_date: endDate,
      status: "Draft",
      is_active: false,
    });
  };

  const selectedPlanningType = useMemo(
    () => planningTypes.find(pt => pt.id === planningTypeId),
    [planningTypeId, planningTypes]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Planning Week</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Planning Type *</label>
            <Select value={planningTypeId} onValueChange={setPlanningTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select planning type..." />
              </SelectTrigger>
              <SelectContent>
                {planningTypes.filter(pt => pt.is_active).map(pt => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlanningType?.description && (
              <p className="text-xs text-slate-500 mt-1">{selectedPlanningType.description}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Week Code *</label>
            <Input
              value={weekCode}
              onChange={e => setWeekCode(e.target.value)}
              placeholder="e.g. W2026-12"
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Week Name *</label>
            <Input
              value={weekName}
              onChange={e => setWeekName(e.target.value)}
              placeholder="e.g. Inspection Round 3"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Start Date *</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">End Date *</label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Week
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}