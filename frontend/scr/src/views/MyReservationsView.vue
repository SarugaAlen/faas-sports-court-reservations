<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { getUserReservations, cancelReservation } from "../firebase";
import { Timestamp } from "firebase/firestore";
import { useAuthUser } from "../composables/useAuthUser";

interface Reservation {
  id: string;
  courtId: string;
  courtName: string;
  startTime: { seconds: number; nanoseconds: number } | { _seconds: number; _nanoseconds: number } | Timestamp | Date;
  endTime: { seconds: number; nanoseconds: number } | { _seconds: number; _nanoseconds: number } | Timestamp | Date;
  userId: string;
  userEmail?: string;
  createdAt: { seconds: number; nanoseconds: number } | { _seconds: number; _nanoseconds: number } | Timestamp | Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

const reservations = ref<Reservation[]>([]);
const loading = ref(false);
const message = ref('');
const errorMessage = ref('');

const { user, authLoading } = useAuthUser();
const router = useRouter();

const convertToDate = (ts: any): Date | null => {
  if (!ts) return null;

  if (ts instanceof Date) {
    return ts;
  }
  if (ts instanceof Timestamp && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts && typeof ts.seconds === 'number') {
    return new Timestamp(ts.seconds, ts.nanoseconds || 0).toDate();
  }
  if (typeof ts === 'object' && ts !== null && '_seconds' in ts && typeof ts._seconds === 'number') {
    return new Timestamp(ts._seconds, ts._nanoseconds || 0).toDate();
  }
  if (typeof ts === 'string') {
    const date = new Date(ts);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

const formatTimestamp = (ts: any) => {
  const date = convertToDate(ts);
  if (date) {
    return date.toLocaleString('sl-SI');
  }
  return 'Neveljaven datum';
};

const fetchReservations = async () => {
  if (!user.value) {
    errorMessage.value = "Za ogled vaših rezervacij se morate prijaviti.";
    reservations.value = [];
    return;
  }

  loading.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const response: any = await getUserReservations();
    if (response.data && Array.isArray(response.data.reservations)) {
      reservations.value = response.data.reservations as Reservation[];
      if (reservations.value.length === 0) {
        message.value = "Trenutno nimate nobenih rezervacij.";
      } else {
        message.value = "";
      }
    } else {
      reservations.value = [];
      errorMessage.value = response.data?.message || "Napaka pri pridobivanju vaših rezervacij.";
    }
  } catch (err: any) {
    console.error("Napaka pri pridobivanju rezervacij:", err);
    errorMessage.value = err.details?.message || err.message || "Nepričakovana napaka pri pridobivanju rezervacij.";
  } finally {
    loading.value = false;
  }
};

const handleCancelReservation = async (reservationId: string) => {
  if (!confirm("Ali ste prepričani, da želite preklicati to rezervacijo?")) {
    return;
  }

  loading.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const response: any = await cancelReservation({ reservationId });
    if (response.data && response.data.status === 'success') {
      message.value = response.data.message;
      errorMessage.value = '';
      await fetchReservations();
    } else {
      errorMessage.value = response.data?.message || "Napaka pri preklicu rezervacije.";
      message.value = '';
    }
  } catch (err: any) {
    console.error("Napaka pri preklicu rezervacije:", err);
    errorMessage.value = err.details?.message || err.message || "Nepričakovana napaka pri preklicu rezervacij.";
  } finally {
    loading.value = false;
  }
};

watchEffect(() => {
  if (!user.value && !authLoading.value) {
    errorMessage.value = "Za ogled vaših rezervacij se morate prijaviti.";
    reservations.value = [];
    message.value = "";
  } else if (user.value && !authLoading.value) {
    fetchReservations();
    errorMessage.value = '';
  }
});

const getStatusClass = (status: string) => {
  switch (status) {
    case 'pending': return 'status-pending';
    case 'confirmed': return 'status-confirmed';
    case 'cancelled': return 'status-cancelled';
    case 'completed': return 'status-completed';
    default: return '';
  }
};

const isCancellable = (reservation: Reservation) => {
  const now = new Date();
  const startTimeDate = convertToDate(reservation.startTime);

  if (!startTimeDate || reservation.status === 'cancelled' || reservation.status === 'completed') {
    return false;
  }

  const timeDifference = startTimeDate.getTime() - now.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (reservation.status === 'confirmed' && timeDifference < twentyFourHours) {
    return false;
  }

  if (reservation.status === 'pending' && timeDifference <= 0) {
    return false;
  }
  
  return true;
};
</script>

<template>
  <div class="page-container">
    <h1>Moje rezervacije</h1>

    <div v-if="authLoading">
      <p>Nalaganje avtentikacije...</p>
    </div>

    <div v-else-if="!user" class="not-logged-in-message">
      <p>Prosimo, <RouterLink to="/login">prijavite se</Routerlink> za ogled vaših rezervacij.</p>
    </div>

    <div v-else>
      <p v-if="loading">Nalaganje rezervacij...</p>
      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div v-if="!loading && reservations.length === 0 && !errorMessage" class="no-reservations">
        <p>Trenutno nimate nobenih rezervacij.</p>
        <RouterLink to="/">Rezerviraj igrišče</RouterLink>
      </div>

      <div v-else class="reservations-list">
        <div v-for="reservation in reservations" :key="reservation.id" class="reservation-card">
          <div class="card-header">
            <h3>{{ reservation.courtName || reservation.courtId }}</h3>
            <span :class="['status-badge', getStatusClass(reservation.status)]">
              {{ reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1) }}
            </span>
          </div>
          <p><strong>Začetek:</strong> {{ formatTimestamp(reservation.startTime) }}</p>
          <p><strong>Konec:</strong> {{ formatTimestamp(reservation.endTime) }}</p>
          <p><strong>Rezervirano:</strong> {{ formatTimestamp(reservation.createdAt) }}</p>
          <button
            v-if="isCancellable(reservation)"
            @click="handleCancelReservation(reservation.id)"
            :disabled="loading"
            class="cancel-button"
          >
            Prekliči rezervacijo
          </button>
          <button v-else-if="reservation.status === 'cancelled'" class="disabled-button" disabled>Preklicano</button>
          <button v-else-if="reservation.status === 'completed'" class="disabled-button" disabled>Zaključeno</button>
          <button v-else class="disabled-button" disabled>Ni mogoče preklicati (prepozno)</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
}

.not-logged-in-message {
  background-color: #ffe0b2;
  border: 1px solid #ffcc80;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  color: #e65100;
  margin-top: 2rem;
}

.not-logged-in-message a {
  color: #e65100;
  font-weight: bold;
  text-decoration: underline;
}

.reservations-list {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.reservation-card {
  background-color: #ffffff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.card-header h3 {
  color: #1a73e8;
  margin: 0;
  font-size: 1.4rem;
  flex-grow: 1;
}

.status-badge {
  padding: 0.3rem 0.7rem;
  border-radius: 5px;
  font-size: 0.85rem;
  font-weight: bold;
  color: white;
  text-transform: capitalize;
  flex-shrink: 0;
}

.status-pending { background-color: #ffc107; color: #333; }
.status-confirmed { background-color: #28a745; }
.status-cancelled { background-color: #dc3545; }
.status-completed { background-color: #6c757d; }

.reservation-card p {
  margin-bottom: 0.5rem;
  color: #555;
  font-size: 0.95rem;
}

.cancel-button {
  margin-top: 1rem;
  padding: 0.8rem 1.2rem;
  background-color: #e53935;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.cancel-button:hover:not(:disabled) {
  background-color: #c62828;
}

.cancel-button:disabled, .disabled-button {
  background-color: #cccccc;
  cursor: not-allowed;
  margin-top: 1rem;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 5px;
  color: #666;
}

.no-reservations {
  text-align: center;
  padding: 2rem;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-top: 2rem;
}

.no-reservations p {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #555;
}

.no-reservations a {
  background-color: #1a73e8;
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.no-reservations a:hover {
  background-color: #145cb3;
}
</style>