<template>
  <div class="home-view">
    <!-- 输入区域 -->
    <section class="input-section">
      <div class="input-header">
        <h1 class="page-title">
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
          </svg>
          视频下载
        </h1>
        <p class="page-desc">粘贴视频链接，支持 YouTube、Bilibili、抖音等 1000+ 网站</p>
      </div>
      
      <div class="url-input-wrapper">
        <div class="input-group">
          <input 
            v-model="url"
            type="text"
            class="url-input"
            placeholder="粘贴视频链接..."
            @keyup.enter="parseUrl"
            @paste="onPaste"
          />
          <button 
            class="btn btn-primary parse-btn"
            :disabled="!url.trim() || parsing"
            @click="parseUrl"
          >
            <svg v-if="parsing" viewBox="0 0 24 24" width="18" height="18" class="animate-spin">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
            <span v-else>解析</span>
          </button>
        </div>
        
        <div class="input-tips">
          <span class="tip-item">
            <kbd>Ctrl</kbd> + <kbd>V</kbd> 自动解析
          </span>
          <span class="tip-divider">|</span>
          <span class="tip-item">支持播放列表</span>
        </div>
      </div>
    </section>
    
    <!-- 解析错误 -->
    <div v-if="parseError" class="error-card animate-fadeIn">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <div class="error-content">
        <h3>解析失败</h3>
        <p>{{ parseError }}</p>
        <button class="btn btn-secondary" @click="goToRules">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          添加自定义规则
        </button>
      </div>
    </div>
    
    <!-- 视频信息 -->
    <section v-if="videoInfo" class="video-section animate-fadeIn">
      <div class="video-header">
        <h2>{{ isPlaylist ? '播放列表' : '视频信息' }}</h2>
        <div class="header-actions">
          <button class="btn btn-text" @click="clearResult">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2"/>
            </svg>
            清除
          </button>
        </div>
      </div>
      
      <!-- 单视频 -->
      <div v-if="!isPlaylist" class="video-card">
        <div class="video-thumbnail">
          <img 
            v-if="videoInfo.thumbnail && !thumbnailError" 
            :src="proxyThumbnail(videoInfo.thumbnail)" 
            alt="thumbnail"
            @error="thumbnailError = true"
            referrerpolicy="no-referrer"
          />
          <div v-else class="thumbnail-placeholder">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <polygon points="10,9 16,12 10,15" fill="currentColor"/>
            </svg>
          </div>
          <span v-if="videoInfo.duration" class="duration-badge">{{ formatDuration(videoInfo.duration) }}</span>
        </div>
        
        <div class="video-info">
          <h3 class="video-title">{{ videoInfo.title || '未知标题' }}</h3>
          <div class="video-meta">
            <span v-if="videoInfo.uploader" class="meta-item">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              {{ videoInfo.uploader }}
            </span>
            <span v-if="videoInfo.view_count" class="meta-item">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              {{ formatNumber(videoInfo.view_count) }} 次播放
            </span>
            <span v-if="videoInfo.upload_date" class="meta-item">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
              </svg>
              {{ formatDate(videoInfo.upload_date) }}
            </span>
          </div>
          
          <p v-if="videoInfo.description" class="video-desc">
            {{ truncateText(videoInfo.description, 150) }}
          </p>
          
          <!-- 格式选择 -->
          <div class="format-section">
            <label class="format-label">选择格式</label>
            
            <!-- 格式类型选择 -->
            <div class="format-type-selector">
              <button 
                v-for="type in formatTypes"
                :key="type.value"
                class="format-type-btn"
                :class="{ active: formatType === type.value }"
                @click="formatType = type.value; selectedFormat = type.defaultFormat"
              >
                <component :is="type.icon" />
                <span>{{ type.label }}</span>
              </button>
            </div>
            
            <!-- 具体格式下拉 -->
            <div class="format-dropdown" v-if="availableFormats.length > 0">
              <select class="format-select" v-model="selectedFormat">
                <optgroup v-if="formatType === 'video'" label="视频+音频">
                  <option value="best">
                    最佳质量 (自动){{ bestVideoInfo ? ` - ${bestVideoInfo.resolution || bestVideoInfo.height + 'p'}` : '' }}{{ bestVideoInfo && getFileSize(bestVideoInfo) ? ` ≈${formatFileSize(getFileSize(bestVideoInfo) + (bestAudioInfo ? getFileSize(bestAudioInfo) : 0))}` : '' }}
                  </option>
                  <option 
                    v-for="fmt in videoWithAudioFormats" 
                    :key="fmt.format_id"
                    :value="fmt.format_id"
                  >
                    {{ fmt.resolution || (fmt.height ? fmt.height + 'p' : fmt.format_id) }} ({{ fmt.ext }}) - {{ formatFileSize(getFileSize(fmt)) }} - {{ getCodecShort(fmt.vcodec) }}
                  </option>
                </optgroup>
                <optgroup v-if="formatType === 'video-only'" label="仅视频">
                  <option value="bestvideo">
                    最佳视频 (自动){{ bestVideoInfo ? ` - ${bestVideoInfo.resolution || bestVideoInfo.height + 'p'}` : '' }}{{ bestVideoInfo && getFileSize(bestVideoInfo) ? ` ≈${formatFileSize(getFileSize(bestVideoInfo))}` : '' }}
                  </option>
                  <option 
                    v-for="fmt in videoOnlyFormats" 
                    :key="fmt.format_id"
                    :value="fmt.format_id"
                  >
                    {{ fmt.resolution || (fmt.height ? fmt.height + 'p' : fmt.format_id) }} ({{ fmt.ext }}) - {{ formatFileSize(getFileSize(fmt)) }} - {{ getCodecShort(fmt.vcodec) }}
                  </option>
                </optgroup>
                <optgroup v-if="formatType === 'audio'" label="仅音频">
                  <option value="bestaudio">
                    最佳音频 (自动){{ bestAudioInfo ? ` - ${bestAudioInfo.abr || ''}kbps` : '' }}{{ bestAudioInfo && getFileSize(bestAudioInfo) ? ` ≈${formatFileSize(getFileSize(bestAudioInfo))}` : '' }}
                  </option>
                  <option 
                    v-for="fmt in audioOnlyFormats" 
                    :key="fmt.format_id"
                    :value="fmt.format_id"
                  >
                    {{ fmt.abr ? fmt.abr + 'kbps' : fmt.format_id }} ({{ fmt.ext }}) - {{ formatFileSize(getFileSize(fmt)) }} - {{ getCodecShort(fmt.acodec) }}
                  </option>
                </optgroup>
              </select>
            </div>
            
            <!-- 选中格式信息 -->
            <div class="selected-format-info" v-if="selectedFormatInfo">
              <span class="info-item" v-if="selectedFormatInfo.resolution">
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                {{ selectedFormatInfo.resolution }}
              </span>
              <span class="info-item" v-if="selectedFormatInfo.filesize">
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" fill="none"/>
                  <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
                  <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                </svg>
                {{ formatFileSize(selectedFormatInfo.filesize) }}
              </span>
              <span class="info-item" v-if="selectedFormatInfo.ext">
                {{ selectedFormatInfo.ext.toUpperCase() }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="video-actions">
          <button class="btn btn-primary" @click="addToDownload">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" fill="none"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            下载
          </button>
        </div>
      </div>
      
      <!-- 播放列表 -->
      <div v-else class="playlist-section">
        <div class="playlist-header">
          <div class="playlist-info">
            <span class="playlist-count">共 {{ videoInfo.length }} 个视频</span>
            <div class="playlist-actions">
              <button class="btn btn-text" @click="selectAll">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <polyline points="9 11 12 14 22 4" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                全选
              </button>
              <button class="btn btn-text" @click="selectNone">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                取消
              </button>
            </div>
          </div>
          
          <div class="format-type-selector">
            <button 
              v-for="type in formatTypes"
              :key="type.value"
              class="format-type-btn"
              :class="{ active: formatType === type.value }"
              @click="formatType = type.value; selectedFormat = type.defaultFormat"
            >
              <component :is="type.icon" />
              <span>{{ type.label }}</span>
            </button>
          </div>
        </div>
        
        <div class="playlist-items">
          <div 
            v-for="(item, index) in videoInfo"
            :key="item.id || index"
            class="playlist-item"
            :class="{ selected: selectedItems.has(index) }"
            @click="toggleSelect(index)"
          >
            <div class="item-checkbox">
              <svg v-if="selectedItems.has(index)" viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="var(--primary)"/>
                <polyline points="9 12 11 14 15 10" stroke="var(--bg-deep)" stroke-width="2" fill="none"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--border-light)" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <span class="item-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="item-info">
              <span class="item-title">{{ item.title || `视频 ${index + 1}` }}</span>
              <span v-if="item.duration" class="item-duration">{{ formatDuration(item.duration) }}</span>
            </div>
          </div>
        </div>
        
        <div class="playlist-footer">
          <span class="selected-count">已选择 {{ selectedItems.size }} 个视频</span>
          <button 
            class="btn btn-primary"
            :disabled="selectedItems.size === 0"
            @click="addSelectedToDownload"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" fill="none"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            下载选中 ({{ selectedItems.size }})
          </button>
        </div>
      </div>
    </section>
    
    <!-- 快捷入口 -->
    <section v-if="!videoInfo && !parsing" class="quick-section">
      <h2 class="section-title">支持的网站</h2>
      <div class="site-grid">
        <div v-for="site in popularSites" :key="site.name" class="site-card">
          <div class="site-icon" :style="{ background: site.color }">
            {{ site.name.charAt(0) }}
          </div>
          <span class="site-name">{{ site.name }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// 状态
const url = ref('')

// 检查路由参数，自动解析
onMounted(() => {
  if (route.query.url) {
    url.value = route.query.url
    // 清除查询参数
    router.replace({ path: '/', query: {} })
    // 自动开始解析
    setTimeout(() => parseUrl(), 100)
  }
})
const parsing = ref(false)
const parseError = ref('')
const videoInfo = ref(null)
const isPlaylist = ref(false)
const selectedFormat = ref('best')
const formatType = ref('video') // video, video-only, audio
const selectedItems = ref(new Set())
const thumbnailError = ref(false)

// 图标组件
const IconVideo = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 16, height: 16 }, [
    h('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2, stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('polygon', { points: '10,9 16,12 10,15', fill: 'currentColor' })
  ])
}

const IconVideoOnly = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 16, height: 16 }, [
    h('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2, stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('line', { x1: 2, y1: 20, x2: 22, y2: 4, stroke: 'currentColor', 'stroke-width': 1.5 })
  ])
}

const IconAudio = {
  render: () => h('svg', { viewBox: '0 0 24 24', width: 16, height: 16 }, [
    h('path', { d: 'M9 18V5l12-2v13', stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('circle', { cx: 6, cy: 18, r: 3, stroke: 'currentColor', 'stroke-width': 2, fill: 'none' }),
    h('circle', { cx: 18, cy: 16, r: 3, stroke: 'currentColor', 'stroke-width': 2, fill: 'none' })
  ])
}

// 格式类型选择
const formatTypes = [
  { value: 'video', label: '视频+音频', icon: IconVideo, defaultFormat: 'best' },
  { value: 'video-only', label: '仅视频', icon: IconVideoOnly, defaultFormat: 'bestvideo' },
  { value: 'audio', label: '仅音频', icon: IconAudio, defaultFormat: 'bestaudio' }
]

// 可用格式列表
const availableFormats = computed(() => {
  if (!videoInfo.value || !videoInfo.value.formats) return []
  return videoInfo.value.formats || []
})

// 获取文件大小（支持 filesize 和 filesize_approx）
const getFileSize = (f) => f.filesize || f.filesize_approx || 0

// 视频+音频格式（按文件大小从大到小排序）
// 如果有合并格式就用合并格式，否则用仅视频格式（yt-dlp会自动合并最佳音频）
const videoWithAudioFormats = computed(() => {
  // 先找合并格式
  const merged = availableFormats.value.filter(f => 
    f.vcodec && f.vcodec !== 'none' && 
    f.acodec && f.acodec !== 'none'
  )
  // 如果有合并格式就返回，否则返回仅视频格式
  const formats = merged.length > 0 ? merged : availableFormats.value.filter(f => 
    f.vcodec && f.vcodec !== 'none' && 
    (!f.acodec || f.acodec === 'none')
  )
  return formats.sort((a, b) => getFileSize(b) - getFileSize(a))
})

// 仅视频格式（按文件大小从大到小排序）
const videoOnlyFormats = computed(() => {
  return availableFormats.value.filter(f => 
    f.vcodec && f.vcodec !== 'none' && 
    (!f.acodec || f.acodec === 'none')
  ).sort((a, b) => getFileSize(b) - getFileSize(a))
})

// 仅音频格式（按文件大小从大到小排序）
const audioOnlyFormats = computed(() => {
  return availableFormats.value.filter(f => 
    (!f.vcodec || f.vcodec === 'none') && 
    f.acodec && f.acodec !== 'none'
  ).sort((a, b) => getFileSize(b) - getFileSize(a))
})

// 最佳视频格式信息（用于显示"最佳质量"的预估信息）
const bestVideoInfo = computed(() => {
  const formats = videoOnlyFormats.value
  if (!formats.length) return null
  // 找到最高分辨率的格式
  const best = formats.reduce((prev, curr) => {
    const prevHeight = prev.height || 0
    const currHeight = curr.height || 0
    return currHeight > prevHeight ? curr : prev
  }, formats[0])
  return best
})

// 最佳音频格式信息
const bestAudioInfo = computed(() => {
  const formats = audioOnlyFormats.value
  if (!formats.length) return null
  return formats[0] // 已按大小排序，第一个最大
})

// 选中格式的详细信息
const selectedFormatInfo = computed(() => {
  if (!selectedFormat.value || !availableFormats.value.length) return null
  if (['best', 'bestvideo', 'bestaudio'].includes(selectedFormat.value)) return null
  return availableFormats.value.find(f => f.format_id === selectedFormat.value)
})

// 代理缩略图URL（添加必要的请求头）
const proxyThumbnail = (url) => {
  if (!url) return ''
  // 直接返回URL，让浏览器处理
  // 在 Electron 中可以通过 webRequest 添加请求头
  return url
}

// 热门网站
const popularSites = [
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Bilibili', color: '#00A1D6' },
  { name: '抖音', color: '#000000' },
  { name: '西瓜视频', color: '#FF5722' },
  { name: '优酷', color: '#1E90FF' },
  { name: '爱奇艺', color: '#00BE06' },
  { name: 'Twitter', color: '#1DA1F2' },
  { name: 'TikTok', color: '#010101' }
]

// 方法
const onPaste = (e) => {
  setTimeout(() => {
    if (url.value.trim() && (url.value.startsWith('http') || url.value.startsWith('www'))) {
      parseUrl()
    }
  }, 100)
}

const parseUrl = async () => {
  if (!url.value.trim() || parsing.value) return
  
  parsing.value = true
  parseError.value = ''
  videoInfo.value = null
  selectedItems.value = new Set()
  thumbnailError.value = false
  formatType.value = 'video'
  selectedFormat.value = 'best'
  
  try {
    const result = await appStore.parseVideo(url.value.trim())
    
    if (result.type === 'playlist') {
      isPlaylist.value = true
      videoInfo.value = result.data
      // 默认全选
      result.data.forEach((_, index) => selectedItems.value.add(index))
    } else {
      isPlaylist.value = false
      videoInfo.value = result.data
    }
  } catch (error) {
    parseError.value = error.message
  } finally {
    parsing.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '未知'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)}${units[unitIndex]}`
}

// 简化编解码器名称
const getCodecShort = (codec) => {
  if (!codec || codec === 'none') return ''
  // 提取主要编码名称
  if (codec.startsWith('avc1')) return 'H.264'
  if (codec.startsWith('hev1') || codec.startsWith('hvc1')) return 'H.265'
  if (codec.startsWith('av01')) return 'AV1'
  if (codec.startsWith('vp9') || codec.startsWith('vp09')) return 'VP9'
  if (codec.startsWith('mp4a')) return 'AAC'
  if (codec.startsWith('opus')) return 'Opus'
  return codec.split('.')[0]
}

const clearResult = () => {
  videoInfo.value = null
  parseError.value = ''
  url.value = ''
}

const goToRules = () => {
  router.push('/rules')
}

const selectAll = () => {
  if (isPlaylist.value && videoInfo.value) {
    videoInfo.value.forEach((_, index) => selectedItems.value.add(index))
  }
}

const selectNone = () => {
  selectedItems.value.clear()
}

const toggleSelect = (index) => {
  if (selectedItems.value.has(index)) {
    selectedItems.value.delete(index)
  } else {
    selectedItems.value.add(index)
  }
}

const addToDownload = () => {
  if (!videoInfo.value) return
  
  // 获取选中格式的信息
  const formatInfo = selectedFormatInfo.value || bestVideoInfo.value
  
  appStore.addToQueue({
    url: url.value,
    title: videoInfo.value.title,
    thumbnail: videoInfo.value.thumbnail,
    duration: videoInfo.value.duration,
    uploader: videoInfo.value.uploader,
    format: selectedFormat.value,
    resolution: formatInfo?.resolution || (formatInfo?.height ? `${formatInfo.height}p` : ''),
    filesize: formatInfo ? getFileSize(formatInfo) : 0
  })
  
  appStore.showToast('已添加到下载队列', 'success')
  router.push('/queue')
}

const addSelectedToDownload = () => {
  if (!isPlaylist.value || selectedItems.value.size === 0) return
  
  // 获取选中格式的信息
  const formatInfo = selectedFormatInfo.value || bestVideoInfo.value
  
  const tasks = Array.from(selectedItems.value).map(index => {
    const item = videoInfo.value[index]
    return {
      url: item.url || item.webpage_url || url.value,
      title: item.title,
      thumbnail: item.thumbnail,
      duration: item.duration,
      uploader: item.uploader,
      format: selectedFormat.value,
      resolution: formatInfo?.resolution || (formatInfo?.height ? `${formatInfo.height}p` : ''),
      filesize: formatInfo ? getFileSize(formatInfo) : 0,
      index: index + 1
    }
  })
  
  appStore.addToQueue(tasks)
  appStore.showToast(`已添加 ${tasks.length} 个视频到下载队列`, 'success')
  router.push('/queue')
}

// 工具函数
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

const formatNumber = (num) => {
  if (!num) return ''
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const year = dateStr.substring(0, 4)
  const month = dateStr.substring(4, 6)
  const day = dateStr.substring(6, 8)
  return `${year}-${month}-${day}`
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style lang="scss" scoped>
.home-view {
  max-width: 900px;
  margin: 0 auto;
}

// 输入区域
.input-section {
  margin-bottom: var(--spacing-xl);
}

.input-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  
  svg {
    color: var(--primary);
  }
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
}

.url-input-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
}

.input-group {
  display: flex;
  gap: var(--spacing-sm);
}

.url-input {
  flex: 1;
  padding: 14px 18px;
  font-size: 15px;
  background: var(--bg-dark);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  outline: none;
  transition: all 0.2s;
  
  &::placeholder {
    color: var(--text-muted);
  }
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-glow);
  }
}

.parse-btn {
  padding: 14px 28px;
  font-size: 15px;
}

.input-tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  font-size: 12px;
  color: var(--text-muted);
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 4px;
  
  kbd {
    padding: 2px 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    border-radius: 3px;
  }
}

.tip-divider {
  color: var(--border-light);
}

// 错误卡片
.error-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-card);
  border: 1px solid var(--error);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-xl);
}

.error-icon {
  flex-shrink: 0;
  color: var(--error);
}

.error-content {
  flex: 1;
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--error);
    margin-bottom: var(--spacing-xs);
  }
  
  p {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    font-family: var(--font-mono);
  }
}

// 视频信息
.video-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.video-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border);
  
  h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

// 单视频卡片
.video-card {
  display: grid;
  grid-template-columns: 280px 1fr auto;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.video-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
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

.duration-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: 500;
  color: white;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 3px;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.video-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.video-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  
  svg {
    color: var(--text-muted);
  }
}

.video-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: var(--spacing-xs);
}

.format-section {
  margin-top: auto;
  padding-top: var(--spacing-md);
}

.format-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.format-type-selector {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.format-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-light);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--primary-glow);
    border-color: var(--primary);
    color: var(--primary);
  }
}

.format-dropdown {
  margin-bottom: var(--spacing-sm);
}

.format-select {
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  
  &:focus {
    border-color: var(--primary);
  }
  
  option {
    background: var(--bg-dark);
    color: var(--text-primary);
    padding: 8px;
  }
  
  optgroup {
    font-weight: 600;
    color: var(--text-secondary);
  }
}

.selected-format-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 8px 12px;
  background: var(--bg-dark);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  
  svg {
    color: var(--text-muted);
  }
}

.format-options {
  display: flex;
  gap: var(--spacing-sm);
}

.format-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-light);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--primary-glow);
    border-color: var(--primary);
    color: var(--primary);
  }
}

.video-actions {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

// 播放列表
.playlist-section {
  padding: var(--spacing-lg);
}

.playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.playlist-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.playlist-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.playlist-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.playlist-items {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 12px var(--spacing-md);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--bg-hover);
  }
  
  &.selected {
    background: rgba(0, 240, 255, 0.05);
  }
}

.item-checkbox {
  flex-shrink: 0;
}

.item-index {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  width: 24px;
}

.item-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  min-width: 0;
}

.item-title {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-duration {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  flex-shrink: 0;
}

.playlist-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
}

.selected-count {
  font-size: 13px;
  color: var(--text-secondary);
}

// 快捷入口
.quick-section {
  margin-top: var(--spacing-xl);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--spacing-md);
}

.site-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: default;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-light);
    transform: translateY(-2px);
  }
}

.site-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: white;
  border-radius: var(--radius-md);
}

.site-name {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
