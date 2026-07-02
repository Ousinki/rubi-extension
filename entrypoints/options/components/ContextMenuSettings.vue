<template>
  <section class="card" id="context-menu-panel">
    <div class="card-header">
      <h2>高级右键菜单</h2>
      <span class="section-tag">Context Menu</span>
    </div>
    
    <div class="card-body">
      <div class="toggle-row" style="margin-bottom: 12px;">
        <div class="toggle-desc">
          <h3>启用悬浮右键菜单卡片</h3>
          <p>右键点击高亮单词时，将展示精美的悬浮菜单并支持快速发音、翻译等操作，不再弹出原生浏览器菜单。</p>
        </div>
        <button 
          class="toggle-btn" 
          :class="{ active: settings.enableCustomContextMenu }" 
          @click="settings.enableCustomContextMenu = !settings.enableCustomContextMenu; saveSettings()"
        >
          <span class="toggle-dot"></span>
        </button>
      </div>

      <!-- Sub options -->
      <div 
        v-show="settings.enableCustomContextMenu" 
        ref="sortableListRef"
        class="draggable-list" 
        style="padding-left: 20px; margin-top: 16px; display: flex; flex-direction: column; gap: 8px;"
      >
        <div 
          v-for="item in customMenuConfigList" 
          :key="item.id"
          class="draggable-item"
          style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; transition: background 0.2s, box-shadow 0.2s;"
          :style="{ opacity: item.enabled ? '1' : '0.6' }"
        >
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="drag-handle" style="color: var(--text-tertiary); cursor: grab; display: flex; align-items: center;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </span>
            <span style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; color: var(--text-secondary);" v-html="getMenuIcon(item.id)"></span>
            <span style="font-size: 13.5px; color: var(--text-primary); font-weight: 500; user-select: none;">{{ getMenuLabel(item.id) }}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: center;">
            <input 
              type="checkbox" 
              v-model="item.enabled" 
              @change="saveSettings"
              style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-color);"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import Sortable from 'sortablejs';
import { useOptions } from '../composables/useOptions';
import type { RubiSettings } from '@/utils/storage';

const { settings, saveSettings } = useOptions();

type MenuConfigItem = RubiSettings['customMenuConfig'][number];

const sortableListRef = ref<HTMLElement | null>(null);
const customMenuConfigList = ref<MenuConfigItem[]>([]);

// Sync settings changes to the local sorting list
watch(() => settings.customMenuConfig, (newVal) => {
  if (newVal && JSON.stringify(newVal) !== JSON.stringify(customMenuConfigList.value)) {
    customMenuConfigList.value = [...newVal];
  }
}, { immediate: true, deep: true });

onMounted(() => {
  nextTick(() => {
    if (sortableListRef.value) {
      Sortable.create(sortableListRef.value, {
        handle: '.drag-handle',
        animation: 200,
        forceFallback: true,
        fallbackClass: 'sortable-drag',
        ghostClass: 'sortable-ghost',
        onUpdate: (e) => {
          const { oldIndex, newIndex } = e;
          if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
            const arr = [...customMenuConfigList.value];
            const item = arr.splice(oldIndex, 1)[0];
            arr.splice(newIndex, 0, item);
            
            // Revert DOM change first so Vue can safely render the list based on VDOM updates
            const el = sortableListRef.value;
            if (el && e.item) {
              const children = Array.from(el.children);
              e.item.remove();
              if (oldIndex >= children.length - 1) {
                el.appendChild(e.item);
              } else {
                el.insertBefore(e.item, children[oldIndex]);
              }
            }
            
            customMenuConfigList.value = arr;
            
            nextTick(() => {
              settings.customMenuConfig = [...arr];
              saveSettings();
            });
          }
        }
      });
    }
  });
});

const getMenuLabel = (id: string) => {
  const map: Record<string, string> = {
    translate: '翻译当前段落',
    furigana: '全文注音',
    explain: 'AI 翻译',
    weblio: '在 Weblio 词典中查询',
    jisho: '在 Jisho 词典中查询',
    wikipedia: '在维基百科中查询',
    google: '在 Google 中搜索',
    x: '在 X (Twitter) 中搜索'
  };
  return map[id] || id;
};

const getMenuIcon = (id: string) => {
  const map: Record<string, string> = {
    translate: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7M9 3v2c0 4.418 -2.239 8 -5 8"/><path d="M5 9c0 2.144 2.952 3.908 6.7 4"/><path d="M12 20l4 -9l4 9"/><path d="M19.1 18h-6.2"/></svg>',
    furigana: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h16"/><path d="M4 19h16"/><circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none"/></svg>',
    explain: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
    weblio: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2" /><text x="12" y="17" fill="currentColor" font-size="14" font-weight="bold" font-family="serif" text-anchor="middle">W</text></svg>',
    jisho: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2" /><text x="12" y="17" fill="currentColor" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">辞</text></svg>',
    wikipedia: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z"/></svg>',
    google: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" fill-opacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" fill-opacity="0.6" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" fill-opacity="0.4" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" fill-opacity="0.8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>'
  };
  return map[id] || '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle></svg>';
};
</script>
