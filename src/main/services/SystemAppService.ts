/**
 * System App Service - Main Process
 * Handles application detection using active-win and ps-list libraries
 */

import { loggerService } from '@logger'

const logger = loggerService.withContext('SystemAppService')

// Dynamic imports to handle optional dependencies
let activeWindow: any = null
let psList: any = null

// Initialize optional dependencies
async function initializeDependencies() {
  try {
    // Try to import active-win
    const activeWinModule = await import('active-win')
    activeWindow = activeWinModule.activeWindow
    logger.info('active-win loaded successfully')
  } catch (error) {
    logger.warn('active-win not available:', error as Error)
  }

  try {
    // Try to import ps-list
    const psListModule = await import('ps-list')
    psList = psListModule.default
    logger.info('ps-list loaded successfully')
  } catch (error) {
    logger.warn('ps-list not available:', error as Error)
  }
}

// Initialize dependencies on module load
initializeDependencies()

export interface ActiveWindowInfo {
  title: string
  owner: {
    name: string
    pid: number
    path?: string
  }
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ProcessInfo {
  name: string
  pid: number
  ppid?: number
  memory?: number // bytes
  cpu?: number    // percentage
}

class SystemAppService {
  private static instance: SystemAppService
  
  private constructor() {}

  static getInstance(): SystemAppService {
    if (!SystemAppService.instance) {
      SystemAppService.instance = new SystemAppService()
    }
    return SystemAppService.instance
  }

  /**
   * Get the currently active/foreground window
   */
  async getActiveWindow(): Promise<ActiveWindowInfo | null> {
    try {
      if (!activeWindow) {
        logger.error('active-win is not available')
        return null
      }

      const result = await activeWindow()
      
      if (!result) {
        logger.warn('No active window detected')
        return null
      }

      const windowInfo: ActiveWindowInfo = {
        title: result.title || '',
        owner: {
          name: result.owner?.name || 'Unknown',
          pid: result.owner?.pid || 0,
          path: result.owner?.path
        }
      }

      // Add bounds if available
      if (result.bounds) {
        windowInfo.bounds = {
          x: result.bounds.x || 0,
          y: result.bounds.y || 0,
          width: result.bounds.width || 0,
          height: result.bounds.height || 0
        }
      }

      return windowInfo
    } catch (error) {
      logger.error('Failed to get active window:', error as Error)
      return null
    }
  }

  /**
   * Get list of running processes
   */
  async getRunningProcesses(): Promise<ProcessInfo[]> {
    try {
      if (!psList) {
        logger.error('ps-list is not available')
        return []
      }

      const processes = await psList()
      
      if (!Array.isArray(processes)) {
        logger.warn('Unexpected ps-list result format')
        return []
      }

      return processes
        .filter((proc: any) => proc && proc.name && proc.name.trim().length > 0)
        .map((proc: any) => ({
          name: String(proc.name).trim(),
          pid: Number(proc.pid) || 0,
          ppid: Number(proc.ppid) || undefined,
          memory: Number(proc.memory) || undefined,
          cpu: Number(proc.cpu) || undefined
        }))
        .filter(proc => proc.pid > 0) // Filter out invalid PIDs
    } catch (error) {
      logger.error('Failed to get running processes:', error as Error)
      return []
    }
  }

  /**
   * Get comprehensive system app information
   */
  async getSystemAppInfo(): Promise<{
    activeWindow: ActiveWindowInfo | null
    runningProcesses: ProcessInfo[]
    timestamp: number
    hasActiveWin: boolean
    hasPsList: boolean
  }> {
    const timestamp = Date.now()
    
    // Run both operations in parallel for better performance
    const [activeWindow, runningProcesses] = await Promise.all([
      this.getActiveWindow(),
      this.getRunningProcesses()
    ])

    return {
      activeWindow,
      runningProcesses,
      timestamp,
      hasActiveWin: activeWindow !== null,
      hasPsList: psList !== null
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isAvailable(): {
    isAvailable: boolean
    activeWin: boolean
    psList: boolean
  } {
    return {
      isAvailable: activeWindow !== null && psList !== null,
      activeWin: activeWindow !== null,
      psList: psList !== null
    }
  }

  /**
   * Get service status and diagnostics
   */
  async getDiagnostics(): Promise<{
    status: 'healthy' | 'degraded' | 'unavailable'
    activeWin: {
      available: boolean
      error?: string
    }
    psList: {
      available: boolean
      error?: string
    }
    lastActiveWindow?: ActiveWindowInfo | null
    processCount?: number
  }> {
    const diagnostics = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unavailable',
      activeWin: {
        available: activeWindow !== null
      } as {
        available: boolean
        error?: string
      },
      psList: {
        available: psList !== null
      } as {
        available: boolean
        error?: string
      }
    } as {
      status: 'healthy' | 'degraded' | 'unavailable'
      activeWin: {
        available: boolean
        error?: string
      }
      psList: {
        available: boolean
        error?: string
      }
      lastActiveWindow?: ActiveWindowInfo | null
      processCount?: number
    }

    // Test active-win functionality
    try {
      if (activeWindow) {
        const lastActiveWindow = await this.getActiveWindow()
        diagnostics.lastActiveWindow = lastActiveWindow
      } else {
        diagnostics.status = 'degraded'
      }
    } catch (error) {
      diagnostics.activeWin.error = error instanceof Error ? error.message : String(error)
      diagnostics.status = 'degraded'
    }

    // Test ps-list functionality
    try {
      if (psList) {
        const processes = await this.getRunningProcesses()
        diagnostics.processCount = processes.length
      } else {
        diagnostics.status = 'degraded'
      }
    } catch (error) {
      diagnostics.psList.error = error instanceof Error ? error.message : String(error)
      diagnostics.status = 'degraded'
    }

    // Set unavailable if both are failing
    if (!diagnostics.activeWin.available && !diagnostics.psList.available) {
      diagnostics.status = 'unavailable'
    }

    return diagnostics
  }

  /**
   * Force reinitialize dependencies (useful for troubleshooting)
   */
  async reinitialize(): Promise<void> {
    activeWindow = null
    psList = null
    await initializeDependencies()
  }
}

export default SystemAppService.getInstance()