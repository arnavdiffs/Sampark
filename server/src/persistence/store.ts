import fs from 'fs';
import path from 'path';
import { Agent, Task, ContextEntry, AuditEvent } from '../domain/types';

export interface StoreData {
  agents: Agent[];
  tasks: Task[];
  contextEntries: ContextEntry[];
}

export class SamparkStore {
  private dataDir: string;
  private storeFile: string;
  private eventsFile: string;
  private memoryCache: StoreData = {
    agents: [],
    tasks: [],
    contextEntries: [],
  };

  constructor(dataDirectory?: string) {
    if (dataDirectory) {
      this.dataDir = dataDirectory;
    } else {
      // Find workspace root containing package.json or data folder
      let dir = process.cwd();
      if (fs.existsSync(path.join(dir, '..', 'data'))) {
        dir = path.resolve(dir, '..');
      }
      this.dataDir = path.join(dir, 'data');
    }
    this.storeFile = path.join(this.dataDir, 'store.json');
    this.eventsFile = path.join(this.dataDir, 'events.jsonl');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.storeFile)) {
      try {
        const raw = fs.readFileSync(this.storeFile, 'utf-8');
        this.memoryCache = JSON.parse(raw);
      } catch (err) {
        console.error('[SamparkStore] Failed to read store.json, re-initializing cache:', err);
        this.memoryCache = { agents: [], tasks: [], contextEntries: [] };
      }
    } else {
      this.persistStore();
    }

    if (!fs.existsSync(this.eventsFile)) {
      fs.writeFileSync(this.eventsFile, '', 'utf-8');
    }
  }

  private persistStore(): void {
    const tempFile = `${this.storeFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
    fs.renameSync(tempFile, this.storeFile);
  }

  // --- Agents ---

  public getAgents(): Agent[] {
    return [...this.memoryCache.agents];
  }

  public getAgentById(id: string): Agent | undefined {
    return this.memoryCache.agents.find((a) => a.id === id);
  }

  public saveAgent(agent: Agent): Agent {
    const idx = this.memoryCache.agents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      this.memoryCache.agents[idx] = agent;
    } else {
      this.memoryCache.agents.push(agent);
    }
    this.persistStore();
    return agent;
  }

  public updateAgent(id: string, updates: Partial<Agent>): Agent | undefined {
    const agent = this.getAgentById(id);
    if (!agent) return undefined;
    const updated = { ...agent, ...updates };
    return this.saveAgent(updated);
  }

  // --- Tasks ---

  public getTasks(filter?: {
    status?: string;
    ownerAgentId?: string;
    priority?: string;
    requiredScope?: string;
  }): Task[] {
    let result = [...this.memoryCache.tasks];
    if (filter) {
      if (filter.status) {
        result = result.filter((t) => t.status === filter.status);
      }
      if (filter.ownerAgentId) {
        result = result.filter((t) => t.ownerAgentId === filter.ownerAgentId);
      }
      if (filter.priority) {
        result = result.filter((t) => t.priority === filter.priority);
      }
      if (filter.requiredScope) {
        result = result.filter((t) => t.requiredScope === filter.requiredScope);
      }
    }
    return result;
  }

  public getTaskById(id: string): Task | undefined {
    return this.memoryCache.tasks.find((t) => t.id === id);
  }

  public saveTask(task: Task): Task {
    const idx = this.memoryCache.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.memoryCache.tasks[idx] = task;
    } else {
      this.memoryCache.tasks.push(task);
    }
    this.persistStore();
    return task;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.getTaskById(id);
    if (!task) return undefined;
    const updated = { ...task, ...updates };
    return this.saveTask(updated);
  }

  // --- Context Entries ---

  public getContextEntries(taskId?: string, sinceVersion?: number): ContextEntry[] {
    let entries = [...this.memoryCache.contextEntries];
    if (taskId) {
      entries = entries.filter((c) => c.taskId === taskId);
    }
    if (sinceVersion !== undefined) {
      entries = entries.filter((c) => c.version > sinceVersion);
    }
    return entries.sort((a, b) => a.version - b.version);
  }

  public saveContextEntry(entry: ContextEntry): ContextEntry {
    const idx = this.memoryCache.contextEntries.findIndex((c) => c.id === entry.id);
    if (idx >= 0) {
      this.memoryCache.contextEntries[idx] = entry;
    } else {
      this.memoryCache.contextEntries.push(entry);
    }
    this.persistStore();
    return entry;
  }

  // --- Events (Audit Log) ---

  public appendEvent(event: AuditEvent): AuditEvent {
    const line = JSON.stringify(event) + '\n';
    fs.appendFileSync(this.eventsFile, line, 'utf-8');
    return event;
  }

  public getEvents(filter?: {
    eventType?: string;
    taskId?: string;
    agentId?: string;
    accepted?: boolean;
    limit?: number;
  }): AuditEvent[] {
    if (!fs.existsSync(this.eventsFile)) return [];
    try {
      const raw = fs.readFileSync(this.eventsFile, 'utf-8');
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      let events: AuditEvent[] = lines.map((l) => JSON.parse(l));

      if (filter) {
        if (filter.eventType) {
          events = events.filter((e) => e.eventType === filter.eventType);
        }
        if (filter.taskId) {
          events = events.filter((e) => e.taskId === filter.taskId);
        }
        if (filter.agentId) {
          events = events.filter(
            (e) => e.actorAgentId === filter.agentId || e.targetAgentId === filter.agentId
          );
        }
        if (filter.accepted !== undefined) {
          events = events.filter((e) => e.accepted === filter.accepted);
        }
      }

      // Reverse chronological order
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (filter?.limit && filter.limit > 0) {
        events = events.slice(0, filter.limit);
      }

      return events;
    } catch (err) {
      console.error('[SamparkStore] Failed to read events.jsonl:', err);
      return [];
    }
  }

  public getEventById(id: string): AuditEvent | undefined {
    const events = this.getEvents();
    return events.find((e) => e.id === id);
  }

  // --- Seed / Reset ---

  public resetWithData(data: StoreData, initialEvents: AuditEvent[]): void {
    this.memoryCache = {
      agents: [...data.agents],
      tasks: [...data.tasks],
      contextEntries: [...data.contextEntries],
    };
    this.persistStore();

    // Overwrite events log with initial seed events
    const content = initialEvents.map((e) => JSON.stringify(e)).join('\n') + (initialEvents.length ? '\n' : '');
    fs.writeFileSync(this.eventsFile, content, 'utf-8');
  }

  public isEmpty(): boolean {
    return (
      this.memoryCache.agents.length === 0 &&
      this.memoryCache.tasks.length === 0 &&
      this.memoryCache.contextEntries.length === 0
    );
  }
}

export const store = new SamparkStore();
