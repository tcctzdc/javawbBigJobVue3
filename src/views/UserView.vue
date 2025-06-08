<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'


// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 类型定义
interface User {
  id?: number
  username: string
  password?: string
  real_name: string
  phone: string
  address: string
  create_time: string
}

// 状态管理
const state = {
  users: ref<User[]>([]),
  form: ref<User>({
    username: '',
    password: '',
    real_name: '',
    phone: '',
    address: '',
    create_time: ''
  }),
  isEditing: ref(false),
  showForm: ref(false),
  searchForm: ref({
    username: '',
    real_name: '',
    phone: ''
  }),
  selectedIds: ref<number[]>([]),
  isSelectionMode: ref(false),
  selectAll: ref(false)
}

// 计算属性
const filteredUsers = computed(() =>
    state.users.value.filter(user => {
      const searchForm = state.searchForm.value
      return (
          (!searchForm.username || user.username.toLowerCase().includes(searchForm.username.toLowerCase())) &&
          (!searchForm.real_name || user.real_name.toLowerCase().includes(searchForm.real_name.toLowerCase())) &&
          (!searchForm.phone || user.phone.includes(searchForm.phone))
      )
    })
)

// API 请求
const api = {
  async loadUsers() {
    try {
      const res = await axios.get(`http://localhost:8081/api/users?page=${currentPage.value}&size=${pageSize.value}`)
      console.log('获取到的用户数据:', res.data)
      users.value = res.data.users
      total.value = res.data.total
      currentPage.value = res.data.currentPage
      pageSize.value = res.data.pageSize
    } catch (err) {
      console.error("获取用户列表失败：", err)
      ElMessage.error('获取用户列表失败')
    }
  },

  async addUser(user: User) {
    await axios.post('http://localhost:8081/api/users', user)
  },

  async updateUser(user: User) {
    const updateData = { ...user }
    if (!updateData.password) delete updateData.password
    await axios.put('http://localhost:8081/api/users', updateData)
  },

  async deleteUser(id: number) {
    await axios.delete(`http://localhost:8081/api/users/${id}`)
  },

  async batchDeleteUsers(ids: number[]) {
    await axios.post('http://localhost:8081/api/users/batchDelete', ids, {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// 表单操作
const formActions = {
  reset() {
    state.form.value = {
      username: '',
      password: '',
      real_name: '',
      phone: '',
      address: '',
      create_time: ''
    }
    state.isEditing.value = false
    state.showForm.value = false
  },

  toggle() {
    state.showForm.value = !state.showForm.value
    if (!state.showForm.value) {
      formActions.reset()
    }
  },

  async submit() {
    try {
      if (state.isEditing.value && state.form.value.id) {
        await api.updateUser(state.form.value)
        ElMessage.success('用户更新成功')
      } else {
        if (!state.form.value.password) {
          ElMessage.warning('新增用户时密码不能为空')
          return
        }
        await api.addUser(state.form.value)
        ElMessage.success('用户添加成功')
      }
      await api.loadUsers()
      formActions.reset()
    } catch (error) {
      console.error("提交失败：", error)
      ElMessage.error('操作失败，请稍后重试')
    }
  },

  edit(user: User) {
    state.form.value = { ...user, password: '' }
    state.isEditing.value = true
    state.showForm.value = true
  }
}

// 用户操作
const userActions = {
  async delete(id: number | undefined) {
    if (!id) return
    try {
      await ElMessageBox.confirm('确认删除该用户？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await api.deleteUser(id)
      ElMessage.success('用户删除成功')
      await api.loadUsers()
    } catch (error) {
      if (error !== 'cancel') {
        console.error("删除失败：", error)
        ElMessage.error('删除失败，请稍后重试')
      }
    }
  }
}

// 批量操作
const batchActions = {
  toggleSelect(id: number) {
    if (state.selectedIds.value.includes(id)) {
      state.selectedIds.value = state.selectedIds.value.filter(i => i !== id)
    } else {
      state.selectedIds.value.push(id)
    }
  },

  toggleSelectAll(event: Event) {
    const target = event.target as HTMLInputElement
    if (!target) return
    state.selectedIds.value = target.checked
        ? state.users.value.filter(u => u.id !== undefined).map(u => u.id!)
        : []
  },

  async deleteSelected() {
    if (state.selectedIds.value.length === 0) {
      ElMessage.warning('请先选择用户')
      return
    }
    try {
      await ElMessageBox.confirm(
          `确定要删除选中的 ${state.selectedIds.value.length} 个用户？`,
          '警告',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
      )
      await api.batchDeleteUsers(state.selectedIds.value)
      ElMessage.success('批量删除成功')
      await api.loadUsers()
      state.selectedIds.value = []
      state.isSelectionMode.value = false
    } catch (error) {
      if (error !== 'cancel') {
        console.error("批量删除失败", error)
        ElMessage.error('删除失败')
      }
    }
  }
}

// 搜索操作
const searchActions = {
  resetSearch() {
    state.searchForm.value = {
      username: '',
      real_name: '',
      phone: ''
    }
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  api.loadUsers()
}

// 生命周期加载数据
onMounted(api.loadUsers)

// 暴露模板所需变量和方法
const {
  users,
  form,
  isEditing,
  showForm,
  searchForm,
  selectedIds,
  isSelectionMode,
  selectAll
} = state

const {
  reset: resetForm,
  toggle: toggleForm,
  submit: submitForm,
  edit: editUser
} = formActions

const {
  delete: deleteUser
} = userActions

const {
  toggleSelect,
  toggleSelectAll,
  deleteSelected
} = batchActions

const {
  resetSearch
} = searchActions
</script>

<template>
  <div class="toolbar">
    <div class="search-container">
      <div class="search-form">
        <div class="search-item">
          <label>用户名</label>
          <input
              v-model="searchForm.username"
              placeholder="请输入用户名"
              class="search-input"
          />
        </div>
        <div class="search-item">
          <label>真实姓名</label>
          <input
              v-model="searchForm.real_name"
              placeholder="请输入真实姓名"
              class="search-input"
          />
        </div>
        <div class="search-item">
          <label>手机号</label>
          <input
              v-model="searchForm.phone"
              placeholder="请输入手机号"
              class="search-input"
          />
        </div>
        <div class="search-actions">
          <button class="btn btn-secondary" @click="resetSearch">
            <i class="fas fa-redo"></i> 重置
          </button>
        </div>
      </div>
    </div>
    <div class="toolbar-actions">
      <template v-if="!isSelectionMode">
        <button class="btn btn-primary" @click="toggleForm">
          <i class="fas fa-plus"></i>
          {{ showForm ? '关闭表单' : '添加用户' }}
        </button>
        <button class="btn btn-danger" @click="isSelectionMode = true">
          <i class="fas fa-trash"></i> 批量删除
        </button>
      </template>
      <template v-else>
        <div class="selection-mode-actions">
          <span class="selected-count">已选择 {{ selectedIds.length }} 项</span>
          <button class="btn btn-secondary" @click="isSelectionMode = false">
            取消
          </button>
          <button
              class="btn btn-danger"
              @click="deleteSelected"
              :disabled="!selectedIds.length"
          >
            删除
          </button>
        </div>
      </template>
    </div>
  </div>

  <!-- 用户表单 -->
  <div v-if="showForm" class="form-container">
    <form @submit.prevent="submitForm" class="user-form">
      <h3>{{ isEditing ? '编辑用户' : '添加用户' }}</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>用户名</label>
          <input
              v-model="form.username"
              type="text"
              required
              placeholder="请输入用户名"
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input
              v-model="form.password"
              type="password"
              :required="!isEditing"
              placeholder="请输入密码"
          />
        </div>
        <div class="form-group">
          <label>真实姓名</label>
          <input
              v-model="form.real_name"
              type="text"
              required
              placeholder="请输入真实姓名"
          />
        </div>
        <div class="form-group">
          <label>手机号</label>
          <input
              v-model="form.phone"
              type="tel"
              required
              placeholder="请输入手机号"
          />
        </div>
        <div class="form-group full-width">
          <label>地址</label>
          <input
              v-model="form.address"
              type="text"
              required
              placeholder="请输入地址"
          />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="resetForm">
          重置
        </button>
        <button type="submit" class="btn btn-primary">
          {{ isEditing ? '保存' : '添加' }}
        </button>
      </div>
    </form>
  </div>

  <!-- 用户列表 -->
  <div class="table-container">
    <table class="user-table" :class="{ 'selection-mode': isSelectionMode }">
      <thead>
      <tr>
        <th width="50" v-if="isSelectionMode">
          <el-checkbox
              v-model="selectAll"
              @change="toggleSelectAll"
          />
        </th>
        <th>用户名</th>
        <th>真实姓名</th>
        <th>手机号</th>
        <th>地址</th>
        <th>创建时间</th>
        <th v-if="!isSelectionMode">操作</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="u in filteredUsers" :key="u.id" @click="isSelectionMode && toggleSelect(u.id!)">
        <td v-if="isSelectionMode">
          <el-checkbox
              :model-value="selectedIds.includes(u.id!)"
              @change="() => toggleSelect(u.id!)"
              @click.stop
          />
        </td>
        <td>{{ u.username }}</td>
        <td>{{ u.real_name }}</td>
        <td>{{ u.phone }}</td>
        <td>{{ u.address }}</td>
        <td>{{ u.create_time }}</td>
        <td class="action-buttons" v-if="!isSelectionMode">
          <button class="btn btn-edit" @click.stop="editUser(u)">
            <i class="fas fa-edit"></i> 编辑
          </button>
          <button class="btn btn-delete" @click.stop="deleteUser(u.id!)">
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
          :page-sizes="[10, 15, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="(val: number) => { pageSize = val; api.loadUsers() }"
          @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.search-container {
  flex: 1;
  margin-right: 1rem;
  background: white;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.search-form {
  display: grid;
  grid-template-columns: repeat(3, 1fr) auto;
  gap: 3rem;
  align-items: end;
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 0.5rem;
}

.search-item label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
  background-color: #f5f7fa;
  min-width: 200px;
}

.search-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  outline: none;
  background-color: white;
}

.search-input::placeholder {
  color: #909399;
}

.search-actions {
  display: flex;
  align-items: flex-end;
  margin-bottom: 0.5rem;
  margin-left: 2rem;
}

.search-actions .btn {
  height: 42px;
  padding: 0 1.5rem;
  white-space: nowrap;
  font-weight: 500;
}

.toolbar-actions {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn i {
  font-size: 14px;
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

.btn-secondary {
  background-color: #909399;
  color: white;
}

.btn-secondary:hover {
  background-color: #a6a9ad;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ebeef5;
}

.user-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 500;
  font-size: 14px;
}

.user-table td {
  color: #606266;
  font-size: 14px;
}

.user-table tr:hover {
  background-color: #f5f7fa;
}

.user-table.selection-mode tr {
  cursor: pointer;
}

.user-table.selection-mode tr:hover {
  background-color: #ecf5ff;
}

.user-table.selection-mode .action-buttons {
  display: none;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-edit,
.btn-delete {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-edit {
  background-color: #67c23a;
  color: white;
}

.btn-edit:hover {
  background-color: #85ce61;
}

.btn-delete {
  background-color: #f56c6c;
  color: white;
}

.btn-delete:hover {
  background-color: #f78989;
}

.selection-mode-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.selected-count {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

/* 复选框样式优化 */
:deep(.el-checkbox__inner) {
  border-radius: 4px;
  border-color: #dcdfe6;
}

:deep(.el-checkbox__inner:hover) {
  border-color: #409eff;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #409eff;
  border-color: #409eff;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .search-form {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .search-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    margin-left: 0;
    margin-top: 0.5rem;
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
  }

  .search-container {
    padding: 1.5rem;
  }

  .search-form {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .search-item {
    padding: 0;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
  }
}

/* 表单样式 */
.form-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 1.5rem;
  padding: 1.5rem;
}

.user-form {
  max-width: 800px;
  margin: 0 auto;
}

.user-form h3 {
  margin: 0 0 1.5rem;
  color: #303133;
  font-size: 1.25rem;
  font-weight: 500;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  outline: none;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ebeef5;
}

/* 响应式布局补充 */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-container {
    padding: 1rem;
  }
}
</style>