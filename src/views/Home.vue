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
          <label class="playlist-toggle">
            <input type="checkbox" v-model="enablePlaylist" />
            <span class="toggle-text">支持播放列表</span>
          </label>
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
        
        <!-- 智能解析按钮 -->
        <div class="smart-parse-section">
          <div class="smart-parse-buttons">
            <button 
              class="btn btn-smart-parse"
              :disabled="smartParsing"
              @click="startSmartParse(false)"
            >
              <svg v-if="smartParsing && !smartParseFailed" viewBox="0 0 24 24" width="18" height="18" class="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/>
                <path d="M11 8v6M8 11h6" stroke="currentColor" stroke-width="2"/>
              </svg>
              {{ smartParsing && !smartParseFailed ? smartParseStatus : '智能解析' }}
            </button>
            
            <!-- 打开浏览器解析按钮 -->
            <button 
              class="btn btn-login-browser"
              :disabled="smartParsing"
              @click="startSmartParseWithBrowser"
            >
              <svg v-if="smartParsing && smartParseFailed" viewBox="0 0 24 24" width="18" height="18" class="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              {{ smartParsing && smartParseFailed ? smartParseStatus : '打开浏览器解析' }}
            </button>
          </div>
          
          <!-- 等待时间设置 -->
          <div class="wait-time-setting">
            <label>操作等待时间：</label>
            <select v-model.number="smartParseWaitTime" class="wait-time-select">
              <option :value="0">0 秒</option>
              <option :value="1">1 秒</option>
              <option :value="3">3 秒</option>
              <option :value="5">5 秒</option>
              <option :value="15">15 秒</option>
              <option :value="30">30 秒</option>
              <option :value="45">45 秒</option>
              <option :value="60">60 秒</option>
              <option :value="90">90 秒</option>
              <option :value="120">120 秒</option>
            </select>
          </div>
          
          <p class="smart-parse-hint">
            {{ smartParseFailed 
              ? '未能捕获视频，请点击"打开浏览器解析"，在弹出窗口中登录或播放视频' 
              : '智能解析：自动捕获视频流 | 打开浏览器解析：可手动登录/操作后捕获' }}
          </p>
        </div>
        
        <!-- YouTube Cookie 配置提示 -->
        <div v-if="isYouTubeError" class="youtube-hint">
          <div class="hint-header">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>如何解决 YouTube 403 错误？</span>
          </div>
          <ol class="hint-steps">
            <li>在 <strong>Firefox 或 Chrome</strong> 浏览器中登录 YouTube</li>
            <li>打开视频下载器的 <strong>"设置"</strong> 页面</li>
            <li>找到 <strong>"从浏览器获取 Cookie"</strong> 选项</li>
            <li>选择你登录的浏览器（Firefox 或 Chrome）</li>
            <li>点击 <strong>"保存设置"</strong> 后重新尝试下载</li>
          </ol>
        </div>
        
        <div class="error-actions">
          <button class="btn btn-icon-text" @click="copyError" :title="errorCopied ? '已复制' : '复制错误信息'">
            <svg v-if="!errorCopied" viewBox="0 0 24 24" width="16" height="16">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16">
              <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            {{ errorCopied ? '已复制' : '复制错误' }}
          </button>
          <button class="btn btn-secondary" @click="goToSettings">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            前往设置
          </button>
        </div>
      </div>
    </div>
    
    <!-- 视频信息 -->
    <section v-if="videoInfo" class="video-section animate-fadeIn">
      <div class="video-header">
        <h2>{{ isPlaylist ? '播放列表' : '视频信息' }}</h2>
        <div class="header-actions">
          <!-- 打开浏览器重新解析按钮 -->
          <button 
            class="btn btn-reparse"
            :disabled="smartParsing"
            @click="startSmartParseWithBrowser"
            title="打开浏览器重新捕获视频"
          >
            <svg v-if="smartParsing" viewBox="0 0 24 24" width="16" height="16" class="animate-spin">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            {{ smartParsing ? smartParseStatus : '浏览器解析' }}
          </button>
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
          <div class="video-title-row">
            <h3 v-if="!editingTitle" class="video-title">{{ videoInfo.title || '未知标题' }}</h3>
            <input 
              v-else
              v-model="editTitleValue"
              type="text"
              class="title-edit-input"
              @keyup.enter="saveTitle"
              @keyup.escape="cancelEditTitle"
              ref="titleInputRef"
            />
            <div class="title-actions">
              <button v-if="!editingTitle" class="btn btn-icon btn-sm" @click="startEditTitle" title="编辑标题">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>
              <template v-else>
                <button class="btn btn-icon btn-sm btn-success" @click="saveTitle" title="保存">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </button>
                <button class="btn btn-icon btn-sm" @click="cancelEditTitle" title="取消">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </template>
            </div>
          </div>
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
          
          <!-- 智能解析多视频来源选择 -->
          <div v-if="videoInfo._allVideoUrls && videoInfo._allVideoUrls.length > 1" class="video-source-section">
            <label class="source-label">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              选择视频来源 (共 {{ videoInfo._allVideoUrls.length }} 个)
            </label>
            <select class="source-select" v-model="selectedVideoUrl">
              <option 
                v-for="(videoUrl, index) in videoInfo._allVideoUrls" 
                :key="index"
                :value="videoUrl"
              >
                {{ getVideoSourceLabel(videoUrl, index) }}
              </option>
            </select>
            <div class="source-preview">
              <div class="preview-url-wrapper">
                <input 
                  type="text" 
                  class="preview-url-input" 
                  :value="selectedVideoUrl" 
                  readonly 
                  @click="$event.target.select()"
                />
              </div>
              <button class="btn btn-copy" @click="copyVideoUrl" title="复制链接">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                复制
              </button>
            </div>
          </div>
          
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
          <div class="action-buttons-row">
            <button class="btn btn-icon" @click="copyParseCommand" title="复制解析命令">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <polyline points="4 17 10 11 4 5" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="12" y1="19" x2="20" y2="19" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="btn btn-icon" @click="copyDownloadCommand" title="复制下载命令">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
          </div>
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
          
          <!-- 格式类型选择 -->
          <div class="playlist-format-row">
            <div class="format-type-selector">
              <button 
                v-for="type in formatTypes"
                :key="type.value"
                class="format-type-btn"
                :class="{ active: formatType === type.value }"
                @click="formatType = type.value; selectedFormat = type.defaultFormat; applyResolutionToAll()"
              >
                <component :is="type.icon" />
                <span>{{ type.label }}</span>
              </button>
            </div>
            
            <!-- 分辨率选择（仅视频模式） -->
            <div class="resolution-selector" v-if="formatType !== 'audio'">
              <label>统一分辨率：</label>
              <div class="resolution-select-wrapper">
                <select class="resolution-select" v-model="selectedResolution" @change="applyResolutionToAll" :disabled="loadingFormats">
                  <option v-for="res in resolutionOptions" :key="res.value" :value="res.value">
                    {{ res.label }}
                  </option>
                </select>
                <span v-if="loadingFormats" class="loading-hint">
                  <svg viewBox="0 0 24 24" width="14" height="14" class="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                  </svg>
                  获取中...
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="playlist-items">
          <div 
            v-for="(item, index) in videoInfo"
            :key="item.id || index"
            class="playlist-item"
            :class="{ selected: selectedItems.has(index) }"
          >
            <div class="item-checkbox" @click="toggleSelect(index)">
              <svg v-if="selectedItems.has(index)" viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="var(--primary)"/>
                <polyline points="9 12 11 14 15 10" stroke="var(--bg-deep)" stroke-width="2" fill="none"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--border-light)" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <span class="item-index" @click="toggleSelect(index)">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="item-info" @click="toggleSelect(index)">
              <span class="item-title">{{ item.title || `视频 ${index + 1}` }}</span>
              <span v-if="item.duration" class="item-duration">{{ formatDuration(item.duration) }}</span>
            </div>
            <!-- 单个视频分辨率选择 -->
            <div class="item-resolution" v-if="formatType !== 'audio'" @click.stop>
              <select 
                class="item-resolution-select" 
                v-model="playlistItemResolutions[index]"
                :title="'选择分辨率'"
              >
                <option v-for="res in resolutionOptions" :key="res.value" :value="res.value">
                  {{ res.label }}
                </option>
              </select>
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
import { ref, computed, h, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// 状态
const url = ref('')
const parsing = ref(false)
const parseError = ref('')
const videoInfo = ref(null)
const isPlaylist = ref(false)
const selectedFormat = ref('best')
const formatType = ref('video') // video, video-only, audio
const selectedItems = ref(new Set())
const thumbnailError = ref(false)
const errorCopied = ref(false)

// 智能解析状态
const smartParsing = ref(false)
const smartParseStatus = ref('')
const selectedVideoUrl = ref('')  // 选中的视频 URL（智能解析有多个来源时）
const smartParseFailed = ref(false)  // 智能解析是否失败（用于显示重新解析选项）
const smartParseWaitTime = ref(5)  // 用户操作等待时间（秒）

// 标题编辑
const editingTitle = ref(false)
const editTitleValue = ref('')
const titleInputRef = ref(null)

// 分辨率相关
const selectedResolution = ref('best')  // 统一分辨率选择
const playlistItemResolutions = ref({})  // 每个视频的独立分辨率选择
const playlistFormats = ref([])  // 播放列表可用的格式（从第一个视频获取）
const loadingFormats = ref(false)  // 正在加载格式信息

// 播放列表开关（本地状态，与设置同步）
const enablePlaylist = ref(true)

// 动态分辨率选项（根据视频实际分辨率生成）
const resolutionOptions = computed(() => {
  const options = [{ value: 'best', label: '最佳质量' }]
  
  if (playlistFormats.value.length > 0) {
    // 从格式列表中提取唯一的分辨率
    const heights = new Set()
    playlistFormats.value.forEach(f => {
      // 只要有 height 就添加（yt-dlp 返回的格式可能各种情况）
      if (f.height && f.height > 0) {
        // 排除纯音频格式（vcodec 明确为 none）
        if (f.vcodec !== 'none') {
          heights.add(f.height)
        }
      }
    })
    
    // 按分辨率从高到低排序
    const sortedHeights = Array.from(heights).sort((a, b) => b - a)
    
    console.log('可用分辨率:', sortedHeights)
    
    sortedHeights.forEach(height => {
      let label = `${height}p`
      if (height >= 2160) label = `4K (${height}p)`
      else if (height >= 1440) label = `2K (${height}p)`
      else if (height >= 1080) label = `1080p (Full HD)`
      else if (height >= 720) label = `720p (HD)`
      options.push({ value: String(height), label })
    })
  }
  
  // 如果没有获取到格式，提供常用分辨率作为默认选项
  if (options.length === 1) {
    options.push(
      { value: '2160', label: '4K (2160p)' },
      { value: '1440', label: '2K (1440p)' },
      { value: '1080', label: '1080p (Full HD)' },
      { value: '720', label: '720p (HD)' },
      { value: '480', label: '480p' },
      { value: '360', label: '360p' }
    )
  }
  
  return options
})

// 检查路由参数，或恢复之前的解析结果
onMounted(() => {
  // 从设置中初始化播放列表开关
  enablePlaylist.value = appStore.config.enablePlaylist !== false
  
  if (route.query.url) {
    url.value = route.query.url
    // 清除查询参数
    router.replace({ path: '/', query: {} })
    // 自动开始解析
    setTimeout(() => parseUrl(), 100)
  } else {
    // 恢复之前的解析结果
    restoreParsedResult()
  }
})

// 监听播放列表开关变化，同步到设置
watch(enablePlaylist, (newVal) => {
  appStore.config.enablePlaylist = newVal
})

// 恢复之前的解析结果
function restoreParsedResult() {
  const saved = appStore.parsedResult
  if (saved.videoInfo) {
    url.value = saved.url
    videoInfo.value = saved.videoInfo
    isPlaylist.value = saved.isPlaylist
    selectedFormat.value = saved.selectedFormat
    formatType.value = saved.formatType
    selectedItems.value = new Set(saved.selectedItems)
    // 恢复分辨率信息
    if (saved.selectedResolution) {
      selectedResolution.value = saved.selectedResolution
    }
    if (saved.playlistItemResolutions) {
      playlistItemResolutions.value = saved.playlistItemResolutions
    }
    if (saved.playlistFormats) {
      playlistFormats.value = saved.playlistFormats
    }
  } else {
    // 没有保存的结果时，使用设置中的默认格式
    applyDefaultFormat()
  }
}

// 应用设置中的默认格式
function applyDefaultFormat() {
  const defaultFormat = appStore.config.defaultFormat
  if (defaultFormat === 'best') {
    formatType.value = 'video'
    selectedFormat.value = 'best'
  } else if (defaultFormat === 'bestvideo') {
    formatType.value = 'video-only'
    selectedFormat.value = 'bestvideo'
  } else if (defaultFormat === 'bestaudio') {
    formatType.value = 'audio'
    selectedFormat.value = 'bestaudio'
  }
}

// 保存解析结果到 store
function saveParsedResultToStore() {
  appStore.saveParsedResult({
    url: url.value,
    videoInfo: videoInfo.value,
    isPlaylist: isPlaylist.value,
    selectedFormat: selectedFormat.value,
    formatType: formatType.value,
    selectedItems: Array.from(selectedItems.value),
    // 保存分辨率信息
    selectedResolution: selectedResolution.value,
    playlistItemResolutions: playlistItemResolutions.value,
    playlistFormats: playlistFormats.value
  })
}

// 监听状态变化，自动保存
watch([videoInfo, selectedFormat, formatType, selectedItems, selectedResolution, playlistItemResolutions, playlistFormats], () => {
  if (videoInfo.value) {
    saveParsedResultToStore()
  }
}, { deep: true })

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

// 判断是否为 YouTube 相关错误
const isYouTubeError = computed(() => {
  if (!parseError.value) return false
  const error = parseError.value.toLowerCase()
  return error.includes('youtube') || 
         error.includes('403') || 
         error.includes('forbidden') || 
         error.includes('cookie') ||
         error.includes('requested format is not available')
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
  
  // 使用设置中的默认格式
  applyDefaultFormat()
  
  // 同步播放列表设置
  appStore.config.enablePlaylist = enablePlaylist.value
  
  try {
    // 检查是否需要使用智能解析（域名白名单匹配）
    const shouldSmartParse = await appStore.api.shouldUseSmartParse(url.value.trim())
    
    if (shouldSmartParse) {
      console.log('域名匹配智能解析白名单，直接使用智能解析')
      await startSmartParse()
      return
    }
    
    const result = await appStore.parseVideo(url.value.trim(), enablePlaylist.value)
    
    if (result.type === 'playlist') {
      isPlaylist.value = true
      videoInfo.value = result.data
      // 默认全选
      result.data.forEach((_, index) => selectedItems.value.add(index))
      // 初始化播放列表分辨率
      selectedResolution.value = 'best'
      playlistFormats.value = []
      initPlaylistResolutions()
      
      // 异步获取第一个视频的格式信息作为分辨率参考
      fetchPlaylistFormats(result.data)
    } else {
      isPlaylist.value = false
      videoInfo.value = result.data
      playlistFormats.value = []
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
  isPlaylist.value = false
  selectedItems.value = new Set()
  selectedFormat.value = 'best'
  formatType.value = 'video'
  // 同时清空 store 中保存的解析结果
  appStore.clearParsedResult()
}

const goToRules = () => {
  router.push('/rules')
}

const goToSettings = () => {
  router.push('/settings')
}

const copyError = async () => {
  try {
    await navigator.clipboard.writeText(parseError.value)
    errorCopied.value = true
    appStore.showToast('错误信息已复制到剪贴板', 'success')
    setTimeout(() => {
      errorCopied.value = false
    }, 2000)
  } catch (err) {
    appStore.showToast('复制失败', 'error')
  }
}

// 智能解析 - 使用 Electron 内置浏览器拦截网络请求
// showBrowser: 是否显示浏览器窗口让用户操作
const startSmartParse = async (showBrowser = false) => {
  if (!url.value.trim() || smartParsing.value) return
  
  smartParsing.value = true
  parsing.value = true  // 同步 parsing 状态
  smartParseStatus.value = showBrowser ? '正在打开浏览器...' : '正在启动浏览器...'
  
  // 如果不是显示浏览器模式，清除之前的失败状态
  if (!showBrowser) {
    smartParseFailed.value = false
  }
  
  // 监听进度更新
  appStore.api.onSmartParseProgress?.((data) => {
    smartParseStatus.value = data.message || '处理中...'
  })
  
  try {
    const options = {
      show: showBrowser,
      timeout: showBrowser ? 120000 : 30000,  // 显示浏览器时给更多时间
      userWaitTime: showBrowser ? smartParseWaitTime.value * 1000 : 0  // 用户操作等待时间
    }
    
    const result = await appStore.api.smartParse(url.value.trim(), options)
    
    if (result.success && result.bestUrl) {
      // 成功捕获到视频地址
      parseError.value = ''
      smartParseFailed.value = false
      videoInfo.value = {
        title: result.title || '未知标题',
        thumbnail: result.thumbnail || '',
        duration: null,
        uploader: '',
        formats: [],
        // 保存捕获到的视频地址
        _smartParseUrl: result.bestUrl,
        _allVideoUrls: result.videoUrls,
        // 保存带请求头的视频信息
        _videoUrlsWithHeaders: result.videoUrlsWithHeaders || [],
        _bestUrlHeaders: result.bestUrlHeaders || {}
      }
      isPlaylist.value = false
      
      // 设置默认选中的视频 URL
      selectedVideoUrl.value = result.bestUrl
      
      appStore.showToast(`成功捕获到 ${result.videoUrls.length} 个视频地址`, 'success')
      
      // 显示捕获到的地址供用户选择
      if (result.videoUrls.length > 1) {
        console.log('捕获到的所有视频地址:', result.videoUrls)
      }
      
      // 打印请求头信息（调试用）
      if (result.bestUrlHeaders && Object.keys(result.bestUrlHeaders).length > 0) {
        console.log('最佳URL的请求头:', result.bestUrlHeaders)
      }
    } else {
      // 智能解析失败，可能需要登录或其他操作
      smartParseFailed.value = true
      parseError.value = '智能解析未能捕获到视频地址，请尝试打开浏览器登录后重新解析'
      appStore.showToast('未能捕获到视频，请尝试"打开浏览器解析"', 'warning')
    }
  } catch (error) {
    console.error('智能解析失败:', error)
    smartParseFailed.value = true
    parseError.value = '智能解析失败: ' + error.message
    appStore.showToast('智能解析失败: ' + error.message, 'error')
  } finally {
    smartParsing.value = false
    parsing.value = false
    smartParseStatus.value = ''
  }
}

// 打开浏览器进行智能解析（用户可以在浏览器中操作）
const startSmartParseWithBrowser = () => {
  startSmartParse(true)
}

const selectAll = () => {
  if (isPlaylist.value && videoInfo.value) {
    videoInfo.value.forEach((_, index) => selectedItems.value.add(index))
  }
}

// 将统一分辨率应用到所有视频
const applyResolutionToAll = () => {
  if (isPlaylist.value && videoInfo.value) {
    videoInfo.value.forEach((_, index) => {
      playlistItemResolutions.value[index] = selectedResolution.value
    })
  }
}

// 初始化播放列表分辨率
const initPlaylistResolutions = () => {
  if (isPlaylist.value && videoInfo.value) {
    playlistItemResolutions.value = {}
    videoInfo.value.forEach((_, index) => {
      playlistItemResolutions.value[index] = selectedResolution.value
    })
  }
}

// 异步获取播放列表的格式信息（从第一个视频获取作为参考）
const fetchPlaylistFormats = async (playlist) => {
  if (!playlist || playlist.length === 0) return
  
  // 找到第一个有 URL 的视频
  const firstItem = playlist.find(item => item.url || item.webpage_url || item.id)
  if (!firstItem) {
    console.log('播放列表中没有可用的视频 URL')
    return
  }
  
  console.log('第一个视频信息:', JSON.stringify(firstItem, null, 2))
  
  // 获取视频 URL，并移除播放列表参数以确保只解析单个视频
  let itemUrl = firstItem.url || firstItem.webpage_url
  
  // 如果没有完整 URL，尝试根据 id 构建（YouTube）
  if (!itemUrl && firstItem.id) {
    itemUrl = `https://www.youtube.com/watch?v=${firstItem.id}`
  }
  
  if (!itemUrl) {
    console.log('无法构建视频 URL')
    return
  }
  
  // 移除 URL 中的播放列表参数，确保只解析单个视频
  try {
    const urlObj = new URL(itemUrl)
    urlObj.searchParams.delete('list')
    urlObj.searchParams.delete('index')
    itemUrl = urlObj.toString()
  } catch (e) {
    // URL 解析失败，保持原样
    console.log('URL 解析失败，使用原始 URL')
  }
  
  console.log('获取格式信息 URL:', itemUrl)
  
  loadingFormats.value = true
  try {
    // 明确禁用播放列表模式，只获取单个视频的完整格式信息
    const result = await appStore.parseVideo(itemUrl, false)
    console.log('解析结果类型:', result.type)
    
    if (result.type === 'single' && result.data) {
      if (result.data.formats && result.data.formats.length > 0) {
        playlistFormats.value = result.data.formats
        console.log('获取到格式数量:', result.data.formats.length)
        
        // 打印所有视频格式的分辨率
        const videoFormats = result.data.formats.filter(f => f.height && f.vcodec !== 'none')
        const heights = [...new Set(videoFormats.map(f => f.height))].sort((a, b) => b - a)
        console.log('视频格式分辨率:', heights.map(h => `${h}p`).join(', '))
        
        // 检查是否只有低分辨率
        const maxHeight = Math.max(...heights, 0)
        if (maxHeight <= 480 && (!appStore.config.cookiesFromBrowser || appStore.config.cookiesFromBrowser === 'none')) {
          appStore.showToast('提示：在设置中配置浏览器 Cookie 可获取高清格式', 'warning', 5000)
        } else if (videoFormats.length > 0) {
          appStore.showToast(`已获取 ${heights.length} 种分辨率 (最高 ${maxHeight}p)`, 'success')
        }
      } else {
        console.log('解析结果中没有 formats 字段:', Object.keys(result.data))
        // 如果没有 formats，可能是因为没有 cookies，提示用户
        if (!appStore.config.cookiesFromBrowser || appStore.config.cookiesFromBrowser === 'none') {
          appStore.showToast('提示：在"设置"中配置浏览器 Cookie 可获取更多格式', 'info', 5000)
        }
      }
    }
  } catch (error) {
    console.error('获取格式信息失败:', error)
    appStore.showToast('获取格式信息失败，将使用默认分辨率', 'warning')
  } finally {
    loadingFormats.value = false
  }
}

const selectNone = () => {
  selectedItems.value.clear()
}

// 标题编辑方法
const startEditTitle = () => {
  editTitleValue.value = videoInfo.value?.title || ''
  editingTitle.value = true
  // 下一帧聚焦输入框
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

const saveTitle = () => {
  if (editTitleValue.value.trim() && videoInfo.value) {
    videoInfo.value.title = editTitleValue.value.trim()
    appStore.showToast('标题已修改', 'success')
  }
  editingTitle.value = false
}

const cancelEditTitle = () => {
  editingTitle.value = false
  editTitleValue.value = ''
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
  
  // 检查是否是智能解析的结果
  const isSmartParseResult = !!videoInfo.value._smartParseUrl
  
  // 获取选中格式的信息
  const formatInfo = selectedFormatInfo.value || bestVideoInfo.value
  
  // 根据格式类型确定实际格式字符串
  let format = selectedFormat.value
  let formatId = null
  let resolutionLabel = ''
  
  // 智能解析结果直接使用 best 格式
  if (isSmartParseResult) {
    format = 'best'
    resolutionLabel = '自动'
  } else if (formatType.value === 'audio') {
    // 仅音频
    format = 'bestaudio'
    resolutionLabel = '音频'
  } else if (formatType.value === 'video-only') {
    // 仅视频 - 不合并音频
    if (selectedFormat.value === 'bestvideo') {
      format = 'bestvideo'
      resolutionLabel = '仅视频'
    } else if (selectedFormatInfo.value) {
      // 选择了具体格式，使用 format_id
      format = 'bestvideo'
      formatId = selectedFormat.value
      resolutionLabel = formatInfo?.resolution || (formatInfo?.height ? `${formatInfo.height}p` : '仅视频')
    } else {
      format = 'bestvideo'
      resolutionLabel = '仅视频'
    }
  } else {
    // 视频+音频
    if (selectedFormat.value === 'best') {
      // 使用最佳视频格式ID + 音频
      if (bestVideoInfo.value?.format_id) {
        formatId = bestVideoInfo.value.format_id
        resolutionLabel = formatInfo?.resolution || (formatInfo?.height ? `${formatInfo.height}p` : '最佳')
      } else {
        format = 'best'
        resolutionLabel = '最佳'
      }
    } else if (selectedFormatInfo.value) {
      // 选择了具体格式
      formatId = selectedFormat.value
      resolutionLabel = formatInfo?.resolution || (formatInfo?.height ? `${formatInfo.height}p` : '')
    }
  }
  
  // 使用智能解析捕获的 URL 或原始 URL
  // 如果是智能解析结果，使用用户选中的视频 URL（如果有多个来源的话）
  const downloadUrl = isSmartParseResult 
    ? (selectedVideoUrl.value || videoInfo.value._smartParseUrl) 
    : url.value
  
  // 获取选中URL的请求头（智能解析时）
  let downloadHeaders = {}
  if (isSmartParseResult && videoInfo.value._videoUrlsWithHeaders) {
    const urlWithHeaders = videoInfo.value._videoUrlsWithHeaders.find(
      item => item.url === downloadUrl
    )
    if (urlWithHeaders) {
      downloadHeaders = urlWithHeaders.headers
    } else if (videoInfo.value._bestUrlHeaders) {
      downloadHeaders = videoInfo.value._bestUrlHeaders
    }
  }
  
  appStore.addToQueue({
    url: downloadUrl,
    title: videoInfo.value.title,
    thumbnail: videoInfo.value.thumbnail,
    duration: videoInfo.value.duration,
    uploader: videoInfo.value.uploader,
    format: format,
    formatId: formatId,
    formatType: formatType.value,  // 保存格式类型
    resolution: resolutionLabel,
    filesize: formatInfo ? getFileSize(formatInfo) : 0,
    isSmartParse: isSmartParseResult,  // 标记是否来自智能解析
    headers: downloadHeaders  // 保存请求头（用于下载时使用）
  })
  
  appStore.showToast('已添加到下载队列', 'success')
  router.push('/queue')
}

const addSelectedToDownload = () => {
  if (!isPlaylist.value || selectedItems.value.size === 0) return
  
  const tasks = Array.from(selectedItems.value).map(index => {
    const item = videoInfo.value[index]
    // 获取该视频的分辨率设置
    const itemResolution = playlistItemResolutions.value[index] || selectedResolution.value
    
    // 根据格式类型和分辨率生成格式字符串
    let format = ''
    let resolutionLabel = ''
    
    if (formatType.value === 'audio') {
      // 仅音频
      format = 'bestaudio'
      resolutionLabel = '音频'
    } else if (formatType.value === 'video-only') {
      // 仅视频
      if (itemResolution === 'best') {
        format = 'bestvideo'
        resolutionLabel = '仅视频'
      } else {
        format = `bestvideo[height<=${itemResolution}]`
        resolutionLabel = `${itemResolution}p (仅视频)`
      }
    } else {
      // 视频+音频
      if (itemResolution === 'best') {
        format = 'bestvideo+bestaudio/best'
        resolutionLabel = '最佳'
      } else {
        format = `bestvideo[height<=${itemResolution}]+bestaudio/best[height<=${itemResolution}]`
        resolutionLabel = `${itemResolution}p`
      }
    }
    
    return {
      url: item.url || item.webpage_url || url.value,
      title: item.title,
      thumbnail: item.thumbnail,
      duration: item.duration,
      uploader: item.uploader,
      format: format,
      formatType: formatType.value,  // 保存格式类型
      resolution: resolutionLabel,
      maxHeight: itemResolution,
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

// 截断 URL 显示
const truncateUrl = (url, maxLength) => {
  if (!url) return ''
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

// 获取视频来源标签
const getVideoSourceLabel = (videoUrl, index) => {
  try {
    const urlObj = new URL(videoUrl)
    const pathname = urlObj.pathname
    
    // 识别视频格式
    let format = ''
    if (pathname.includes('.m3u8')) format = 'HLS (m3u8)'
    else if (pathname.includes('.mpd')) format = 'DASH (mpd)'
    else if (pathname.includes('.mp4')) format = 'MP4'
    else if (pathname.includes('.flv')) format = 'FLV'
    else if (pathname.includes('.m4s')) format = 'M4S'
    else if (pathname.includes('.ts')) format = 'TS'
    else format = '视频'
    
    // 尝试从 URL 中提取质量信息
    let quality = ''
    const qualityMatch = videoUrl.match(/(\d{3,4}p)|(\d{3,4}x\d{3,4})/i)
    if (qualityMatch) {
      quality = ` - ${qualityMatch[0]}`
    }
    
    return `来源 ${index + 1}: ${format}${quality}`
  } catch (e) {
    return `来源 ${index + 1}`
  }
}

// 复制视频 URL
const copyVideoUrl = async () => {
  try {
    await navigator.clipboard.writeText(selectedVideoUrl.value)
    appStore.showToast('视频链接已复制', 'success')
  } catch (e) {
    appStore.showToast('复制失败', 'error')
  }
}

// 生成解析命令
const generateParseCommand = () => {
  const config = appStore.config
  let args = ['yt-dlp', '--dump-json', '--no-download']
  
  // 代理
  if (config.proxy) {
    args.push('--proxy', config.proxy)
  }
  
  // Cookie
  if (config.cookieFile) {
    args.push('--cookies', `"${config.cookieFile}"`)
  } else if (config.cookiesFromBrowser && config.cookiesFromBrowser !== 'none') {
    args.push('--cookies-from-browser', config.cookiesFromBrowser)
  }
  
  // 自定义参数
  if (config.customArgs) {
    args.push(config.customArgs)
  }
  
  args.push(`"${url.value}"`)
  
  return args.join(' ')
}

// 生成下载命令
const generateDownloadCommand = () => {
  const config = appStore.config
  let args = ['yt-dlp']
  
  // 输出路径
  const outputTemplate = config.namingTemplate
    .replace('{title}', '%(title)s')
    .replace('{id}', '%(id)s')
    .replace('{index}', '%(playlist_index)s')
    .replace('{uploader}', '%(uploader)s')
    .replace('{date}', '%(upload_date)s')
  args.push('-o', `"${config.downloadPath}/${outputTemplate}.%(ext)s"`)
  
  // 下载线程数
  if (config.downloadThreads && config.downloadThreads > 1) {
    args.push('-N', String(config.downloadThreads))
  }
  
  // 限速
  if (config.rateLimit) {
    args.push('-r', config.rateLimit)
  }
  
  // 格式选择
  if (selectedFormat.value === 'bestaudio') {
    // 仅音频
    args.push('-x')
    args.push('--audio-format', config.audioFormat || 'mp3')
    args.push('--audio-quality', config.audioQuality || '0')
  } else if (selectedFormat.value === 'bestvideo') {
    // 仅视频 - 使用实际的最佳视频格式ID
    if (bestVideoInfo.value && bestVideoInfo.value.format_id) {
      args.push('-f', bestVideoInfo.value.format_id)
    } else {
      args.push('-f', 'bestvideo')
    }
  } else if (selectedFormat.value === 'best') {
    // 最佳质量：使用实际的最佳视频格式ID + 最佳音频
    if (bestVideoInfo.value && bestVideoInfo.value.format_id) {
      args.push('-f', `${bestVideoInfo.value.format_id}+bestaudio/best`)
    } else {
      args.push('-f', 'bestvideo+bestaudio/best')
    }
  } else {
    // 具体格式ID
    args.push('-f', `${selectedFormat.value}+bestaudio/best`)
  }
  
  // 字幕
  if (config.downloadSubtitles) {
    args.push('--write-subs')
    args.push('--sub-lang', config.subtitleLang || 'zh,en')
    if (config.embedSubtitles) {
      args.push('--embed-subs')
    }
  }
  
  // 嵌入封面
  if (config.embedThumbnail) {
    args.push('--embed-thumbnail')
  }
  
  // 代理
  if (config.proxy) {
    args.push('--proxy', config.proxy)
  }
  
  // Cookie
  if (config.cookieFile) {
    args.push('--cookies', `"${config.cookieFile}"`)
  } else if (config.cookiesFromBrowser && config.cookiesFromBrowser !== 'none') {
    args.push('--cookies-from-browser', config.cookiesFromBrowser)
  }
  
  // 自定义参数
  if (config.customArgs) {
    args.push(config.customArgs)
  }
  
  args.push(`"${url.value}"`)
  
  return args.join(' ')
}

// 复制解析命令
const copyParseCommand = async () => {
  try {
    const command = generateParseCommand()
    await navigator.clipboard.writeText(command)
    appStore.showToast('解析命令已复制', 'success')
  } catch (e) {
    appStore.showToast('复制失败', 'error')
  }
}

// 复制下载命令
const copyDownloadCommand = async () => {
  try {
    const command = generateDownloadCommand()
    await navigator.clipboard.writeText(command)
    appStore.showToast('下载命令已复制', 'success')
  } catch (e) {
    appStore.showToast('复制失败', 'error')
  }
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

.playlist-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  
  input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  
  .toggle-text {
    font-size: 12px;
    color: var(--text-secondary);
    user-select: none;
  }
  
  &:hover .toggle-text {
    color: var(--text-primary);
  }
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
    line-height: 1.6;
    word-break: break-word;
  }
}

.error-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.smart-parse-section {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-md);
  text-align: center;
}

.smart-parse-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.btn-smart-parse {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  svg {
    flex-shrink: 0;
  }
}

.btn-login-browser {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  svg {
    flex-shrink: 0;
  }
}

.wait-time-setting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  
  label {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.wait-time-select {
  padding: 4px 24px 4px 8px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  
  &:focus {
    border-color: var(--primary);
  }
}

.smart-parse-hint {
  margin-top: var(--spacing-sm);
  font-size: 12px;
  color: var(--text-muted);
}

.youtube-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: var(--radius-md);
}

.hint-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: var(--spacing-sm);
  
  svg {
    flex-shrink: 0;
    color: var(--primary);
  }
}

.hint-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.8;
  
  li {
    margin-bottom: 4px;
    
    strong {
      color: var(--text-primary);
      font-weight: 600;
    }
  }
}

.btn-icon-text {
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
    background: var(--bg-hover);
  }
  
  svg {
    flex-shrink: 0;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-reparse {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: white;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  svg {
    flex-shrink: 0;
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
  min-width: 0;  // 防止内容溢出 grid
  overflow: hidden;
}

.video-title-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  width: 100%;
}

.video-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
  min-width: 0;  // 允许文字截断
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;  // 最多显示2行
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.title-actions {
  flex-shrink: 0;  // 确保按钮不被压缩
}

.title-edit-input {
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  outline: none;
  
  &:focus {
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
  }
}

.title-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-sm {
  padding: 4px;
  
  svg {
    width: 16px;
    height: 16px;
  }
}

.btn-success {
  color: var(--success);
  
  &:hover {
    background: rgba(var(--success-rgb, 34, 197, 94), 0.1);
  }
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

// 视频来源选择（智能解析多来源）
.video-source-section {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-md);
}

.source-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
  margin-bottom: var(--spacing-sm);
  
  svg {
    flex-shrink: 0;
  }
}

.source-select {
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
}

.source-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.preview-url-wrapper {
  flex: 1;
  min-width: 0;
}

.preview-url-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: text;
  
  &:focus {
    border-color: var(--primary);
  }
  
  &::selection {
    background: var(--primary);
    color: white;
  }
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  
  svg {
    flex-shrink: 0;
  }
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
  gap: var(--spacing-sm);
}

.action-buttons-row {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

// 播放列表
.playlist-section {
  padding: var(--spacing-lg);
}

.playlist-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.playlist-format-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.resolution-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  
  label {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

.resolution-select-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.loading-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.resolution-select {
  padding: 6px 28px 6px 12px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  
  &:focus {
    border-color: var(--primary);
  }
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

.item-resolution {
  flex-shrink: 0;
  margin-left: var(--spacing-sm);
}

.item-resolution-select {
  padding: 4px 24px 4px 8px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  min-width: 80px;
  
  &:focus {
    border-color: var(--primary);
  }
  
  &:hover {
    border-color: var(--border-light);
  }
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
