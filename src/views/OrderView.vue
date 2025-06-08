<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
interface Order {
  id: number
  userId: string
  createTime: string
  status: string
}
const orders = ref<Order[]>([])
onMounted(() => {
  axios.get('/api/orders').then(res => orders.value = res.data)
})
</script>

<template>
  <div>
    <h2>订单管理</h2>
    <table>
      <thead><tr><th>ID</th><th>用户</th><th>创建时间</th><th>状态</th></tr></thead>
      <tbody>
      <tr v-for="o in orders" :key="o.id">
        <td>{{ o.id }}</td>
        <td>{{ o.userId }}</td>
        <td>{{ o.createTime }}</td>
        <td>{{ o.status }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>

</style>