<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 分类接口定义
interface Category {
  id?: number
  name: string
  parent_id: number
  description: string
  sort_order: number
  status: number
  children?: Category[]
}

// 响应式变量定义
const categories = ref<Category[]>([])
const parentCategories = ref<Category[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const selectedIds = ref<number[]>([])

// 分类表单对象
const form = ref<Category>({
  name: '',
  parent_id: 0,
  description: '',
  sort_order: 0,
  status: 1
})

// 获取分类数据
const fetchCategories = async () => {
  loading.value = true
  try {
    // 获取所有父分类
    const parentRes = await axios.get('http://localhost:8081/api/categories/parents')
    const parentCategoriesData = parentRes.data

    // 获取所有子分类
    const childRes = await axios.get('http://localhost:8081/api/categories/children')
    const childCategories = childRes.data

    // 对父分类进行排序：启用的在前，禁用的在后，同状态的按 sort_order 排序
    const sortedParentCategories = parentCategoriesData.sort((a: Category, b: Category) => {
      if (a.status !== b.status) {
        return b.status - a.status
      }
      return a.sort_order - b.sort_order
    })

    // 将子分类添加到对应的父分类中
    sortedParentCategories.forEach((parent: Category) => {
      parent.children = childCategories
          .filter((child: Category) => child.parent_id === parent.id)
          .sort((a: Category, b: Category) => {
            if (a.status !== b.status) {
              return b.status - a.status
            }
            return a.sort_order - b.sort_order
          })
    })

    categories.value = sortedParentCategories
    parentCategories.value = sortedParentCategories
  } catch (error: any) {
    console.error('获取分类列表失败:', error)
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

// 表格选择变化处理
const handleSelectionChange = (selection: Category[]) => {
  selectedIds.value = selection.map((item: Category) => item.id!)
}

// 打开表单
const openDialog = (category?: Category) => {
  if (category) {
    form.value = { ...category }
    isEdit.value = true
  } else {
    form.value = {
      name: '',
      parent_id: 0,
      description: '',
      sort_order: 0,
      status: 1
    }
    isEdit.value = false
  }
  dialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  if (!validateForm()) return
  try {
    if (isEdit.value && form.value.id) {
      await axios.put('http://localhost:8081/api/categories', form.value)
      ElMessage.success('分类更新成功')
    } else {
      await axios.post('http://localhost:8081/api/categories', form.value)
      ElMessage.success('分类添加成功')
    }
    dialogVisible.value = false
    fetchCategories()
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data || '操作失败，请重试')
  }
}

// 删除分类
const deleteCategory = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该分类吗？', '警告', {
      type: 'warning'
    })
    await axios.delete(`http://localhost:8081/api/categories/${id}`)
    ElMessage.success('分类删除成功')
    fetchCategories()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 批量删除
const deleteBatch = async () => {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择分类')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 项？`, '警告', {
      type: 'warning'
    })
    await axios.post('http://localhost:8081/api/categories/batchDelete', selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    fetchCategories()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败，请重试')
    }
  }
}

// 更新状态
const updateStatus = async (id: number, status: number, isParent: boolean) => {
  try {
    // 如果是父分类，需要同步更新所有子分类
    if (isParent) {
      await axios.put(`http://localhost:8081/api/categories/${id}/status?status=${status}&syncChildren=true`)
    } else {
      // 如果是子分类，需要同步更新相关商品
      await axios.put(`http://localhost:8081/api/categories/${id}/status?status=${status}&syncProducts=true`)
    }
    ElMessage.success('状态更新成功')
    // 重新获取并排序分类列表
    await fetchCategories()
  } catch (error: any) {
    console.error('状态更新失败:', error)
    ElMessage.error(error.response?.data || '状态更新失败，请重试')
  }
}

// 更新排序
const updateSortOrder = async (id: number, sortOrder: number) => {
  try {
    await axios.put(`http://localhost:8081/api/categories/${id}/sort?sortOrder=${sortOrder}`)
    ElMessage.success('排序更新成功')
    await fetchCategories()
  } catch (error: any) {
    console.error('排序更新失败:', error)
    ElMessage.error('排序更新失败，请重试')
  }
}

// 表单校验
const validateForm = () => {
  if (!form.value.name) {
    ElMessage.warning('请输入分类名称')
    return false
  }
  return true
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="category-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="action-bar">
        <button class="btn btn-primary" @click="openDialog()">
          <i class="fas fa-plus"></i> 添加分类
        </button>
        <button class="btn btn-danger" @click="deleteBatch" :disabled="!selectedIds.length">
          <i class="fas fa-trash"></i> 批量删除
        </button>
      </div>
    </div>

    <!-- 分类列表 -->
    <div class="table-container" v-loading="loading">
      <el-table
          :data="categories"
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
          row-key="id"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="150">
          <template #default="scope">
            <div class="sort-controls">
              <el-button
                  size="small"
                  :disabled="scope.row.sort_order <= 0"
                  @click="updateSortOrder(scope.row.id!, scope.row.sort_order - 1)"
              >
                <i class="fas fa-arrow-up"></i>
              </el-button>
              <span class="sort-number">{{ scope.row.sort_order }}</span>
              <el-button
                  size="small"
                  :disabled="scope.row.sort_order >= 999"
                  @click="updateSortOrder(scope.row.id!, scope.row.sort_order + 1)"
              >
                <i class="fas fa-arrow-down"></i>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-switch
                v-model="scope.row.status"
                :active-value="1"
                :inactive-value="0"
                @change="(val: number) => updateStatus(scope.row.id!, val, !scope.row.parent_id)"
            />
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="150">
          <template #default="scope">
            <button class="btn btn-edit" @click="openDialog(scope.row)">
              <i class="fas fa-edit"></i> 编辑
            </button>
            <button class="btn btn-delete" @click="deleteCategory(scope.row.id!)">
              <i class="fas fa-trash"></i> 删除
            </button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分类表单弹窗 -->
    <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑分类' : '添加分类'"
        width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="父分类">
          <el-select v-model="form.parent_id" placeholder="请选择父分类">
            <el-option label="无" :value="0" />
            <el-option
                v-for="category in parentCategories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入分类描述"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
              v-model="form.status"
              :active-value="1"
              :inactive-value="0"
              active-text="启用"
              inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.category-container {
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-width: 1200px;
  margin: 0 auto;
}

/* 工具栏样式 */
.toolbar {
  margin-bottom: 1.5rem;
}

.action-bar {
  display: flex;
  gap: 1rem;
}

/* 按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 32px;
  line-height: 1;
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover {
  background-color: #66b1ff;
}

.btn-danger {
  background-color: #f56c6c;
  color: white;
}

.btn-danger:hover {
  background-color: #f78989;
}

.btn-danger:disabled {
  background-color: #fab6b6;
  cursor: not-allowed;
}

.btn-edit {
  background-color: #67c23a;
  color: white;
}

.btn-delete {
  background-color: #f56c6c;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.8;
}

/* 表格样式 */
.table-container {
  margin-top: 2rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* 排序控制样式 */
.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-number {
  min-width: 40px;
  text-align: center;
}

/* 表格展开图标样式 */
:deep(.el-table__expand-icon) {
  margin-right: 8px;
}

:deep(.el-table__expand-icon .el-icon) {
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .category-container {
    padding: 1rem;
  }

  .action-bar {
    flex-direction: column;
  }

  .action-bar .btn {
    width: 100%;
  }
}
</style> 