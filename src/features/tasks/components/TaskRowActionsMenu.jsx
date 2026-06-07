import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Eye,
  Pencil,
  Trash2,
  RefreshCcw,
  ChevronLeft,
  EllipsisVertical,
} from "lucide-react";
import { cn } from "../../../shared/utils";

const QUICK_STATUS_OPTIONS = [
  { label: "TODO", value: "TODO" },
  { label: "REVIEW", value: "IN_PROGRESS" },
  { label: "DONE", value: "DONE" },
  { label: "REJECTED", value: "REJECTED" },
];

export function TaskRowActionsMenu({
  task,
  role,
  onViewDetails,
  onEditTask,
  onDeleteTask,
  onChangeStatus,
  onCopyLink,
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setShowStatusSubmenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isMangaka = role === "MANGAKA";

  const estimateMenuHeight = isMangaka ? 270 : 120;

  const toggleMenu = (event) => {
    event.stopPropagation();
    if (!open) {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        setOpenUpward(spaceBelow < estimateMenuHeight);
      }
    }
    setOpen((value) => !value);
    setShowStatusSubmenu(false);
  };

  const handleAction = (callback) => {
    callback(task);
    setOpen(false);
    setShowStatusSubmenu(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        className="rounded-lg p-2 text-on-surface-variant transition-colors hover:text-primary"
      >
        <EllipsisVertical size={18} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-[80] min-w-[210px] overflow-hidden rounded-xl border border-outline-variant/35 bg-surface-container shadow-2xl shadow-black/30",
            openUpward ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => handleAction(onViewDetails)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Eye size={14} />
              View Details
            </button>

            <button
              type="button"
              onClick={() => handleAction(onCopyLink)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Copy size={14} />
              Copy Link
            </button>

            {isMangaka && (
              <>
                <button
                  type="button"
                  onClick={() => handleAction(onEditTask)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <Pencil size={14} />
                  Edit Task
                </button>

                <button
                  type="button"
                  onClick={() => setShowStatusSubmenu((value) => !value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface",
                    showStatusSubmenu &&
                      "bg-surface-container-high text-on-surface",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw size={14} />
                    Change Status
                  </span>
                  <ChevronLeft
                    size={14}
                    className={cn(
                      "transition-transform",
                      showStatusSubmenu && "-rotate-90",
                    )}
                  />
                </button>

                {showStatusSubmenu && (
                  <div className="mt-1 space-y-1 rounded-lg border border-outline-variant/25 bg-surface-container-low p-1.5">
                    {QUICK_STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.label}
                        type="button"
                        onClick={() =>
                          handleAction(() =>
                            onChangeStatus(task, status.value, status.label),
                          )
                        }
                        className="flex w-full items-center rounded-md px-2 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="my-1 border-t border-outline-variant/25" />

                <button
                  type="button"
                  onClick={() => handleAction(onDeleteTask)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-error transition-colors hover:bg-error/10"
                >
                  <Trash2 size={14} />
                  Delete Task
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
