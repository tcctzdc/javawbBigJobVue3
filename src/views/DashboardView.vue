<script setup lang="ts">
import * as echarts from 'echarts'
import { onMounted, ref } from 'vue'
import axios from 'axios'

const productChart = ref<HTMLDivElement | null>(null)
const deliveryChart = ref<HTMLDivElement | null>(null)
const priceChart = ref<HTMLDivElement | null>(null)

const renderProductSalesChart = async () => {
  const res = await axios.get('http://localhost:8081/api/dashboard/product-sales')
  const data = res.data

  const chart = echarts.init(productChart.value!)
  chart.setOption({
    title: { text: '产品销量统计' },
    tooltip: {}, // 显示信息
    xAxis: {
      type: 'category',
      data: data.map((item: any) => item.productName),
      axisLabel: {
        interval: 0,
        rotate: 30,
        formatter: (value: string) => value
      }
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '销量',
        type: 'bar',
        data: data.map((item: any) => item.totalSales),
        itemStyle: { color: '#5470C6' },
        barWidth: '30%',       // 设定柱子宽度（可调小）
        barGap: '20%',         // 柱子之间间隔
      },
    ],
    grid: {
      left: 60,
      right: 30,
      bottom: 80,
      containLabel: true,
    },
  })
}

const renderDeliveryOrdersChart = async () => {
  const res = await axios.get('http://localhost:8081/api/dashboard/deliveries')
  const data = res.data

  const chart = echarts.init(priceChart.value!)
  chart.setOption({
    title: { text: '快递公司订单统计'},
    tooltip: {},
    xAxis: {
      type: 'category',
      data: data.map((item: any) => item.company),
      axisLabel: {
        interval: 0,
        rotate: 30,
        formatter: (value: string) => value
      }
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '订单量',
        type: 'bar',
        data: data.map((item: any) => item.total),
        itemStyle: { color: '#c3e59c' },
        barWidth: '30%',       // 设定柱子宽度（可调小）
        barGap: '20%',         // 柱子之间间隔
      },
    ],
   grid: {
     left: 60,
         right: 30,
         bottom: 80,
         containLabel: true,
   },
  })
}

const renderProductPricesChart = async () => {
  const res = await axios.get('http://localhost:8081/api/dashboard/product-prices')
  const data = res.data

  const chart = echarts.init(deliveryChart.value!)
  chart.setOption({
    title: { text: '商品销售额统计'},
    tooltip: {},
    xAxis: {
      type: 'category',
      data: data.map((item: any) => item.productName),
      axisLabel: {
        interval: 0,
        rotate: 30,
        formatter: (value: string) => value
      }
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '销售额',
        type: 'line',
        data: data.map((item: any) => item.totalPrices),
        lineStyle: { color: '#5e6fdf' },
        itemStyle: { color: '#5bd3ac' },
        smooth: true, // 平滑线条
        symbol: 'circle',
        symbolSize: 6  // 柱子之间间隔
      },
    ],
    grid: {
      left: 60,
      right: 30,
      bottom: 80,
      containLabel: true,
    },
  })
}
onMounted(() => {
  renderProductSalesChart()
  renderDeliveryOrdersChart()
  renderProductPricesChart()
})
</script>

<template>
  <div class="charts-container">
    <div class="chart" ref="productChart"></div>
    <div class="chart" ref="deliveryChart"></div>
    <div class="chart" ref="priceChart"></div>

  </div>
</template>

<style scoped>
.charts-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: 20px;
}
.chart {
  width: 100%;
  height: 400px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
