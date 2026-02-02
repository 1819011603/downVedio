<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
        <div class="dialog-content">
          <div class="dialog-header">
            <div class="dialog-icon warning">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
            <h3>文件已存在</h3>
          </div>
          
          <div class="dialog-body">
            <p class="dialog-message">下载目录中已存在同名文件：</p>
            <div class="file-info">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" fill="none"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span class="filename">{{ filename }}</span>
            </div>
            <p class="dialog-hint">请选择操作方式：</p>
          </div>
          
          <div class="dialog-actions">
            <button class="btn btn-secondary" @click="handleCancel">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
              </svg>
              取消
            </button>
            <button class="btn btn-warning" @click="handleOverwrite">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" fill="none"/>
                <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
              </svg>
              覆盖
            </button>
            <button class="btn btn-primary" @click="handleSaveAs">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
                <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2" fill="none"/>
                <polyline points="7 3 7 8 15 8" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              另存为
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  filename: String,
  fullPath: String
})

const emit = defineEmits(['cancel', 'overwrite', 'saveAs'])

const handleCancel = () => emit('cancel')
const handleOverwrite = () => emit('overwrite')
const handleSaveAs = () => emit('saveAs')
</script>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
}

.dialog-content {
  width: 420px;
  max-width: 90vw;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: rgba(255, 200, 50, 0.1);
  border-bottom: 1px solid rgba(255, 200, 50, 0.2);
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  
  &.warning {
    background: rgba(255, 200, 50, 0.2);
    color: #ffc832;
  }
}

.dialog-body {
  padding: var(--spacing-lg);
}

.dialog-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px 16px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  
  svg {
    flex-shrink: 0;
    color: var(--text-muted);
  }
  
  .filename {
    font-size: 13px;
    font-family: var(--font-mono);
    color: var(--text-primary);
    word-break: break-all;
  }
}

.dialog-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.dialog-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  padding-top: 0;
  
  .btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
  
  .btn-secondary {
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    
    &:hover {
      border-color: var(--border-light);
      color: var(--text-primary);
    }
  }
  
  .btn-warning {
    background: rgba(255, 150, 50, 0.2);
    border: 1px solid rgba(255, 150, 50, 0.3);
    color: #ff9632;
    
    &:hover {
      background: rgba(255, 150, 50, 0.3);
    }
  }
  
  .btn-primary {
    background: var(--primary);
    border: 1px solid var(--primary);
    color: var(--bg-deep);
    
    &:hover {
      background: var(--primary-dark);
      border-color: var(--primary-dark);
    }
  }
}

// 动画
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.25s ease;
  
  .dialog-content {
    transition: all 0.25s ease;
  }
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  
  .dialog-content {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
}
</style>
