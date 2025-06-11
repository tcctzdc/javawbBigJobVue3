<script setup lang="ts">
</script>

<template>
  <div class="layout">
    <header class="header">
      <h2>电商订单管理系统</h2>
    </header>

    <div class="content-wrapper">
      <aside class="sidebar">
        <ul>
          <li><router-link to="/home/dashboard">仪表盘</router-link></li>
          <li><router-link to="/home/users">用户管理</router-link></li>
          <li><router-link to="/home/products">商品管理</router-link></li>
          <li><router-link to="/home/categories">分类管理</router-link></li>
          <li><router-link to="/home/orders">订单管理</router-link></li>
          <li><router-link to="/home/delivery">配送管理</router-link></li>
        </ul>
      </aside>

      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>


<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

.header {
  background-color: #2c3e50;
  color: #ecf0f1;
  padding: 1rem;
  text-align: center;
  height: 60px;
  line-height: 38px;
  font-weight: 700;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.content-wrapper {
  display: flex;
  flex: 1;
  height: calc(100vh - 60px);
  background-color: #f4f7fa;
}

.sidebar {
  width: 120px;
  background-color: #fff;
  padding: 1rem 0;
  overflow-y: auto;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;  /* 防止 sidebar 被压缩 */
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.sidebar li {
  margin: 12px 0;
  width: 100%;
}

.sidebar a {
  text-decoration: none;
  color: #34495e;
  display: block;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  transition: background-color 0.25s, color 0.25s;
  user-select: none;
}

.sidebar a:hover {
  background-color: #2980b9;
  color: white;
}

.router-link-exact-active {
  background-color: #1abc9c !important;
  color: white !important;
  font-weight: 700;
  box-shadow: 0 0 8px #16a085;
}

.main-content {
  flex-grow: 1;
  padding: 1.5rem;
  background-color: #fff;
  overflow-y: auto;
  border-radius: 8px;
  margin: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
  min-height: calc(100vh - 84px);
}

</style>
