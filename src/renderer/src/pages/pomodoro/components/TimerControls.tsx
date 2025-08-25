import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Button } from 'antd'
import { Play, Pause, Square, SkipForward } from 'lucide-react'

import { usePomodoroTimer } from '../hooks/usePomodoro'

const TimerControls: FC = () => {
  const { t } = useTranslation()
  const { 
    isRunning, 
    startTimer, 
    pauseTimer, 
    stopTimer, 
    skipPhase,
    currentPhase 
  } = usePomodoroTimer()

  return (
    <Container>
      <MainControls>
        {!isRunning ? (
          <PrimaryButton
            size="large"
            icon={<Play size={20} />}
            onClick={startTimer}
          >
            {t('pomodoro.controls.start')}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            size="large"
            icon={<Pause size={20} />}
            onClick={pauseTimer}
          >
            {t('pomodoro.controls.pause')}
          </PrimaryButton>
        )}
        
        <SecondaryButton
          size="large"
          icon={<Square size={18} />}
          onClick={stopTimer}
        >
          {t('pomodoro.controls.stop')}
        </SecondaryButton>
      </MainControls>

      <SkipButton
        type="text"
        icon={<SkipForward size={16} />}
        onClick={skipPhase}
        disabled={!isRunning}
      >
        {currentPhase === 'work' 
          ? t('pomodoro.controls.skipToBreak')
          : t('pomodoro.controls.skipToWork')
        }
      </SkipButton>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`

const MainControls = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`

const PrimaryButton = styled(Button)`
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 500;
  border-radius: 28px;
  
  &.ant-btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    
    &:hover {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  transition: all 0.2s ease;
`

const SecondaryButton = styled(Button)`
  height: 56px;
  padding: 0 32px;
  font-size: 16px;
  border-radius: 28px;
  color: var(--color-text-2);
  border-color: var(--color-border);
  
  &:hover {
    color: var(--color-text-1);
    border-color: var(--color-primary);
    transform: translateY(-2px);
  }
  
  transition: all 0.2s ease;
`

const SkipButton = styled(Button)`
  font-size: 12px;
  color: var(--color-text-3);
  
  &:hover {
    color: var(--color-primary);
  }
  
  &:disabled {
    color: var(--color-text-4);
  }
`

export default TimerControls