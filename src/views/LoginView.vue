<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from "axios";
import {ElMessage} from "element-plus";

const username = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()
const login = async () => {
  try {
    const res = await axios.post(`http://localhost:8081/api/login`, {username: username.value}, {
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'text'  // 告诉 axios 别当成 JSON 处理
    })
    if (res.data ) {
      console.log('后端密码:', res.data);
      console.log('输入密码:', password.value);
      if (res.data === password.value) {
        router.push('/home/users')
      } else {
        error.value = '用户名或密码错误'
      }
    } else {
      error.value = '未获取到密码'
    }
  } catch (err: any) {
    console.error('获取密码失败:', err)
    ElMessage.error(`登录失败: ${err.message || '未知错误'}`)
  }

}

</script>

<template>
  <div class="login-container">
    <h2>电商管理系统</h2>
    <input v-model="username" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <button @click="login">登录</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
/* 作用于 body 和 html */
:global(body), :global(html) {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: url('/img.png') no-repeat center center fixed;
  background-size: cover;
  position: relative;
}

/* 半透明遮罩层，提升对比度 */
:global(body)::before {
  content: "";
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 0;
}

/* 登录框 */
.login-container {
  position: relative;
  z-index: 1;
  width: 320px;
  margin: 120px auto;
  padding: 36px 28px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  text-align: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px); /* 兼容 Safari */
}

/* 标题 */
.login-container h2 {
  margin-bottom: 24px;
  color: #333;
  font-size: 22px;
  font-weight: bold;
}

/* 输入框 */
.login-container input {
  width: 90%;
  padding: 10px;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.login-container input:focus {
  border-color: #409eff;
  box-shadow: 0 0 6px rgba(64, 158, 255, 0.4);
  outline: none;
}

/* 登录按钮 */
.login-container button {
  width: 90%;
  padding: 12px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.login-container button:hover {
  background-color: #66b1ff;
}

/* 错误信息 */
.error {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 12px;
}
</style>

