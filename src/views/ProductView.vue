<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

// 商品接口定义
interface Product {
  id?: number
  name: string
  price: number
  stock: number
  category_id: number
  description: string
  image_url: string
  status: number
  create_time: string
  update_time: string
}

// 分类接口定义
interface Category {
  id: number
  name: string
  parent_id: number
  description: string
  sort_order: number
  status: number
}

// 响应式变量定义
const products = ref<Product[]>([])
const parentCategories = ref<Category[]>([])
const childCategories = ref<Category[]>([])
const showForm = ref(false)
const isEditing = ref(false)
const searchForm = ref({
  name: '',
  category_id: null as number | null,
  minPrice: null as number | null,
  maxPrice: null as number | null
})
const searchKeyword = ref('')
const parentCategorySearch = ref('')
const childCategorySearch = ref('')
const showParentDropdown = ref(false)
const showChildDropdown = ref(false)
const selectedParentId = ref<number | null>(null)
const categorySearch = ref('')
const showCategoryDropdown = ref(false)
const loading = ref(false)
const dialogVisible = ref(false)
const selectedIds = ref<number[]>([])
const showBatchDelete = ref(false)
const selectedProducts = ref<number[]>([])

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(5)
const total = ref(0)

// 商品表单对象
const form = ref<Product>({
  name: '',
  price: 0,
  stock: 0,
  category_id: 0,
  description: '',
  image_url: '',
  status: 1,
  create_time: '',
  update_time: ''
})

// 选择模式相关
const isSelectionMode = ref(false);
const selectAll = ref(false);

// 获取父分类数据
const fetchParentCategories = async () => {
  try {
    const res = await axios.get('http://localhost:8081/api/categories/parents')
    parentCategories.value = res.data
  } catch (error: any) {
    console.error('获取父分类列表失败:', error)
    ElMessage.error('获取父分类列表失败')
  }
}

// 获取子分类数据
const fetchChildCategories = async (parentId: number) => {
  try {
    const res = await axios.get(`http://localhost:8081/api/categories/parent/${parentId}/children`)
    childCategories.value = res.data
  } catch (error: any) {
    console.error('获取子分类列表失败:', error)
    ElMessage.error('获取子分类列表失败')
  }
}

// 获取所有子分类数据
const fetchAllChildCategories = async () => {
  try {
    const res = await axios.get('http://localhost:8081/api/categories/children')
    childCategories.value = res.data
  } catch (error: any) {
    console.error('获取子分类列表失败:', error)
    ElMessage.error('获取子分类列表失败')
  }
}

// 根据分类ID获取分类名称
const getCategoryName = (categoryId: number) => {
  const category = childCategories.value.find(c => c.id === categoryId)
  return category ? category.name : '未知分类'
}

// 过滤父分类列表
const filteredParentCategories = computed(() => {
  return parentCategories.value.filter(category =>
      category.name.toLowerCase().includes(parentCategorySearch.value.toLowerCase())
  )
})

// 过滤子分类列表
const filteredChildCategories = computed(() => {
  if (selectedParentId.value) {
    // 如果选择了父分类，只显示该父分类下的子分类
    return childCategories.value
        .filter(category => category.parent_id === selectedParentId.value)
        .filter(category => category.name.toLowerCase().includes(childCategorySearch.value.toLowerCase()))
  } else {
    // 如果没有选择父分类，显示所有子分类
    return childCategories.value
        .filter(category => category.name.toLowerCase().includes(childCategorySearch.value.toLowerCase()))
  }
})

// 选择父分类
const selectParentCategory = (category: Category) => {
  selectedParentId.value = category.id
  parentCategorySearch.value = category.name
  showParentDropdown.value = false
  // 清空子分类选择
  childCategorySearch.value = ''
  form.value.category_id = 0
}

// 选择子分类
const selectChildCategory = (category: Category) => {
  form.value.category_id = category.id
  childCategorySearch.value = category.name
  showChildDropdown.value = false
  // 如果父分类为空，自动设置父分类
  if (!selectedParentId.value && category.parent_id > 0) {
    const parentCategory = parentCategories.value.find(p => p.id === category.parent_id)
    if (parentCategory) {
      selectedParentId.value = parentCategory.id
      parentCategorySearch.value = parentCategory.name
    }
  }
}

// 切换表单显示，并重置
const openDialog = (product?: Product) => {
  if (product) {
    form.value = { ...product }
    isEditing.value = true
  } else {
    resetForm()
  }
  showForm.value = true
}

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '价格必须大于0', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入库存数量', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存必须大于等于0', trigger: 'blur' }
  ],
  category_id: [
    { required: true, message: '请选择商品分类', trigger: 'change' }
  ]
}

// 表单提交处理
const submitForm = async () => {
  if (!validateForm()) return
  try {
    if (isEditing.value && form.value.id) {
      await axios.put('http://localhost:8081/api/products', form.value)
      ElMessage.success('商品更新成功')
    } else {
      await axios.post('http://localhost:8081/api/products', form.value)
      ElMessage.success('商品添加成功')
    }
    await fetchProducts()
    resetForm()
    showForm.value = false
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data || '操作失败，请重试')
  }
}

// 编辑商品
const editProduct = (product: Product) => {
  form.value = { ...product }
  const category = childCategories.value.find(c => c.id === product.category_id)
  if (category) {
    selectedParentId.value = category.parent_id
    fetchChildCategories(category.parent_id)
  }
  isEditing.value = true
  showForm.value = true
}

// 删除商品
const deleteProduct = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？', '警告', {
      type: 'warning'
    })
    await axios.delete(`http://localhost:8081/api/products/${id}`)
    ElMessage.success('商品删除成功')
    await fetchProducts()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    name: '',
    price: 0,
    stock: 0,
    category_id: 0,
    description: '',
    image_url: '',
    status: 1,
    create_time: '',
    update_time: ''
  }
  parentCategorySearch.value = ''
  childCategorySearch.value = ''
  selectedParentId.value = null
  isEditing.value = false
  // 重置时重新获取所有子分类
  fetchAllChildCategories()
}

// 表单校验
const validateForm = () => {
  if (!form.value.name) {
    ElMessage.warning('请输入商品名称')
    return false
  }
  if (form.value.price <= 0) {
    ElMessage.warning('请输入有效的价格')
    return false
  }
  if (form.value.stock < 0) {
    ElMessage.warning('库存不能为负数')
    return false
  }
  if (!form.value.category_id) {
    ElMessage.warning('请选择商品分类')
    return false
  }
  return true
}

// 过滤商品列表
const filteredProducts = computed(() => {
  return products.value
      .filter(p => {
        const search = searchForm.value
        const nameMatch = !search.name || p.name.toLowerCase().includes(search.name.toLowerCase())
        const categoryMatch = !search.category_id || p.category_id === search.category_id
        const minPriceMatch = !search.minPrice || p.price >= search.minPrice
        const maxPriceMatch = !search.maxPrice || p.price <= search.maxPrice
        return nameMatch && categoryMatch && minPriceMatch && maxPriceMatch
      })
      .sort((a: Product, b: Product) => {
        // 首先按状态排序（1在前，0在后）
        if (a.status !== b.status) {
          return b.status - a.status
        }
        // 如果状态相同，按ID排序
        return (a.id || 0) - (b.id || 0)
      })
})

// 监听搜索条件变化
watch([searchForm, categorySearch], () => {
  // 当分类搜索框被清空时，同时清空分类ID
  if (!categorySearch.value) {
    searchForm.value.category_id = null
  }
  // 强制更新过滤后的商品列表
  filteredProducts.value
}, { deep: true })

// 获取商品数据
const fetchProducts = async () => {
  try {
    const res = await axios.get(`http://localhost:8081/api/products?page=${currentPage.value}&size=${pageSize.value}`)
    console.log('获取到的商品数据:', res.data)
    // 对商品进行排序，状态为1的在前，状态为0的在后
    products.value = res.data.products.sort((a: Product, b: Product) => {
      if (a.status !== b.status) {
        return b.status - a.status
      }
      return (a.id || 0) - (b.id || 0)
    })
    total.value = res.data.total
    currentPage.value = res.data.currentPage
    pageSize.value = res.data.pageSize
  } catch (error: any) {
    console.error('获取商品列表失败:', error)
    ElMessage.error('获取商品列表失败')
  }
}

// 过滤分类列表
const filteredCategories = computed(() => {
  if (!categorySearch.value) return childCategories.value
  return childCategories.value.filter(category =>
      category.name.toLowerCase().includes(categorySearch.value.toLowerCase())
  )
})

// 选择分类
const selectCategory = (category: Category) => {
  searchForm.value.category_id = category.id
  categorySearch.value = category.name
  showCategoryDropdown.value = false
}

// 处理分类输入框点击
const handleCategoryInputClick = () => {
  showCategoryDropdown.value = true
}

// 处理分类输入框清空
const handleCategoryClear = () => {
  categorySearch.value = ''
  searchForm.value.category_id = null
  showCategoryDropdown.value = false
}

// 点击外部关闭下拉框
const closeCategoryDropdown = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.category-search')) {
    showCategoryDropdown.value = false
  }
}

// 添加获取父分类状态的函数
const getParentCategoryStatus = (categoryId: number) => {
  const childCategory = childCategories.value.find(c => c.id === categoryId)
  if (childCategory && childCategory.parent_id > 0) {
    const parentCategory = parentCategories.value.find(p => p.id === childCategory.parent_id)
    return parentCategory ? parentCategory.status : 1
  }
  return 1
}

// 修改状态切换处理函数
const handleStatusChange = async (product: Product, newStatus: number) => {
  try {
    const childCategory = childCategories.value.find(c => c.id === product.category_id)
    if (!childCategory) {
      ElMessage.error('无法获取商品分类信息')
      return
    }

    // 如果要启用商品
    if (newStatus === 1) {
      // 检查子分类状态
      if (childCategory.status === 0) {
        ElMessage.warning('该商品所属的子分类已禁用，无法启用商品')
        return
      }

      // 检查父分类状态
      if (childCategory.parent_id > 0) {
        const parentCategory = parentCategories.value.find(p => p.id === childCategory.parent_id)
        if (parentCategory && parentCategory.status === 0) {
          ElMessage.warning('该商品所属的父分类已禁用，无法启用商品')
          return
        }
      }
    }

    // 更新商品状态
    await axios.put(`http://localhost:8081/api/products/${product.id}/status?status=${newStatus}`)

    // 如果商品被禁用，检查是否需要更新分类状态
    if (newStatus === 0) {
      // 检查该分类下是否还有其他上架商品
      const hasActiveProducts = products.value.some(p =>
          p.category_id === childCategory.id && p.status === 1 && p.id !== product.id
      )

      // 如果没有其他上架商品，更新分类状态
      if (!hasActiveProducts) {
        await axios.put(`http://localhost:8081/api/categories/${childCategory.id}/status?status=0&syncChildren=false&syncProducts=false`)
      }
    }

    // 重新获取数据以更新显示
    await Promise.all([
      fetchProducts(),
      fetchParentCategories(),
      fetchAllChildCategories()
    ])

    ElMessage.success('状态更新成功')
  } catch (error: any) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败，请重试')
  }
}

// 进入选择模式
const enterSelectionMode = () => {
  isSelectionMode.value = true;
  selectedProducts.value = [];
  selectAll.value = false;
};

// 退出选择模式
const exitSelectionMode = () => {
  isSelectionMode.value = false;
  selectedProducts.value = [];
  selectAll.value = false;
};

// 处理行点击
const handleRowClick = (product: Product) => {
  if (isSelectionMode.value) {
    const index = selectedProducts.value.indexOf(product.id!);
    if (index === -1) {
      selectedProducts.value.push(product.id!);
    } else {
      selectedProducts.value.splice(index, 1);
    }
    selectAll.value = selectedProducts.value.length === filteredProducts.value.length;
  }
};

// 处理全选/取消全选
const handleSelectAllChange = (val: boolean) => {
  if (val) {
    selectedProducts.value = filteredProducts.value.map(p => p.id!);
  } else {
    selectedProducts.value = [];
  }
};

// 表格选择变化处理
const handleSelectionChange = (selection: Product[]) => {
  selectedProducts.value = selection.map(p => p.id!)
}

// 切换批量删除模式
const toggleBatchDelete = () => {
  showBatchDelete.value = !showBatchDelete.value
  if (!showBatchDelete.value) {
    selectedProducts.value = []
  }
}

// 批量删除商品
const batchDeleteProducts = async () => {
  if (selectedProducts.value.length === 0) {
    ElMessage.warning('请选择要删除的商品')
    return
  }

  try {
    await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedProducts.value.length} 个商品吗？`,
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    await axios.post('http://localhost:8081/api/products/batchDelete', selectedProducts.value)
    ElMessage.success('批量删除成功')
    await fetchProducts()
    toggleBatchDelete()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败，请重试')
    }
  }
}

// 处理父分类变化
const handleParentCategoryChange = async (parentId: number | null) => {
  if (parentId) {
    await fetchChildCategories(parentId)
  } else {
    await fetchAllChildCategories()
  }
  form.value.category_id = 0
}

// 处理子分类变化
const handleChildCategoryChange = (categoryId: number) => {
  const selectedChild = childCategories.value.find(c => c.id === categoryId)
  if (selectedChild && !selectedParentId.value) {
    selectedParentId.value = selectedChild.parent_id
  }
}

// 添加重置搜索函数
const resetSearch = () => {
  searchForm.value = {
    name: '',
    category_id: null,
    minPrice: null,
    maxPrice: null
  }
  categorySearch.value = ''
  showCategoryDropdown.value = false
}

// 处理上传成功
const handleUploadSuccess = (response: any) => {
  form.value.image_url = response.data
  ElMessage.success('图片上传成功')
}

// 处理上传失败
const handleUploadError = () => {
  ElMessage.error('图片上传失败')
}

// 上传前检查
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 处理页码变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchProducts()
}

onMounted(() => {
  fetchParentCategories()
  fetchAllChildCategories()
  fetchProducts()
  document.addEventListener('click', closeCategoryDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeCategoryDropdown)
})
</script>

<template>
  <div class="product-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="search-container">
        <div class="search-item">
          <el-input
              v-model="searchForm.name"
              placeholder="商品名称"
              clearable
              @clear="searchForm.name = ''"
          />
        </div>

        <div class="search-item category-search">
          <el-input
              v-model="categorySearch"
              placeholder="商品分类"
              clearable
              @click="handleCategoryInputClick"
              @clear="handleCategoryClear"
          />
          <div v-if="showCategoryDropdown" class="category-dropdown">
            <div class="category-list">
              <div
                  v-for="category in filteredCategories"
                  :key="category.id"
                  class="category-item"
                  @click="selectCategory(category)"
              >
                {{ category.name }}
              </div>
            </div>
          </div>
        </div>

        <div class="search-item price-range">
          <el-input-number
              v-model="searchForm.minPrice"
              placeholder="最低价"
              :min="0"
              :precision="2"
              :step="0.1"
              clearable
          />
          <span class="price-separator">-</span>
          <el-input-number
              v-model="searchForm.maxPrice"
              placeholder="最高价"
              :min="0"
              :precision="2"
              :step="0.1"
              clearable
          />
        </div>

        <div class="search-actions">
          <el-button type="primary" @click="resetSearch">重置</el-button>
        </div>
      </div>

      <div class="action-buttons">
        <el-button
            type="danger"
            :class="{ active: showBatchDelete }"
            @click="toggleBatchDelete"
        >
          <i class="fas fa-trash"></i>
          {{ showBatchDelete ? '取消批量删除' : '批量删除' }}
        </el-button>
        <el-button
            v-if="showBatchDelete"
            type="primary"
            @click="batchDeleteProducts"
            :disabled="selectedProducts.length === 0"
        >
          删除选中商品 ({{ selectedProducts.length }})
        </el-button>
        <el-button type="primary" @click="openDialog()">
          <i class="fas fa-plus"></i> 添加商品
        </el-button>
      </div>
    </div>

    <!-- 商品列表 -->
    <div class="table-container">
      <table class="product-table">
        <thead>
        <tr>
          <th v-if="showBatchDelete" style="width: 50px;">
            <el-checkbox
                :model-value="selectedProducts.length === filteredProducts.length"
                :indeterminate="selectedProducts.length > 0 && selectedProducts.length < filteredProducts.length"
                @change="(val: boolean) => selectedProducts = val ? filteredProducts.map(p => p.id!) : []"
            />
          </th>
          <th>图片</th>
          <th>名称</th>
          <th>价格</th>
          <th>库存</th>
          <th>分类</th>
          <th>描述</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="p in filteredProducts" :key="p.id" :class="{ 'product-disabled': p.status === 0 }">
          <td v-if="showBatchDelete">
            <el-checkbox
                :model-value="selectedProducts.includes(p.id!)"
                @change="(val: boolean) => {
                  if (val) {
                    selectedProducts.push(p.id!)
                  } else {
                    selectedProducts = selectedProducts.filter(id => id !== p.id)
                  }
                }"
            />
          </td>
          <td>
            <img
                :src="p.image_url"
                :alt="p.name"
                class="product-image"
                v-if="p.image_url"
            />
            <div class="no-image" v-else>暂无图片</div>
          </td>
          <td>{{ p.name }}</td>
          <td>¥{{ p.price.toFixed(2) }}</td>
          <td>{{ p.stock }}</td>
          <td>{{ getCategoryName(p.category_id) }}</td>
          <td class="description-cell">{{ p.description || '暂无描述' }}</td>
          <td>
            <el-switch
                :model-value="p.status"
                :active-value="1"
                :inactive-value="0"
                @change="(val: number) => handleStatusChange(p, val)"
                active-text="上架"
                inactive-text="下架"
            />
          </td>
          <td class="action-buttons">
            <button class="btn btn-edit" @click="editProduct(p)">
              <i class="fas fa-edit"></i> 编辑
            </button>
            <button class="btn btn-delete" @click="deleteProduct(p.id!)">
              <i class="fas fa-trash"></i> 删除
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            :page-sizes="[5, 10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="(val: number) => { pageSize = val; fetchProducts() }"
            @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 商品表单弹窗 -->
    <el-dialog
        v-model="showForm"
        :title="isEditing ? '编辑商品' : '添加商品'"
        width="500px"
    >
      <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
      >
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>

        <el-form-item label="商品价格" prop="price">
          <el-input-number
              v-model="form.price"
              :precision="2"
              :step="0.1"
              :min="0"
              placeholder="请输入商品价格"
          />
        </el-form-item>

        <el-form-item label="库存数量" prop="stock">
          <el-input-number
              v-model="form.stock"
              :min="0"
              :precision="0"
              placeholder="请输入库存数量"
          />
        </el-form-item>

        <el-form-item label="商品分类" prop="category_id">
          <div class="category-select-container">
            <!-- 父分类选择 -->
            <el-select
                v-model="selectedParentId"
                placeholder="请选择父分类（可选）"
                filterable
                clearable
                style="width: 100%; margin-bottom: 10px;"
                @change="handleParentCategoryChange"
            >
              <el-option
                  v-for="category in parentCategories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
              />
            </el-select>

            <!-- 子分类选择 -->
            <el-select
                v-model="form.category_id"
                placeholder="请选择子分类"
                filterable
                style="width: 100%"
                @change="handleChildCategoryChange"
            >
              <el-option
                  v-for="category in filteredChildCategories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
              />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="商品描述">
          <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入商品描述（选填）"
          />
        </el-form-item>

        <el-form-item label="商品图片">
          <el-upload
              class="product-image-uploader"
              action="http://localhost:8081/api/upload"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :before-upload="beforeUpload"
          >
            <img v-if="form.image_url" :src="form.image_url" class="uploaded-image" />
            <el-icon v-else class="upload-icon"><Plus /></el-icon>
            <div class="upload-text">点击上传图片</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="商品状态" prop="status">
          <el-switch
              v-model="form.status"
              :active-value="1"
              :inactive-value="0"
              active-text="上架"
              inactive-text="下架"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showForm = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.product-container {
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-width: 1200px;
  margin: 0 auto;
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.search-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
  margin-right: 1rem;
}

.search-item {
  position: relative;
}

.category-search {
  min-width: 200px;
  position: relative;
}

.price-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-separator {
  color: #909399;
}

.search-actions {
  display: flex;
  gap: 0.5rem;
}

.category-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  z-index: 1000;
  margin-top: 4px;
}

.category-list {
  max-height: 200px;
  overflow-y: auto;
}

.category-item {
  padding: 8px 12px;
  cursor: pointer;
}

.category-item:hover {
  background-color: #f5f7fa;
}

/* 按钮样式 */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover {
  background-color: #66b1ff;
}

.btn-edit {
  background-color: #67c23a;
  color: white;
}

.btn-delete {
  background-color: #f56c6c;
  color: white;
}

/* 表格样式 */
.table-container {
  overflow-x: auto;
  margin-top: 2rem;
}

.product-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.product-table th,
.product-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ebeef5;
}

.product-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

.product-table tr:hover {
  background-color: #f5f7fa;
}

.product-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}

.no-image {
  width: 80px;
  height: 80px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.el-button.active {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: white;
}

.el-button.active:hover {
  background-color: #f78989;
  border-color: #f78989;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .search-container {
    flex-wrap: wrap;
  }

  .search-item {
    flex: 1;
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .search-container {
    flex-direction: column;
  }

  .search-item {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .el-button {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}

.category-select-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.el-switch {
  margin: 0 8px;
}

.el-switch__label {
  color: #606266;
}

.el-switch__label.is-active {
  color: #409EFF;
}

.description-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description-cell:hover {
  white-space: normal;
  overflow: visible;
  position: relative;
  z-index: 1;
  background: white;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  padding: 8px;
  border-radius: 4px;
}

.product-disabled {
  opacity: 0.7;
  background-color: #f5f7fa;
}

.product-disabled:hover {
  background-color: #ebeef5;
}

.product-disabled .product-image {
  opacity: 0.7;
}

.product-disabled .btn {
  opacity: 0.8;
}

.product-disabled .btn:hover {
  opacity: 1;
}

.el-tag {
  padding: 0 8px;
  height: 24px;
  line-height: 24px;
  border-radius: 4px;
}

.el-tag--success {
  background-color: #f0f9eb;
  border-color: #e1f3d8;
  color: #67c23a;
}

.el-tag--info {
  background-color: #f4f4f5;
  border-color: #e9e9eb;
  color: #909399;
}

.product-image-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 178px;
  height: 178px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.product-image-uploader:hover {
  border-color: #409EFF;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
}

.upload-text {
  color: #8c939d;
  font-size: 14px;
  margin-top: 8px;
}

.uploaded-image {
  width: 178px;
  height: 178px;
  object-fit: cover;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.page-input {
  display: flex;
  align-items: center;
  color: #606266;
}

.page-input .el-input {
  margin: 0 8px;
}

.page-input .el-input__inner {
  text-align: center;
}
</style>