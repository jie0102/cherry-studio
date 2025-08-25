import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Input, List, Typography, Space, Button, Spin, Empty, Tag, Alert } from 'antd'
import { SearchOutlined, AppstoreOutlined } from '@ant-design/icons'
import styled from 'styled-components'

import systemAppService from '@renderer/services/SystemAppService'
import type { AppInfo } from '@renderer/services/SystemAppService'

const { Text } = Typography
const { Search } = Input

interface AppSelectorProps {
  visible: boolean
  mode: 'allowed' | 'blocked'
  onSelect: (appName: string) => void
  onCancel: () => void
  excludeApps?: string[]
}

const StyledModal = styled(Modal)`
  .ant-modal-body {
    max-height: 60vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
`

const SearchContainer = styled.div`
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
`

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
`

const AppItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1890ff;
    background: #f6ffed;
  }
`

const AppInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
`

const AppDetails = styled.div`
  margin-left: 12px;
  min-width: 0;
  flex: 1;
`

const AppName = styled(Text)`
  font-weight: 500;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const AppMeta = styled(Text)`
  font-size: 12px;
  color: #999;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const AppIcon = styled.div`
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
  flex-shrink: 0;
`

const StatusTag = styled(Tag)`
  margin-left: 8px;
  
  &.running {
    background: #f6ffed;
    border-color: #b7eb8f;
    color: #52c41a;
  }
  
  &.inactive {
    background: #fafafa;
    border-color: #d9d9d9;
    color: #999;
  }
`

const AppSelector = ({ visible, mode, onSelect, onCancel, excludeApps = [] }: AppSelectorProps) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [runningApps, setRunningApps] = useState<AppInfo[]>([])
  const [suggestions, setSuggestions] = useState<Array<{
    name: string
    originalName: string
    isRunning: boolean
    pid?: number
    score: number
  }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      loadRunningApps()
    }
  }, [visible])

  useEffect(() => {
    if (searchText.length >= 2) {
      loadSuggestions(searchText)
    } else {
      setSuggestions([])
    }
  }, [searchText])

  const loadRunningApps = async () => {
    setLoading(true)
    setError(null)
    try {
      const { runningApps: apps } = await systemAppService.getAppStatus(false)
      const filteredApps = apps.filter(app => !excludeApps.includes(app.originalName))
      setRunningApps(filteredApps)
    } catch (err) {
      setError(t('focusMonitor.appSelector.loadError'))
      console.error('Failed to load running apps:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestions = async (query: string) => {
    try {
      const suggestions = await systemAppService.getAppSuggestions(query, 20)
      const filteredSuggestions = suggestions.filter(suggestion => 
        !excludeApps.includes(suggestion.originalName)
      )
      setSuggestions(filteredSuggestions)
    } catch (err) {
      console.error('Failed to load app suggestions:', err)
    }
  }

  const handleSelectApp = (appName: string) => {
    onSelect(appName)
  }

  const getModalTitle = () => {
    const titleKey = mode === 'allowed' ? 'selectAllowedApp' : 'selectBlockedApp'
    return t(`focusMonitor.appSelector.${titleKey}`)
  }

  const getEmptyText = () => {
    if (searchText) {
      return t('focusMonitor.appSelector.noSearchResults')
    }
    return t('focusMonitor.appSelector.noApps')
  }

  const renderAppList = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert
          message={t('focusMonitor.appSelector.error')}
          description={error}
          type="error"
          showIcon
        />
      )
    }

    if (searchText && suggestions.length > 0) {
      return (
        <List
          dataSource={suggestions}
          renderItem={(suggestion) => (
            <List.Item style={{ border: 'none', padding: '4px 0' }}>
              <AppItem onClick={() => handleSelectApp(suggestion.originalName)}>
                <AppInfo>
                  <AppIcon>
                    <AppstoreOutlined />
                  </AppIcon>
                  <AppDetails>
                    <AppName>{suggestion.originalName}</AppName>
                    <AppMeta>
                      {suggestion.name !== suggestion.originalName && `${suggestion.name} • `}
                      {suggestion.pid && `PID: ${suggestion.pid} • `}
                      {`Score: ${(suggestion.score * 100).toFixed(0)}%`}
                    </AppMeta>
                  </AppDetails>
                </AppInfo>
                <StatusTag className={suggestion.isRunning ? 'running' : 'inactive'}>
                  {suggestion.isRunning ? t('focusMonitor.appSelector.running') : t('focusMonitor.appSelector.available')}
                </StatusTag>
              </AppItem>
            </List.Item>
          )}
        />
      )
    }

    if (runningApps.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={getEmptyText()}
        />
      )
    }

    return (
      <List
        dataSource={runningApps}
        renderItem={(app) => (
          <List.Item style={{ border: 'none', padding: '4px 0' }}>
            <AppItem onClick={() => handleSelectApp(app.originalName)}>
              <AppInfo>
                <AppIcon>
                  <AppstoreOutlined />
                </AppIcon>
                <AppDetails>
                  <AppName>{app.originalName}</AppName>
                  <AppMeta>
                    {app.name !== app.originalName && `${app.name} • `}
                    {app.pid && `PID: ${app.pid} • `}
                    {app.memoryUsage && `${app.memoryUsage}MB`}
                  </AppMeta>
                </AppDetails>
              </AppInfo>
              <StatusTag className={app.isActive ? 'running' : 'inactive'}>
                {app.isActive ? t('focusMonitor.appSelector.running') : t('focusMonitor.appSelector.available')}
              </StatusTag>
            </AppItem>
          </List.Item>
        )}
      />
    )
  }

  return (
    <StyledModal
      title={
        <Space>
          <AppstoreOutlined />
          {getModalTitle()}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      ]}
      width={600}
    >
      <SearchContainer>
        <Search
          placeholder={t('focusMonitor.appSelector.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
        />
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {searchText
              ? t('focusMonitor.appSelector.searchHint')
              : t('focusMonitor.appSelector.runningAppsHint')
            }
          </Text>
        </div>
      </SearchContainer>

      <ListContainer>
        {renderAppList()}
      </ListContainer>
    </StyledModal>
  )
}

export default AppSelector