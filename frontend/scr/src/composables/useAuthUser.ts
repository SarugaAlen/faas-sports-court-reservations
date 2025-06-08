// src/composables/useAuthUser.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions'; 

interface IsAdminResult {
  status: string;
  isAdmin: boolean;
  message?: string;
}

export function useAuthUser() {
  const user = ref<User | null>(null);
  const isAdmin = ref(false); 
  const authLoading = ref(true);

  let unsubscribe: () => void;

  const checkAdminStatus = async (currentUser: User) => {
    if (!currentUser) {
      isAdmin.value = false;
      return;
    }
    try {
      const functions = getFunctions();
      const isAdminCallable = httpsCallable<void, IsAdminResult>(functions, 'isAdmin');
      const result = await isAdminCallable();
      if (result.data && result.data.status === 'success') {
        isAdmin.value = result.data.isAdmin;
      } else {
        isAdmin.value = false;
        console.warn("Could not determine admin status:", result.data?.message);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      isAdmin.value = false;
    }
  };

  onMounted(() => {
    unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Firebase Auth State Changed:", firebaseUser);
      user.value = firebaseUser;
      if (firebaseUser) {
        await checkAdminStatus(firebaseUser);
      } else {
        isAdmin.value = false; 
      }
      authLoading.value = false;
    });
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return {
    user,
    isAdmin,
    authLoading, 
  };
}