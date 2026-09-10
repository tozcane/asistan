import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Task } from '../types';

const CLOUD_MOCK_PREFIX = 'structured_cloud_tasks_';

export async function saveTasksToCloud(userId: string, tasks: Task[]): Promise<boolean> {
  if (isFirebaseConfigured && db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      // Clean undefined fields for Firestore
      const cleanTasks = JSON.parse(JSON.stringify(tasks));
      await setDoc(
        userDocRef,
        {
          tasks: cleanTasks,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error('Firestore bulut kayıt hatası:', error);
      return false;
    }
  }

  // Demo Modu: Simüle bulut alanı
  try {
    localStorage.setItem(CLOUD_MOCK_PREFIX + userId, JSON.stringify(tasks));
    return true;
  } catch (e) {
    return false;
  }
}

export async function loadTasksFromCloud(userId: string): Promise<Task[] | null> {
  if (isFirebaseConfigured && db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return (data.tasks as Task[]) || [];
      }
      return null;
    } catch (error) {
      console.error('Firestore veri çekme hatası:', error);
      return null;
    }
  }

  // Demo Modu
  const saved = localStorage.getItem(CLOUD_MOCK_PREFIX + userId);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function subscribeToCloudTasks(
  userId: string,
  onTasksChanged: (tasks: Task[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.tasks)) {
            onTasksChanged(data.tasks);
          }
        }
      },
      (error) => {
        console.warn('Firestore dinleme uyarısı:', error);
      }
    );
    return unsubscribe;
  }

  // Demo modunda boş dinleyici
  return () => {};
}
