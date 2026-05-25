import { create } from 'zustand'
import { mockTasks, mockTaskSubmissions } from '../../shared/constants/mock-data'

let nextId = mockTasks.reduce((max, t) => Math.max(max, t.id), 0) + 1
let nextSubId = mockTaskSubmissions.reduce((max, s) => Math.max(max, s.id), 0) + 1

export const useTaskStore = create((set) => ({
  tasks: mockTasks,

  addTask: (task) =>
    set((state) => {
      const t = { ...task, id: nextId++ }
      mockTasks.push(t)
      return { tasks: [...state.tasks, t] }
    }),

  updateTaskStatus: (taskId, status) =>
    set((state) => {
      const found = state.tasks.find(t => t.id === taskId)
      if (found) found.status = status
      return { tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status } : t) }
    }),

  addSubmission: (taskId, submission) =>
    set(() => {
      const sub = { ...submission, id: nextSubId++, taskId, version: 1, status: 'SUBMITTED', submittedAt: new Date().toISOString() }
      mockTaskSubmissions.push(sub)
      return {}
    }),
}))
