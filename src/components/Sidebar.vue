<template>
  <aside class="sidebar">
    <nav class="nav-menu">
      <router-link 
        v-for="item in menuItems" 
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <component :is="item.icon" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>
    
    <div class="sidebar-footer">
      <div class="queue-status" v-if="appStore.queueCount > 0">
        <div class="status-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" class="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--primary)" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="status-text">
          <span class="status-count">{{ appStore.activeCount }} 下载中</span>
          <span class="status-pending">{{ appStore.pendingCount }} 等待中</span>
        </div>
      </div>
      
      <button class="btn btn-text w-full" @click="openDownloadFolder">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        打开下载目录
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, h } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// 图标组件
const IconHome = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, [
    h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('polyline', { points: '9 22 9 12 15 12 15 22', stroke: 'currentColor', 'stroke-width': 2, fill: 'none' })
  ])
}

const IconQueue = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, [
    h('line', { x1: 8, y1: 6, x2: 21, y2: 6, stroke: 'currentColor', 'stroke-width': 2 }),
    h('line', { x1: 8, y1: 12, x2: 21, y2: 12, stroke: 'currentColor', 'stroke-width': 2 }),
    h('line', { x1: 8, y1: 18, x2: 21, y2: 18, stroke: 'currentColor', 'stroke-width': 2 }),
    h('line', { x1: 3, y1: 6, x2: 3.01, y2: 6, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    h('line', { x1: 3, y1: 12, x2: 3.01, y2: 12, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    h('line', { x1: 3, y1: 18, x2: 3.01, y2: 18, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })
  ])
}

const IconHistory = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, [
    h('circle', { cx: 12, cy: 12, r: 10, stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('polyline', { points: '12 6 12 12 16 14', stroke: 'currentColor', 'stroke-width': 2, fill: 'none' })
  ])
}

const IconRules = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, [
    h('path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', stroke: 'currentColor', 'stroke-width': 2, fill: 'none' })
  ])
}

const IconSettings = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, [
    h('circle', { cx: 12, cy: 12, r: 3, stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z', stroke: 'currentColor', 'stroke-width': 2, fill: 'none' })
  ])
}

const menuItems = computed(() => [
  { path: '/', label: '下载', icon: IconHome, badge: null },
  { path: '/queue', label: '队列', icon: IconQueue, badge: appStore.queueCount > 0 ? appStore.queueCount : null },
  { path: '/history', label: '历史', icon: IconHistory, badge: null },
  { path: '/rules', label: '规则', icon: IconRules, badge: null },
  { path: '/settings', label: '设置', icon: IconSettings, badge: null }
])

const openDownloadFolder = () => {
  appStore.api.openPath(appStore.config.downloadPath)
}
</script>

<style lang="scss" scoped>
.sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
}

.nav-menu {
  flex: 1;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px 14px;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  text-decoration: none;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%);
    color: var(--primary);
    
    .nav-icon {
      color: var(--primary);
    }
  }
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

.nav-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--bg-deep);
  background: var(--primary);
  border-radius: 10px;
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border);
}

.queue-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  background: var(--bg-dark);
  border-radius: var(--radius-md);
}

.status-icon {
  color: var(--primary);
}

.status-text {
  display: flex;
  flex-direction: column;
  font-size: 11px;
}

.status-count {
  color: var(--primary);
  font-weight: 500;
}

.status-pending {
  color: var(--text-muted);
}
</style>
