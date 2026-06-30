import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from '@/utils/i18n-plugin';

createApp(App).use(i18n).mount('#app');
