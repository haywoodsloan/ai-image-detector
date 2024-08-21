<script setup>
import KofiSvg from '@/assets/kofi.svg';
import PatreonSvg from '@/assets/patreon.svg';
</script>

<template>
  <v-divider class="mx-3" />
  <div class="d-flex align-center justify-center text-body-2 py-2 px-4">
    <span class="mr-4 text-medium-emphasis">Support us at:</span>
    <a
      href="https://patreon.com/ai_image_detector"
      target="_blank"
      title="Patreon"
    >
      <v-icon class="w-auto align-stretch" :icon="PatreonSvg" />
    </a>
    <v-divider class="mx-3" vertical />
    <a href="https://ko-fi.com/ai_image_detector" target="_blank" title="Ko-fi">
      <v-icon class="w-auto align-stretch" :icon="KofiSvg" />
    </a>
  </div>
</template>
