import { createRouter, createWebHistory } from 'vue-router'
import ReserveView from '../views/ReserveView.vue'
import LoginView from '../views/LoginView.vue'
import AllReservationsView from '../views/AllReservationsView.vue'
import MyReservationsView from '../views/MyReservationsView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminToolsView from '../views/AdminToolsView.vue'

const routes = [
  {
    path: '/',
    name: 'Reserve',
    component: ReserveView,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
  },
  {
    path: '/all',
    name: 'AllReservations',
    component: AllReservationsView,
  },
  {
    path: '/my',
    name: 'MyReservations',
    component: MyReservationsView,
  },
  {
      path: '/admin-tools',
      name: 'admin-tools',
      component: AdminToolsView,
    }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
