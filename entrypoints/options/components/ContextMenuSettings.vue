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
    translate: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
    furigana: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
    explain: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    weblio: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2" /><text x="12" y="17" fill="currentColor" font-size="14" font-weight="bold" font-family="serif" text-anchor="middle">W</text></svg>',
    jisho: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2" /><text x="12" y="17" fill="currentColor" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">辞</text></svg>',
    wikipedia: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.82 4.86c0-.34.12-.51.36-.51.07 0 .22.02.46.06v-.3h-5v.3c.23 0 .37.02.41.02.25 0 .37.17.37.51 0 .17-.07.47-.21.89l-2.6 8.5-1.92-6.52 1.63-5.26c.12-.37.22-.56.3-.56.05 0 .21.02.46.06v-.3H9.86v.3c.23 0 .36.02.38.02.24 0 .35.17.35.51 0 .24-.1.58-.29 1.01L8.35 13.62 6.14 5.88c-.11-.45-.16-.79-.16-1.02 0-.34.13-.51.38-.51.05 0 .2-.02.43-.06v-.3h-4v.3c.23 0 .37.02.4.02.25 0 .43.17.56.51l3.52 11.58h.41l2.67-8.15 2.62 8.15h.41l4.02-11.58c.2-.6.27-.9.27-1.07z"/></svg>',
    google: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>'
  };
  return map[id] || '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle></svg>';
};
</script>
