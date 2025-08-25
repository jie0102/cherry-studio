import { Progress } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { usePomodoroTimer } from '../hooks/usePomodoro'

const TimerDisplay: FC = () => {
  const { t } = useTranslation()
  const { timeLeft, isRunning, currentPhase, progress } = usePomodoroTimer()

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'work':
        return t('pomodoro.phase.work')
      case 'shortBreak':
        return t('pomodoro.phase.shortBreak')
      case 'longBreak':
        return t('pomodoro.phase.longBreak')
      default:
        return ''
    }
  }

  return (
    <Container>
      <PhaseIndicator $isRunning={isRunning}>{getPhaseLabel(currentPhase)}</PhaseIndicator>

      <TimerWrapper>
        <ProgressRing
          type="circle"
          size={320}
          percent={progress}
          strokeWidth={10}
          strokeColor={currentPhase === 'work' ? '#ff6b6b' : '#4ecdc4'}
          trailColor="var(--color-border-soft)"
          format={() => ''}
        />
        <TimeDisplay>{formatTime(timeLeft)}</TimeDisplay>
      </TimerWrapper>

      <StatusIndicator $isRunning={isRunning}>
        {isRunning ? t('pomodoro.status.running') : t('pomodoro.status.paused')}
      </StatusIndicator>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 32px 0;
`

const PhaseIndicator = styled.div<{ $isRunning: boolean }>`
  font-size: 20px;
  font-weight: 500;
  color: var(--color-text-2);
  padding: 12px 24px;
  border-radius: 24px;
  background-color: var(--color-background-soft);
  border: 2px solid ${(props) => (props.$isRunning ? 'var(--color-primary)' : 'var(--color-border)')};
  transition: border-color 0.3s ease;
`

const TimerWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ProgressRing = styled(Progress)`
  .ant-progress-circle-trail,
  .ant-progress-circle-path {
    stroke-linecap: round;
  }
`

const TimeDisplay = styled.div`
  position: absolute;
  font-size: 56px;
  font-weight: 300;
  color: var(--color-text-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: 3px;
`

const StatusIndicator = styled.div<{ $isRunning: boolean }>`
  font-size: 16px;
  color: ${(props) => (props.$isRunning ? 'var(--color-success)' : 'var(--color-text-3)')};
  font-weight: 500;
`

export default TimerDisplay
