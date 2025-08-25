import { Button, Checkbox, Input, List, Typography } from 'antd'
import { Play, Plus, X } from 'lucide-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { usePomodoroTasks } from '../hooks/usePomodoroTasks'

const { Text } = Typography

const TasksList: FC = () => {
  const { t } = useTranslation()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const { tasks, addTask, toggleTask, deleteTask, setCurrentTask, currentTask } = usePomodoroTasks()

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle.trim())
      setNewTaskTitle('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    }
  }

  return (
    <Container>
      <Header>
        <Title>{t('pomodoro.tasks.title')}</Title>
        <TaskCount>
          {tasks.filter((t) => !t.completed).length} {t('pomodoro.tasks.remaining')}
        </TaskCount>
      </Header>

      <AddTaskSection>
        <TaskInput
          placeholder={t('pomodoro.tasks.addPlaceholder')}
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          suffix={
            <AddButton
              type="text"
              size="small"
              icon={<Plus size={16} />}
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
            />
          }
        />
      </AddTaskSection>

      <TaskList>
        <List
          dataSource={tasks}
          renderItem={(task) => (
            <TaskItem>
              <TaskContent>
                <Checkbox checked={task.completed} onChange={() => toggleTask(task.id)} />
                <TaskText $completed={task.completed}>{task.title}</TaskText>
                {task.pomodoroCount > 0 && <PomodoroCount>🍅 {task.pomodoroCount}</PomodoroCount>}
              </TaskContent>

              <TaskActions className="task-actions">
                {!task.completed && (
                  <ActionButton
                    type="text"
                    size="small"
                    icon={<Play size={14} />}
                    onClick={() => setCurrentTask(task.id)}
                    disabled={currentTask?.id === task.id}
                  />
                )}
                <ActionButton
                  type="text"
                  size="small"
                  icon={<X size={14} />}
                  onClick={() => deleteTask(task.id)}
                  danger
                />
              </TaskActions>
            </TaskItem>
          )}
        />
      </TaskList>

      {currentTask && (
        <CurrentTask>
          <Text type="secondary">{t('pomodoro.tasks.current')}:</Text>
          <CurrentTaskTitle>{currentTask.title}</CurrentTaskTitle>
        </CurrentTask>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 300px;
  background-color: var(--color-background-soft);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border);
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
`

const TaskCount = styled.span`
  font-size: 12px;
  color: var(--color-text-3);
  background-color: var(--color-background);
  padding: 4px 8px;
  border-radius: 10px;
`

const AddTaskSection = styled.div`
  margin-bottom: 16px;
`

const TaskInput = styled(Input)`
  border-radius: 8px;

  .ant-input {
    border: none;
    background-color: var(--color-background);

    &:focus {
      box-shadow: 0 0 0 2px var(--color-primary-soft);
    }
  }
`

const AddButton = styled(Button)`
  color: var(--color-primary);

  &:hover {
    color: var(--color-primary);
    background-color: var(--color-primary-soft);
  }

  &:disabled {
    color: var(--color-text-4);
  }
`

const TaskList = styled.div`
  flex: 1;
  overflow-y: auto;

  .ant-list {
    .ant-list-item {
      border: none;
      padding: 0;
    }
  }
`

const TaskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-soft);

  &:hover {
    .task-actions {
      opacity: 1;
    }
  }
`

const TaskContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

const TaskText = styled.span<{ $completed: boolean }>`
  flex: 1;
  font-size: 14px;
  color: ${(props) => (props.$completed ? 'var(--color-text-3)' : 'var(--color-text-1)')};
  text-decoration: ${(props) => (props.$completed ? 'line-through' : 'none')};
  word-break: break-word;
`

const PomodoroCount = styled.span`
  font-size: 12px;
  color: var(--color-text-3);
  background-color: var(--color-background);
  padding: 2px 6px;
  border-radius: 10px;
`

const TaskActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
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

const CurrentTask = styled.div`
  margin-top: 16px;
  padding: 12px;
  background-color: var(--color-primary-soft);
  border-radius: 8px;
  border-left: 4px solid var(--color-primary);
`

const CurrentTaskTitle = styled.div`
  font-weight: 500;
  color: var(--color-text-1);
  margin-top: 4px;
`

export default TasksList
