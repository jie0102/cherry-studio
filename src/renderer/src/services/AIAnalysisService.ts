import { loggerService } from '@logger'
import AiProvider from '@renderer/aiCore'
import { CompletionsParams } from '@renderer/aiCore/middleware/schemas'
import { getModel } from '@renderer/hooks/useModel'
import { getProviderByModel } from '@renderer/services/AssistantService'
import { Assistant } from '@renderer/types'

// Set up logging
loggerService.initWindowSource('main')
const logger = loggerService.withContext('AIAnalysisService')

export interface FocusAnalysisInput {
  taskDescription: string
  activeApp?: string
  allowedApps: string[]
  blockedApps: string[]
  screenText?: string
  windowTitle?: string
}

export interface FocusAnalysisResult {
  success: boolean
  isFocused: boolean
  confidence: number // 0-1
  reason: string
  suggestions?: string[]
  error?: string
  timestamp: number
}

class AIAnalysisService {
  private static instance: AIAnalysisService

  private constructor() {}

  static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService()
    }
    return AIAnalysisService.instance
  }

  /**
   * Analyze focus state using AI
   */
  async analyzeFocus(input: FocusAnalysisInput): Promise<FocusAnalysisResult> {
    const timestamp = Date.now()

    try {
      logger.debug('Starting AI focus analysis', {
        taskDescription: input.taskDescription,
        activeApp: input.activeApp,
        hasScreenText: !!input.screenText
      })

      const prompt = this.buildAnalysisPrompt(input)
      const aiResponse = await this.callAI(prompt)

      const result = this.parseAIResponse(aiResponse)

      logger.info('AI focus analysis completed', {
        isFocused: result.isFocused,
        confidence: result.confidence,
        reason: result.reason
      } as any)

      return {
        ...result,
        success: true,
        timestamp
      }
    } catch (error) {
      logger.error('AI focus analysis failed:', error as Error)

      return {
        success: false,
        isFocused: true, // Default to focused on error to avoid false alerts
        confidence: 0,
        reason: '分析失败，无法确定专注状态',
        error: error instanceof Error ? error.message : '未知错误',
        timestamp
      }
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(input: FocusAnalysisInput): string {
    const sections = [
      '你是一个专注力分析助手，需要分析用户当前是否专注于指定任务。',
      '',
      '## 任务信息',
      `用户当前任务: ${input.taskDescription}`,
      '',
      '## 应用信息',
      input.activeApp ? `当前活动应用: ${input.activeApp}` : '未检测到活动应用'
    ]

    if (input.allowedApps.length > 0) {
      sections.push(`允许使用的应用: ${input.allowedApps.join(', ')}`)
    }

    if (input.blockedApps.length > 0) {
      sections.push(`被禁止的应用: ${input.blockedApps.join(', ')}`)
    }

    sections.push('')

    if (input.windowTitle) {
      sections.push('## 窗口标题')
      sections.push(input.windowTitle)
      sections.push('')
    }

    if (input.screenText) {
      sections.push('## 屏幕文本内容')
      sections.push(input.screenText)
      sections.push('')
    }

    sections.push(
      '## 分析要求',
      '请分析用户是否专注于指定任务，考虑以下因素：',
      '1. 当前应用是否与任务相关',
      '2. 屏幕内容是否与任务描述匹配',
      '3. 应用使用是否符合允许/禁止列表',
      '4. 窗口标题是否表明工作内容',
      '',
      '## 输出格式',
      '请按照以下JSON格式返回分析结果：',
      '```json',
      '{',
      '  "isFocused": true/false,',
      '  "confidence": 0.0-1.0,',
      '  "reason": "详细分析原因",',
      '  "suggestions": ["建议1", "建议2"] // 可选，仅在不专注时提供',
      '}',
      '```',
      '',
      '注意：',
      '- confidence表示分析的置信度，0.0完全不确定，1.0完全确定',
      '- reason应该说明判断的具体依据',
      '- suggestions仅在isFocused为false时提供，给出改善专注的建议'
    )

    return sections.join('\n')
  }

  /**
   * Call AI model for analysis
   */
  private async callAI(prompt: string): Promise<string> {
    try {
      // Get current model and provider
      const currentModel = getModel()
      if (!currentModel) {
        throw new Error('No AI model configured')
      }

      const provider = getProviderByModel(currentModel)
      if (!provider) {
        throw new Error('No provider found for current model')
      }

      logger.debug('Calling AI model for analysis', {
        modelId: currentModel.id,
        providerId: provider.id
      })

      // Create AI provider instance
      const aiProvider = new AiProvider(provider)

      // Get a basic assistant for the completion
      const assistant: Assistant = {
        id: 'focus-analysis-assistant',
        name: 'Focus Analysis',
        prompt: '',
        model: currentModel,
        topics: [],
        type: 'assistant'
      }

      // Prepare completion parameters
      const completionsParams: CompletionsParams = {
        messages: prompt, // Simple string message
        assistant,
        streamOutput: false,
        temperature: 0.1, // Low temperature for consistent analysis
        maxTokens: 1000
      }

      // Call AI
      const result = await aiProvider.completions(completionsParams)

      const text = result.getText()
      if (!text) {
        throw new Error('No response text from AI model')
      }

      return text.trim()
    } catch (error) {
      logger.error('AI model call failed:', error as Error)
      throw error
    }
  }

  /**
   * Parse AI response to extract analysis result
   */
  private parseAIResponse(response: string): {
    isFocused: boolean
    confidence: number
    reason: string
    suggestions?: string[]
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
      let jsonStr = jsonMatch ? jsonMatch[1] : response

      // Clean up common formatting issues
      jsonStr = jsonStr
        .trim()
        .replace(/^[^{]*/, '') // Remove text before first {
        .replace(/[^}]*$/, '') // Remove text after last }

      const parsed = JSON.parse(jsonStr)

      return {
        isFocused: Boolean(parsed.isFocused),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        reason: String(parsed.reason || '未提供分析原因'),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : undefined
      }
    } catch (parseError) {
      logger.warn('Failed to parse AI response as JSON, attempting text analysis:', parseError as Error)

      // Fallback: simple text analysis
      const lowerResponse = response.toLowerCase()
      const isFocused =
        !lowerResponse.includes('不专注') && !lowerResponse.includes('分心') && !lowerResponse.includes('false')

      return {
        isFocused,
        confidence: 0.3, // Low confidence for fallback analysis
        reason: `基于文本分析的结果: ${response.substring(0, 200)}...`,
        suggestions: isFocused ? undefined : ['请检查当前应用是否与任务相关']
      }
    }
  }

  /**
   * Check if AI analysis is available
   */
  async isAvailable(): Promise<{
    isAvailable: boolean
    error?: string
  }> {
    try {
      const currentModel = getModel()
      if (!currentModel) {
        return {
          isAvailable: false,
          error: '未配置AI模型'
        }
      }

      const provider = getProviderByModel(currentModel)
      if (!provider) {
        return {
          isAvailable: false,
          error: '未找到模型对应的服务提供商'
        }
      }

      // Check if provider has necessary credentials
      if (!provider.apiKey && provider.id !== 'ollama') {
        return {
          isAvailable: false,
          error: '服务提供商未配置API密钥'
        }
      }

      return {
        isAvailable: true
      }
    } catch (error) {
      return {
        isAvailable: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * Test AI analysis with sample data
   */
  async testAnalysis(): Promise<FocusAnalysisResult> {
    const testInput: FocusAnalysisInput = {
      taskDescription: '编写代码项目文档',
      activeApp: 'Visual Studio Code',
      allowedApps: ['Visual Studio Code', 'Google Chrome'],
      blockedApps: ['微信', 'QQ'],
      screenText: 'README.md - 项目介绍和使用说明',
      windowTitle: 'README.md - Visual Studio Code'
    }

    return await this.analyzeFocus(testInput)
  }
}

export default AIAnalysisService.getInstance()
