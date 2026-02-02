<template>
  <div class="queue-view">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2"/>
            <line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          下载队列
        </h1>
        <span class="task-count" v-if="appStore.queueCount > 0">
          {{ appStore.queueCount }} 个任务
        </span>
      </div>
      
      <div class="header-actions" v-if="appStore.queueCount > 0">
        <button class="btn btn-text" @click="clearCompleted">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          清除已完成
        </button>
      </div>
    </header>
    
    <!-- 空状态 -->
    <div v-if="appStore.queueCount === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="64" height="64">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </div>
      <h2>队列为空</h2>
      <p>去首页添加视频到下载队列</p>
      <router-link to="/" class="btn btn-primary">
        开始下载
      </router-link>
    </div>
    
    <!-- 队列列表 -->
    <div v-else class="queue-list">
      <TransitionGroup name="task">
        <div 
          v-for="task in appStore.downloadQueue" 
          :key="task.id"
          class="task-card"
          :class="task.status"
        >
          <!-- 缩略图 -->
          <div class="task-thumbnail">
            <img v-if="task.thumbnail" :src="task.thumbnail" alt="" />
            <div v-else class="thumbnail-placeholder">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                <polygon points="10,9 16,12 10,15" fill="currentColor"/>
              </svg>
            </div>
            
            <!-- 状态覆盖层 -->
            <div class="status-overlay" v-if="task.status !== 'pending' && task.status !== 'downloading'">
              <svg v-if="task.status === 'completed'" viewBox="0 0 24 24" width="28" height="28" class="status-icon success">
                <circle cx="12" cy="12" r="10" fill="var(--success)" opacity="0.2"/>
                <polyline points="8 12 11 15 16 9" stroke="var(--success)" stroke-width="2" fill="none"/>
              </svg>
              <svg v-else-if="task.status === 'error'" viewBox="0 0 24 24" width="28" height="28" class="status-icon error">
                <circle cx="12" cy="12" r="10" fill="var(--error)" opacity="0.2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="var(--error)" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="var(--error)" stroke-width="2"/>
              </svg>
              <svg v-else-if="task.status === 'paused'" viewBox="0 0 24 24" width="28" height="28" class="status-icon warning">
                <circle cx="12" cy="12" r="10" fill="var(--warning)" opacity="0.2"/>
                <rect x="9" y="8" width="2" height="8" fill="var(--warning)"/>
                <rect x="13" y="8" width="2" height="8" fill="var(--warning)"/>
              </svg>
              <svg v-else-if="task.status === 'cancelled'" viewBox="0 0 24 24" width="28" height="28" class="status-icon muted">
                <circle cx="12" cy="12" r="10" fill="var(--text-muted)" opacity="0.2"/>
                <line x1="5" y1="12" x2="19" y2="12" stroke="var(--text-muted)" stroke-width="2"/>
              </svg>
            </div>
          </div>
          
          <!-- 信息区 -->
          <div class="task-info">
            <h3 class="task-title">{{ task.title || '未知视频' }}</h3>
            <div class="task-meta">
              <span v-if="task.uploader" class="meta-item">{{ task.uploader }}</span>
              <span v-if="task.duration" class="meta-item">{{ formatDuration(task.duration) }}</span>
              <span v-if="task.resolution" class="meta-item">{{ task.resolution }}</span>
              <span v-if="task.filesize" class="meta-item">{{ formatFileSize(task.filesize) }}</span>
              <span class="meta-item format-tag">{{ getFormatLabel(task.format) }}</span>
            </div>
            
            <!-- 进度条 -->
            <div v-if="task.status === 'downloading'" class="task-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
              </div>
              <div class="progress-info">
                <span class="progress-text">{{ task.progress.toFixed(1) }}%</span>
                <span v-if="task.downloadSize" class="progress-size">{{ task.downloadSize }}</span>
                <span v-if="task.speed" class="progress-speed">{{ task.speed }}</span>
                <span v-if="task.eta && task.eta !== 'Unknown'" class="progress-eta">剩余 {{ task.eta }}</span>
              </div>
            </div>
            
            <!-- 状态文字 -->
            <div class="task-status">
              <span v-if="task.status === 'pending'" class="status-text pending">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                  <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                等待中
              </span>
              <span v-else-if="task.status === 'downloading'" class="status-text downloading">
                <svg viewBox="0 0 24 24" width="14" height="14" class="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
                下载中
              </span>
              <span v-else-if="task.status === 'completed'" class="status-text completed">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                已完成
              </span>
              <span v-else-if="task.status === 'paused'" class="status-text paused">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                  <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                </svg>
                已暂停
              </span>
              <span v-else-if="task.status === 'error'" class="status-text error">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                失败
              </span>
              <span v-else-if="task.status === 'cancelled'" class="status-text cancelled">
                已取消
              </span>
            </div>
            
            <!-- 错误详情 -->
            <div v-if="task.status === 'error'" class="error-detail">
              <div class="error-header">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="error-title">错误信息</span>
                <button 
                  class="copy-btn" 
                  @click.stop="copyErrorInfo(task)"
                  :title="copiedTaskId === task.id ? '已复制!' : '复制全部信息'"
                >
                  <svg v-if="copiedTaskId !== task.id" viewBox="0 0 24 24" width="14" height="14">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="14" height="14">
                    <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </button>
              </div>
              <div class="error-content">
                <div class="error-row">
                  <span class="error-label">URL:</span>
                  <span class="error-value">{{ task.url }}</span>
                </div>
                <div class="error-row" v-if="task.error">
                  <span class="error-label">原因:</span>
                  <span class="error-value error-message">{{ task.error }}</span>
                </div>
                <div class="error-row" v-if="task.output">
                  <span class="error-label">输出:</span>
                  <span class="error-value error-output">{{ task.output }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮（横向排列） -->
          <div class="task-actions">
            <!-- 已完成：打开视频 -->
            <button v-if="task.status === 'completed'" class="btn btn-icon btn-success" @click="openVideo(task)" title="打开视频">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
              </svg>
            </button>
            
            <!-- 下载中：暂停 -->
            <button v-if="task.status === 'downloading'" class="btn btn-icon" @click="pauseTask(task.id)" title="暂停">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
              </svg>
            </button>
            
            <!-- 已暂停：继续 -->
            <button v-if="task.status === 'paused'" class="btn btn-icon" @click="resumeTask(task.id)" title="继续">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
              </svg>
            </button>
            
            <!-- 重试按钮：失败/取消/已完成都可以重试 -->
            <button v-if="['error', 'cancelled', 'completed'].includes(task.status)" class="btn btn-icon" @click="retryTask(task)" title="重新下载">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <polyline points="23 4 23 10 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            
            <!-- 复制链接 -->
            <button v-if="task.status !== 'downloading'" class="btn btn-icon" @click="copyLink(task.url)" title="复制链接">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            
            <!-- 移除/取消按钮 -->
            <button v-if="task.status !== 'downloading'" class="btn btn-icon btn-danger" @click="removeTask(task.id)" title="移除">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            <button v-else class="btn btn-icon btn-danger" @click="cancelTask(task.id)" title="取消">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()
const copiedTaskId = ref(null)

const formatDuration = (seconds) => {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
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
    'audio': '仅音频'
  }
  return labels[format] || format
}

const pauseTask = (taskId) => appStore.pauseTask(taskId)
const resumeTask = (taskId) => appStore.resumeTask(taskId)
const cancelTask = (taskId) => appStore.cancelTask(taskId)
const removeTask = (taskId) => appStore.removeFromQueue(taskId)
const clearCompleted = () => appStore.clearCompleted()

// 重试任务 - 跳转到首页重新解析
const retryTask = (task) => {
  appStore.removeFromQueue(task.id)
  // 跳转到首页，带上URL参数让首页自动解析
  router.push({
    path: '/',
    query: { url: task.url }
  })
}

// 打开已下载的视频（使用默认应用）
const openVideo = async (task) => {
  try {
    // 转换为普通对象，避免 IPC 序列化问题
    const plainTask = JSON.parse(JSON.stringify(toRaw(task)))
    console.log('正在查找视频文件...', plainTask.title)
    const result = await appStore.api.getDownloadedPath(plainTask)
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

// 复制链接
const copyLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url)
    appStore.showToast('链接已复制', 'success')
  } catch (e) {
    appStore.showToast('复制失败', 'error')
  }
}

const copyErrorInfo = async (task) => {
  const info = [
    `=== 下载失败信息 ===`,
    `标题: ${task.title || '未知'}`,
    `URL: ${task.url || '未知'}`,
    `格式: ${task.format || '未知'}`,
    `时间: ${new Date().toLocaleString()}`,
    ``,
    `=== 错误详情 ===`,
    `错误: ${task.error || '未知错误'}`,
    task.output ? `\n=== 命令输出 ===\n${task.output}` : ''
  ].filter(Boolean).join('\n')
  
  try {
    await navigator.clipboard.writeText(info)
    copiedTaskId.value = task.id
    setTimeout(() => {
      copiedTaskId.value = null
    }, 2000)
  } catch (e) {
    console.error('复制失败:', e)
  }
}
</script>

<style lang="scss" scoped>
.queue-view {
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

.task-count {
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
  margin-bottom: var(--spacing-lg);
}

// 任务列表
.queue-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.task-card {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-light);
  }
  
  &.downloading {
    border-color: var(--primary);
    box-shadow: 0 0 20px var(--primary-glow);
  }
  
  &.completed {
    opacity: 0.7;
  }
  
  &.error {
    border-color: var(--error);
  }
}

.task-thumbnail {
  position: relative;
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

.status-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
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

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: var(--spacing-xs);
  
  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-dark);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--primary-dark));
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  
  .progress-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  .progress-text {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--primary);
    min-width: 50px;
  }
  
  .progress-size {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }
  
  .progress-speed {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--success);
    padding: 2px 6px;
    background: rgba(46, 213, 115, 0.1);
    border-radius: var(--radius-sm);
  }
  
  .progress-eta {
    font-size: 11px;
    color: var(--text-secondary);
  }
}

.task-status {
  margin-top: auto;
}

.status-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  
  &.pending {
    color: var(--text-muted);
  }
  
  &.downloading {
    color: var(--primary);
  }
  
  &.completed {
    color: var(--success);
  }
  
  &.paused {
    color: var(--warning);
  }
  
  &.error {
    color: var(--error);
  }
  
  &.cancelled {
    color: var(--text-muted);
  }
}

.error-detail {
  margin-top: var(--spacing-sm);
  background: rgba(255, 71, 87, 0.08);
  border: 1px solid rgba(255, 71, 87, 0.2);
  border-radius: var(--radius-md);
  overflow: hidden;
  
  .error-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(255, 71, 87, 0.1);
    border-bottom: 1px solid rgba(255, 71, 87, 0.15);
    
    svg {
      flex-shrink: 0;
      color: var(--error);
    }
    
    .error-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--error);
    }
    
    .copy-btn {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: 11px;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
      }
      
      svg {
        color: currentColor;
      }
    }
  }
  
  .error-content {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .error-row {
    display: flex;
    gap: 8px;
    font-size: 11px;
    line-height: 1.5;
    
    .error-label {
      flex-shrink: 0;
      color: var(--text-muted);
      min-width: 36px;
    }
    
    .error-value {
      color: var(--text-secondary);
      font-family: var(--font-mono);
      word-break: break-all;
      white-space: pre-wrap;
    }
    
    .error-message {
      color: var(--error);
    }
    
    .error-output {
      max-height: 100px;
      overflow-y: auto;
      padding: 6px 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
    }
  }
}

.task-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  
  .btn-icon {
    &.btn-success {
      color: var(--success);
      
      &:hover {
        background: rgba(46, 213, 115, 0.15);
      }
    }
    
    &.btn-warning {
      color: var(--warning);
      
      &:hover {
        background: rgba(255, 200, 50, 0.15);
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

// 动画
.task-enter-active,
.task-leave-active {
  transition: all 0.3s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.task-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.task-move {
  transition: transform 0.3s ease;
}
</style>
