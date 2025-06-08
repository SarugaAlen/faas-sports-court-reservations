<script setup lang="ts">
import { ref, onMounted, watchEffect } from "vue";
import { useRouter, RouterLink } from "vue-router";
import {
  listCourts,
  submitCourtReservation,
} from "../firebase";
import { useAuthUser } from "../composables/useAuthUser";

interface Court {
  id: string;
  name: string;
  description: string;
  location: string;
  pricePerHour: number;
  imageUrl?: string;
  availableHours?: Record<string, { start: string; end: string }>;
}

const { user, authLoading } = useAuthUser();

const courts = ref<Court[]>([]);
const selectedCourtId = ref<string | null>(null);
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]);
const selectedStartTime = ref<string>('09:00');
const selectedEndTime = ref<string>('10:00');
const loading = ref(false);
const message = ref('');
const errorMessage = ref('');

const router = useRouter();

const fetchCourts = async () => {
  loading.value = true;
  message.value = '';
  errorMessage.value = '';
  try {
    const response: any = await listCourts();
    if (response.data && response.data.status === 'success') {
      courts.value = response.data.data as Court[];
      if (courts.value.length > 0) {
        selectedCourtId.value = courts.value[0].id;
      } else {
        errorMessage.value = "Trenutno ni razpoložljivih igrišč v sistemu.";
      }
    } else {
      errorMessage.value = response.data?.message || "Napaka pri pridobivanju igrišč.";
    }
  } catch (err: any) {
    console.error("Napaka pri pridobivanju igrišč:", err);
    errorMessage.value = err.message || "Nepričakovana napaka pri pridobivanju igrišč.";
  } finally {
    loading.value = false;
  }
};

const submitReservationHandler = async () => {
  loading.value = true;
  message.value = '';
  errorMessage.value = '';

  if (!user.value) {
    errorMessage.value = "Za rezervacijo morate biti prijavljeni.";
    loading.value = false;
    return;
  }

  if (!selectedCourtId.value || !selectedDate.value || !selectedStartTime.value || !selectedEndTime.value) {
    errorMessage.value = "Prosimo, izpolnite vsa polja za rezervacijo.";
    loading.value = false;
    return;
  }

  const startDateTime = `${selectedDate.value}T${selectedStartTime.value}:00Z`;
  const endDateTime = `${selectedDate.value}T${selectedEndTime.value}:00Z`;

  try {
    const response: any = await submitCourtReservation({
      courtId: selectedCourtId.value,
      startTime: startDateTime,
      endTime: endDateTime,
    });

    if (response.data && response.data.status === 'success') {
      message.value = response.data.message;
      errorMessage.value = '';
    } else {
      errorMessage.value = response.data?.message || "Napaka pri oddaji rezervacije.";
      message.value = '';
    }
  } catch (err: any) {
    console.error("Napaka pri oddaji rezervacije:", err);
    errorMessage.value = err.details?.message || err.message || "Nepričakovana napaka pri oddaji rezervacije.";
  } finally {
    loading.value = false;
  }
};

watchEffect(() => {
  if (user.value) {
    fetchCourts();
    errorMessage.value = ''; 
  } else if (!authLoading.value) {
    errorMessage.value = "Prosimo, prijavite se za ogled in rezervacijo igrišč.";
    courts.value = []; 
    selectedCourtId.value = null;
  }
});


</script>

<template>
  <div class="page-container">
    <h1>Rezervacija igrišča</h1>

    <div v-if="!user" class="not-logged-in-message">
      <p>Prosimo, <RouterLink to="/login">prijavite se</RouterLink> ali <RouterLink to="/register">registrirajte</RouterLink> za rezervacijo igrišča.</p>
    </div>

    <div v-else class="reservation-form-container">
      <div class="form-group">
        <label for="court">Izberi igrišče:</label>
        <select id="court" v-model="selectedCourtId" :disabled="loading">
          <option v-if="courts.length === 0 && loading" value="" disabled>Nalaganje igrišč...</option>
          <option v-if="courts.length === 0 && !loading" value="" disabled>Ni razpoložljivih igrišč</option>
          <option v-for="court in courts" :key="court.id" :value="court.id">
            {{ court.name }} ({{ court.location }}) - {{ court.pricePerHour }}€/h
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="date">Datum:</label>
        <input type="date" id="date" v-model="selectedDate" :min="new Date().toISOString().split('T')[0]" :disabled="loading" />
      </div>

      <div class="form-row">
        <div class="form-group half-width">
          <label for="startTime">Začetni čas:</label>
          <input type="time" id="startTime" v-model="selectedStartTime" :disabled="loading" />
        </div>
        <div class="form-group half-width">
          <label for="endTime">Končni čas:</label>
          <input type="time" id="endTime" v-model="selectedEndTime" :disabled="loading" />
        </div>
      </div>

      <button @click="submitReservationHandler" :disabled="loading || !selectedCourtId" class="submit-button">
        {{ loading ? 'Oddajam...' : 'Oddaj rezervacijo' }}
      </button>

      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div class="court-list">
        <h2>Vsa igrišča:</h2>
        <p v-if="loading && courts.length === 0">Nalaganje igrišč...</p>
        <p v-if="!loading && courts.length === 0 && !errorMessage">Trenutno ni razpoložljivih igrišč v sistemu.</p>
        <div v-for="court in courts" :key="court.id" class="court-card">
          <h3>{{ court.name }}</h3>
          <p>{{ court.description }}</p>
          <p><strong>Lokacija:</strong> {{ court.location }}</p>
          <p><strong>Cena:</strong> {{ court.pricePerHour }}€/h</p>
          <img v-if="court.imageUrl" :src="court.imageUrl" alt="Court Image" class="court-image">
          <div v-if="court.availableHours" class="available-hours">
            <h4>Delovni čas:</h4>
            <ul>
              <li v-for="(hours, day) in court.availableHours" :key="day">
                <strong>{{ day.charAt(0).toUpperCase() + day.slice(1) }}:</strong> {{ hours.start }} - {{ hours.end }}
              </li>
            </ul>
          </div>
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

.reservation-form-container {
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 3rem;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
}

.form-row .half-width {
  flex: 1;
}

.submit-button {
  display: block;
  width: 100%;
  padding: 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background-color: #45a049;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
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

.court-list {
  margin-top: 3rem;
}

.court-list h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.court-card {
  background-color: #ffffff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.court-card h3 {
  color: #1a73e8;
  margin-bottom: 0.75rem;
}

.court-card p {
  margin-bottom: 0.5rem;
  color: #555;
}

.court-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.available-hours {
  margin-top: 1rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.available-hours h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.available-hours ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.available-hours li {
  background-color: #f5f5f5;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #444;
}
</style>