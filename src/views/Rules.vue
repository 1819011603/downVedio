<template>
  <div class="rules-view">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          自定义规则
        </h1>
      </div>
      
      <button class="btn btn-primary" @click="addRule">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        添加规则
      </button>
    </header>
    
    <!-- 说明卡片 -->
    <div class="info-card">
      <div class="info-icon">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="info-content">
        <h3>关于自定义规则</h3>
        <p>当 yt-dlp 无法解析某些网站时，可以通过自定义规则来提取视频信息。规则使用 CSS 选择器或 JSON Path 来定位页面中的视频元素。</p>
      </div>
    </div>
    
    <!-- 规则列表 -->
    <div class="rules-list">
      <div v-if="rules.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <h2>暂无自定义规则</h2>
        <p>点击上方按钮添加第一条规则</p>
      </div>
      
      <div 
        v-for="(rule, index) in rules" 
        :key="index"
        class="rule-card"
        :class="{ editing: editingIndex === index, enabled: rule.enabled }"
      >
        <div class="rule-header">
          <div class="rule-info">
            <label class="rule-toggle">
              <input type="checkbox" v-model="rule.enabled" @change="saveRules" />
              <span class="toggle-slider"></span>
            </label>
            <h3 class="rule-name">{{ rule.name || '未命名规则' }}</h3>
            <span class="rule-domain">{{ rule.domain }}</span>
          </div>
          
          <div class="rule-actions">
            <button class="btn btn-icon" @click="editRule(index)" title="编辑">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            <button class="btn btn-icon" @click="deleteRule(index)" title="删除">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 编辑面板 -->
        <div v-if="editingIndex === index" class="rule-editor">
          <div class="form-grid">
            <div class="form-group">
              <label>规则名称</label>
              <input 
                type="text" 
                class="input" 
                v-model="rule.name"
                placeholder="例如：某视频网站"
              />
            </div>
            
            <div class="form-group">
              <label>匹配域名</label>
              <input 
                type="text" 
                class="input" 
                v-model="rule.domain"
                placeholder="例如：example.com"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>URL 匹配模式 (正则表达式)</label>
            <input 
              type="text" 
              class="input font-mono" 
              v-model="rule.urlPattern"
              placeholder="例如：/video/(\d+)"
            />
          </div>
          
          <div class="form-section">
            <h4>提取规则 (CSS 选择器)</h4>
            
            <div class="form-grid">
              <div class="form-group">
                <label>视频标题</label>
                <input 
                  type="text" 
                  class="input font-mono" 
                  v-model="rule.selectors.title"
                  placeholder="例如：h1.video-title"
                />
              </div>
              
              <div class="form-group">
                <label>视频源地址</label>
                <input 
                  type="text" 
                  class="input font-mono" 
                  v-model="rule.selectors.videoUrl"
                  placeholder="例如：video source[src]"
                />
              </div>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label>封面图片</label>
                <input 
                  type="text" 
                  class="input font-mono" 
                  v-model="rule.selectors.thumbnail"
                  placeholder="例如：meta[property='og:image']"
                />
              </div>
              
              <div class="form-group">
                <label>作者/上传者</label>
                <input 
                  type="text" 
                  class="input font-mono" 
                  v-model="rule.selectors.uploader"
                  placeholder="例如：.uploader-name"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label>视频时长</label>
              <input 
                type="text" 
                class="input font-mono" 
                v-model="rule.selectors.duration"
                placeholder="例如：.video-duration"
              />
            </div>
          </div>
          
          <div class="form-section">
            <h4>高级选项</h4>
            
            <div class="form-group">
              <label>请求头 (JSON 格式)</label>
              <textarea 
                class="textarea font-mono" 
                v-model="rule.headers"
                placeholder='{"Referer": "https://example.com"}'
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>自定义脚本 (JavaScript)</label>
              <textarea 
                class="textarea font-mono" 
                v-model="rule.script"
                placeholder="// 返回 { title, videoUrl, thumbnail, uploader, duration }"
                rows="5"
              ></textarea>
            </div>
          </div>
          
          <div class="editor-actions">
            <button class="btn btn-secondary" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" @click="saveRules">保存规则</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 预设规则 -->
    <section class="preset-section">
      <h2 class="section-title">预设规则模板</h2>
      <div class="preset-grid">
        <button 
          v-for="preset in presets" 
          :key="preset.name"
          class="preset-card"
          @click="applyPreset(preset)"
        >
          <span class="preset-name">{{ preset.name }}</span>
          <span class="preset-desc">{{ preset.description }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const rules = ref([])
const editingIndex = ref(-1)

// 预设模板
const presets = [
  {
    name: '通用 HTML5 视频',
    description: '提取页面中的 video 标签',
    rule: {
      name: '通用 HTML5 视频',
      domain: '*',
      urlPattern: '.*',
      selectors: {
        title: 'title',
        videoUrl: 'video source[src], video[src]',
        thumbnail: 'meta[property="og:image"]',
        uploader: '',
        duration: ''
      },
      headers: '',
      script: '',
      enabled: true
    }
  },
  {
    name: 'Open Graph 元数据',
    description: '提取 og:video 标签',
    rule: {
      name: 'Open Graph 视频',
      domain: '*',
      urlPattern: '.*',
      selectors: {
        title: 'meta[property="og:title"]',
        videoUrl: 'meta[property="og:video"], meta[property="og:video:url"]',
        thumbnail: 'meta[property="og:image"]',
        uploader: '',
        duration: ''
      },
      headers: '',
      script: '',
      enabled: true
    }
  },
  {
    name: 'JSON-LD 结构化数据',
    description: '提取 schema.org VideoObject',
    rule: {
      name: 'JSON-LD 视频',
      domain: '*',
      urlPattern: '.*',
      selectors: {
        title: '',
        videoUrl: '',
        thumbnail: '',
        uploader: '',
        duration: ''
      },
      headers: '',
      script: `
// 提取 JSON-LD 中的视频信息
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
for (const script of scripts) {
  try {
    const data = JSON.parse(script.textContent);
    if (data['@type'] === 'VideoObject') {
      return {
        title: data.name,
        videoUrl: data.contentUrl || data.embedUrl,
        thumbnail: data.thumbnailUrl,
        uploader: data.author?.name,
        duration: data.duration
      };
    }
  } catch (e) {}
}
return null;
      `.trim(),
      enabled: true
    }
  }
]

onMounted(() => {
  rules.value = [...appStore.customRules]
})

const createEmptyRule = () => ({
  name: '',
  domain: '',
  urlPattern: '',
  selectors: {
    title: '',
    videoUrl: '',
    thumbnail: '',
    uploader: '',
    duration: ''
  },
  headers: '',
  script: '',
  enabled: true
})

const addRule = () => {
  rules.value.push(createEmptyRule())
  editingIndex.value = rules.value.length - 1
}

const editRule = (index) => {
  editingIndex.value = editingIndex.value === index ? -1 : index
}

const deleteRule = (index) => {
  if (confirm('确定要删除这条规则吗？')) {
    rules.value.splice(index, 1)
    editingIndex.value = -1
    saveRules()
  }
}

const cancelEdit = () => {
  // 如果是新添加的空规则，删除它
  const rule = rules.value[editingIndex.value]
  if (!rule.name && !rule.domain) {
    rules.value.splice(editingIndex.value, 1)
  }
  editingIndex.value = -1
}

const saveRules = () => {
  appStore.saveRules(rules.value)
  editingIndex.value = -1
}

const applyPreset = (preset) => {
  rules.value.push({ ...preset.rule })
  editingIndex.value = rules.value.length - 1
  appStore.showToast(`已添加预设规则: ${preset.name}`, 'success')
}
</script>

<style lang="scss" scoped>
.rules-view {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

// 说明卡片
.info-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.info-icon {
  flex-shrink: 0;
  color: var(--primary);
}

.info-content {
  h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: var(--spacing-xs);
  }
  
  p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.empty-icon {
  margin-bottom: var(--spacing-md);
  color: var(--text-muted);
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.empty-state p {
  font-size: 13px;
  color: var(--text-secondary);
}

// 规则列表
.rules-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.rule-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-light);
  }
  
  &.editing {
    border-color: var(--primary);
  }
  
  &:not(.enabled) {
    opacity: 0.6;
  }
}

.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
}

.rule-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

// 开关样式
.rule-toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  
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
  border-radius: 22px;
  transition: 0.3s;
  
  &::before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background: var(--text-muted);
    border-radius: 50%;
    transition: 0.3s;
  }
}

.rule-toggle input:checked + .toggle-slider {
  background: var(--primary-glow);
  
  &::before {
    background: var(--primary);
    transform: translateX(18px);
  }
}

.rule-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.rule-domain {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  padding: 2px 8px;
  background: var(--bg-dark);
  border-radius: var(--radius-sm);
}

.rule-actions {
  display: flex;
  gap: var(--spacing-xs);
}

// 编辑器
.rule-editor {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border);
  background: var(--bg-dark);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
  
  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }
}

.form-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border);
  
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
  }
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
}

// 预设规则
.preset-section {
  margin-top: var(--spacing-xl);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--primary);
    background: rgba(0, 240, 255, 0.05);
  }
}

.preset-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-desc {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
