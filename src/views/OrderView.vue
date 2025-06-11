<script setup lang="ts">
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

interface OrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  subtotal: number
  product_name?: string
}

interface Order {
  id?: number
  order_no: string
  user_id: number
  create_time: string
  total_price: number
  status: string
  items?: OrderItem[]
}

interface Product {
  id: number
  name: string
  price: number
  stock: number
  parent_category: string
  child_category: string
  category_id: number
}

interface User {
  id: number
  username: string
  real_name: string
  phone: string
  address: string
  create_time: string
}

interface Category {
  id: number
  name: string
  parent_id: number | null
  children?: Category[]
}

// 定义商品选择项的类型
interface ProductSelection {
  productId: number | null
  quantity: number
  productText: string
}

interface AutocompleteProduct extends Product {
  value: string
}

const orders = ref<Order[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const selectedOrder = ref<Order | null>(null)
const showOrderDetail = ref(false)
const users = ref<User[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const userSearchQuery = ref({
  username: '',
  id: ''
})
const searchQuery = ref({
  parentCategory: '',
  childCategory: '',
  productName: ''
})
const categories = ref<Category[]>([])
const parentCategories = ref<Category[]>([])
const childCategories = ref<Category[]>([])

// 商品列表
const filteredProducts = ref<Product[]>([])

// 订单状态常量
const ORDER_STATUS = {
  UNPAID: 'unpaid',      // 未发货
  SHIPPED: 'shipped',    // 已发货
  COMPLETED: 'completed' // 已完成
}

// 订单状态显示文本
const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.UNPAID]: '未发货',
  [ORDER_STATUS.SHIPPED]: '已发货',
  [ORDER_STATUS.COMPLETED]: '已完成'
}

// 新增订单相关
const newOrder = ref<Order>({
  order_no: '',
  user_id: 0,
  create_time: '',
  total_price: 0,
  status: ORDER_STATUS.UNPAID
})
const selectedProducts = ref<ProductSelection[]>([])

// 商品名称搜索建议
const productSuggestions = ref<string[]>([])
const newOrderUserText = ref<string>('')

// 在 searchQuery 定义后添加
const orderSearchQuery = ref({
  orderNo: '',
  userId: '',
  status: ''
})

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchOrders()
}
// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await axios.get(`http://localhost:8081/api/orders?page=${currentPage.value}&size=${pageSize.value}`)
    if (res.data) {
      orders.value = res.data.orders || []
      total.value = res.data.total || 0
      currentPage.value = res.data.currentPage || 1
      pageSize.value = res.data.pageSize || 10
      console.log('获取订单列表成功:', res.data)
    } else {
      ElMessage.warning('获取订单列表为空')
    }
  } catch (error: any) {
    console.error('获取订单列表失败:', error)
    ElMessage.error(`获取订单列表失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

// 组合查询订单
const searchOrders = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()

    // 处理订单编号
    if (orderSearchQuery.value.orderNo && orderSearchQuery.value.orderNo.trim()) {
      params.append('orderNo', orderSearchQuery.value.orderNo.trim())
    }

    // 处理用户ID
    if (orderSearchQuery.value.userId && orderSearchQuery.value.userId.trim()) {
      const userId = orderSearchQuery.value.userId.trim()
      // 检查是否为有效数字
      if (!/^\d+$/.test(userId)) {
        ElMessage.warning('用户ID必须是数字')
        loading.value = false
        return
      }
      params.append('userId', userId)
    }

    // 处理订单状态
    if (orderSearchQuery.value.status) {
      params.append('status', orderSearchQuery.value.status)
    }

    // 添加分页参数
    params.append('page', currentPage.value.toString())
    params.append('size', pageSize.value.toString())

    console.log('查询参数:', params.toString())
    const res = await axios.get(`http://localhost:8081/api/orders/search?${params.toString()}`)
    if (res.data) {
      orders.value = res.data.orders || []
      total.value = res.data.total || 0
      currentPage.value = res.data.currentPage || 1
      pageSize.value = res.data.pageSize || 10
      console.log('查询订单列表成功:', res.data)
    } else {
      ElMessage.warning('未找到符合条件的订单')
    }
  } catch (error: any) {
    console.error('查询订单列表失败:', error)
    if (error.response) {
      console.error('错误响应:', error.response.data)
      ElMessage.error(`查询订单列表失败: ${error.response.data.message || error.message || '未知错误'}`)
    } else {
      ElMessage.error(`查询订单列表失败: ${error.message || '未知错误'}`)
    }
  } finally {
    loading.value = false
  }
}

// 清空订单搜索条件
const clearOrderSearch = () => {
  orderSearchQuery.value = {
    orderNo: '',
    userId: '',
    status: ''
  }
  fetchOrders()
}

// 获取商品列表
const fetchProducts = async () => {
  try {
    const res = await axios.get('http://localhost:8081/api/products')
    if (res.data) {
      // 处理分页响应格式
      products.value = Array.isArray(res.data) ? res.data : (res.data.products || [])
      console.log('获取商品列表成功:', res.data)
      if (searchQuery.value.parentCategory) {
        filterProductsByCategory()
      }
    } else {
      ElMessage.warning('获取商品列表为空')
    }
  } catch (error: any) {
    console.error('获取商品列表失败:', error)
    ElMessage.error(`获取商品列表失败: ${error.message || '未知错误'}`)
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    const params = new URLSearchParams()
    if (userSearchQuery.value.username) {
      params.append('username', userSearchQuery.value.username)
    }
    if (userSearchQuery.value.id) {
      params.append('id', userSearchQuery.value.id)
    }

    const res = await axios.get(`http://localhost:8081/api/users/search?${params.toString()}`)
    if (res.data) {
      users.value = res.data
      console.log('获取用户列表成功:', users.value)
      const selectedUser = users.value.find(u => u.id === newOrder.value.user_id)
      if (selectedUser) {
        newOrderUserText.value = `${selectedUser.username} (${selectedUser.real_name} - ID: ${selectedUser.id})`
      } else {
        newOrderUserText.value = ''
        newOrder.value.user_id = 0
      }
    } else {
      users.value = []
      newOrderUserText.value = ''
      newOrder.value.user_id = 0
    }
  } catch (error: any) {
    console.error('获取用户列表失败:', error)
    ElMessage.error(`获取用户列表失败: ${error.message || '未知错误'}`)
  }
}

// 获取订单详情
const fetchOrderDetail = async (orderId: number) => {
  try {
    // 先获取用户列表和商品列表
    await Promise.all([fetchUsers(), fetchProducts()])

    const res = await axios.get(`http://localhost:8081/api/order-items/order/${orderId}`)
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      selectedOrder.value = { ...order }
      selectedOrder.value.items = res.data
      console.log('获取订单详情成功:', res.data)
      console.log('当前订单:', selectedOrder.value)
      console.log('用户ID:', selectedOrder.value.user_id)
      console.log('所有用户:', users.value)
      const foundUser = users.value.find(u => u.id === selectedOrder.value?.user_id)
      console.log('找到的用户:', foundUser)

      // 如果没有找到用户，显示提示
      if (!foundUser) {
        ElMessage.warning('未找到该订单的用户信息')
      }
    } else {
      ElMessage.warning('未找到订单信息')
    }
    showOrderDetail.value = true
  } catch (error: any) {
    console.error('获取订单详情失败:', error)
    ElMessage.error(`获取订单详情失败: ${error.message || '未知错误'}`)
    showOrderDetail.value = false
  }
}

// 获取分类树
const fetchCategoryTree = async () => {
  try {
    const res = await axios.get('http://localhost:8081/api/categories/tree')
    if (res.data) {
      console.log('原始分类数据:', res.data)

      // 将分类数据转换为扁平结构
      const flattenCategories = (categories: Category[]): Category[] => {
        let result: Category[] = []
        categories.forEach(category => {
          // 创建新的分类对象，不包含 children
          const flatCategory = {
            id: category.id,
            name: category.name,
            parent_id: category.parent_id
          }
          result.push(flatCategory)

          // 如果有子分类，递归处理
          if (category.children && category.children.length > 0) {
            // 为子分类设置 parent_id
            category.children.forEach(child => {
              child.parent_id = category.id
            })
            result = result.concat(flattenCategories(category.children))
          }
        })
        return result
      }

      categories.value = flattenCategories(res.data)
      console.log('扁平化后的分类数据:', categories.value)

      // 获取父分类（parent_id 为 null 或 0 的分类）
      parentCategories.value = categories.value.filter(c => !c.parent_id || c.parent_id === 0)
      console.log('父分类列表:', parentCategories.value)
    }
  } catch (error: any) {
    console.error('获取分类失败:', error)
    ElMessage.error(`获取分类失败: ${error.message || '未知错误'}`)
  }
}

// 根据条件搜索商品
const searchProducts = async () => {
  try {
    const params = new URLSearchParams()
    if (searchQuery.value.parentCategory) {
      params.append('parentCategoryId', searchQuery.value.parentCategory.toString())
    }
    if (searchQuery.value.childCategory) {
      params.append('childCategoryId', searchQuery.value.childCategory.toString())
    }

    console.log('搜索参数:', params.toString())
    const res = await axios.get(`http://localhost:8081/api/products/search?${params.toString()}`)
    console.log('API响应:', res)
    if (res.data) {
      // 处理分页响应格式
      products.value = Array.isArray(res.data) ? res.data : (res.data.products || [])
      console.log('更新后的商品列表:', products.value)
      filterProductsByCategory()
    }
  } catch (error: any) {
    console.error('搜索商品失败:', error)
    if (error.response) {
      console.error('错误响应:', error.response.data)
      ElMessage.error(`搜索商品失败: ${error.response.data.message || error.message || '未知错误'}`)
    } else {
      ElMessage.error(`搜索商品失败: ${error.message || '未知错误'}`)
    }
  }
}

// 清空搜索条件
const clearSearch = () => {
  searchQuery.value = {
    parentCategory: '',
    childCategory: '',
    productName: ''
  }
  userSearchQuery.value = {
    username: '',
    id: ''
  }
  newOrderUserText.value = ''
  newOrder.value.user_id = 0
  childCategories.value = []
  filteredProducts.value = [...products.value]
  fetchUsers()
}

// 根据分类过滤商品
const filterProductsByCategory = () => {
  if (!searchQuery.value.parentCategory) {
    filteredProducts.value = [...products.value]
    return
  }

  console.log('开始过滤商品，当前商品列表:', products.value)
  const filtered = products.value.filter((product: Product) => {
    if (searchQuery.value.parentCategory && searchQuery.value.childCategory) {
      // 如果同时选择了父类和子类，只显示子类下的商品
      return product.category_id === Number(searchQuery.value.childCategory)
    } else if (searchQuery.value.parentCategory) {
      // 如果只选择了父类，显示父类下的所有商品
      // 获取该父类下的所有子类ID
      const childCategoryIds = childCategories.value.map(c => c.id)
      return childCategoryIds.includes(product.category_id)
    }
    return false
  })
  console.log('过滤后的商品列表:', filtered)
  filteredProducts.value = filtered
}

// 根据关键字搜索商品
const searchProductsByKeyword = (keyword: string) => {
  if (!keyword) {
    filterProductsByCategory()
    return
  }

  const searchResult = filteredProducts.value.filter((product: Product) =>
      product.name.toLowerCase().includes(keyword.toLowerCase())
  )
  filteredProducts.value = searchResult
}

// 当选择父分类时更新子分类
const updateChildCategories = async (parentId: number) => {
  try {
    console.log('选择的父分类ID:', parentId)
    console.log('所有分类:', categories.value)

    // 获取所有子分类
    childCategories.value = categories.value.filter(c => c.parent_id === parentId)
    console.log('子分类列表:', childCategories.value)

    // 清空子分类选择
    searchQuery.value.childCategory = ''
    // 更新商品列表
    await searchProducts()
    // 立即过滤并显示商品
    filterProductsByCategory()
  } catch (error: any) {
    console.error('更新子分类失败:', error)
    ElMessage.error(`更新子分类失败: ${error.message || '未知错误'}`)
  }
}

// 当选择子分类时更新商品列表
const updateProductsByCategory = async () => {
  try {
    console.log('选择的子分类ID:', searchQuery.value.childCategory)
    await searchProducts()
    // 立即过滤并显示商品
    filterProductsByCategory()
  } catch (error: any) {
    console.error('更新商品列表失败:', error)
    ElMessage.error(`更新商品列表失败: ${error.message || '未知错误'}`)
  }
}

// 添加商品到新订单
const addProductToOrder = () => {
  // 如果没有选择分类，使用所有商品
  if (!searchQuery.value.parentCategory) {
    filteredProducts.value = [...products.value]
  } else if (filteredProducts.value.length === 0) {
    filterProductsByCategory()
  }
  selectedProducts.value.push({ productId: null, quantity: 1, productText: '' })
}

// 从新订单中移除商品
const removeProductFromOrder = (index: number) => {
  selectedProducts.value.splice(index, 1)
  calculateTotal()
}

// 计算订单总价
const calculateTotal = () => {
  let total = 0
  selectedProducts.value.forEach(item => {
    const product = products.value.find(p => p.id === item.productId)
    if (product) {
      total += product.price * item.quantity
    }
  })
  newOrder.value.total_price = Number(total.toFixed(2))
}

// 创建新订单
const createOrder = async () => {
  try {
    // 检查是否选择了用户
    if (!newOrder.value.user_id) {
      ElMessage.error('请选择用户')
      return
    }

    // 检查是否选择了商品
    if (selectedProducts.value.length === 0) {
      ElMessage.error('请至少选择一个商品')
      return
    }

    // 检查库存
    for (const item of selectedProducts.value) {
      const product = products.value.find(p => p.id === item.productId)
      if (!product) {
        ElMessage.error(`商品 ${item.productId} 不存在`)
        return
      }
      if (product.stock < item.quantity) {
        ElMessage.error(`商品 ${product.name} 库存不足`)
        return
      }
    }

    // 生成订单编号
    newOrder.value.order_no = generateOrderNo()
    // 设置创建时间（使用当前日期和时间）
    const now = new Date()
    newOrder.value.create_time = now.toISOString().slice(0, 19).replace('T', ' ')
    // 设置初始状态
    newOrder.value.status = ORDER_STATUS.UNPAID

    // 创建订单项
    const orderItems = selectedProducts.value.map(item => {
      const product = products.value.find(p => p.id === item.productId)
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: product?.price || 0,
        subtotal: (product?.price || 0) * item.quantity
      }
    })

    // 创建订单和订单项
    const requestData = {
      order: {
        order_no: newOrder.value.order_no,
        user_id: newOrder.value.user_id,
        create_time: newOrder.value.create_time,
        total_price: newOrder.value.total_price,
        status: newOrder.value.status
      },
      items: orderItems
    }

    console.log('发送的订单数据:', requestData)
    await axios.post('http://localhost:8081/api/orders', requestData)

    // 更新商品库存
    for (const item of selectedProducts.value) {
      const product = products.value.find(p => p.id === item.productId)
      if (product) {
        await axios.put(`http://localhost:8081/api/products/${item.productId}/stock`, {
          quantity: -item.quantity // 减少库存
        })
      }
    }

    ElMessage.success('订单创建成功')
    dialogVisible.value = false
    // 重置表单
    newOrder.value = {
      order_no: '',
      user_id: 0,
      create_time: '',
      total_price: 0,
      status: ORDER_STATUS.UNPAID
    }
    selectedProducts.value = []
    fetchOrders()
  } catch (error: any) {
    console.error('创建订单失败:', error)
    if (error.response) {
      console.error('错误响应:', error.response.data)
      ElMessage.error(`创建订单失败: ${error.response.data.message || error.message || '未知错误'}`)
    } else {
      ElMessage.error(`创建订单失败: ${error.message || '未知错误'}`)
    }
  }
}

// 删除订单
const deleteOrder = async (id: number) => {
  try {
    const order = orders.value.find(o => o.id === id)
    if (!order) {
      ElMessage.error('未找到订单信息')
      return
    }

    // 已完成订单不允许删除
    if (order.status === ORDER_STATUS.COMPLETED) {
      ElMessage.warning('已完成的订单不允许删除')
      return
    }

    let confirmMessage = ''
    switch (order.status) {
      case ORDER_STATUS.UNPAID:
        confirmMessage = '该订单未发货，删除后将退回商品库存，是否继续？'
        break
      case ORDER_STATUS.SHIPPED:
        confirmMessage = '该订单已发货，删除后将退回商品库存并更新运输记录，是否继续？'
        break
      default:
        confirmMessage = '确定要删除这个订单吗？'
    }

    await ElMessageBox.confirm(confirmMessage, '提示', {
      type: 'warning'
    })

    // 获取订单项信息
    const res = await axios.get(`http://localhost:8081/api/order-items/order/${id}`)
    const orderItems = res.data

    // 根据订单状态处理
    switch (order.status) {
      case ORDER_STATUS.UNPAID:
        // 未发货状态：退回商品库存
        for (const item of orderItems) {
          await axios.put(`http://localhost:8081/api/products/${item.product_id}/stock`, {
            quantity: item.quantity // 增加库存
          })
        }
        break

      case ORDER_STATUS.SHIPPED:
        // 已发货状态：退回商品库存，删除运输记录
        for (const item of orderItems) {
          await axios.put(`http://localhost:8081/api/products/${item.product_id}/stock`, {
            quantity: item.quantity // 增加库存
          })
        }
        // 删除运输记录
        await axios.delete(`http://localhost:8081/api/deliveries/order/${id}`)
        break
    }

    // 删除订单
    await axios.delete(`http://localhost:8081/api/orders/${id}`)
    ElMessage.success('订单删除成功')
    fetchOrders()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除订单失败:', error)
      ElMessage.error(`删除订单失败: ${error.message || '未知错误'}`)
    }
  }
}

// 更新订单状态
const updateOrderStatus = async (orderId: number, newStatus: string) => {
  try {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) {
      ElMessage.error('未找到订单信息')
      return
    }

    // 如果是从待确认到已确认，需要检查库存
    if (order.status === ORDER_STATUS.UNPAID && newStatus === ORDER_STATUS.SHIPPED) {
      // 获取订单项
      const res = await axios.get(`http://localhost:8081/api/order-items/order/${orderId}`)
      const orderItems = res.data

      // 检查每个商品的库存
      for (const item of orderItems) {
        const product = products.value.find(p => p.id === item.product_id)
        if (!product) {
          ElMessage.error(`商品 ${item.product_id} 不存在`)
          return
        }
        if (product.stock < item.quantity) {
          ElMessage.error(`商品 ${product.name} 库存不足`)
          return
        }
      }

      // 创建基础运输记录
      try {
        const now = new Date()
        const currentTime = now.toISOString().slice(0, 19).replace('T', ' ')
        const deliveryData = {
          orderId: orderId,
          courierName: '',
          company: '',
          trackingNo: '',
          status: 'pending',
          updateTime: currentTime
        }
        await axios.post('http://localhost:8081/api/deliveries', deliveryData)
        ElMessage.success('已创建运输记录，请在配送管理页面完善运输信息')
      } catch (error) {
        console.error('创建运输记录失败:', error)
        ElMessage.error('创建运输记录失败')
      }
    } else {
      // 其他状态更新
      await axios.put(`http://localhost:8081/api/orders/${orderId}`, {
        id: orderId,
        status: newStatus,
        order_no: order.order_no,
        user_id: order.user_id,
        create_time: order.create_time,
        total_price: order.total_price
      })
      ElMessage.success('订单状态更新成功')
    }

    fetchOrders() // 刷新订单列表
  } catch (error: any) {
    console.error('更新订单状态失败:', error)
    ElMessage.error(`更新订单状态失败: ${error.message || '未知错误'}`)
  }
}

// 生成订单编号
const generateOrderNo = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD${year}${month}${day}${random}`
}

// 在模板中添加状态操作按钮
const getStatusActions = (status: string) => {
  switch (status) {
    case ORDER_STATUS.UNPAID:
      return [
        { text: '发货', type: 'primary', status: ORDER_STATUS.SHIPPED }
      ]
    case ORDER_STATUS.SHIPPED:
      return [
        { text: '完成', type: 'success', status: ORDER_STATUS.COMPLETED }
      ]
    default:
      return []
  }
}

// 根据输入获取商品名称建议
const getProductSuggestions = (query: string) => {
  if (query && typeof query === 'string') {
    productSuggestions.value = products.value
        .filter(p => p.name && typeof p.name === 'string' && p.name.toLowerCase().includes(query.toLowerCase()))
        .map(p => p.name)
  } else {
    productSuggestions.value = []
  }
}

// 选择商品名称建议
const handleProductSuggestionSelect = (suggestion: string) => {
  if (typeof suggestion === 'string') {
    searchQuery.value.productName = suggestion
    searchProducts()
  }
}

// 清空商品搜索
const clearProductSearch = () => {
  searchQuery.value = {
    parentCategory: '',
    childCategory: '',
    productName: ''
  }
  childCategories.value = []
  filteredProducts.value = [...products.value]
}

// 获取当前订单的用户信息
const currentOrderUser = computed(() => {
  if (!selectedOrder.value) {
    console.log('DEBUG: currentOrderUser - selectedOrder.value is null, returning null.')
    return null
  }

  // 添加更详细的日志
  console.log('DEBUG: currentOrderUser - 当前订单:', selectedOrder.value)
  // 强制转换为数字进行比较，确保类型一致
  const orderUserIdNumber = Number(selectedOrder.value.user_id);
  console.log('DEBUG: currentOrderUser - 订单用户ID:', orderUserIdNumber, '类型:', typeof orderUserIdNumber)
  console.log('DEBUG: currentOrderUser - 所有用户:', users.value)

  // 遍历用户列表，打印每个用户的ID和类型
  users.value.forEach(user => {
    console.log('DEBUG: 用户:', user.username, 'ID:', user.id, '类型:', typeof user.id)
  })

  const user = users.value.find((u: User) => {
    const userIdInListNumber = Number(u.id);
    console.log('DEBUG: 比较:', userIdInListNumber, '和', orderUserIdNumber, '结果:', userIdInListNumber === orderUserIdNumber)
    return userIdInListNumber === orderUserIdNumber
  })

  console.log('DEBUG: currentOrderUser - 找到的用户:', user)

  return user
})

// 新增一个函数用于"搜索"按钮的点击事件
const searchUsers = async () => {
  await fetchUsers() // 调用 fetchUsers 来根据当前 userSearchQuery 进行搜索
}

// el-autocomplete 的建议查询方法：现在从已加载的 users.value 中筛选
const querySearchUser = (queryString: string, cb: (arg: any[]) => void) => {
  let results = users.value

  if (queryString) {
    const lowerCaseQuery = queryString.toLowerCase()
    results = results.filter((user: User) =>
        String(user.id).includes(lowerCaseQuery) ||
        user.username.toLowerCase().includes(lowerCaseQuery) ||
        user.real_name.toLowerCase().includes(lowerCaseQuery)
    )
  }

  // 格式化结果以适应 el-autocomplete 的需求
  const formattedResults = results.map((user: User) => ({
    ...user,
    value: `${user.username} (${user.real_name} - ID: ${user.id})` // 建议显示文本
  }))
  cb(formattedResults)
}

// 处理用户选择
const handleUserSelect = (item: User) => {
  newOrder.value.user_id = item.id
  newOrderUserText.value = `${item.username} (${item.real_name} - ID: ${item.id})`
}

// el-autocomplete 的建议查询方法：现在从已加载的 filteredProducts.value 中筛选
const querySearchProduct = (query: string, cb: (arg: AutocompleteProduct[]) => void) => {
  let results = filteredProducts.value // 从当前已过滤的商品列表中开始筛选

  if (query && typeof query === 'string') {
    const lowerCaseQuery = query.toLowerCase()
    results = results.filter((product: Product) =>
        product.name && typeof product.name === 'string' && product.name.toLowerCase().includes(lowerCaseQuery)
    )
  }

  // 格式化结果以适应 el-autocomplete 的需求
  const formattedResults = results.map((product: Product) => ({
    ...product,
    value: `${product.name} (库存: ${product.stock}, 单价: ¥${product.price})` // 建议显示文本
  }))
  cb(formattedResults)
}

// 处理商品选择
const handleProductSelect = (item: ProductSelection, selectedProduct: AutocompleteProduct) => {
  if (selectedProduct && selectedProduct.id) {
    item.productId = selectedProduct.id
    item.productText = selectedProduct.name || ''
    calculateTotal()
  }
}

// 在组件卸载前清理数据
onBeforeUnmount(() => {
  // 清理所有响应式数据
  orders.value = []
  products.value = []
  filteredProducts.value = []
  users.value = []
  categories.value = []
  parentCategories.value = []
  childCategories.value = []
  selectedOrder.value = null
  selectedProducts.value = []
  newOrder.value = {
    order_no: '',
    user_id: 0,
    create_time: '',
    total_price: 0,
    status: ORDER_STATUS.UNPAID
  }
  searchQuery.value = {
    parentCategory: '',
    childCategory: '',
    productName: ''
  }
  userSearchQuery.value = {
    username: '',
    id: ''
  }
  newOrderUserText.value = ''
})

// 修改对话框关闭处理
const handleDialogClose = () => {
  dialogVisible.value = false
  // 重置表单数据
  newOrder.value = {
    order_no: '',
    user_id: 0,
    create_time: '',
    total_price: 0,
    status: ORDER_STATUS.UNPAID
  }
  selectedProducts.value = []
  searchQuery.value = {
    parentCategory: '',
    childCategory: '',
    productName: ''
  }
  userSearchQuery.value = {
    username: '',
    id: ''
  }
  newOrderUserText.value = ''
  filteredProducts.value = [...products.value]
}

// 修改订单明细对话框关闭处理
const handleOrderDetailClose = () => {
  showOrderDetail.value = false
  selectedOrder.value = null
}

// 在 setup 中添加 router
const router = useRouter()

onMounted(() => {
  fetchOrders()
  fetchProducts().then(() => {
    filteredProducts.value = [...products.value]
  })
  fetchUsers()
  fetchCategoryTree()
  searchProducts()
})
</script>

<template>
  <div class="order-container">
    <div class="header">
      <h2>订单管理</h2>
      <el-button type="primary" @click="dialogVisible = true">新增订单</el-button>
    </div>

    <div class="search-container">
      <el-form :inline="true" :model="orderSearchQuery" class="search-form">
        <el-form-item label="订单编号">
          <el-input
              v-model="orderSearchQuery.orderNo"
              placeholder="请输入订单编号"
              clearable
              @keyup.enter="searchOrders"
          />
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input
              v-model="orderSearchQuery.userId"
              placeholder="请输入用户ID"
              clearable
              @keyup.enter="searchOrders"
          />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select
              v-model="orderSearchQuery.status"
              placeholder="请选择订单状态"
              clearable
              style="width: 200px"
          >
            <el-option
                v-for="(text, status) in ORDER_STATUS_TEXT"
                :key="status"
                :label="text"
                :value="status"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchOrders">查询</el-button>
          <el-button @click="clearOrderSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 订单列表 -->
    <el-table :data="orders" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="订单ID" width="80" />
      <el-table-column prop="order_no" label="订单编号" width="180" />
      <el-table-column prop="user_id" label="用户ID" width="100" />
      <el-table-column prop="create_time" label="创建时间" width="180" />
      <el-table-column prop="total_price" label="总价" width="120">
        <template #default="scope">
          ¥{{ scope.row.total_price.toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          {{ ORDER_STATUS_TEXT[scope.row.status] }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="scope">
          <el-button size="small" @click="fetchOrderDetail(scope.row.id)">查看明细</el-button>
          <template v-for="action in getStatusActions(scope.row.status)" :key="action.status">
            <el-button
                size="small"
                :type="action.type"
                @click="updateOrderStatus(scope.row.id, action.status)"
            >
              {{ action.text }}
            </el-button>
          </template>
          <el-button
              size="small"
              type="danger"
              @click="deleteOrder(scope.row.id)"
              v-if="scope.row.status !== ORDER_STATUS.COMPLETED"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增订单对话框 -->
    <el-dialog
        v-model="dialogVisible"
        title="新增订单"
        width="800px"
        @close="handleDialogClose"
    >
      <el-form :model="newOrder" label-width="100px">
        <el-form-item label="用户搜索">
          <div class="user-search-inputs-row">
            <div class="input-group">
              <label for="username-input">用户名:</label>
              <el-input
                  id="username-input"
                  v-model="userSearchQuery.username"
                  placeholder="请输入用户名"
                  clearable
                  style="width: 150px"
              />
            </div>
            <div class="input-group">
              <label for="user-id-input">ID:</label>
              <el-input
                  id="user-id-input"
                  v-model="userSearchQuery.id"
                  placeholder="请输入用户ID"
                  clearable
                  style="width: 150px"
              />
            </div>
            <div class="input-group" style="flex-grow: 1;">
              <label for="select-user">选择用户:</label>
              <el-autocomplete
                  id="select-user"
                  v-model="newOrderUserText"
                  :fetch-suggestions="querySearchUser"
                  placeholder="选择用户"
                  clearable
                  @select="handleUserSelect"
                  style="width: 250px"
              >
                <template #default="{ item }">
                  <div>{{ item.username }} ({{ item.real_name }} - ID: {{ item.id }})</div>
                </template>
              </el-autocomplete>
            </div>
          </div>
          <div class="user-search-buttons-row">
            <el-button type="primary" @click="searchUsers">搜索</el-button>
            <el-button @click="clearSearch">清空搜索</el-button>
          </div>
        </el-form-item>

        <el-form-item label="商品搜索">
          <div class="search-form">
            <div class="input-group">
              <label for="parent-category-input">父类:</label>
              <el-select
                  id="parent-category-input"
                  v-model="searchQuery.parentCategory"
                  placeholder="选择父类"
                  @change="updateChildCategories"
                  filterable
                  clearable
                  style="width: 200px"
              >
                <el-option
                    v-for="category in parentCategories"
                    :key="category.id"
                    :label="category.name"
                    :value="category.id"
                />
              </el-select>
            </div>
            <div class="input-group">
              <label for="child-category-input">子类:</label>
              <el-select
                  id="child-category-input"
                  v-model="searchQuery.childCategory"
                  placeholder="选择子类"
                  @change="updateProductsByCategory"
                  filterable
                  clearable
                  :disabled="!searchQuery.parentCategory"
                  style="width: 200px"
              >
                <el-option
                    v-for="category in childCategories"
                    :key="category.id"
                    :label="category.name"
                    :value="category.id"
                />
              </el-select>
            </div>
            <el-button @click="clearProductSearch">清空搜索</el-button>
          </div>
        </el-form-item>

        <el-form-item label="选择商品">
          <div v-for="(item, index) in selectedProducts" :key="index" class="product-item">
            <el-select
                v-model="item.productId"
                placeholder="选择商品"
                @change="calculateTotal"
                filterable
                style="width: 400px"
            >
              <el-option
                  v-for="product in filteredProducts"
                  :key="product.id"
                  :label="`${product.name} (库存: ${product.stock}, 单价: ¥${product.price})`"
                  :value="product.id"
              />
            </el-select>
            <el-input-number
                v-model="item.quantity"
                :min="1"
                :max="filteredProducts.find((p: Product) => p.id === item.productId)?.stock || 1"
                @change="calculateTotal"
            />
            <el-button type="danger" @click="removeProductFromOrder(index)">删除</el-button>
          </div>
          <el-button type="primary" @click="addProductToOrder">添加商品</el-button>
        </el-form-item>

        <el-form-item label="总价">
          <span class="total-price">¥{{ newOrder.total_price.toFixed(2) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createOrder">确定</el-button>
      </template>
    </el-dialog>

    <!-- 订单明细对话框 -->
    <el-dialog
        v-model="showOrderDetail"
        title="订单明细"
        width="800px"
        @close="handleOrderDetailClose"
    >
      <template v-if="selectedOrder">
        <h3>订单信息</h3>
        <p>订单编号：{{ selectedOrder.order_no }}</p>
        <p>创建时间：{{ selectedOrder.create_time }}</p>
        <p>总价：¥{{ selectedOrder.total_price.toFixed(2) }}</p>
        <p>状态：{{ ORDER_STATUS_TEXT[selectedOrder.status] }}</p>

        <h3>用户信息</h3>
        <template v-if="currentOrderUser">
          <p>用户ID：{{ currentOrderUser.id }}</p>
          <p>用户名：{{ currentOrderUser.username }}</p>
          <p>真实姓名：{{ currentOrderUser.real_name }}</p>
          <p>手机号：{{ currentOrderUser.phone }}</p>
          <p>地址：{{ currentOrderUser.address }}</p>
        </template>
        <template v-else>
          <p>未找到用户信息</p>
        </template>

        <h3>商品明细</h3>
        <el-table :data="selectedOrder.items" style="width: 100%">
          <el-table-column prop="product_id" label="商品ID" width="100" />
          <el-table-column label="商品名称" width="200">
            <template #default="scope">
              <template v-if="products && products.length > 0">
                {{ products.find(p => p.id === scope.row.product_id)?.name || '未知商品' }}
              </template>
              <template v-else>
                加载中...
              </template>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="unit_price" label="单价" width="120">
            <template #default="scope">
              ¥{{ scope.row.unit_price.toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="subtotal" label="小计" width="120">
            <template #default="scope">
              ¥{{ scope.row.subtotal.toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
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
          @size-change="(val: number) => { pageSize = val; fetchOrders() }"
          @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.order-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.product-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.search-form {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.total-price {
  font-size: 20px;
  color: #f56c6c;
  font-weight: bold;
}

.el-dialog :deep(.el-form-item__content) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.el-dialog p {
  margin: 8px 0;
  line-height: 1.5;
}

.el-dialog h3 {
  margin: 16px 0 8px;
  color: #303133;
  font-weight: 500;
}

.user-search-inputs-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
  width: 100%;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.user-search-buttons-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  width: 100%;
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
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}
</style>