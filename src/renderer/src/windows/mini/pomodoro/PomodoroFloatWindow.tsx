import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Progress } from 'antd'
import { Play, Pause, Square, X } from 'lucide-react'

import { usePomodoroTimer } from '@renderer/pages/pomodoro/hooks/usePomodoro'
import { usePomodoroTasks } from '@renderer/pages/pomodoro/hooks/usePomodoroTasks'
import { useAppDispatch } from '@renderer/store'
import { setShowFloatWindow } from '@renderer/store/pomodoro'

const PomodoroFloatWindow: FC = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { timeLeft, isRunning, currentPhase, progress, startTimer, pauseTimer, stopTimer } = usePomodoroTimer()
  const { currentTask } = usePomodoroTasks()

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getPhaseColor = () => {
    return currentPhase === 'work' ? '#ff6b6b' : '#4ecdc4'
  }

  const closeFloatWindow = () => {
    dispatch(setShowFloatWindow(false))
  }

  return (
    <Container>
      <Header>
        <PhaseIndicator $color={getPhaseColor()}>
          {currentPhase === 'work' ? '🍅' : '☕'}
        </PhaseIndicator>
        <CloseButton onClick={closeFloatWindow}>
          <X size={14} />
        </CloseButton>
      </Header>

      <TimerSection>
        <ProgressWrapper>
          <CircularProgress
            type="circle"
            size={100}
            percent={progress}
            strokeWidth={8}
            strokeColor={getPhaseColor()}
            trailColor="var(--color-border-soft)"
            format={() => ''}
          />
          <TimeDisplay>{formatTime(timeLeft)}</TimeDisplay>
        </ProgressWrapper>
      </TimerSection>

      <TaskSection>
        {currentTask ? (
          <CurrentTask>
            <TaskLabel>{t('pomodoro.float.currentTask')}:</TaskLabel>
            <TaskTitle title={currentTask.title}>
              {currentTask.title}
            </TaskTitle>
          </CurrentTask>
        ) : (
          <NoTask>{t('pomodoro.float.noTask')}</NoTask>
        )}
      </TaskSection>

      <Controls>
        {!isRunning ? (
          <ControlButton onClick={startTimer} $primary>
            <Play size={14} />
          </ControlButton>
        ) : (
          <ControlButton onClick={pauseTimer}>
            <Pause size={14} />
          </ControlButton>
        )}
        
        <ControlButton onClick={stopTimer}>
          <Square size={14} />
        </ControlButton>
      </Controls>
    </Container>
  )
}

const Container = styled.div`
  width: 280px;
  height: 120px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 20px;
`

const PhaseIndicator = styled.div<{ $color: string }>`
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::after {
    content: '';
    width: 8px;
    height: 8px;
    background-color: ${props => props.$color};
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const CloseButton = styled.button`
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: var(--color-background-soft);
    color: var(--color-text-1);
  }
`

const TimerSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
`

const ProgressWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CircularProgress = styled(Progress)`
  .ant-progress-circle-trail,
  .ant-progress-circle-path {
    stroke-linecap: round;
  }
`

const TimeDisplay = styled.div`
  position: absolute;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
  font-variant-numeric: tabular-nums;
`

const TaskSection = styled.div`
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CurrentTask = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const TaskLabel = styled.div`
  font-size: 10px;
  color: var(--color-text-3);
  text-align: center;
`

const TaskTitle = styled.div`
  font-size: 12px;
  color: var(--color-text-1);
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`

const NoTask = styled.div`
  font-size: 11px;
  color: var(--color-text-3);
  text-align: center;
`

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  height: 24px;
`

const ControlButton = styled.button<{ $primary?: boolean }>`
  width: 32px;
  height: 24px;
  border: 1px solid var(--color-border);
  background: ${props => props.$primary ? 'var(--color-primary)' : 'var(--color-background-soft)'};
  color: ${props => props.$primary ? 'white' : 'var(--color-text-2)'};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$primary ? 'var(--color-primary-hover)' : 'var(--color-background)'};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`

export default PomodoroFloatWindow