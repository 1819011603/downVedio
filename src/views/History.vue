<template>
  <div class="history-view">
    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="deleteDialog.visible" class="modal-overlay" @click.self="deleteDialog.visible = false">
        <div class="delete-confirm-dialog animate-fadeIn">
          <div class="dialog-header">
            <svg viewBox="0 0 24 24" width="24" height="24" class="dialog-icon">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <h3>确认删除</h3>
          </div>
          <div class="dialog-content">
            <p class="task-title-hint">{{ deleteDialog.title }}</p>
            <p class="dialog-question">是否同时删除本地已下载的视频文件？</p>
            <p class="dialog-note">（将在下载目录中查找文件名完全匹配的文件）</p>
          </div>
          <div class="dialog-actions">
            <button class="btn btn-secondary" @click="deleteDialog.visible = false">
              取消
            </button>
            <button class="btn btn-outline" @click="confirmDeleteRecord(false)">
              仅删除记录
            </button>
            <button class="btn btn-danger" @click="confirmDeleteRecord(true)">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              删除记录和文件
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          下载历史
        </h1>
        <span class="history-count" v-if="appStore.history.length > 0">
          {{ appStore.history.length }} 条记录
        </span>
      </div>
      
      <div class="header-actions" v-if="appStore.history.length > 0">
        <button class="btn btn-text" @click="clearHistory">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          清空历史
        </button>
      </div>
    </header>
    
    <!-- 空状态 -->
    <div v-if="appStore.history.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="64" height="64">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      </div>
      <h2>暂无下载记录</h2>
      <p>完成下载后会在这里显示</p>
    </div>
    
    <!-- 历史列表 -->
    <div v-else class="history-list">
      <div 
        v-for="item in appStore.history" 
        :key="item.id"
        class="history-item"
      >
        <div class="item-thumbnail">
          <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
          <div v-else class="thumbnail-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <polygon points="10,9 16,12 10,15" fill="currentColor"/>
            </svg>
          </div>
        </div>
        
        <div class="item-info">
          <h3 class="item-title">{{ item.title || '未知视频' }}</h3>
          <div class="item-meta">
            <span v-if="item.uploader" class="meta-item">{{ item.uploader }}</span>
            <span v-if="item.resolution" class="meta-item">{{ item.resolution }}</span>
            <span v-if="item.filesize" class="meta-item">{{ formatFileSize(item.filesize) }}</span>
            <span class="meta-item">{{ formatDate(item.downloadedAt) }}</span>
            <span class="meta-item format-tag">{{ getFormatLabel(item.format) }}</span>
          </div>
        </div>
        
        <div class="item-actions">
          <!-- 打开视频 -->
          <button class="btn btn-icon btn-success" @click="openVideo(item)" title="打开视频">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
            </svg>
          </button>
          <!-- 打开文件夹 -->
          <button class="btn btn-icon" @click="openFolder(item.outputPath)" title="打开文件夹">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <!-- 复制链接 -->
          <button class="btn btn-icon" @click="copyLink(item.url)" title="复制链接">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <!-- 重新下载 -->
          <button class="btn btn-icon" @click="redownload(item)" title="重新下载">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <polyline points="23 4 23 10 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <!-- 删除记录 -->
          <button class="btn btn-icon btn-danger" @click="deleteItem(item)" title="删除记录">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

// 删除确认弹窗状态
const deleteDialog = reactive({
  visible: false,
  title: '',
  item: null
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)}${units[unitIndex]}`
}

const getFormatLabel = (format) => {
  const labels = {
    'best': '最佳质量',
    'bestvideo+bestaudio': '视频+音频',
    'bestaudio': '仅音频',
    'bestvideo': '仅视频'
  }
  return labels[format] || format
}

// 打开视频文件
const openVideo = async (item) => {
  try {
    // 转换为普通对象，避免 IPC 序列化问题
    const plainItem = JSON.parse(JSON.stringify(toRaw(item)))
    console.log('正在查找视频文件...', plainItem.title)
    const result = await appStore.api.getDownloadedPath(plainItem)
    console.log('查找结果:', result)
    
    if (result.found) {
      console.log('正在打开文件:', result.path)
      const openResult = await appStore.api.openFile(result.path)
      console.log('打开结果:', openResult)
      
      if (!openResult.success) {
        console.error('打开视频失败:', openResult.error)
        appStore.showToast('打开失败: ' + openResult.error, 'error')
      }
    } else {
      console.log('文件未找到，打开目录:', result.path)
      appStore.api.openPath(result.path)
      appStore.showToast('文件未找到，已打开下载目录', 'warning')
    }
  } catch (e) {
    console.error('打开视频异常:', e)
    appStore.showToast('打开视频失败: ' + e.message, 'error')
  }
}

const openFolder = (path) => {
  appStore.api.openPath(path)
}

// 复制链接
const copyLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url)
    appStore.showToast('链接已复制', 'success')
  } catch (e) {
    appStore.showToast('复制失败', 'error')
  }
}

const redownload = (item) => {
  appStore.addToQueue({
    url: item.url,
    title: item.title,
    thumbnail: item.thumbnail,
    duration: item.duration,
    uploader: item.uploader,
    format: item.format,
    resolution: item.resolution,
    filesize: item.filesize
  })
  appStore.showToast('已添加到下载队列', 'success')
  router.push('/queue')
}

// 删除单条记录（显示确认弹窗）
const deleteItem = (item) => {
  deleteDialog.visible = true
  deleteDialog.title = item.title || '未知视频'
  deleteDialog.item = item
}

// 确认删除记录
const confirmDeleteRecord = async (deleteLocalFile) => {
  const item = deleteDialog.item
  if (!item) return
  
  // 如果需要删除本地文件
  if (deleteLocalFile && item.title) {
    try {
      const result = await appStore.api.deleteVideoByTitle(item.title)
      if (result.deleted && result.deletedFiles.length > 0) {
        appStore.showToast(`已删除 ${result.deletedFiles.length} 个本地文件`, 'success')
      } else if (!result.deleted) {
        appStore.showToast('未找到匹配的本地文件', 'info')
      }
    } catch (error) {
      appStore.showToast('删除本地文件失败: ' + error.message, 'error')
    }
  }
  
  // 删除历史记录
  const index = appStore.history.findIndex(h => h.id === item.id || (h.url === item.url && h.downloadedAt === item.downloadedAt))
  if (index > -1) {
    appStore.history.splice(index, 1)
    appStore.showToast('记录已删除', 'success')
  }
  
  // 关闭弹窗
  deleteDialog.visible = false
  deleteDialog.item = null
}

const clearHistory = () => {
  if (confirm('确定要清空所有下载历史吗？')) {
    appStore.clearHistory()
  }
}
</script>

<style lang="scss" scoped>
.history-view {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  
  svg {
    color: var(--primary);
  }
}

.history-count {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 10px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: var(--spacing-lg);
  color: var(--text-muted);
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
}

// 历史列表
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.history-item {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-light);
  }
}

.item-thumbnail {
  aspect-ratio: 16/9;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-dark);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-xs);
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: 12px;
  color: var(--text-secondary);
}

.format-tag {
  padding: 2px 8px;
  background: var(--bg-dark);
  border-radius: var(--radius-sm);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  
  .btn-icon {
    &.btn-success {
      color: var(--success);
      
      &:hover {
        background: rgba(46, 213, 115, 0.15);
      }
    }
    
    &.btn-danger {
      color: var(--error);
      
      &:hover {
        background: rgba(255, 71, 87, 0.15);
      }
    }
  }
}

// 删除确认弹窗
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.delete-confirm-dialog {
  width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: rgba(255, 71, 87, 0.1);
  border-bottom: 1px solid var(--border);
  
  .dialog-icon {
    color: var(--error);
  }
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.dialog-content {
  padding: var(--spacing-lg);
  
  .task-title-hint {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-dark);
    border-radius: var(--radius-md);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .dialog-question {
    font-size: 15px;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }
  
  .dialog-note {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-dark);
  border-top: 1px solid var(--border);
  
  .btn-outline {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    
    &:hover {
      border-color: var(--border-light);
      color: var(--text-primary);
    }
  }
  
  .btn-danger {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--error);
    color: white;
    
    &:hover {
      background: #e63946;
    }
  }
}
</style>
