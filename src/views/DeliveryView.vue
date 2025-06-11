<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'

interface Delivery {
  id: number
  orderId: number
  courierName: string
  company: string
  trackingNo: string
  status: string
  updateTime: string
  details?: DeliveryDetail[]
  user?: User
}

interface DeliveryDetail {
  id: number
  deliveryId: number
  location: string
  description: string
  timestamp: string
}

interface User {
  id: number
  username: string
  real_name: string
  phone: string
  address: string
  create_time: string
}

// 配送状态常量
const DELIVERY_STATUS = {
  PENDING: 'pending',    // 待发货
  SHIPPING: 'shipping',  // 运输中
  DELIVERED: 'delivered' // 已签收
}

// 配送状态显示文本
const DELIVERY_STATUS_TEXT = {
  [DELIVERY_STATUS.PENDING]: '待发货',
  [DELIVERY_STATUS.SHIPPING]: '运输中',
  [DELIVERY_STATUS.DELIVERED]: '已签收'
}
// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const deliveries = ref<Delivery[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const selectedDelivery = ref<Delivery | null>(null)
const newDelivery = ref<Delivery>({
  id: 0,
  orderId: 0,
  courierName: '',
  company: '',
  trackingNo: '',
  status: DELIVERY_STATUS.PENDING,
  updateTime: ''
})

const route = useRoute()

// 添加类型定义
type CourierCompany = '顺丰速运' | '中通快递' | '申通快递' | '邮政快递'

// 修改快递员配置的类型定义
const COURIERS: Record<CourierCompany, string[]> = {
  '顺丰速运': ['张三', '李四', '王五'],
  '中通快递': ['赵六', '钱七', '孙八'],
  '申通快递': ['周九', '吴十', '郑十一'],
  '邮政快递': ['王十二', '李十三', '张十四']
}

const EXPRESS_COMPANIES = Object.keys(COURIERS) as CourierCompany[]

// 修改随机选择快递员方法
const getRandomCourier = (company: CourierCompany) => {
  const couriers = COURIERS[company]
  return couriers[Math.floor(Math.random() * couriers.length)]
}

// 添加运单号生成方法
const generateTrackingNo = (company: CourierCompany) => {
  // 获取公司前缀
  const companyPrefix = {
    '顺丰速运': 'SF',
    '中通快递': 'ZT',
    '申通快递': 'ST',
    '邮政快递': 'YZ'
  }[company]

  // 生成时间戳部分（年月日时分秒）
  const now = new Date()
  const timestamp = now.getFullYear().toString().slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')

  // 生成随机数部分（4位）
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `${companyPrefix}${timestamp}${random}`
}

// 修改快递公司选择处理
const handleCompanyChange = (company: CourierCompany) => {
  if (selectedDelivery.value) {
    selectedDelivery.value.company = company
    // 自动选择该公司的第一个快递员
    selectedDelivery.value.courierName = COURIERS[company][0]
    selectedDelivery.value.trackingNo = generateTrackingNo(company) // 自动生成运单号
  } else if (newDelivery.value) {
    newDelivery.value.company = company
    // 自动选择该公司的第一个快递员
    newDelivery.value.courierName = COURIERS[company][0]
    newDelivery.value.trackingNo = generateTrackingNo(company) // 自动生成运单号
  }
}

// 添加一个变量存储原始数据
const originalDeliveries = ref<Delivery[]>([])

// 修改获取配送列表方法
const fetchDeliveries = async () => {
  loading.value = true
  try {
    const res = await axios.get(`http://localhost:8081/api/deliveries?page=${currentPage.value}&size=${pageSize.value}`)
    if (res.data) {
      originalDeliveries.value = res.data.deliveries || []
      deliveries.value = res.data.deliveries || []
      total.value = res.data.total || 0
      currentPage.value = res.data.currentPage || 1
      pageSize.value = res.data.pageSize || 10
      console.log('获取配送列表成功:', res.data)
    } else {
      ElMessage.warning('获取配送列表为空')
    }
  } catch (error: any) {
    console.error('获取配送列表失败:', error)
    ElMessage.error(`获取配送列表失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchDeliveries()

}
// 添加配送信息
const addDelivery = async () => {
  try {
    if (!newDelivery.value.orderId) {
      ElMessage.error('请选择订单')
      return
    }
    if (!newDelivery.value.company) {
      ElMessage.error('请选择快递公司')
      return
    }
    if (!newDelivery.value.trackingNo) {
      ElMessage.error('请输入运单号')
      return
    }

    await axios.post('http://localhost:8081/api/deliveries', newDelivery.value)
    ElMessage.success('配送信息添加成功')
    dialogVisible.value = false
    fetchDeliveries()
  } catch (error: any) {
    console.error('添加配送信息失败:', error)
    ElMessage.error(`添加配送信息失败: ${error.message || '未知错误'}`)
  }
}

// 修改 autoFillOrderInfo 方法
const autoFillOrderInfo = async (orderId: number) => {
  try {
    // 获取订单信息
    const orderRes = await axios.get(`http://localhost:8081/api/orders/${orderId}`)
    const order = orderRes.data

    // 更新表单数据
    newDelivery.value = {
      id: 0,
      orderId: orderId,
      courierName: '',
      company: '',
      trackingNo: '',
      status: DELIVERY_STATUS.PENDING,
      updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    }

    // 显示对话框
    dialogVisible.value = true
  } catch (error) {
    console.error('获取订单信息失败:', error)
    ElMessage.error('获取订单信息失败，请手动填写运输信息')
  }
}

// 添加 StatusAction 接口定义
interface StatusAction {
  text: string      // 按钮文本
  type: string      // 按钮类型
  status?: string   // 可选的状态值
  action?: string   // 可选的动作类型
}

// 修改 getStatusActions 方法的返回类型
const getStatusActions = (status: string): StatusAction[] => {
  switch (status) {
    case DELIVERY_STATUS.PENDING:
      return [
        { text: '开始运输', type: 'primary', action: 'edit' }
      ]
    case DELIVERY_STATUS.SHIPPING:
      return [
        { text: '确认签收', type: 'success', status: DELIVERY_STATUS.DELIVERED }
      ]
    default:
      return []
  }
}

// 修改 updateDeliveryStatus 方法
const updateDeliveryStatus = async (delivery: Delivery, newStatus: string) => {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const currentTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

    const updatedDelivery = {
      ...delivery,
      status: newStatus,
      updateTime: currentTime
    }
    await axios.put('http://localhost:8081/api/deliveries', updatedDelivery)

    // 如果是开始运输状态，更新订单状态为已发货
    if (newStatus === DELIVERY_STATUS.SHIPPING) {
      try {
        // 先获取订单信息
        const orderRes = await axios.get(`http://localhost:8081/api/orders/${delivery.orderId}`)
        const order = orderRes.data

        // 更新订单状态，保留原有信息
        await axios.put(`http://localhost:8081/api/orders/${delivery.orderId}`, {
          id: delivery.orderId,
          status: 'shipped',
          order_no: order.order_no,
          user_id: order.user_id,
          create_time: order.create_time,
          total_price: order.total_price
        })
        ElMessage.success('订单状态已自动更新为已发货')
      } catch (error) {
        console.error('更新订单状态失败:', error)
        ElMessage.error('运输状态已更新，但订单状态更新失败')
      }
    }
    // 如果是已签收状态，更新订单状态为已完成
    else if (newStatus === DELIVERY_STATUS.DELIVERED) {
      try {
        // 先获取订单信息
        const orderRes = await axios.get(`http://localhost:8081/api/orders/${delivery.orderId}`)
        const order = orderRes.data

        // 更新订单状态，保留原有信息
        await axios.put(`http://localhost:8081/api/orders/${delivery.orderId}`, {
          id: delivery.orderId,
          status: 'completed',
          order_no: order.order_no,
          user_id: order.user_id,
          create_time: order.create_time,
          total_price: order.total_price
        })
        ElMessage.success('订单状态已自动更新为已完成')
      } catch (error) {
        console.error('更新订单状态失败:', error)
        ElMessage.error('运输状态已更新，但订单状态更新失败')
      }
    }

    ElMessage.success('配送状态更新成功')
    fetchDeliveries()
  } catch (error: any) {
    console.error('更新配送状态失败:', error)
    ElMessage.error(`更新配送状态失败: ${error.message || '未知错误'}`)
  }
}

// 删除配送信息
const deleteDelivery = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条配送信息吗？', '提示', {
      type: 'warning'
    })
    await axios.delete(`http://localhost:8081/api/deliveries/${id}`)
    ElMessage.success('配送信息删除成功')
    fetchDeliveries()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除配送信息失败:', error)
      ElMessage.error(`删除配送信息失败: ${error.message || '未知错误'}`)
    }
  }
}

// 重置表单
const resetForm = () => {
  newDelivery.value = {
    id: 0,
    orderId: 0,
    courierName: '',
    company: '',
    trackingNo: '',
    status: DELIVERY_STATUS.PENDING,
    updateTime: ''
  }
}

// 对话框关闭处理
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 修改编辑配送信息的方法
const editDelivery = (delivery: Delivery) => {
  if (delivery.status !== DELIVERY_STATUS.PENDING) {
    ElMessage.warning('只有待发货状态的配送信息可以编辑')
    return
  }
  selectedDelivery.value = { ...delivery }
  dialogVisible.value = true
}

// 修改保存配送信息的方法
const saveDelivery = async () => {
  try {
    if (!selectedDelivery.value) return

    if (!selectedDelivery.value.id) {
      ElMessage.error('配送信息ID不能为空')
      return
    }
    if (!selectedDelivery.value.company) {
      ElMessage.error('请选择快递公司')
      return
    }
    if (!selectedDelivery.value.courierName) {
      ElMessage.error('请选择快递员')
      return
    }
    if (!selectedDelivery.value.trackingNo) {
      ElMessage.error('请输入运单号')
      return
    }

    // 更新配送信息
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const currentTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

    // 保留原有的 courierName 和 trackingNo
    const updatedDelivery = {
      id: selectedDelivery.value.id,
      orderId: selectedDelivery.value.orderId,
      courierName: selectedDelivery.value.courierName,
      company: selectedDelivery.value.company,
      trackingNo: selectedDelivery.value.trackingNo,
      status: DELIVERY_STATUS.SHIPPING,
      updateTime: currentTime
    }
    console.log('准备发送的配送信息:', updatedDelivery)
    console.log('courierName:', updatedDelivery.courierName)
    console.log('trackingNo:', updatedDelivery.trackingNo)

    const response = await axios.put('http://localhost:8081/api/deliveries', updatedDelivery)
    console.log('服务器响应:', response.data)

    // 更新订单状态为已发货
    try {
      // 先获取订单信息
      const orderRes = await axios.get(`http://localhost:8081/api/orders/${selectedDelivery.value.orderId}`)
      const order = orderRes.data

      // 更新订单状态，保留原有信息
      await axios.put(`http://localhost:8081/api/orders/${selectedDelivery.value.orderId}`, {
        id: selectedDelivery.value.orderId,
        status: 'shipped',
        order_no: order.order_no,
        user_id: order.user_id,
        create_time: order.create_time,
        total_price: order.total_price
      })
      ElMessage.success('配送信息已更新，订单状态已自动更新为已发货')
    } catch (error) {
      console.error('更新订单状态失败:', error)
      ElMessage.error('配送信息已更新，但订单状态更新失败')
    }

    dialogVisible.value = false
    await fetchDeliveries() // 确保在更新后重新获取数据
  } catch (error: any) {
    console.error('保存配送信息失败:', error)
    if (error.response) {
      console.error('错误响应:', error.response.data)
    }
    ElMessage.error(`保存配送信息失败: ${error.message || '未知错误'}`)
  }
}

// 在 script setup 部分添加搜索相关的响应式变量
const searchQuery = ref<{
  orderId: string
  company: string
  courierName: string
  status: string
}>({
  orderId: '',
  company: '',
  courierName: '',
  status: ''
})

// 添加订单ID列表
const orderIds = ref<number[]>([])

// 获取所有订单ID
const fetchOrderIds = async () => {
  try {
    const res = await axios.get('http://localhost:8081/api/orders')
    if (res.data && res.data.orders) {
      // 提取所有订单ID并去重，确保转换为数字类型
      const ids = res.data.orders.map((order: any) => {
        const id = Number(order.id)
        return isNaN(id) ? null : id
      }).filter((id: number | null): id is number => id !== null)

      // 使用Array.from确保类型正确
      orderIds.value = Array.from(new Set(ids))
    }
  } catch (error: any) {
    console.error('获取订单ID列表失败:', error)
    ElMessage.error(`获取订单ID列表失败: ${error.message || '未知错误'}`)
  }
}

// 修改搜索方法
const searchDeliveries = async () => {
  loading.value = true
  try {
    // 使用原始数据进行过滤
    let filteredDeliveries = [...originalDeliveries.value]

    if (searchQuery.value.orderId) {
      filteredDeliveries = filteredDeliveries.filter(d =>
          d.orderId === Number(searchQuery.value.orderId)
      )
    }
    if (searchQuery.value.company) {
      filteredDeliveries = filteredDeliveries.filter(d =>
          d.company === searchQuery.value.company
      )
    }
    if (searchQuery.value.courierName) {
      filteredDeliveries = filteredDeliveries.filter(d =>
          d.courierName === searchQuery.value.courierName
      )
    }
    if (searchQuery.value.status) {
      filteredDeliveries = filteredDeliveries.filter(d =>
          d.status === searchQuery.value.status
      )
    }

    deliveries.value = filteredDeliveries
    if (filteredDeliveries.length === 0) {
      ElMessage.warning('未找到符合条件的配送信息')
    }
  } catch (error: any) {
    console.error('搜索配送列表失败:', error)
    ElMessage.error(`搜索配送列表失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

// 修改重置搜索方法
const resetSearch = async () => {
  searchQuery.value = {
    orderId: '',
    company: '',
    courierName: '',
    status: ''
  }
  // 恢复显示原始数据
  deliveries.value = [...originalDeliveries.value]
}

// 添加获取所有快递员的方法
const getAllCouriers = (): string[] => {
  return Object.values(COURIERS).flat()
}

// 修改快递员下拉框的选项计算
const getCourierOptions = computed(() => {
  if (!searchQuery.value.company) {
    // 如果没有选择快递公司，显示所有快递员
    return getAllCouriers()
  }
  // 如果选择了快递公司，显示对应公司的快递员
  return COURIERS[searchQuery.value.company as CourierCompany]
})

const showDeliveryDetail = ref(false)

// 获取运输明细
const fetchDeliveryDetails = async (deliveryId: number) => {
  try {
    const res = await axios.get(`http://localhost:8081/api/deliveries/${deliveryId}/details`)
    if (res.data) {
      if (selectedDelivery.value) {
        selectedDelivery.value.details = res.data
      }
    }
  } catch (error: any) {
    console.error('获取运输明细失败:', error)
    ElMessage.error(`获取运输明细失败: ${error.message || '未知错误'}`)
  }
}

// 获取用户信息
const fetchUserInfo = async (orderId: number) => {
  try {
    const res = await axios.get(`http://localhost:8081/api/orders/${orderId}/user`)
    if (res.data && selectedDelivery.value) {
      selectedDelivery.value.user = res.data
    }
  } catch (error: any) {
    console.error('获取用户信息失败:', error)
    ElMessage.error(`获取用户信息失败: ${error.message || '未知错误'}`)
  }
}

// 查看配送详情
const viewDeliveryDetail = async (delivery: Delivery) => {
  selectedDelivery.value = { ...delivery }
  showDeliveryDetail.value = true
  await fetchDeliveryDetails(delivery.id)
  await fetchUserInfo(delivery.orderId)
}

// 关闭配送详情对话框
const handleDeliveryDetailClose = () => {
  showDeliveryDetail.value = false
  selectedDelivery.value = null
}

onMounted(async () => {
  await fetchDeliveries()
  await fetchOrderIds()

  // 检查是否有订单ID参数
  const orderId = route.query.orderId
  if (orderId) {
    await autoFillOrderInfo(Number(orderId))
  }
})
</script>

<template>
  <div class="delivery-container">
    <div class="header">
      <h2>配送管理</h2>
    </div>

    <!-- 添加搜索表单 -->
    <div class="search-container">
      <el-form :inline="true" :model="searchQuery" class="search-form">
        <el-form-item label="订单ID">
          <el-select
              v-model="searchQuery.orderId"
              placeholder="请选择订单ID"
              clearable
              style="width: 200px"
          >
            <el-option
                v-for="id in orderIds"
                :key="id"
                :label="id"
                :value="id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="快递公司">
          <el-select
              v-model="searchQuery.company"
              placeholder="请选择快递公司"
              clearable
              style="width: 200px"
          >
            <el-option
                v-for="company in EXPRESS_COMPANIES"
                :key="company"
                :label="company"
                :value="company"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="快递员">
          <el-select
              v-model="searchQuery.courierName"
              placeholder="请选择快递员"
              clearable
              style="width: 200px"
          >
            <el-option
                v-for="courier in getCourierOptions"
                :key="courier"
                :label="courier"
                :value="courier"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
              v-model="searchQuery.status"
              placeholder="请选择状态"
              clearable
              style="width: 200px"
          >
            <el-option
                v-for="(text, status) in DELIVERY_STATUS_TEXT"
                :key="status"
                :label="text"
                :value="status"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchDeliveries">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 配送列表 -->
    <el-table :data="deliveries" v-loading="loading" style="width: 100%">
      <el-table-column prop="orderId" label="订单ID" width="100" />
      <el-table-column prop="courierName" label="快递员" width="120" />
      <el-table-column prop="company" label="快递公司" width="150" />
      <el-table-column prop="trackingNo" label="运单号" width="180" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          {{ DELIVERY_STATUS_TEXT[scope.row.status] }}
        </template>
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="180" />
      <el-table-column label="操作" width="280">
        <template #default="scope">
          <el-button
              size="small"
              type="info"
              @click="viewDeliveryDetail(scope.row)"
          >
            查看详情
          </el-button>
          <!--          <template v-if="scope.row.status === DELIVERY_STATUS.PENDING">-->
          <!--            <el-button-->
          <!--                size="small"-->
          <!--                type="primary"-->
          <!--                @click="editDelivery(scope.row)"-->
          <!--            >-->
          <!--              编辑-->
          <!--            </el-button>-->
          <!--          </template>-->
          <template v-for="action in getStatusActions(scope.row.status)" :key="action.status">
            <el-button
                size="small"
                :type="action.type"
                @click="action.action ? editDelivery(scope.row) : (action.status ? updateDeliveryStatus(scope.row, action.status) : null)"
            >
              {{ action.text }}
            </el-button>
          </template>
          <!--          <el-button-->
          <!--              size="small"-->
          <!--              type="danger"-->
          <!--              @click="deleteDelivery(scope.row.id)"-->
          <!--          >-->
          <!--            删除-->
          <!--          </el-button>-->
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增配送对话框 -->
    <el-dialog
        v-model="dialogVisible"
        :title="selectedDelivery ? '编辑配送信息' : '新增配送'"
        width="500px"
        @close="handleDialogClose"
    >
      <el-form :model="selectedDelivery || newDelivery" label-width="100px">
        <el-form-item label="订单ID">
          <el-input v-model.number="(selectedDelivery || newDelivery).orderId" type="number" disabled />
        </el-form-item>
        <el-form-item label="快递公司">
          <el-select
              v-model="(selectedDelivery || newDelivery).company"
              placeholder="请选择快递公司"
              @change="handleCompanyChange"
          >
            <el-option
                v-for="company in EXPRESS_COMPANIES"
                :key="company"
                :label="company"
                :value="company"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="快递员">
          <el-select
              v-model="(selectedDelivery || newDelivery).courierName"
              placeholder="请选择快递员"
              :disabled="!(selectedDelivery || newDelivery).company"
          >
            <el-option
                v-for="courier in COURIERS[(selectedDelivery || newDelivery).company as CourierCompany]"
                :key="courier"
                :label="courier"
                :value="courier"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号">
          <el-input
              v-model="(selectedDelivery || newDelivery).trackingNo"
              readonly
              placeholder="选择快递公司后自动生成"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="selectedDelivery ? saveDelivery() : addDelivery()">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 配送详情对话框 -->
    <el-dialog
        v-model="showDeliveryDetail"
        title="配送详情"
        width="500px"
        @close="handleDeliveryDetailClose"
    >
      <template v-if="selectedDelivery">
        <el-form :model="selectedDelivery" label-width="100px">
          <el-form-item label="订单ID">
            <el-input v-model.number="selectedDelivery.orderId" type="number" disabled />
          </el-form-item>
          <el-form-item label="快递公司">
            <el-input v-model="selectedDelivery.company" disabled />
          </el-form-item>
          <el-form-item label="快递员">
            <el-input v-model="selectedDelivery.courierName" disabled />
          </el-form-item>
          <el-form-item label="运单号">
            <el-input v-model="selectedDelivery.trackingNo" disabled />
          </el-form-item>
          <el-form-item label="状态">
            <el-input v-model="DELIVERY_STATUS_TEXT[selectedDelivery.status]" disabled />
          </el-form-item>
          <el-form-item label="更新时间">
            <el-input v-model="selectedDelivery.updateTime" disabled />
          </el-form-item>
          <el-form-item label="用户信息">
            <template v-if="selectedDelivery.user">
              <div class="user-info-grid">
                <div class="user-info-item">
                  <span class="label">用户ID：</span>
                  <span class="value">{{ selectedDelivery.user.id }}</span>
                </div>
                <div class="user-info-item">
                  <span class="label">用户名：</span>
                  <span class="value">{{ selectedDelivery.user.username }}</span>
                </div>
                <div class="user-info-item">
                  <span class="label">真实姓名：</span>
                  <span class="value">{{ selectedDelivery.user.real_name }}</span>
                </div>
                <div class="user-info-item">
                  <span class="label">联系电话：</span>
                  <span class="value">{{ selectedDelivery.user.phone }}</span>
                </div>
                <div class="user-info-item full-width">
                  <span class="label">收货地址：</span>
                  <span class="value">{{ selectedDelivery.user.address }}</span>
                </div>
              </div>
            </template>
            <template v-else>
              <p>未找到用户信息</p>
            </template>
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
        <p>加载中...</p>
      </template>
      <template #footer>
        <el-button @click="showDeliveryDetail = false">关闭</el-button>
      </template>
    </el-dialog>
    <!-- 分页组件 -->
    <div class="pagination-container">
      <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[10, 15, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="(val: number) => { pageSize = val; fetchDeliveries() }"
          @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.delivery-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-container {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.search-form .el-form-item {
  margin-bottom: 0;
  margin-right: 10px;
}

.user-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.user-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info-item.full-width {
  grid-column: 1 / -1;
}

.user-info-item .label {
  color: #606266;
  font-weight: 500;
  min-width: 80px;
}

.user-info-item .value {
  color: #303133;
  flex: 1;
}
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}
</style>