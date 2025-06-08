import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import DeliveryView from "@/views/DeliveryView.vue"
import ProductView from "@/views/ProductView.vue"
import OrderView from "@/views/OrderView.vue"
import UserView from "@/views/UserView.vue"
import CategoryView from "@/views/CategoryView.vue"

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: LoginView },

  {
    path: '/home',
    name: 'home',
    component: HomeView,
    children: [
      { path: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'users', component: UserView },
      { path: 'products', component: ProductView },
      { path: 'categories', component: CategoryView },
      { path: 'orders', component: OrderView },
      { path: 'deliveries', component: DeliveryView },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
