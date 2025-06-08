<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface deliverie{
  id: number
  orderId:string
  company:string
  trackingNumber:string
  status:string
}
const deliveries = ref<deliverie[]>([])
onMounted(() => {
  axios.get('/api/deliveries').then(res => deliveries.value = res.data)
})
</script>

<template>
  <div>
    <h2>配送管理</h2>
    <table>
      <thead><tr><th>订单</th><th>快递公司</th><th>运单号</th><th>状态</th></tr></thead>
      <tbody>
      <tr v-for="d in deliveries" :key="d.id">
        <td>{{ d.orderId }}</td>
        <td>{{ d.company }}</td>
        <td>{{ d.trackingNumber }}</td>
        <td>{{ d.status }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>

</style>