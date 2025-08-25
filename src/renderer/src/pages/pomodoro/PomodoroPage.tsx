import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'

import TimerDisplay from './components/TimerDisplay'
import TimerControls from './components/TimerControls'
import TasksList from './components/TasksList'
import StatisticsView from './components/StatisticsView'
import { usePomodoroFloat } from './hooks/usePomodoroFloat'

const PomodoroPage: FC = () => {
  const { t } = useTranslation()
  
  // Initialize float window management
  usePomodoroFloat()

  return (
    <Container>
      <Navbar>
        <NavbarCenter style={{ borderRight: 'none' }}>{t('pomodoro.title')}</NavbarCenter>
      </Navbar>
      <Content>
        <MainSection>
          <TimerDisplay />
          <TimerControls />
        </MainSection>
        <SideSection>
          <TasksList />
          <StatisticsView />
        </SideSection>
      </Content>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

const Content = styled.div`
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
  min-height: 0;
  width: 100%;
  height: calc(100vh - var(--navbar-height));
  padding: 16px 20px;
  background-color: var(--color-background);
`

const MainSection = styled.div`
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  min-width: 400px;
  
  @media (max-width: 1200px) {
    min-width: 350px;
  }
  
  @media (max-width: 900px) {
    flex: 1.5;
    min-width: 300px;
  }
`

const SideSection = styled.div`
  flex: 1;
  min-width: 320px;
  max-width: none;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  min-height: 0;
  
  @media (max-width: 1200px) {
    min-width: 300px;
  }
  
  @media (max-width: 900px) {
    min-width: 280px;
  }
`

export default PomodoroPage