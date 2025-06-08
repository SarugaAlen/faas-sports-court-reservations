<template>
  <div class="auth-container">
    <h2>Registracija</h2>
    <form @submit.prevent="register" class="auth-form">
      <div class="form-group">
        <label for="email">E-pošta:</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Geslo:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">Potrdi geslo:</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" required />
      </div>
      <button type="submit" class="auth-button">Ustvari račun</button>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
    </form>
    <p>Že imate račun? <RouterLink to="/login">Prijava</RouterLink></p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMessage = ref(""); 
const successMessage = ref(""); 
const router = useRouter();

const register = async () => {
  errorMessage.value = "";
  successMessage.value = ""; 

  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Gesli se ne ujemata.";
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email.value, password.value);
    successMessage.value = `Račun za ${result.user.email} je uspešno ustvarjen! Preusmerjam...`;
    setTimeout(() => {
      router.push("/");
    }, 2000); 
  } catch (error: any) {
    console.error("Napaka pri registraciji:", error.code, error.message);
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage.value = 'E-poštni naslov je že v uporabi. Prosimo, uporabite drugega ali se prijavite.';
        break;
      case 'auth/invalid-email':
        errorMessage.value = 'Neveljaven e-poštni naslov.';
        break;
      case 'auth/weak-password':
        errorMessage.value = 'Geslo je prešibko (vsaj 6 znakov).';
        break;
      case 'auth/network-request-failed':
        errorMessage.value = 'Napaka pri povezavi. Prosimo, preverite svojo internetno povezavo.';
        break;
      default:
        errorMessage.value = 'Napaka pri registraciji: ' + error.message;
    }
  }
};
</script>

<style scoped>
/* Uporabljeni so isti slogi kot za LoginView, da se zagotovi konsistentnost. */
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px); /* Odštejemo višino headerja, če je prisoten */
  background-color: #f0f2f5;
  padding: 2rem;
  box-sizing: border-box;
}

.auth-form {
  background-color: #ffffff;
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  text-align: center;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 600;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.auth-button {
  padding: 0.85rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.auth-button:hover {
  background-color: #145cb3;
}

.error-message {
  color: #e53935;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 0.75rem;
  border-radius: 5px;
  text-align: center;
  margin-top: 1rem;
  font-weight: 500;
}

.success-message {
  color: #2e7d32;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 0.75rem;
  border-radius: 5px;
  text-align: center;
  margin-top: 1rem;
  font-weight: 500;
}

p {
  margin-top: 1.5rem;
  color: #555;
  text-align: center;
}

p a {
  color: #1a73e8;
  text-decoration: none;
  font-weight: 500;
}

p a:hover {
  text-decoration: underline;
}
</style>