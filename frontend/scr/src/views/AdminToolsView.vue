<script setup lang="ts">
import { ref } from 'vue';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuthUser } from '../composables/useAuthUser';

const emailToMakeAdmin = ref('');
const message = ref('');
const errorMessage = ref('');
const loading = ref(false);

const { user, isAdmin, authLoading } = useAuthUser();

const makeUserAdmin = async () => {
  if (!emailToMakeAdmin.value) {
    errorMessage.value = 'Prosimo, vnesite email naslov.';
    return;
  }

  loading.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const functionsInstance = getFunctions();
    const addAdminRoleCallable = httpsCallable<{ email: string }, { status: string; message: string }>(functionsInstance, 'addAdminRole');

    const result = await addAdminRoleCallable({ email: emailToMakeAdmin.value });

    if (result.data.status === 'success') {
      message.value = result.data.message;
      emailToMakeAdmin.value = '';
    } else {
      errorMessage.value = result.data.message || 'Nepričakovana napaka pri dodeljevanju admin vloge.';
    }
  } catch (error: any) {
    console.error('Napaka pri klicanju funkcije addAdminRole:', error);
    if (error.code) {
      errorMessage.value = `Napaka (${error.code}): ${error.message}`;
    } else {
      errorMessage.value = `Nepričakovana napaka: ${error.message || 'Neznana napaka.'}`;
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page-container">
    <h1>Administratorska orodja</h1>

    <div v-if="authLoading">
      <p>Preverjanje avtentikacije...</p>
    </div>

    <div v-else-if="!user">
      <p>Prosimo, prijavite se za dostop do administratorskih orodij.</p>
    </div>

    <div v-else-if="!isAdmin">
      <p>Nimate dovoljenja za dostop do administratorskih orodij.</p>
      <p>Samo administratorji lahko dodeljujejo vloge.</p>
    </div>

    <div v-else>
      <h2>Deli admin vlogo uporabniku</h2>
      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div class="admin-form-group">
        <label for="admin-email">Email uporabnika:</label>
        <input
          type="email"
          id="admin-email"
          v-model="emailToMakeAdmin"
          placeholder="vnesi email"
          :disabled="loading"
        />
        <button @click="makeUserAdmin" :disabled="loading || !emailToMakeAdmin">
          {{ loading ? 'Obdelujem...' : 'Naredi admina' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 700px;
  margin: 0 auto;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 1.5rem;
}

h2 {
  color: #34495e;
  margin-top: 2rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.admin-form-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.admin-form-group label {
  font-weight: bold;
  color: #555;
}

.admin-form-group input[type="email"] {
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box; /* Include padding in width */
}

.admin-form-group button {
  padding: 0.9rem 1.5rem;
  background-color: #42b983; /* Vue green */
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: background-color 0.3s ease;
  align-self: flex-start; /* Align button to the left */
}

.admin-form-group button:hover:not(:disabled) {
  background-color: #368a65;
}

.admin-form-group button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.success-message {
  background-color: #e6ffe6;
  border: 1px solid #82e082;
  color: #1f7a1f;
  padding: 0.8rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.error-message {
  background-color: #ffe6e6;
  border: 1px solid #e08282;
  color: #7a1f1f;
  padding: 0.8rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

p {
  color: #666;
  margin-bottom: 1rem;
}
</style>