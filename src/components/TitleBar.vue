<template>
  <header class="title-bar">
    <div class="title-bar-drag">
      <div class="app-logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="app-title">视频下载器</span>
      </div>
      
      <div class="title-bar-info">
        <span v-if="appStore.ytdlpInstalled" class="version-badge">
          <span class="status-dot success"></span>
          yt-dlp {{ appStore.ytdlpVersion }}
        </span>
        <span v-else class="version-badge warning">
          <span class="status-dot warning"></span>
          未安装 yt-dlp
        </span>
      </div>
    </div>
    
    <div class="window-controls">
      <button class="control-btn" @click="minimize" title="最小化">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path d="M5 12h14" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <button class="control-btn" @click="maximize" title="最大化">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </button>
      <button class="control-btn close" @click="close" title="关闭">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const minimize = () => window.electronAPI?.minimize()
const maximize = () => window.electronAPI?.maximize()
const close = () => window.electronAPI?.close()
</script>

<style lang="scss" scoped>
.title-bar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}

.title-bar-drag {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-md);
  height: 100%;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  width: 20px;
  height: 20px;
  color: var(--primary);
}

.app-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.title-bar-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.version-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: var(--bg-dark);
  border-radius: var(--radius-sm);
  
  &.warning {
    color: var(--warning);
  }
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  
  &.success {
    background: var(--success);
    box-shadow: 0 0 6px var(--success);
  }
  
  &.warning {
    background: var(--warning);
    box-shadow: 0 0 6px var(--warning);
  }
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.close:hover {
    background: var(--error);
    color: white;
  }
}
</style>
