<template>
  <div class="page-container">
    <h1>Vse rezervacije</h1>

    <div v-if="!isAdmin && !authLoading" class="not-authorized-message">
      <p>Nimate dovoljenja za ogled te strani. Prosimo, prijavite se kot administrator.</p>
      <RouterLink to="/login">Prijava</RouterLink>
    </div>

    <div v-else>
      <p v-if="loading">Nalaganje vseh rezervacij...</p>
      <p v-if="message && !loading" class="success-message">{{ message }}</p>
      <p v-if="errorMessage && !loading" class="error-message">{{ errorMessage }}</p>

      <div v-if="!loading && reservations.length === 0 && !errorMessage && !message" class="no-reservations">
        <p>Trenutno ni nobenih rezervacij v sistemu.</p>
      </div>

      <div v-else class="reservations-list">
        <div v-for="reservation in reservations" :key="reservation.id" class="reservation-card">
          <div class="card-header">
            <h3>{{ reservation.courtName || reservation.courtId }}</h3>
            <span :class="['status-badge', getStatusClass(reservation.status)]">
              {{ reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1) }}
            </span>
          </div>
          <p><strong>Uporabnik:</strong> {{ reservation.userEmail || reservation.userId }}</p>
          <p><strong>Začetek:</strong> {{ formatTimestamp(reservation.startTime) }}</p>
          <p><strong>Konec:</strong> {{ formatTimestamp(reservation.endTime) }}</p>
          <p><strong>Rezervirano:</strong> {{ formatTimestamp(reservation.createdAt) }}</p>

          <div class="admin-actions" v-if="reservation.status === 'pending'">
            <button @click="handleConfirmReservation(reservation.id)" :disabled="loading" class="confirm-button">
              Potrdi
            </button>
            <button @click="handleCancelReservation(reservation.id)" :disabled="loading" class="cancel-button">
              Zavrni
            </button>
          </div>
          <div class="admin-actions" v-else>
            <button class="disabled-button" disabled>Obravnavano</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue"; // Uporabljamo watchEffect namesto onMounted
import { RouterLink } from "vue-router";
import {
  getAllReservationsUrl,
  confirmReservation,
  cancelReservation
} from "../firebase";
import { Timestamp } from "firebase/firestore";
import { useAuthUser } from "../composables/useAuthUser";

interface Reservation {
  id: string;
  courtId: string;
  courtName?: string;
  // Razširjen tip, da vključuje vse možne oblike, ki jih lahko dobite
  startTime: { seconds: number; nanoseconds: number } | { _seconds: number; _nanoseconds: number } | Timestamp | Date | string;
  endTime: { seconds: number; nanoseconds: number } | { _seconds: number; _nanoseconds: number } | Timestamp | Date | string;
  userId: string;
  userEmail?: string;
  createdAt: { seconds: number; nanoseconds: number } | { _seconds: number; _nanoseconds: number } | Timestamp | Date | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

const { user, isAdmin, authLoading } = useAuthUser();

const reservations = ref<Reservation[]>([]);
const loading = ref(false);
const message = ref('');
const errorMessage = ref('');

const convertToDate = (ts: any): Date | null => {
  if (!ts) return null;

  if (ts instanceof Date) {
    return ts;
  }
  if (ts instanceof Timestamp && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  if (typeof ts === 'object' && ts !== null && ('seconds' in ts || '_seconds' in ts)) {
    const seconds = (ts as any).seconds || (ts as any)._seconds;
    const nanoseconds = (ts as any).nanoseconds || (ts as any)._nanoseconds || 0;
    if (typeof seconds === 'number') {
      return new Timestamp(seconds, nanoseconds).toDate();
    }
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

const fetchAllReservations = async () => {
  if (!user.value || !isAdmin.value || authLoading.value) {
    reservations.value = [];
    message.value = "";
    errorMessage.value = "";
    console.log("fetchAllReservations: Not authorized or auth still loading. User:", user.value, "isAdmin:", isAdmin.value, "authLoading:", authLoading.value);
    return;
  }

  loading.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const token = await user.value?.getIdToken();
    console.log("Attempting to fetch reservations with token:", token ? "Token present" : "No token");

    const res = await fetch(getAllReservationsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Fetch response status:", res.status);
    const data = await res.json();
    console.log("Fetch response data:", data);

    if (!res.ok) {
      throw new Error(data.message || "Napaka pri pridobivanju vseh rezervacij.");
    }

    if (data.data && Array.isArray(data.data)) {
      reservations.value = data.data as Reservation[];
      console.log("Reservations successfully loaded:", reservations.value.length, "items.");
      if (reservations.value.length === 0) {
        message.value = "Trenutno ni nobenih rezervacij v sistemu.";
      } else {
        message.value = "";
      }
    } else {
      errorMessage.value = "Nepričakovana oblika podatkov.";
      reservations.value = [];
      console.error("Unexpected data format from API:", data);
    }
  } catch (err: any) {
    console.error("Napaka pri pridobivanju vseh rezervacij:", err);
    errorMessage.value = err.message || "Nepričakovana napaka pri pridobivanju vseh rezervacij.";
    reservations.value = [];
  } finally {
    loading.value = false;
    console.log("fetchAllReservations finished. Loading:", loading.value, "Reservations count:", reservations.value.length);
  }
};

const handleConfirmReservation = async (reservationId: string) => {
  if (!confirm("Ali ste prepričani, da želite POTRDITI to rezervacijo?")) {
    return;
  }

  loading.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const response: any = await confirmReservation({ reservationId });
    if (response.data && response.data.status === 'success') {
      message.value = response.data.message;
      errorMessage.value = '';
      await fetchAllReservations();
    } else {
      errorMessage.value = response.data?.message || "Napaka pri potrditvi rezervacije.";
      message.value = '';
    }
  } catch (err: any) {
    console.error("Napaka pri potrditvi rezervacije:", err);
    errorMessage.value = err.details?.message || err.message || "Nepričakovana napaka pri potrditvi rezervacije.";
  } finally {
    loading.value = false;
  }
};

const handleCancelReservation = async (reservationId: string) => {
  if (!confirm("Ali ste prepričani, da želite ZAVRNITI to rezervacijo?")) {
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
      await fetchAllReservations();
    } else {
      errorMessage.value = response.data?.message || "Napaka pri zavrnitvi rezervacije.";
      message.value = '';
    }
  } catch (err: any) {
    console.error("Napaka pri zavrnitvi rezervacije:", err);
    errorMessage.value = err.details?.message || err.message || "Nepričakovana napaka pri zavrnitvi rezervacije.";
  } finally {
    loading.value = false;
  }
};

watchEffect(() => {
  if (!authLoading.value && user.value && isAdmin.value) {
      console.log("watchEffect triggered: User is admin and auth loaded. Fetching reservations...");
      fetchAllReservations();
  } else if (!authLoading.value && (!user.value || !isAdmin.value)) {
      console.log("watchEffect triggered: User is NOT admin or not logged in. Clearing reservations.");
      reservations.value = [];
      message.value = "";
      errorMessage.value = "";
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
</script>

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

.not-authorized-message {
  background-color: #ffccbc;
  border: 1px solid #ffab91;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  color: #bf360c;
  margin-top: 2rem;
}

.not-authorized-message a {
  color: #bf360c;
  font-weight: bold;
  text-decoration: underline;
  margin-top: 1rem;
  display: inline-block;
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
}

.card-header h3 {
  color: #1a73e8;
  margin: 0;
  font-size: 1.4rem;
}

.status-badge {
  padding: 0.3rem 0.7rem;
  border-radius: 5px;
  font-size: 0.85rem;
  font-weight: bold;
  color: white;
  text-transform: capitalize;
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

.admin-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.admin-actions button {
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.confirm-button {
  background-color: #28a745;
  color: white;
}

.confirm-button:hover:not(:disabled) {
  background-color: #218838;
}

.cancel-button {
  background-color: #dc3545;
  color: white;
}

.cancel-button:hover:not(:disabled) {
  background-color: #c82333;
}

.disabled-button {
  background-color: #cccccc;
  cursor: not-allowed;
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

.success-message {
  color: #28a745;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 1rem;
  border-radius: 5px;
  margin-top: 1.5rem;
  text-align: center;
}

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 1rem;
  border-radius: 5px;
  margin-top: 1.5rem;
  text-align: center;
}
</style>