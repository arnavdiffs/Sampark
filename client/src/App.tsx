import React, { useState, useEffect, useCallback } from 'react';
import { Agent, Task, AuditEvent, ContextEntry } from './types';
import { api } from './api/client';
import { ToastProvider, useToast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { AgentsPage } from './pages/AgentsPage';
import { TasksPage } from './pages/TasksPage';
import { SharedContextPage } from './pages/SharedContextPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { SettingsPage } from './pages/SettingsPage';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { AgentDetailDrawer } from './components/AgentDetailDrawer';
import { HandoffModal } from './components/HandoffModal';
import { EventDetailModal } from './components/EventDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateAgentModal } from './components/CreateAgentModal';

function MainApp() {
  const { showToast } = useToast();
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Core Data State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal & Drawer State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [handoffTask, setHandoffTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [contextSelectedTaskId, setContextSelectedTaskId] = useState<string | null>(null);

  // Fetch all mesh data
  const refreshAll = useCallback(async () => {
    try {
      const [fetchedAgents, fetchedTasks, fetchedEvents] = await Promise.all([
        api.getAgents(),
        api.getTasks(),
        api.getEvents(),
      ]);
      setAgents(fetchedAgents);
      setTasks(fetchedTasks);
      setEvents(fetchedEvents);

      // Keep drawers updated if open
      if (selectedTask) {
        const updated = fetchedTasks.find((t) => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
      if (selectedAgent) {
        const updated = fetchedAgents.find((a) => a.id === selectedAgent.id);
        if (updated) setSelectedAgent(updated);
      }
    } catch (err: any) {
      console.error('Failed to load mesh data:', err);
      showToast('error', 'Sync Failed', 'Could not connect to backend on port 8787');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTask, selectedAgent, showToast]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Simulation handler
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await api.simulateStep();
      const sim = res.simulationResult;
      showToast('info', `Simulation Step ${res.step}`, (sim as any)?.action || 'Cross-agent action processed');
      await refreshAll();
    } catch (err: any) {
      showToast('error', 'Simulation Failed', err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // Task creation handler
  const handleCreateTask = async (data: any) => {
    try {
      const created = await api.createTask(data);
      showToast('success', 'Task Created', created.title);
      await refreshAll();
    } catch (err: any) {
      showToast('error', 'Task Creation Failed', err.message);
      throw err;
    }
  };

  // Agent registration handler
  const handleCreateAgent = async (data: any) => {
    try {
      const created = await api.createAgent(data);
      showToast('success', 'Agent Registered', `${created.displayName} (${created.role}) joined mesh`);
      await refreshAll();
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message);
      throw err;
    }
  };

  // Handoff submission handler
  const handleHandoffSubmit = async (recipientId: string, note: string) => {
    if (!handoffTask) return;
    try {
      const res = await api.handoffTask(
        handoffTask.id,
        handoffTask.ownerAgentId || agents[0]?.id || 'agt_system',
        recipientId,
        note
      );
      showToast('success', 'Handoff Completed', res.validation.reason);
      await refreshAll();
    } catch (err: any) {
      showToast('error', 'Handoff Blocked', err.message);
      throw err;
    }
  };

  const handleNavigateToContext = (taskId: string) => {
    setContextSelectedTaskId(taskId);
    setSelectedTask(null);
    setCurrentTab('context');
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080C14', color: '#10B981' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sampark Control Plane</div>
          <div style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Initializing local mesh from ./data store...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        agentsCount={agents.length}
        tasksCount={tasks.length}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          onRunSimulation={handleRunSimulation}
          onCreateTask={() => setIsCreateTaskOpen(true)}
          isSimulating={isSimulating}
        />

        {/* Tab Pages */}
        {currentTab === 'overview' && (
          <OverviewPage
            agents={agents}
            tasks={tasks}
            events={events}
            contextEntries={contextEntries}
            onSelectAgent={setSelectedAgent}
            onSelectTask={setSelectedTask}
            onSelectEvent={setSelectedEvent}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'agents' && (
          <AgentsPage
            agents={agents}
            tasks={tasks}
            onSelectAgent={setSelectedAgent}
            onOpenCreateModal={() => setIsCreateAgentOpen(true)}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksPage
            tasks={tasks}
            agents={agents}
            onSelectTask={setSelectedTask}
            onOpenCreateModal={() => setIsCreateTaskOpen(true)}
          />
        )}

        {currentTab === 'context' && (
          <SharedContextPage
            tasks={tasks}
            agents={agents}
            initialTaskId={contextSelectedTaskId}
            onTaskUpdated={refreshAll}
          />
        )}

        {currentTab === 'audit' && (
          <AuditTrailPage
            events={events}
            agents={agents}
            tasks={tasks}
            onSelectEvent={setSelectedEvent}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            onRefreshAll={refreshAll}
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
          />
        )}
      </div>

      {/* Drawers and Modals */}
      <TaskDetailDrawer
        task={selectedTask}
        agents={agents}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={refreshAll}
        onOpenHandoff={(t) => setHandoffTask(t)}
        onNavigateToContext={handleNavigateToContext}
      />

      <AgentDetailDrawer
        agent={selectedAgent}
        tasks={tasks}
        onClose={() => setSelectedAgent(null)}
        onAgentUpdated={refreshAll}
        onSelectTask={(t) => {
          setSelectedAgent(null);
          setSelectedTask(t);
        }}
      />

      {handoffTask && (
        <HandoffModal
          isOpen={Boolean(handoffTask)}
          onClose={() => setHandoffTask(null)}
          task={handoffTask}
          agents={agents}
          onSubmit={handleHandoffSubmit}
        />
      )}

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTask}
      />

      <CreateAgentModal
        isOpen={isCreateAgentOpen}
        onClose={() => setIsCreateAgentOpen(false)}
        onSubmit={handleCreateAgent}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
