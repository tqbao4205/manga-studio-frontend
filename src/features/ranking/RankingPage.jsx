import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "../../shared/utils"
import { WeeklyRanking } from "./WeeklyRanking"
import { MonthlyRanking } from "./MonthlyRanking"

const TABS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
]

export function RankingPage() {
  const [activeTab, setActiveTab] = useState("weekly")

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
            <span>Editorial Suite</span>
            <ChevronRight size={14} />
            <span className="text-primary">Rankings</span>
          </nav>
          <h1 className="text-[32px] font-bold text-on-surface tracking-tight leading-tight">
            Rankings
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="rounded-2xl p-1 flex gap-1"
        style={{
          background: "rgba(27, 27, 29, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(73, 69, 79, 0.3)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "weekly" ? <WeeklyRanking /> : <MonthlyRanking />}
    </div>
  )
}
