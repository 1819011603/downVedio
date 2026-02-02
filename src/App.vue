<template>
  <div class="app-container">
    <!-- 自定义标题栏 -->
    <TitleBar />
    
    <!-- 主内容区 -->
    <div class="app-content">
      <!-- 侧边栏 -->
      <Sidebar />
      
      <!-- 主视图 -->
      <main class="main-view">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    
    <!-- 全局消息提示 -->
    <Toast />
    
    <!-- 文件存在弹窗 -->
    <FileExistsDialog 
      :visible="appStore.fileExistsDialog.visible"
      :filename="appStore.fileExistsDialog.filename"
      :fullPath="appStore.fileExistsDialog.fullPath"
      @cancel="appStore.handleFileExistsChoice('cancel')"
      @overwrite="appStore.handleFileExistsChoice('overwrite')"
      @saveAs="appStore.handleFileExistsChoice('saveAs')"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import TitleBar from '@/components/TitleBar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Toast from '@/components/Toast.vue'
import FileExistsDialog from '@/components/FileExistsDialog.vue'

const appStore = useAppStore()

onMounted(async () => {
  // 初始化应用
  await appStore.init()
})
</script>

<style lang="scss" scoped>
.app-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: 
    radial-gradient(ellipse at 20% 0%, rgba(0, 240, 255, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(255, 45, 106, 0.06) 0%, transparent 50%),
    var(--bg-deep);
}

.app-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-view {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

// 路由切换动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
