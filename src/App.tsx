import { useState, useEffect } from 'react';
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

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved !== null ? saved === 'dark' : true;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // invalid json
      }
    }
    return getInitialDemoTasks();
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

  // Sync tasks to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Sync Theme to HTML document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

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
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const success = await pushRoomTasks(syncRoom, tasks);
      if (success) {
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      setIsSyncing(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [tasks, syncRoom]);

  // Periodic pull from room to receive iPad / PC updates
  useEffect(() => {
    if (!syncRoom) return;

    let isMounted = true;
    const checkRemote = async () => {
      try {
        const res = await fetchRoomTasks(syncRoom);
        if (!isMounted) return;
        if (res.exists && Array.isArray(res.tasks) && res.tasks.length > 0) {
          const remoteJson = JSON.stringify(res.tasks);
          const localJson = JSON.stringify(tasks);
          if (remoteJson !== localJson) {
            setTasks(res.tasks);
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch {
        // silent fail on network glitch
      }
    };

    checkRemote();
    const interval = setInterval(checkRemote, 3000);
    const onFocus = () => checkRemote();
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncRoom, tasks]);

  const handleConnectRoom = async (room: string) => {
    setIsSyncing(true);
    try {
      saveStoredRoom(room);
      setSyncRoom(room);
      const res = await fetchRoomTasks(room);
      if (res.exists && Array.isArray(res.tasks) && res.tasks.length > 0) {
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

  // Task actions
  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleSaveMultipleTasks = (newTasksData: Array<Omit<Task, 'id' | 'completed'>>) => {
    const newTasks: Task[] = newTasksData.map((taskData, idx) => ({
      ...taskData,
      id: 'task_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
      completed: false,
    }));
    setTasks((prev) => [...prev, ...newTasks]);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'completed'> & { id?: string }) => {
    if (taskData.id) {
      // Update existing
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskData.id ? { ...t, ...taskData, completed: t.completed } : t
        )
      );
    } else {
      // Create new
      const newTask: Task = {
        ...taskData,
        id: 'task_' + Date.now() + Math.random().toString(36).substr(2, 4),
        completed: false,
      };
      setTasks((prev) => [...prev, newTask]);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
    setTasks((prev) => [...prev, newTask]);
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

  const handleLoadDemoData = () => {
    if (confirm('Örnek bir gün planı yüklemek istiyor musunuz? Mevcut görevler güncellenecektir.')) {
      setTasks(getInitialDemoTasks());
      setSelectedDate(getTodayDateString());
    }
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
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        dayStats={dayStats}
        onLoadDemoData={handleLoadDemoData}
        currentView={viewMode}
        onChangeView={setViewMode}
        currentRoom={syncRoom}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenSiriModal={() => setIsSiriModalOpen(true)}
        isSyncing={isSyncing}
      />

      {/* Main View Area: Daily Timeline | Weekly View | Monthly View */}
      {viewMode === 'day' && (
        <Timeline
          tasks={dayTasks}
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
          <Plus size={18} /> Yeni Görev
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

// 4 Main Colors demo schedule:
// Mavi (#0A84FF), Kırmızı (#FF453A), Yeşil (#30D158), Turuncu (#FF9F0A)
function getInitialDemoTasks(): Task[] {
  const today = getTodayDateString();

  return [
    {
      id: 'demo_1',
      title: 'Sabah Kahvesi & Günlük Planlama',
      notes: 'Güne sakin başla ve günün önemli gündem maddelerini incele.',
      date: today,
      startTime: '07:30',
      durationMinutes: 45,
      color: '#FF9F0A', // Turuncu
      completed: true,
    },
    {
      id: 'demo_2',
      title: 'Sabah Koşusu & Egzersiz',
      notes: 'Parkta 5 km tempo koşusu ve esneme.',
      date: today,
      startTime: '08:30',
      durationMinutes: 60,
      color: '#30D158', // Yeşil
      completed: true,
    },
    {
      id: 'demo_3',
      title: 'Derin Odaklanma: Proje Geliştirme',
      notes: 'Yeni projenin görsel zaman akışı motorunu tamamla.',
      date: today,
      startTime: '10:00',
      durationMinutes: 120,
      color: '#0A84FF', // Mavi
      completed: false,
    },
    {
      id: 'demo_4',
      title: 'Öğle Yemeği & Kısa Mola',
      date: today,
      startTime: '12:45',
      durationMinutes: 45,
      color: '#30D158', // Yeşil
      completed: false,
    },
    {
      id: 'demo_5',
      title: 'Tasarım ve Mimari Toplantısı',
      notes: 'Görsel arayüz ve kullanıcı deneyimi incelemesi.',
      date: today,
      startTime: '14:00',
      durationMinutes: 60,
      color: '#0A84FF', // Mavi
      completed: false,
    },
    {
      id: 'demo_6',
      title: 'Kitap Okuma & Zihin Dinlendirme',
      notes: 'Atomik Alışkanlıklar - Bölüm 4.',
      date: today,
      startTime: '16:30',
      durationMinutes: 45,
      color: '#FF453A', // Kırmızı
      completed: false,
    },
    {
      id: 'demo_7',
      title: 'Akşam Yürüyüşü & Podcast',
      date: today,
      startTime: '18:30',
      durationMinutes: 45,
      color: '#FF9F0A', // Turuncu
      completed: false,
    },
    // Inbox items
    {
      id: 'demo_inbox_1',
      title: 'Diş hekimi kontrolü için randevu al',
      date: today,
      durationMinutes: 15,
      color: '#FF453A', // Kırmızı
      completed: false,
      inInbox: true,
    },
    {
      id: 'demo_inbox_2',
      title: 'Haftalık bütçe tablosunu kontrol et',
      date: today,
      durationMinutes: 30,
      color: '#0A84FF', // Mavi
      completed: false,
      inInbox: true,
    },
    {
      id: 'demo_inbox_3',
      title: 'Kütüphaneden alınan kitabı iade et',
      date: today,
      durationMinutes: 20,
      color: '#FF9F0A', // Turuncu
      completed: false,
      inInbox: true,
    },
  ];
}
