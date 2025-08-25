import { useAppSelector } from '@renderer/store'
import { useCallback } from 'react'

export const usePomodoroStats = () => {
  const { sessions, settings } = useAppSelector((state) => state.pomodoro)

  const getDateRangeStats = useCallback(
    (startDate: Date, endDate: Date) => {
      const startTime = startDate.getTime()
      const endTime = endDate.getTime()

      const filteredSessions = sessions.filter(
        (session) =>
          session.completedAt &&
          session.completedAt >= startTime &&
          session.completedAt <= endTime &&
          session.type === 'work'
      )

      return {
        count: filteredSessions.length,
        minutes: filteredSessions.length * (settings?.workDuration || 25),
        sessions: filteredSessions
      }
    },
    [sessions, settings]
  )

  const getTodayStats = useCallback(() => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    return getDateRangeStats(todayStart, todayEnd)
  }, [getDateRangeStats])

  const getWeekStats = useCallback(() => {
    const today = new Date()
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    return getDateRangeStats(weekStart, weekEnd)
  }, [getDateRangeStats])

  const getMonthStats = useCallback(() => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

    return getDateRangeStats(monthStart, monthEnd)
  }, [getDateRangeStats])

  const getStreakDays = useCallback(() => {
    if (sessions.length === 0) return 0

    const workSessions = sessions
      .filter((session) => session.type === 'work' && session.completedAt)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

    if (workSessions.length === 0) return 0

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const dayMs = 24 * 60 * 60 * 1000

    // Group sessions by day
    const sessionsByDay = new Map<string, number>()
    workSessions.forEach((session) => {
      if (session.completedAt) {
        const sessionDate = new Date(session.completedAt)
        const dayKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}-${sessionDate.getDate()}`
        sessionsByDay.set(dayKey, (sessionsByDay.get(dayKey) || 0) + 1)
      }
    })

    let streakDays = 0
    let currentDate = todayStart

    // Check if today has sessions, if not start from yesterday
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    if (!sessionsByDay.has(todayKey)) {
      currentDate -= dayMs
    }

    // Count consecutive days with sessions
    while (currentDate >= 0) {
      const date = new Date(currentDate)
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

      if (sessionsByDay.has(dayKey)) {
        streakDays++
        currentDate -= dayMs
      } else {
        break
      }
    }

    return streakDays
  }, [sessions])

  const getDailyGoal = useCallback(() => {
    return settings?.dailyGoal || 8 // Default goal of 8 pomodoros
  }, [settings])

  const todayStats = getTodayStats()
  const weekStats = getWeekStats()
  const monthStats = getMonthStats()
  const streakDays = getStreakDays()
  const dailyGoal = getDailyGoal()

  // Calculate average pomodoros per day for the last 30 days
  const getAveragePerDay = useCallback(
    (days: number = 30) => {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

      const stats = getDateRangeStats(startDate, endDate)
      return Math.round((stats.count / days) * 10) / 10 // Round to 1 decimal
    },
    [getDateRangeStats]
  )

  // Get productivity score (0-100) based on goal achievement
  const getProductivityScore = useCallback(() => {
    const last7Days = 7
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - last7Days * 24 * 60 * 60 * 1000)

    let totalScore = 0
    for (let i = 0; i < last7Days; i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const dayStats = getDateRangeStats(dayStart, dayEnd)
      const dayScore = Math.min(100, (dayStats.count / dailyGoal) * 100)
      totalScore += dayScore
    }

    return Math.round(totalScore / last7Days)
  }, [getDateRangeStats, dailyGoal])

  return {
    // Current stats
    todayCount: todayStats.count,
    weeklyCount: weekStats.count,
    monthlyCount: monthStats.count,
    todayMinutes: todayStats.minutes,

    // Goals and streaks
    dailyGoal,
    streakDays,

    // Advanced stats
    averagePerDay: getAveragePerDay(),
    productivityScore: getProductivityScore(),

    // Helper functions
    getDateRangeStats,
    getTodayStats,
    getWeekStats,
    getMonthStats
  }
}
