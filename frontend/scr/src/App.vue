<script setup lang="ts">
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { ref, onMounted } from "vue";
import { RouterView, RouterLink, useRouter } from "vue-router";
import { useAuthUser } from "./composables/useAuthUser";

const { user, isAdmin, authLoading } = useAuthUser(); 

const router = useRouter();

const logout = async () => {
  await signOut(auth);
  router.push("/login");
};
</script>

<template>
  <main v-if="!authLoading">
    <header v-if="user" class="header">
      <nav>
        <RouterLink to="/">Rezervacija</RouterLink>

        <RouterLink to="/my">Moje rezervacije</RouterLink>
        
        <template v-if="isAdmin">
          <RouterLink to="/all">Vse rezervacije</RouterLink>
          <RouterLink to="/admin-tools">Admin orodja</RouterLink>
        </template>
      </nav>
      <div class="user-info">
        <span>{{ user?.email }}</span>
        <button @click="logout">Odjava</button>
      </div>
    </header>

    <RouterView />
  </main>

  <div v-else class="loading-screen">
    <p>Nalaganje avtentikacije...</p>
  </div>
</template>


<style scoped>
main {
  background-color: #fdfdfd;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
  color: #1a1a1a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #ffffff;
  border-bottom: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05); /* Dodan diskreten shadow */
}

nav {
  display: flex;
  gap: 1.5rem; /* Povečan razmak za boljšo berljivost */
}

nav a {
  text-decoration: none;
  color: #1a73e8;
  font-weight: 500;
  padding: 0.25rem 0; /* Dodan padding za interakcijo */
  transition: color 0.2s ease, text-decoration 0.2s ease;
}

nav a:hover {
    color: #0f4a8b; /* Temnejša modra ob hoverju */
    text-decoration: underline;
}

nav a.router-link-exact-active {
  font-weight: bold;
  text-decoration: underline;
  color: #0d47a1; /* Še temnejša modra za aktivno povezavo */
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info span {
  font-weight: 500;
  color: #333;
}

.user-info button {
  padding: 0.6rem 1.2rem; /* Povečan padding */
  background-color: #e53935;
  color: white;
  border: none;
  border-radius: 6px; /* Bolj zaobljeni robovi */
  cursor: pointer;
  font-weight: 600; /* Povečana teža pisave */
  transition: background-color 0.3s ease, transform 0.1s ease;
}

.user-info button:hover {
  background-color: #c62828;
  transform: translateY(-1px); /* Majhen dvig ob hoverju */
}

/* Novo: Stil za Loading Screen */
.loading-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: #555;
  background-color: #f0f2f5;
}
</style>