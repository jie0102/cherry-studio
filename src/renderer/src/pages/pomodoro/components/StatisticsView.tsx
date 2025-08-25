import { useAppDispatch } from '@renderer/store'
import { clearStatistics, setDailyGoal } from '@renderer/store/pomodoro'
import { Button, InputNumber, Modal, Progress } from 'antd'
import { Calendar, Clock, Settings, Target, Trash2, TrendingUp } from 'lucide-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { usePomodoroStats } from '../hooks/usePomodoroStats'

const StatisticsView: FC = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false)
  const [tempGoal, setTempGoal] = useState(8)

  const { todayCount, weeklyCount, monthlyCount, dailyGoal, todayMinutes, streakDays } = usePomodoroStats()

  const goalProgress = dailyGoal > 0 ? (todayCount / dailyGoal) * 100 : 0

  const handleClearStatistics = () => {
    Modal.confirm({
      title: t('pomodoro.stats.clearConfirm.title'),
      content: t('pomodoro.stats.clearConfirm.message'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: () => {
        dispatch(clearStatistics())
        window.message.success(t('pomodoro.stats.clearSuccess'))
      }
    })
  }

  const handleSetGoal = () => {
    setTempGoal(dailyGoal)
    setIsGoalModalVisible(true)
  }

  const handleGoalOk = () => {
    if (tempGoal > 0 && tempGoal <= 20) {
      dispatch(setDailyGoal(tempGoal))
      setIsGoalModalVisible(false)
      window.message.success(t('pomodoro.stats.goalUpdated'))
    } else {
      window.message.error(t('pomodoro.stats.goalError'))
    }
  }

  const handleGoalCancel = () => {
    setIsGoalModalVisible(false)
    setTempGoal(dailyGoal)
  }

  return (
    <Container>
      <Header>
        <Title>{t('pomodoro.stats.title')}</Title>
        <HeaderActions>
          <ActionButton
            type="text"
            size="small"
            icon={<Settings size={16} />}
            onClick={handleSetGoal}
            title={t('pomodoro.stats.setGoal')}
          />
          <ActionButton
            type="text"
            size="small"
            icon={<Trash2 size={16} />}
            onClick={handleClearStatistics}
            title={t('pomodoro.stats.clear')}
            danger
          />
        </HeaderActions>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatIcon>
            <Target size={20} color="var(--color-primary)" />
          </StatIcon>
          <StatContent>
            <StatNumber>{todayCount}</StatNumber>
            <StatLabel>{t('pomodoro.stats.today')}</StatLabel>
            {dailyGoal > 0 && (
              <ProgressBar
                percent={goalProgress}
                strokeColor="var(--color-primary)"
                trailColor="var(--color-border-soft)"
                strokeWidth={6}
                showInfo={false}
              />
            )}
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon>
            <Calendar size={20} color="#52c41a" />
          </StatIcon>
          <StatContent>
            <StatNumber>{weeklyCount}</StatNumber>
            <StatLabel>{t('pomodoro.stats.thisWeek')}</StatLabel>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon>
            <TrendingUp size={20} color="#faad14" />
          </StatIcon>
          <StatContent>
            <StatNumber>{monthlyCount}</StatNumber>
            <StatLabel>{t('pomodoro.stats.thisMonth')}</StatLabel>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon>
            <Clock size={20} color="#1890ff" />
          </StatIcon>
          <StatContent>
            <StatNumber>{todayMinutes}</StatNumber>
            <StatLabel>{t('pomodoro.stats.minutesToday')}</StatLabel>
          </StatContent>
        </StatCard>
      </StatsGrid>

      {streakDays > 0 && (
        <StreakCard>
          <StreakContent>
            <StreakNumber>🔥 {streakDays}</StreakNumber>
            <StreakLabel>{t('pomodoro.stats.dayStreak')}</StreakLabel>
          </StreakContent>
        </StreakCard>
      )}

      {dailyGoal > 0 && (
        <GoalSection>
          <GoalTitle>
            {t('pomodoro.stats.dailyGoal')}: {dailyGoal}
          </GoalTitle>
          <GoalProgress>
            <Progress
              percent={goalProgress}
              strokeColor={{
                '0%': '#667eea',
                '100%': '#764ba2'
              }}
              trailColor="var(--color-border-soft)"
              strokeWidth={8}
              format={(percent) => `${Math.round(percent || 0)}%`}
            />
          </GoalProgress>
        </GoalSection>
      )}

      <Modal
        title={t('pomodoro.stats.setGoalTitle')}
        open={isGoalModalVisible}
        onOk={handleGoalOk}
        onCancel={handleGoalCancel}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={400}>
        <GoalModalContent>
          <p>{t('pomodoro.stats.setGoalDescription')}</p>
          <InputNumber
            min={1}
            max={20}
            value={tempGoal}
            onChange={(value) => setTempGoal(value || 8)}
            style={{ width: '100%' }}
            suffix={t('pomodoro.stats.pomodorosUnit')}
          />
        </GoalModalContent>
      </Modal>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 300px;
  max-height: 100%;
  background-color: var(--color-background-soft);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-background);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;

    &:hover {
      background: var(--color-text-4);
    }
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border-soft);
`

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border-soft);
  flex-shrink: 0;

  svg {
    opacity: 0.9;
  }
`

const StatContent = styled.div`
  flex: 1;
  min-width: 0;
`

const StatNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-1);
  line-height: 1.2;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 8px;
`

const ProgressBar = styled(Progress)`
  .ant-progress-bg {
    border-radius: 3px;
  }

  .ant-progress-outer {
    .ant-progress-inner {
      border-radius: 3px;
    }
  }
`

const StreakCard = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%);
  border-radius: 8px;
  margin-bottom: 16px;
`

const StreakContent = styled.div`
  text-align: center;
`

const StreakNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
`

const StreakLabel = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
`

const GoalSection = styled.div`
  padding: 16px;
  background-color: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border-soft);
`

const GoalTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-2);
  margin-bottom: 12px;
`

const GoalProgress = styled.div`
  .ant-progress-text {
    color: var(--color-text-2);
    font-weight: 500;
  }
`

const HeaderActions = styled.div`
  display: flex;
  gap: 4px;
`

const ActionButton = styled(Button)`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.05);
  }
`

const GoalModalContent = styled.div`
  padding: 12px 0;

  p {
    margin-bottom: 16px;
    color: var(--color-text-2);
  }
`

export default StatisticsView
