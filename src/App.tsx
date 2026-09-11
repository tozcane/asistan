import { useState, useEffect, useRef } from 'react';
import { Plus, Inbox, Mic } from 'lucide-react';
import type { Task, DayStats } from './types';
import { getTodayDateString } from './utils/time';
import { STRUCTURED_COLORS } from './constants/theme';
import { Header, type ViewMode } from './components/Header';
import { Timeline } from './components/Timeline';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { TaskModal } from './components/TaskModal';
import { InboxDrawer } from './components/InboxDrawer';
import { MorningNotification } from './components/MorningNotification';
import { SyncModal } from './components/SyncModal';
import { SiriVoiceModal } from './components/SiriVoiceModal';
import { sendMorningSummaryNotification } from './utils/notifications';
import {
  getStoredRoom,
  saveStoredRoom,
  clearStoredRoom,
  fetchRoomTasks,
  pushRoomTasks,
} from './services/roomSyncService';

const STORAGE_KEY = 'structured_app_tasks';
const THEME_KEY = 'structured_app_theme';

function getInitialTheme(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // iPad ve cihazın sistem tonuna göre otomatik başla
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }
  return true;
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialTheme);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // invalid json
      }
    }
    return [];
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalStartTime, setModalStartTime] = useState('09:00');
  const [modalDuration, setModalDuration] = useState(60);

  // Inbox drawer state
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  // Morning briefing modal state
  const [isMorningModalOpen, setIsMorningModalOpen] = useState(false);

  // View Mode: 'day' | 'week' | 'month'
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  // Device Room Sync state
  const [syncRoom, setSyncRoom] = useState<string | null>(() => getStoredRoom());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSiriModalOpen, setIsSiriModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const lastLocalEditTimeRef = useRef<number>(0);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const hasOfflineChangesRef = useRef<boolean>(false);
  const isInitialMountRef = useRef<boolean>(true);

  // Sync tasks to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // iPad ve cihazın sistem teması değişimini anlık dinle
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_KEY);
      if (!saved || saved === 'system') {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Sync Theme to HTML document & Safari Status Bar
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#000000' : '#f2f2f7');
    }
  }, [isDarkMode]);

  // Cihazın internete bağlanmasını anlık dinle ve çevrimdışı eklenen tüm görevleri otomatik yükle!
  useEffect(() => {
    const handleOnline = async () => {
      const room = getStoredRoom();
      const saved = localStorage.getItem(STORAGE_KEY);
      const hasOfflineChanges =
        localStorage.getItem('structured_has_offline_changes') === 'true' ||
        hasOfflineChangesRef.current;

      if (room && saved && hasOfflineChanges) {
        setIsSyncing(true);
        try {
          const offlineTasks: Task[] = JSON.parse(saved);
          const success = await pushRoomTasks(room, offlineTasks);
          if (success) {
            localStorage.removeItem('structured_has_offline_changes');
            hasOfflineChangesRef.current = false;
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        } catch (err) {
          console.error('Çevrimdışı yükleme hatası:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Filter tasks for the selected date (excluding unscheduled inbox tasks)
  const dayTasks = tasks.filter(
    (t) => t.date === selectedDate && !t.inInbox
  );

  // Inbox tasks (unscheduled or marked as inInbox)
  const inboxTasks = tasks.filter((t) => t.inInbox);

  // Compute Day Stats
  const dayStats: DayStats = {
    totalTasks: dayTasks.length,
    completedTasks: dayTasks.filter((t) => t.completed).length,
    totalPlannedMinutes: dayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0),
    completedMinutes: dayTasks
      .filter((t) => t.completed)
      .reduce((acc, t) => acc + (t.durationMinutes || 0), 0),
  };

  // Check for morning briefing notification
  useEffect(() => {
    const today = getTodayDateString();
    const lastNotifiedDate = localStorage.getItem('structured_last_morning_date');
    const currentHour = new Date().getHours();

    // Trigger on morning opening (before 12:00) if not yet triggered today
    if (selectedDate === today && lastNotifiedDate !== today && currentHour < 12) {
      setIsMorningModalOpen(true);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        sendMorningSummaryNotification(dayTasks);
      }
      localStorage.setItem('structured_last_morning_date', today);
    }
  }, [selectedDate, dayTasks]);

  // Push changes to room whenever tasks change
  useEffect(() => {
    if (!syncRoom) return;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const success = await pushRoomTasks(syncRoom, tasks);
      if (success) {
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      setIsSyncing(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [tasks, syncRoom]);

  // Periodic pull from room to receive iPad / PC updates
  useEffect(() => {
    if (!syncRoom) return;

    let isMounted = true;
    const checkRemote = async () => {
      // If user modified tasks locally in the last 1500ms, don't overwrite!
      if (Date.now() - lastLocalEditTimeRef.current < 1500) return;

      try {
        const res = await fetchRoomTasks(syncRoom);
        if (!isMounted) return;
        if (Date.now() - lastLocalEditTimeRef.current < 1500) return;

        if (res.exists && Array.isArray(res.tasks)) {
          const remoteJson = JSON.stringify(res.tasks);
          const localJson = localStorage.getItem(STORAGE_KEY) || '[]';
          if (remoteJson !== localJson) {
            isRemoteUpdateRef.current = true;
            setTasks(res.tasks);
            localStorage.setItem(STORAGE_KEY, remoteJson);
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch {
        // silent fail on network glitch
      }
    };

    checkRemote();
    const interval = setInterval(checkRemote, 1500);
    const onFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      checkRemote();
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [syncRoom]);

  const handleConnectRoom = async (room: string) => {
    setIsSyncing(true);
    try {
      saveStoredRoom(room);
      setSyncRoom(room);
      const res = await fetchRoomTasks(room);
      if (res.exists && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      } else {
        await pushRoomTasks(room, tasks);
      }
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectRoom = () => {
    clearStoredRoom();
    setSyncRoom(null);
    setLastSyncTime(null);
  };

  const handleManualSync = async () => {
    if (!syncRoom) return;
    setIsSyncing(true);
    try {
      const res = await fetchRoomTasks(syncRoom);
      if (res.exists && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      } else {
        await pushRoomTasks(syncRoom, tasks);
      }
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  };

  // Task actions with immediate local and remote sync
  const handleToggleComplete = (taskId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (syncRoom) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          hasOfflineChangesRef.current = true;
          localStorage.setItem("structured_has_offline_changes", "true");
        } else {
          pushRoomTasks(syncRoom, updated);
        }
      }
      return updated;
    });
  };

  const handleSaveMultipleTasks = (newTasksData: Array<Omit<Task, 'id' | 'completed'>>) => {
    lastLocalEditTimeRef.current = Date.now();
    setTasks((prev) => {
      const newTasks: Task[] = newTasksData.map((taskData, idx) => ({
        ...taskData,
        id: 'task_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
        completed: false,
      }));
      const updated = [...prev, ...newTasks];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (syncRoom) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          hasOfflineChangesRef.current = true;
          localStorage.setItem("structured_has_offline_changes", "true");
        } else {
          pushRoomTasks(syncRoom, updated);
        }
      }
      return updated;
    });
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'completed'> & { id?: string }) => {
    lastLocalEditTimeRef.current = Date.now();
    setTasks((prev) => {
      let updated: Task[];
      if (taskData.id) {
        updated = prev.map((t) =>
          t.id === taskData.id ? { ...t, ...taskData, completed: t.completed } : t
        );
      } else {
        const newTask: Task = {
          ...taskData,
          id: 'task_' + Date.now() + Math.random().toString(36).substr(2, 4),
          completed: false,
        };
        updated = [...prev, newTask];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (syncRoom) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          hasOfflineChangesRef.current = true;
          localStorage.setItem("structured_has_offline_changes", "true");
        } else {
          pushRoomTasks(syncRoom, updated);
        }
      }
      return updated;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (syncRoom) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          hasOfflineChangesRef.current = true;
          localStorage.setItem("structured_has_offline_changes", "true");
        } else {
          pushRoomTasks(syncRoom, updated);
        }
      }
      return updated;
    });
  };

  // Open modal with specific time slot (e.g. from clicking a Free Time card)
  const handleAddNewAtTime = (startTime: string, durationMinutes: number) => {
    setEditingTask(null);
    setModalStartTime(startTime);
    setModalDuration(durationMinutes);
    setIsModalOpen(true);
  };

  const handleOpenGeneralNewModal = () => {
    setEditingTask(null);
    setModalStartTime('10:00');
    setModalDuration(60);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Quick add into Inbox
  const handleQuickAddInbox = (title: string) => {
    const newTask: Task = {
      id: 'task_' + Date.now() + Math.random().toString(36).substr(2, 4),
      title,
      date: selectedDate,
      durationMinutes: 30,
      color: STRUCTURED_COLORS[Math.floor(Math.random() * STRUCTURED_COLORS.length)].hex,
      completed: false,
      inInbox: true,
    };
    lastLocalEditTimeRef.current = Date.now();
    setTasks((prev) => {
      const updated = [...prev, newTask];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (syncRoom) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          hasOfflineChangesRef.current = true;
          localStorage.setItem("structured_has_offline_changes", "true");
        } else {
          pushRoomTasks(syncRoom, updated);
        }
      }
      return updated;
    });
  };

  // Schedule task from inbox to the timeline
  const handleScheduleFromInbox = (task: Task) => {
    setIsInboxOpen(false);
    setEditingTask({
      ...task,
      inInbox: false,
      date: selectedDate,
      startTime: '11:00',
      durationMinutes: 45,
    });
    setIsModalOpen(true);
  };


  const handleAddNewAtDate = (date: string) => {
    setSelectedDate(date);
    setEditingTask(null);
    setModalStartTime('10:00');
    setModalDuration(60);
    setIsModalOpen(true);
  };

  const handleSwitchToDayView = (date: string) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const isSelectedToday = selectedDate === getTodayDateString();

  return (
    <div className="app-viewport">
      {/* Top Header with Date Strip & View Switcher */}
      <Header
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        isDarkMode={isDarkMode}
        onToggleTheme={() => {
          setIsDarkMode((prev) => {
            const next = !prev;
            localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
            return next;
          });
        }}
        dayStats={dayStats}
        currentView={viewMode}
        onChangeView={setViewMode}
      />

      {/* Main View Area: Daily Timeline | Weekly View | Monthly View */}
      {viewMode === 'day' && (
        <Timeline
          tasks={dayTasks}
          selectedDate={selectedDate}
          isToday={isSelectedToday}
          onToggleComplete={handleToggleComplete}
          onEditTask={handleEditTask}
          onAddNewAtTime={handleAddNewAtTime}
          onOpenNewTaskModal={handleOpenGeneralNewModal}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          tasks={tasks}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onToggleComplete={handleToggleComplete}
          onEditTask={handleEditTask}
          onAddNewAtDate={handleAddNewAtDate}
          onSwitchToDayView={handleSwitchToDayView}
        />
      )}

      {viewMode === 'month' && (
        <MonthView
          tasks={tasks}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSwitchToDayView={handleSwitchToDayView}
        />
      )}

      {/* Floating Action Bar */}
      <div className="floating-bar">
        <button className="add-task-btn" onClick={handleOpenGeneralNewModal}>
          <Plus size={16} />
          <span className="desktop-only">Yeni Görev</span>
          <span className="mobile-only">Yeni</span>
        </button>

        <button
          className="siri-pill-btn"
          onClick={() => setIsSiriModalOpen(true)}
          title="Siri & Sesli Asistan ile Görev Ekle"
        >
          <Mic size={16} />
          <span>Siri</span>
        </button>

        <button className="inbox-pill-btn" onClick={() => setIsInboxOpen(true)}>
          <Inbox size={17} />
          <span>Havuz</span>
          {inboxTasks.length > 0 && (
            <span className="inbox-count-badge">{inboxTasks.length}</span>
          )}
        </button>
      </div>

      {/* Add / Edit Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        defaultDate={selectedDate}
        defaultStartTime={modalStartTime}
        defaultDuration={modalDuration}
      />

      {/* Inbox Drawer */}
      <InboxDrawer
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        inboxTasks={inboxTasks}
        onQuickAdd={handleQuickAddInbox}
        onScheduleTask={handleScheduleFromInbox}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
      />

      {/* Morning Briefing Modal / On-Screen Notification */}
      <MorningNotification
        isOpen={isMorningModalOpen}
        onClose={() => setIsMorningModalOpen(false)}
        tasks={dayTasks}
        dateStr={selectedDate}
      />

      {/* Device Sync Modal (iPad ↔ PC) */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentRoom={syncRoom}
        onConnectRoom={handleConnectRoom}
        onDisconnectRoom={handleDisconnectRoom}
        onManualSync={handleManualSync}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
      />

      {/* Siri Voice & Shortcuts Modal */}
      <SiriVoiceModal
        isOpen={isSiriModalOpen}
        onClose={() => setIsSiriModalOpen(false)}
        onAddTasks={handleSaveMultipleTasks}
        selectedDate={selectedDate}
        currentRoom={syncRoom}
      />
    </div>
  );
}


