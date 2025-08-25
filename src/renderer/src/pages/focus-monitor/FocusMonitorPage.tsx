import {
  AppstoreOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import Scrollbar from '@renderer/components/Scrollbar'
import systemAppService from '@renderer/services/SystemAppService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addAllowedApp,
  addBlockedApp,
  clearLogs,
  removeAllowedApp,
  removeBlockedApp,
  selectFocusMonitor,
  setIsActive,
  setMonitoringFrequency,
  setTaskDescription
} from '@renderer/store/focusMonitor'
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Space, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import AppSelector from './AppSelector'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
`

const Main = styled(Scrollbar)`
  flex: 1;
  padding: 24px;
  background: var(--color-background);
  height: calc(100vh - var(--navbar-height));
  overflow-y: auto;
`

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`

const HeaderSection = styled.div`
  margin-bottom: 24px;
  padding: 24px;
  background: var(--color-background-soft);
  border: 0.5px solid var(--color-border);
  border-radius: var(--border-radius);
`

const LogsSection = styled.div`
  .ant-card-body {
    max-height: 400px;
    overflow-y: auto;
  }
`

const StatusIndicator = styled.div<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--border-radius);
  background: ${(props) => (props.active ? 'var(--color-success-bg)' : 'var(--color-background-soft)')};
  border: 0.5px solid ${(props) => (props.active ? 'var(--color-success-border)' : 'var(--color-border)')};
  color: ${(props) => (props.active ? 'var(--color-success)' : 'var(--color-text-2)')};
  font-weight: 500;
`

const AppTag = styled(Tag)`
  margin-bottom: 4px;
  border-radius: var(--border-radius-sm);

  &.allowed {
    background: var(--color-success-bg);
    border-color: var(--color-success-border);
    color: var(--color-success);
  }

  &.blocked {
    background: var(--color-error-bg);
    border-color: var(--color-error-border);
    color: var(--color-error);
  }
`

const LogEntry = styled.div`
  padding: 12px;
  margin-bottom: 8px;
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  border-left: 4px solid var(--color-border);

  &.distraction {
    background: var(--color-error-bg);
    border-left-color: var(--color-error);
  }

  &.focused {
    background: var(--color-success-bg);
    border-left-color: var(--color-success);
  }
`

const FocusMonitorPage = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const focusMonitor = useAppSelector(selectFocusMonitor)
  const [form] = Form.useForm()
  const [appSelectorVisible, setAppSelectorVisible] = useState<'allowed' | 'blocked' | null>(null)
  const [systemSupported, setSystemSupported] = useState<boolean>(true)

  useEffect(() => {
    // Check if system app detection is supported
    systemAppService.isSupported().then((result) => {
      setSystemSupported(result.isSupported)
    })
  }, [])

  const handleToggleMonitoring = () => {
    dispatch(setIsActive(!focusMonitor.isActive))
  }

  const handleTaskDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setTaskDescription(e.target.value))
  }

  const handleFrequencyChange = (value: number) => {
    dispatch(setMonitoringFrequency(value))
  }

  const handleAddAllowedApp = (appName: string) => {
    dispatch(addAllowedApp(appName))
  }

  const handleRemoveAllowedApp = (appName: string) => {
    dispatch(removeAllowedApp(appName))
  }

  const handleAddBlockedApp = (appName: string) => {
    dispatch(addBlockedApp(appName))
  }

  const handleRemoveBlockedApp = (appName: string) => {
    dispatch(removeBlockedApp(appName))
  }

  const handleClearLogs = () => {
    dispatch(clearLogs())
  }

  const getStatusText = () => {
    if (!focusMonitor.isActive) {
      return t('focusMonitor.status.inactive')
    }
    return focusMonitor.lastCheckTime
      ? t('focusMonitor.status.active', { time: new Date(focusMonitor.lastCheckTime).toLocaleTimeString() })
      : t('focusMonitor.status.starting')
  }

  const formatLogTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getLogTypeClass = (isFocused: boolean) => {
    return isFocused ? 'focused' : 'distraction'
  }

  if (!systemSupported) {
    return (
      <Container>
        <Navbar>
          <NavbarCenter style={{ borderRight: 'none' }}>{t('focusMonitor.title')}</NavbarCenter>
        </Navbar>
        <Main>
          <Alert
            message={t('focusMonitor.unsupported.title')}
            description={t('focusMonitor.unsupported.description')}
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        </Main>
      </Container>
    )
  }

  return (
    <Container>
      <Navbar>
        <NavbarCenter style={{ borderRight: 'none' }}>{t('focusMonitor.title')}</NavbarCenter>
      </Navbar>
      <Main>
        <Content>
          <HeaderSection>
            <Row align="middle" justify="space-between">
              <Col>
                <Title level={2} style={{ margin: 0, color: 'var(--color-text)' }}>
                  <EyeOutlined style={{ marginRight: 12, color: 'var(--color-primary)' }} />
                  {t('focusMonitor.title')}
                </Title>
                <Paragraph style={{ margin: '8px 0 0', color: 'var(--color-text-2)' }}>
                  {t('focusMonitor.description')}
                </Paragraph>
              </Col>
              <Col>
                <Button
                  type={focusMonitor.isActive ? 'default' : 'primary'}
                  size="large"
                  icon={focusMonitor.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handleToggleMonitoring}
                  style={{ minWidth: 120 }}>
                  {focusMonitor.isActive ? t('focusMonitor.actions.stop') : t('focusMonitor.actions.start')}
                </Button>
              </Col>
            </Row>
          </HeaderSection>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <SettingOutlined />
                    {t('focusMonitor.config.title')}
                  </Space>
                }
                style={{
                  marginBottom: 24,
                  background: 'var(--color-background-soft)',
                  border: '0.5px solid var(--color-border)'
                }}>
                <Form form={form} layout="vertical">
                  <Form.Item label={t('focusMonitor.config.taskDescription')}>
                    <TextArea
                      value={focusMonitor.taskDescription}
                      onChange={handleTaskDescriptionChange}
                      placeholder={t('focusMonitor.config.taskDescriptionPlaceholder')}
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label={t('focusMonitor.config.frequency')}>
                        <Input
                          type="number"
                          value={focusMonitor.monitoringFrequency}
                          onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                          min={10}
                          max={600}
                          suffix={t('focusMonitor.config.seconds')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label=" " style={{ marginBottom: 0 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {t('focusMonitor.config.frequencyHint')}
                        </Text>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Form.Item label={t('focusMonitor.config.allowedApps')}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        {focusMonitor.allowedApps.map((app) => (
                          <AppTag key={app} className="allowed" closable onClose={() => handleRemoveAllowedApp(app)}>
                            {app}
                          </AppTag>
                        ))}
                      </div>
                      <Button
                        type="dashed"
                        icon={<AppstoreOutlined />}
                        onClick={() => setAppSelectorVisible('allowed')}
                        style={{ width: '100%' }}>
                        {t('focusMonitor.config.addAllowedApp')}
                      </Button>
                    </Space>
                  </Form.Item>

                  <Form.Item label={t('focusMonitor.config.blockedApps')}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        {focusMonitor.blockedApps.map((app) => (
                          <AppTag key={app} className="blocked" closable onClose={() => handleRemoveBlockedApp(app)}>
                            {app}
                          </AppTag>
                        ))}
                      </div>
                      <Button
                        type="dashed"
                        icon={<AppstoreOutlined />}
                        onClick={() => setAppSelectorVisible('blocked')}
                        style={{ width: '100%' }}>
                        {t('focusMonitor.config.addBlockedApp')}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={t('focusMonitor.status.title')}
                style={{
                  marginBottom: 24,
                  background: 'var(--color-background-soft)',
                  border: '0.5px solid var(--color-border)'
                }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <StatusIndicator active={focusMonitor.isActive}>
                    {focusMonitor.isActive ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                    {getStatusText()}
                  </StatusIndicator>

                  {focusMonitor.statistics.totalChecks > 0 && (
                    <>
                      <Divider style={{ margin: '16px 0' }} />
                      <div>
                        <Text strong>{t('focusMonitor.statistics.title')}</Text>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">{t('focusMonitor.statistics.totalChecks')}: </Text>
                          <Text>{focusMonitor.statistics.totalChecks}</Text>
                        </div>
                        <div>
                          <Text type="secondary">{t('focusMonitor.statistics.focusedChecks')}: </Text>
                          <Text style={{ color: 'var(--color-success)' }}>{focusMonitor.statistics.focusedChecks}</Text>
                        </div>
                        <div>
                          <Text type="secondary">{t('focusMonitor.statistics.distractedChecks')}: </Text>
                          <Text style={{ color: 'var(--color-error)' }}>
                            {focusMonitor.statistics.distractedChecks}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary">{t('focusMonitor.statistics.focusRate')}: </Text>
                          <Text strong>
                            {(
                              (focusMonitor.statistics.focusedChecks / focusMonitor.statistics.totalChecks) *
                              100
                            ).toFixed(1)}
                            %
                          </Text>
                        </div>
                      </div>
                    </>
                  )}
                </Space>
              </Card>
            </Col>
          </Row>

          <LogsSection>
            <Card
              title={
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span>
                    {t('focusMonitor.logs.title')} ({focusMonitor.logs.length})
                  </span>
                  <Button size="small" onClick={handleClearLogs} disabled={focusMonitor.logs.length === 0}>
                    {t('focusMonitor.logs.clear')}
                  </Button>
                </Space>
              }
              style={{
                background: 'var(--color-background-soft)',
                border: '0.5px solid var(--color-border)'
              }}>
              {focusMonitor.logs.length === 0 ? (
                <Text type="secondary">{t('focusMonitor.logs.empty')}</Text>
              ) : (
                focusMonitor.logs
                  .slice()
                  .reverse()
                  .map((log, index) => (
                    <LogEntry key={index} className={getLogTypeClass(log.isFocused)}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4
                        }}>
                        <Text strong style={{ color: log.isFocused ? 'var(--color-success)' : 'var(--color-error)' }}>
                          {log.isFocused ? t('focusMonitor.logs.focused') : t('focusMonitor.logs.distracted')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatLogTime(log.timestamp)}
                        </Text>
                      </div>
                      {log.activeApp && (
                        <Text type="secondary">
                          {t('focusMonitor.logs.activeApp')}: {log.activeApp}
                        </Text>
                      )}
                      {log.reason && (
                        <div style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: '12px' }}>{log.reason}</Text>
                        </div>
                      )}
                    </LogEntry>
                  ))
              )}
            </Card>
          </LogsSection>
        </Content>
      </Main>

      {appSelectorVisible && (
        <AppSelector
          visible={appSelectorVisible !== null}
          mode={appSelectorVisible!}
          onSelect={(appName) => {
            if (appSelectorVisible === 'allowed') {
              handleAddAllowedApp(appName)
            } else {
              handleAddBlockedApp(appName)
            }
            setAppSelectorVisible(null)
          }}
          onCancel={() => setAppSelectorVisible(null)}
          excludeApps={appSelectorVisible === 'allowed' ? focusMonitor.allowedApps : focusMonitor.blockedApps}
        />
      )}
    </Container>
  )
}

export default FocusMonitorPage
