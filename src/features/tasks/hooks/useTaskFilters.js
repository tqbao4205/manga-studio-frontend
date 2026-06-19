import { useEffect, useMemo, useRef, useState } from 'react'

const ALL = 'ALL'

function normalizeStatus(status) {
  if (!status) return 'TODO'
  if (['DONE', 'APPROVED', 'COMPLETED'].includes(status)) return 'DONE'
  if (['REJECTED'].includes(status)) return 'REJECTED'
  if (['IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'REVISION_REQUIRED', 'REVISE'].includes(status)) return 'REVIEW'
  return 'TODO'
}

export function useTaskFilters(tasks) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(ALL)
  const [selectedPriority, setSelectedPriority] = useState(ALL)
  const [selectedAssignee, setSelectedAssignee] = useState(ALL)
  const [selectedSeries, setSelectedSeries] = useState(ALL)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const normalizedStatus = normalizeStatus(task.status)

      if (selectedStatus !== ALL && normalizedStatus !== selectedStatus) return false
      if (selectedPriority !== ALL && (task.priority || 'LOW') !== selectedPriority) return false
      if (selectedAssignee !== ALL && String(task.assistant?.id || '') !== selectedAssignee) return false
      if (selectedSeries !== ALL && String(task.seriesId || '') !== selectedSeries) return false
      return true
    })
  }, [tasks, selectedStatus, selectedPriority, selectedAssignee, selectedSeries])

  const hasActiveFilters = [selectedStatus, selectedPriority, selectedAssignee, selectedSeries].some((value) => value !== ALL)

  const clearFilters = () => {
    setSelectedStatus(ALL)
    setSelectedPriority(ALL)
    setSelectedAssignee(ALL)
    setSelectedSeries(ALL)
    setOpenDropdown(null)
  }

  return {
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
    filteredTasks,
    hasActiveFilters,
    clearFilters,
    normalizeStatus,
  }
}
