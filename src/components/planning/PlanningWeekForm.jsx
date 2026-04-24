import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

export default function PlanningWeekForm({ open, onOpenChange, onWeekCreated }) {
  const queryClient = useQueryClient();
  const [planningTypeId, setPlanningTypeId] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: planningTypes = [] } = useQuery({
    queryKey: ["planningTypes"],
    queryFn: () => base44.entities.PlanningTypes.list(),
  });

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generatePlanningWeeks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      resetForm();
      onOpenChange(false);
    },
  });

  const resetForm = () => {
    setPlanningTypeId("");
    setSelectedYear(new Date().getFullYear());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!planningTypeId) {
      alert("Please select a planning type");
      return;
    }
    generateMutation.mutate({
      planning_type_id: planningTypeId,
      year: selectedYear,
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
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Year *</label>
            <Input
              type="number"
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              min={2020}
              max={2050}
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">52 weeks will be created for {selectedYear}</p>
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
            <Button type="submit" disabled={generateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Generate 52 Weeks
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}