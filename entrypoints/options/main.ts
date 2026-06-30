import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from '@/utils/i18n-plugin';

// Force override Chrome's default extension icon on the options tab
const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
link.type = 'image/png';
link.rel = 'icon';
link.href = '/icon/128.png?t=' + Date.now();
document.head.appendChild(link);

createApp(App).use(i18n).mount('#app');
