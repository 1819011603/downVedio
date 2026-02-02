<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div 
          v-for="toast in appStore.toasts" 
          :key="toast.id"
          class="toast-item"
          :class="toast.type"
        >
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" width="18" height="18">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
            </svg>
            <svg v-else-if="toast.type === 'warning'" viewBox="0 0 24 24" width="18" height="18">
              <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="appStore.removeToast(toast.id)">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 60px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.toast-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px 16px;
  min-width: 280px;
  max-width: 400px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  
  &.success {
    border-color: var(--success);
    
    .toast-icon {
      color: var(--success);
    }
  }
  
  &.error {
    border-color: var(--error);
    
    .toast-icon {
      color: var(--error);
    }
  }
  
  &.warning {
    border-color: var(--warning);
    
    .toast-icon {
      color: var(--warning);
    }
  }
  
  &.info {
    border-color: var(--primary);
    
    .toast-icon {
      color: var(--primary);
    }
  }
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

// 动画
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
