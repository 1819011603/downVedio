<template>
  <div class="settings-view">
    <header class="page-header">
      <h1 class="page-title">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        设置
      </h1>
    </header>
    
    <div class="settings-content">
      <!-- 下载设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
          </svg>
          下载设置
        </h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>下载目录</label>
            <p>视频文件的保存位置</p>
          </div>
          <div class="setting-control path-control">
            <input 
              type="text" 
              class="input" 
              v-model="config.downloadPath"
              readonly
            />
            <button class="btn btn-secondary" @click="selectDownloadPath">
              浏览
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>默认格式</label>
            <p>下载视频时的默认格式选择</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model="config.defaultFormat">
              <option value="best">视频+音频（最佳质量）</option>
              <option value="bestvideo">仅视频</option>
              <option value="bestaudio">仅音频</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>支持播放列表</label>
            <p>开启后会解析整个播放列表，关闭则只解析单个视频</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.enablePlaylist" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>同时下载数</label>
            <p>允许同时进行的下载任务数量</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model.number="config.concurrentDownloads">
              <option :value="1">1 个</option>
              <option :value="2">2 个</option>
              <option :value="3">3 个</option>
              <option :value="5">5 个</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>下载线程数</label>
            <p>单个视频的并行下载连接数（-N 参数）</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model.number="config.downloadThreads">
              <option :value="1">1 线程</option>
              <option :value="2">2 线程</option>
              <option :value="4">4 线程</option>
              <option :value="8">8 线程</option>
              <option :value="16">16 线程</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>失败重试次数</label>
            <p>下载失败时自动重试的次数（网络超时等临时错误）</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model.number="config.downloadRetries">
              <option :value="0">不重试</option>
              <option :value="1">1 次</option>
              <option :value="2">2 次</option>
              <option :value="3">3 次</option>
              <option :value="5">5 次</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>下载限速</label>
            <p>限制下载速度，如 1M, 500K（留空不限速）</p>
          </div>
          <div class="setting-control">
            <input 
              type="text" 
              class="input font-mono" 
              v-model="config.rateLimit"
              placeholder="如 1M, 500K"
            />
          </div>
        </div>
      </section>
      
      <!-- 字幕与媒体 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="6" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="2"/>
            <line x1="6" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="2"/>
          </svg>
          字幕与媒体
        </h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>下载字幕</label>
            <p>自动下载视频字幕</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.downloadSubtitles" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item" v-if="config.downloadSubtitles">
          <div class="setting-info">
            <label>字幕语言</label>
            <p>优先下载的字幕语言（逗号分隔）</p>
          </div>
          <div class="setting-control">
            <input 
              type="text" 
              class="input font-mono" 
              v-model="config.subtitleLang"
              placeholder="zh,en"
            />
          </div>
        </div>
        
        <div class="setting-item" v-if="config.downloadSubtitles">
          <div class="setting-info">
            <label>嵌入字幕</label>
            <p>将字幕嵌入视频文件</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.embedSubtitles" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>嵌入封面</label>
            <p>将视频封面嵌入文件</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.embedThumbnail" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>保存封面</label>
            <p>单独保存视频封面图片</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.writeThumbnail" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>保存描述</label>
            <p>保存视频描述信息</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.writeDescription" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>
      
      <!-- 音频设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          音频设置
        </h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>音频格式</label>
            <p>提取音频时的输出格式</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model="config.audioFormat">
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="flac">FLAC</option>
              <option value="wav">WAV</option>
              <option value="opus">OPUS</option>
              <option value="aac">AAC</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>音频质量</label>
            <p>0 最佳，9 最差</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model="config.audioQuality">
              <option value="0">0 (最佳)</option>
              <option value="2">2 (高)</option>
              <option value="5">5 (中)</option>
              <option value="9">9 (低)</option>
            </select>
          </div>
        </div>
      </section>
      
      <!-- 命名设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          文件命名
        </h2>
        
        <div class="setting-item column">
          <div class="setting-info">
            <label>命名模板</label>
            <p>使用变量自定义文件名格式</p>
          </div>
          <div class="setting-control">
            <input 
              type="text" 
              class="input font-mono" 
              v-model="config.namingTemplate"
              placeholder="{title}"
            />
          </div>
          <div class="template-help">
            <span class="help-title">可用变量：</span>
            <div class="template-tags">
              <code v-for="tag in templateTags" :key="tag.name" @click="insertTag(tag.name)">
                {{ tag.name }}
                <span class="tag-desc">{{ tag.desc }}</span>
              </code>
            </div>
          </div>
          <div class="template-preview" v-if="config.namingTemplate">
            <span class="preview-label">预览：</span>
            <span class="preview-text">{{ previewFilename }}</span>
          </div>
        </div>
      </section>
      
      <!-- 智能解析设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/>
            <path d="M11 8v6M8 11h6" stroke="currentColor" stroke-width="2"/>
          </svg>
          智能解析
        </h2>
        
        <div class="setting-item column">
          <div class="setting-info">
            <label>智能解析域名白名单</label>
            <p>添加的域名将跳过 yt-dlp 解析，直接使用智能解析捕获视频流</p>
          </div>
          
          <div class="domain-input-row">
            <input 
              type="text" 
              class="input font-mono" 
              v-model="newSmartDomain"
              placeholder="输入域名，如 example.com"
              @keyup.enter="addSmartDomain"
            />
            <button class="btn btn-primary" @click="addSmartDomain" :disabled="!newSmartDomain.trim()">
              添加
            </button>
          </div>
          
          <div class="domain-list" v-if="config.smartParseDomains && config.smartParseDomains.length > 0">
            <div 
              v-for="(domain, index) in config.smartParseDomains" 
              :key="index"
              class="domain-item"
            >
              <span class="domain-text">{{ domain }}</span>
              <button class="btn btn-icon btn-sm" @click="removeSmartDomain(index)" title="删除">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="smart-parse-help">
            <div class="help-icon">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="help-content">
              <p><strong>使用说明：</strong></p>
              <ul>
                <li>添加的域名会自动匹配子域名（如添加 site.com 会匹配 www.site.com）</li>
                <li>适用于 yt-dlp 不支持的网站</li>
                <li>智能解析会捕获页面中的视频流地址（m3u8、mp4 等）</li>
                <li>如果捕获到多个视频来源，可以选择想要下载的链接</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 网络设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          网络设置
        </h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>代理服务器</label>
            <p>用于访问受限制网站的代理地址</p>
          </div>
          <div class="setting-control">
            <input 
              type="text" 
              class="input font-mono" 
              v-model="config.proxy"
              placeholder="http://127.0.0.1:7890"
            />
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>Cookie 文件</label>
            <p>用于登录验证的 Cookies（Netscape 格式）</p>
          </div>
          <div class="setting-control path-control">
            <input 
              type="text" 
              class="input" 
              v-model="config.cookieFile"
              readonly
              placeholder="未选择"
            />
            <button class="btn btn-secondary" @click="selectCookieFile">
              浏览
            </button>
            <button 
              v-if="config.cookieFile" 
              class="btn btn-icon" 
              @click="config.cookieFile = ''"
              title="清除"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>从浏览器获取 Cookie</label>
            <p>自动读取浏览器登录状态（推荐 B站、优酷等）</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model="config.cookiesFromBrowser">
              <option value="none">不使用</option>
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="edge">Edge</option>
              <option value="opera">Opera</option>
              <option value="brave">Brave</option>
            </select>
          </div>
        </div>
        
        <div class="cookie-help">
          <div class="help-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="help-content">
            <p><strong>推荐方式：</strong>选择"从浏览器获取 Cookie"，然后用该浏览器登录 B站/优酷等网站即可</p>
            <p style="margin-top: 8px;"><strong>手动方式：</strong></p>
            <ol>
              <li>安装浏览器扩展 "Get cookies.txt LOCALLY"</li>
              <li>登录目标网站后，点击扩展导出 Cookies</li>
              <li>选择导出的 cookies.txt 文件</li>
            </ol>
          </div>
        </div>
      </section>
      
      <!-- 高级设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          高级设置
        </h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <label>自动重试</label>
            <p>下载失败时自动重试</p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="config.autoRetry" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item" v-if="config.autoRetry">
          <div class="setting-info">
            <label>最大重试次数</label>
            <p>自动重试的最大次数</p>
          </div>
          <div class="setting-control">
            <select class="input select" v-model.number="config.maxRetries">
              <option :value="1">1 次</option>
              <option :value="2">2 次</option>
              <option :value="3">3 次</option>
              <option :value="5">5 次</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item column">
          <div class="setting-info">
            <label>自定义 yt-dlp 参数</label>
            <p>添加额外的命令行参数（空格分隔）</p>
          </div>
          <div class="setting-control">
            <input 
              type="text" 
              class="input font-mono" 
              v-model="config.customArgs"
              placeholder="例如：--no-check-certificate --ignore-errors"
            />
          </div>
          <div class="custom-args-help">
            <span class="help-title">常用参数：</span>
            <div class="args-tags">
              <code @click="addCustomArg('--no-check-certificate')">--no-check-certificate</code>
              <code @click="addCustomArg('--ignore-errors')">--ignore-errors</code>
              <code @click="addCustomArg('--geo-bypass')">--geo-bypass</code>
              <code @click="addCustomArg('--no-playlist')">--no-playlist</code>
              <code @click="addCustomArg('--yes-playlist')">--yes-playlist</code>
              <code @click="addCustomArg('--extract-audio')">--extract-audio</code>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 关于 -->
      <section class="settings-section about-section">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          关于
        </h2>
        
        <div class="about-info">
          <div class="app-logo">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="var(--primary)" stroke-width="2" fill="none"/>
              <path d="M2 17l10 5 10-5" stroke="var(--primary)" stroke-width="2" fill="none"/>
              <path d="M2 12l10 5 10-5" stroke="var(--primary)" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <div class="app-details">
            <h3>视频下载器</h3>
            <p>版本 1.0.0</p>
            <p class="powered-by">
              Powered by 
              <a href="#" @click.prevent="openExternal('https://github.com/yt-dlp/yt-dlp')">yt-dlp</a>
            </p>
          </div>
        </div>
        
        <div class="about-links">
          <button class="btn btn-secondary" @click="openExternal('https://github.com/yt-dlp/yt-dlp')">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            yt-dlp GitHub
          </button>
          <button class="btn btn-secondary" @click="checkForUpdates">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <polyline points="23 4 23 10 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            检查 yt-dlp 更新
          </button>
        </div>
      </section>
      
      <!-- 保存按钮 -->
      <div class="save-bar">
        <button class="btn btn-secondary" @click="resetConfig">重置默认</button>
        <button class="btn btn-primary" @click="saveConfig">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="7 3 7 8 15 8" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          保存设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const config = reactive({
  downloadPath: '',
  namingTemplate: '{title}',
  defaultFormat: 'best',
  proxy: '',
  cookieFile: '',
  cookiesFromBrowser: 'none',
  concurrentDownloads: 1,
  autoRetry: true,
  maxRetries: 3,
  // 新增配置项
  downloadThreads: 4,
  rateLimit: '',
  downloadSubtitles: false,
  subtitleLang: 'zh,en',
  embedSubtitles: false,
  embedThumbnail: false,
  writeThumbnail: false,
  writeDescription: false,
  audioFormat: 'mp3',
  audioQuality: '0',
  customArgs: '',
  // 智能解析域名白名单
  smartParseDomains: []
})

// 智能解析域名输入
const newSmartDomain = ref('')

// 添加智能解析域名
const addSmartDomain = () => {
  const domain = newSmartDomain.value.trim().toLowerCase()
  if (!domain) return
  
  // 移除协议前缀
  let cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  
  // 检查是否已存在
  if (config.smartParseDomains.includes(cleanDomain)) {
    appStore.showToast('该域名已存在', 'warning')
    return
  }
  
  config.smartParseDomains.push(cleanDomain)
  newSmartDomain.value = ''
}

// 删除智能解析域名
const removeSmartDomain = (index) => {
  config.smartParseDomains.splice(index, 1)
}

const templateTags = [
  { name: '{title}', desc: '视频标题' },
  { name: '{id}', desc: '视频ID' },
  { name: '{index}', desc: '序号' },
  { name: '{uploader}', desc: '上传者' },
  { name: '{date}', desc: '日期' }
]

const previewFilename = computed(() => {
  return config.namingTemplate
    .replace('{title}', '示例视频标题')
    .replace('{id}', 'abc123')
    .replace('{index}', '01')
    .replace('{uploader}', '某创作者')
    .replace('{date}', new Date().toISOString().split('T')[0])
    + '.mp4'
})

onMounted(() => {
  Object.assign(config, appStore.config)
  // 确保 smartParseDomains 是数组
  if (!Array.isArray(config.smartParseDomains)) {
    config.smartParseDomains = []
  }
})

const selectDownloadPath = async () => {
  const path = await appStore.api.selectFolder()
  if (path) {
    config.downloadPath = path
  }
}

const selectCookieFile = async () => {
  const path = await appStore.api.selectFile([
    { name: 'Cookie Files', extensions: ['txt'] }
  ])
  if (path) {
    config.cookieFile = path
  }
}

const insertTag = (tag) => {
  config.namingTemplate += tag
}

const addCustomArg = (arg) => {
  if (config.customArgs) {
    if (!config.customArgs.includes(arg)) {
      config.customArgs += ' ' + arg
    }
  } else {
    config.customArgs = arg
  }
}

const saveConfig = () => {
  // 使用 JSON 深拷贝，确保 reactive 对象可以通过 IPC 序列化
  const plainConfig = JSON.parse(JSON.stringify(config))
  appStore.saveConfig(plainConfig)
}

const resetConfig = () => {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    Object.assign(config, {
      downloadPath: config.downloadPath, // 保留下载目录
      namingTemplate: '{title}',
      defaultFormat: 'best',
      proxy: '',
      cookieFile: '',
      concurrentDownloads: 1,
      autoRetry: true,
      maxRetries: 3
    })
    appStore.showToast('设置已重置', 'info')
  }
}

const openExternal = (url) => {
  appStore.api.openExternal(url)
}

const checkForUpdates = () => {
  appStore.showToast('正在检查 yt-dlp 更新...', 'info')
  // TODO: 实现更新检查
}
</script>

<style lang="scss" scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--spacing-lg);
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

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

// 设置区块
.settings-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border);
  
  svg {
    color: var(--primary);
  }
}

// 设置项
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  &:first-of-type {
    padding-top: 0;
  }
  
  &.column {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
    
    .setting-control {
      width: 100%;
    }
  }
}

.setting-info {
  flex: 1;
  
  label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }
  
  p {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.setting-control {
  min-width: 200px;
  
  &.path-control {
    display: flex;
    gap: var(--spacing-sm);
    min-width: 350px;
    
    .input {
      flex: 1;
    }
  }
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  cursor: pointer;
}

// 开关
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-dark);
  border-radius: 26px;
  transition: 0.3s;
  
  &::before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background: var(--text-muted);
    border-radius: 50%;
    transition: 0.3s;
  }
}

.toggle input:checked + .toggle-slider {
  background: var(--primary);
  
  &::before {
    background: white;
    transform: translateX(22px);
  }
}

// 命名模板
.template-help {
  width: 100%;
}

.help-title {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: var(--spacing-sm);
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  
  code {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--primary);
    background: var(--bg-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      border-color: var(--primary);
      background: var(--primary-glow);
    }
    
    .tag-desc {
      font-family: var(--font-sans);
      color: var(--text-muted);
      font-size: 11px;
    }
  }
}

.template-preview {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-dark);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.preview-label {
  color: var(--text-muted);
  margin-right: var(--spacing-sm);
}

.preview-text {
  color: var(--success);
  font-family: var(--font-mono);
}

// 智能解析域名设置
.domain-input-row {
  display: flex;
  gap: var(--spacing-sm);
  width: 100%;
  
  .input {
    flex: 1;
  }
}

.domain-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  width: 100%;
  margin-top: var(--spacing-sm);
}

.domain-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px 10px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  
  .domain-text {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--primary);
  }
  
  .btn-icon {
    padding: 2px;
    color: var(--text-muted);
    
    &:hover {
      color: var(--error);
    }
  }
}

.smart-parse-help {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  margin-top: var(--spacing-md);
  background: var(--bg-dark);
  border-radius: var(--radius-md);
  width: 100%;
  
  .help-icon {
    flex-shrink: 0;
    color: var(--text-muted);
  }
  
  .help-content {
    p {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }
    
    ul {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      color: var(--text-muted);
      
      li {
        margin-bottom: 2px;
      }
    }
  }
}

// Cookie 帮助
.cookie-help {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  margin-top: var(--spacing-md);
  background: var(--bg-dark);
  border-radius: var(--radius-md);
}

.help-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.help-content {
  p {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }
  
  ol {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: var(--text-muted);
    
    li {
      margin-bottom: 2px;
    }
  }
}

// 关于
.about-section {
  .about-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }
  
  .app-logo {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-dark);
    border-radius: var(--radius-lg);
  }
  
  .app-details {
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    
    p {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .powered-by {
      margin-top: var(--spacing-xs);
      
      a {
        color: var(--primary);
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
  
  .about-links {
    display: flex;
    gap: var(--spacing-sm);
  }
}

// 自定义参数帮助
.custom-args-help {
  width: 100%;
  margin-top: var(--spacing-sm);
}

.args-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  
  code {
    padding: 4px 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    background: var(--bg-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      border-color: var(--primary);
      color: var(--primary);
      background: var(--primary-glow);
    }
  }
}

// 保存栏
.save-bar {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  position: sticky;
  bottom: var(--spacing-lg);
}
</style>
