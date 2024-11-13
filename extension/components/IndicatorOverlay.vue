<script setup>
import { useResizeObserver } from '@vueuse/core';

import DetectorSvg from '@/assets/detector.svg';
import { useAuth } from '@/utilities/auth.js';
import { DefaultIndicatorColor, getIndicatorColor } from '@/utilities/color';
import {
  checkImage,
  getImageSrc,
  useImageAnalysis,
} from '@/utilities/image.js';
import { debugError, debugWarn } from '@/utilities/log.js';
import { useSettings } from '@/utilities/settings.js';

import AnalysisCard from './AnalysisCard.vue';
import CreateLoginCard from './CreateLoginCard.vue';
import StyleProvider from './StyleProvider.vue';
import VerifyLoginCard from './VerifyLoginCard.vue';

// Allow deep mutations of the host element
/* eslint vue/no-mutating-props: ['error', {shallowOnly: true}] */
const { image, host } = defineProps({
  image: {
    type: HTMLImageElement,
    required: true,
  },
  host: {
    type: HTMLElement,
    required: true,
  },
});

// Reset the host element positioning
onMounted(() => {
  host.style.position = 'absolute';
  host.style.height = null;
  host.style.width = null;
});

/** @type {Ref<'small' | 'medium' | 'large'>} */
const size = ref('small');

const imageSrc = getImageSrc(image);
if (!imageSrc) throw new Error('Missing image source');

const settings = useSettings();
const indicatorPosition = computed(
  () => settings.value?.indicatorPosition ?? 'top-left'
);

watch(indicatorPosition, () => {
  // Skip if the offset parent can't be found.
  if (!image.offsetParent) return;

  const imgRect = new DOMRect(
    image.offsetLeft,
    image.offsetTop,
    image.offsetWidth,
    image.offsetHeight
  );

  const offsetRect = new DOMRect(
    0,
    0,
    image.offsetParent.clientWidth,
    image.offsetParent.clientHeight
  );

  updatePosition(imgRect, offsetRect);
});

useResizeObserver([image, image.offsetParent], async () => {
  // Skip if one of the rects can't get found, this element is being removed.
  if (!image.offsetParent) return;

  const imgRect = new DOMRect(
    image.offsetLeft,
    image.offsetTop,
    image.offsetWidth,
    image.offsetHeight
  );

  const offsetRect = new DOMRect(
    0,
    0,
    image.offsetParent.clientWidth,
    image.offsetParent.clientHeight
  );

  updatePosition(imgRect, offsetRect);
  const width = Math.min(imgRect.width, offsetRect.width);
  const height = Math.min(imgRect.height, offsetRect.height);

  if (width > 300 && height > 200) {
    size.value = 'large';
  } else if (width > 100 && height > 50) {
    size.value = 'medium';
  } else {
    size.value = 'small';
  }
});

/**
 * @param {DOMRectReadOnly} imgRect
 * @param {DOMRectReadOnly} offsetRect
 */
function updatePosition(imgRect, offsetRect) {
  if (indicatorPosition.value.startsWith('top-')) {
    const top = Math.max(imgRect.top - offsetRect.top, 0);
    host.style.top = `${top}px`;
    host.style.bottom = null;
  } else {
    const bottom = Math.max(offsetRect.bottom - imgRect.bottom, 0);
    host.style.bottom = `${bottom}px`;
    host.style.top = null;
  }

  if (indicatorPosition.value.endsWith('-left')) {
    const left = Math.max(imgRect.left - offsetRect.left, 0);
    host.style.left = `${left}px`;
    host.style.right = null;
  } else {
    const right = Math.max(offsetRect.right - imgRect.right, 0);
    host.style.right = `${right}px`;
    host.style.left = null;
  }
}

const analysis = useImageAnalysis(imageSrc);
const storedAuth = useAuth();
const menuOpen = ref(false);

// Wait for the size to become medium or large
let pending = false;
let apiAbort;

watch(
  [size, storedAuth, analysis],
  async ([newSize, newAuth, newAnalysis], [, , oldAnalysis]) => {
    if (newAnalysis === null) return;
    if (!oldAnalysis?.scoreType && newAnalysis?.scoreType) {
      menuOpen.value = false;
    }

    if (
      !pending &&
      !newAnalysis?.scoreType &&
      newAuth?.verification === 'verified' &&
      newSize !== 'small'
    ) {
      try {
        apiAbort?.abort();
        apiAbort = new AbortController();

        pending = true;
        analysis.value = await checkImage(imageSrc, {
          signal: apiAbort.signal,
        });
      } catch (error) {
        if (error.name === 'AbortError')
          debugWarn('Check image request aborted', imageSrc);
        else debugError(error);
      } finally {
        pending = false;
      }
    } else if (newSize === 'small') apiAbort?.abort();
  },
  { immediate: true }
);

// Abort any pending API requests
onUnmounted(() => {
  apiAbort?.abort();
});

const iconColor = computed(() => {
  const auth = storedAuth.value;
  const needsAuth = auth !== null && auth?.verification !== 'verified';

  if (needsAuth) return DefaultIndicatorColor;
  else if (analysis.value) return getIndicatorColor(analysis.value.artificial);
  else return null;
});

const xOffset = 6;
const yOffset = 10;

/**
 * @param {LocationStrategyData} data
 * @param {Ref<Record<string, string>>} styles
 */
function locationStrategy(data, _, styles) {
  const positionMenu = () => {
    const { target, contentEl } = data;

    const targetRect = target.value.getBoundingClientRect();
    const offsetRect = contentEl.value.offsetParent.getBoundingClientRect();

    const contentWidth = Math.max(
      contentEl.value.clientWidth || 0,
      contentEl.value.innerWidth || 0
    );
    const contentHeight = Math.max(
      contentEl.value.clientHeight || 0,
      contentEl.value.innerHeight || 0
    );

    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );

    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );

    styles.value = { transformOrigin: '' };
    if (
      (indicatorPosition.value.endsWith('-left') &&
        targetRect.right + xOffset + contentWidth <= vw) ||
      (indicatorPosition.value.endsWith('-right') &&
        targetRect.left - xOffset - contentWidth < 0)
    ) {
      styles.value.transformOrigin += 'left';
      const offset = targetRect.right - offsetRect.left;
      styles.value.left = `${offset + 6}px`;
    } else {
      styles.value.transformOrigin += 'right';
      const offset = offsetRect.right - targetRect.left;
      styles.value.right = `${offset + 6}px`;
    }

    if (
      (indicatorPosition.value.startsWith('top-') &&
        targetRect.top + yOffset + contentHeight <= vh) ||
      (indicatorPosition.value.startsWith('bottom-') &&
        targetRect.bottom - yOffset - contentHeight < 0)
    ) {
      const offset = targetRect.top - offsetRect.top;
      styles.value.top = `${offset + 10}px`;
    } else {
      const offset = offsetRect.bottom - targetRect.bottom;
      styles.value.bottom = `${offset + 10}px`;
    }
  };

  requestAnimationFrame(positionMenu);
  return { updateLocation: positionMenu };
}
</script>

<template>
  <StyleProvider>
    <v-menu
      v-model="menuOpen"
      z-index="2147483647"
      open-on-hover
      :close-on-content-click="false"
      :location-strategy="locationStrategy"
      @click.stop
    >
      <template #activator="{ props: menu }">
        <v-fade-transition>
          <button
            v-if="size !== 'small' && iconColor"
            class="button"
            :class="[size, { 'menu-open': menuOpen }]"
            v-bind="menu"
            aria-label="AI Image Detector"
            @click.stop.prevent
          >
            <v-icon v-if="size === 'large'" class="icon" :icon="DetectorSvg" />
            <div v-else class="icon" :class="indicatorPosition"></div>
          </button>
        </v-fade-transition>
      </template>
      <StyleProvider v-if="storedAuth !== null">
        <v-scroll-x-reverse-transition mode="out-in">
          <VerifyLoginCard v-if="storedAuth?.verification === 'pending'" />
          <CreateLoginCard
            v-else-if="storedAuth?.verification !== 'verified'"
          />
          <AnalysisCard v-if="analysis" v-model="analysis" :image="imageSrc" />
        </v-scroll-x-reverse-transition>
      </StyleProvider>
    </v-menu>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.button {
  --transition-dur: 0.3s;

  display: flex;
  position: relative;

  padding: 0;
  border: none;

  height: fit-content;
  width: fit-content;

  background: none !important;
  box-shadow: none !important;

  .icon-wrapper {
    position: relative;
  }

  &.large {
    margin: 8px;
    transform-origin: center;
    transition: transform var(--transition-dur);

    .icon {
      height: 28px;
      width: 28px;

      opacity: 0.8;
      transition: opacity var(--transition-dur);

      :deep(path) {
        transition:
          stroke var(--transition-dur),
          fill var(--transition-dur);

        stroke: v-bind(iconColor) !important;
        fill: v-bind(iconColor) !important;
      }
    }

    &:hover,
    &:focus,
    &.menu-open {
      transform: scale(1.1);

      .icon {
        opacity: 1;
      }
    }
  }

  &.medium {
    margin: 8px;

    .icon {
      height: 7px;
      width: 7px;

      transition:
        transform var(--transition-dur),
        background-color var(--transition-dur),
        filter var(--transition-dur);

      filter: drop-shadow(0 0 1.4px v-bind(iconColor)) !important;
      background-color: v-bind(iconColor) !important;
      border-radius: 50%;

      &.top-left {
        margin-right: 10px;
        margin-bottom: 10px;
        transform-origin: 15% 15%;
      }

      &.top-right {
        margin-left: 10px;
        margin-bottom: 10px;
        transform-origin: 85% 15%;
      }

      &.bottom-left {
        margin-right: 10px;
        margin-top: 10px;
        transform-origin: 15% 85%;
      }

      &.bottom-right {
        margin-left: 10px;
        margin-top: 10px;
        transform-origin: 85% 85%;
      }
    }

    &:hover,
    &:focus,
    &.menu-open {
      .icon {
        transform: scale(2.5);
      }
    }
  }
}
</style>
