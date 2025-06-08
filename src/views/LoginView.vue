<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

function login() {
  if (username.value === 'admin' && password.value === '123456') {
    router.push('/home')
  } else {
    error.value = '用户名或密码错误'
  }
}
</script>

<template>
  <div class="login-container">
    <h2>登录系统</h2>
    <input v-model="username" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <button @click="login">登录</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.login-container {
  width: 300px;
  margin: 100px auto;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}
.login-container input {
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
}
.login-container button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}
.error {
  color: red;
  text-align: center;
}
</style>