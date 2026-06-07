import { Filter, FilterX } from "lucide-react";
import { TaskFilterDropdown } from "./TaskFilterDropdown";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "TODO", label: "TODO" },
  { value: "REVIEW", label: "REVIEW" },
  { value: "DONE", label: "DONE" },
  { value: "REJECTED", label: "REJECTED" },
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "URGENT", label: "Urgent" },
];

export function TasksFilterBar({
  filterState,
  assigneeOptions,
  seriesOptions,
}) {
  const {
    containerRef,
    openDropdown,
    setOpenDropdown,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    selectedAssignee,
    setSelectedAssignee,
    selectedSeries,
    setSelectedSeries,
    hasActiveFilters,
    clearFilters,
  } = filterState;

  const assigneeDropdownOptions = [
    { value: "ALL", label: "All" },
    ...assigneeOptions,
  ];
  const seriesDropdownOptions = [
    { value: "ALL", label: "All" },
    ...seriesOptions,
  ];

  return (
    <div
      ref={containerRef}
      className="relative z-40 flex flex-wrap items-center gap-3 pb-2"
    >
      <TaskFilterDropdown
        label="Status"
        value={selectedStatus}
        options={STATUS_OPTIONS}
        isOpen={openDropdown === "status"}
        onToggle={() =>
          setOpenDropdown((value) => (value === "status" ? null : "status"))
        }
        onSelect={(value) => {
          setSelectedStatus(value);
          setOpenDropdown(null);
        }}
        active={selectedStatus !== "ALL"}
      />

      <TaskFilterDropdown
        label="Priority"
        value={selectedPriority}
        options={PRIORITY_OPTIONS}
        isOpen={openDropdown === "priority"}
        onToggle={() =>
          setOpenDropdown((value) => (value === "priority" ? null : "priority"))
        }
        onSelect={(value) => {
          setSelectedPriority(value);
          setOpenDropdown(null);
        }}
        active={selectedPriority !== "ALL"}
      />

      <TaskFilterDropdown
        label="Assignee"
        value={selectedAssignee}
        options={assigneeDropdownOptions}
        isOpen={openDropdown === "assignee"}
        onToggle={() =>
          setOpenDropdown((value) => (value === "assignee" ? null : "assignee"))
        }
        onSelect={(value) => {
          setSelectedAssignee(value);
          setOpenDropdown(null);
        }}
        active={selectedAssignee !== "ALL"}
      />

      <TaskFilterDropdown
        label="Series"
        value={selectedSeries}
        options={seriesDropdownOptions}
        isOpen={openDropdown === "series"}
        onToggle={() =>
          setOpenDropdown((value) => (value === "series" ? null : "series"))
        }
        onSelect={(value) => {
          setSelectedSeries(value);
          setOpenDropdown(null);
        }}
        active={selectedSeries !== "ALL"}
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="ml-1 inline-flex items-center gap-1 px-2 text-[11px] text-on-surface-variant underline transition-colors hover:text-primary"
        >
          <FilterX size={12} />
          Clear Filter
        </button>
      )}

      <div className="flex-1" />

      <button
        type="button"
        className="p-2 text-on-surface-variant transition-colors hover:text-on-surface"
        title="Filters"
      >
        <Filter size={16} />
      </button>
    </div>
  );
}
