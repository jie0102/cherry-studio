import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addTask as addTaskAction,
  deleteTask as deleteTaskAction,
  incrementTaskPomodoros,
  setCurrentTask as setCurrentTaskAction,
  toggleTask as toggleTaskAction
} from '@renderer/store/pomodoro'
import { useCallback } from 'react'

export interface PomodoroTask {
  id: string
  title: string
  completed: boolean
  pomodoroCount: number
  createdAt: number
  completedAt?: number
}

export const usePomodoroTasks = () => {
  const dispatch = useAppDispatch()
  const { tasks, currentTaskId } = useAppSelector((state) => state.pomodoro)

  const currentTask = currentTaskId ? tasks.find((task) => task.id === currentTaskId) : null

  const addTask = useCallback(
    (title: string) => {
      const newTask: PomodoroTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        completed: false,
        pomodoroCount: 0,
        createdAt: Date.now()
      }

      dispatch(addTaskAction(newTask))
    },
    [dispatch]
  )

  const toggleTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        dispatch(
          toggleTaskAction({
            id: taskId,
            completed: !task.completed,
            completedAt: !task.completed ? Date.now() : undefined
          })
        )

        // If current task is completed, clear it as current
        if (!task.completed && currentTaskId === taskId) {
          dispatch(setCurrentTaskAction(null))
        }
      }
    },
    [tasks, currentTaskId, dispatch]
  )

  const deleteTask = useCallback(
    (taskId: string) => {
      dispatch(deleteTaskAction(taskId))

      // If deleted task was current, clear it
      if (currentTaskId === taskId) {
        dispatch(setCurrentTaskAction(null))
      }
    },
    [currentTaskId, dispatch]
  )

  const setCurrentTask = useCallback(
    (taskId: string | null) => {
      dispatch(setCurrentTaskAction(taskId))
    },
    [dispatch]
  )

  const incrementCurrentTaskPomodoros = useCallback(() => {
    if (currentTaskId) {
      dispatch(incrementTaskPomodoros(currentTaskId))
    }
  }, [currentTaskId, dispatch])

  const getTasksStats = useCallback(() => {
    const total = tasks.length
    const completed = tasks.filter((task) => task.completed).length
    const pending = total - completed
    const totalPomodoros = tasks.reduce((sum, task) => sum + task.pomodoroCount, 0)

    return {
      total,
      completed,
      pending,
      totalPomodoros
    }
  }, [tasks])

  const getTodayTasks = useCallback(() => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    return tasks.filter((task) => task.createdAt >= todayStart && task.createdAt < todayEnd)
  }, [tasks])

  const getCompletedTodayTasks = useCallback(() => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    return tasks.filter(
      (task) => task.completed && task.completedAt && task.completedAt >= todayStart && task.completedAt < todayEnd
    )
  }, [tasks])

  return {
    tasks,
    currentTask,
    currentTaskId,
    addTask,
    toggleTask,
    deleteTask,
    setCurrentTask,
    incrementCurrentTaskPomodoros,
    getTasksStats,
    getTodayTasks,
    getCompletedTodayTasks
  }
}
