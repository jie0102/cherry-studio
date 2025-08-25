import '@renderer/databases'

import { loggerService } from '@logger'
import store, { persistor } from '@renderer/store'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { useEffect } from 'react'

import TopViewContainer from './components/TopView'
import AntdProvider from './context/AntdProvider'
import { CodeStyleProvider } from './context/CodeStyleProvider'
import { NotificationProvider } from './context/NotificationProvider'
import StyleSheetManager from './context/StyleSheetManager'
import { ThemeProvider } from './context/ThemeProvider'
import Router from './Router'
import PomodoroTimerService from './services/PomodoroTimerService'

const logger = loggerService.withContext('App.tsx')

function App(): React.ReactElement {
  logger.info('App initialized')

  // Initialize global Pomodoro Timer Service
  useEffect(() => {
    const timerService = PomodoroTimerService.getInstance()
    logger.info('Pomodoro Timer Service initialized')

    // Cleanup on app unmount
    return () => {
      timerService.destroy()
      logger.info('Pomodoro Timer Service destroyed')
    }
  }, [])

  return (
    <Provider store={store}>
      <StyleSheetManager>
        <ThemeProvider>
          <AntdProvider>
            <NotificationProvider>
              <CodeStyleProvider>
                <PersistGate loading={null} persistor={persistor}>
                  <TopViewContainer>
                    <Router />
                  </TopViewContainer>
                </PersistGate>
              </CodeStyleProvider>
            </NotificationProvider>
          </AntdProvider>
        </ThemeProvider>
      </StyleSheetManager>
    </Provider>
  )
}

export default App
