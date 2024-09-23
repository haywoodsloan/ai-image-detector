<script setup>
import { useResizeObserver } from '@vueuse/core';

import DetectorSvg from '@/assets/detector.svg';
import { useAuth } from '@/utilities/auth.js';
import { DefaultIndicatorColor, getIndicatorColor } from '@/utilities/color';
import { waitForStablePosition } from '@/utilities/element.js';
import { checkImage, useImageAnalysis } from '@/utilities/image.js';
import { debugError } from '@/utilities/log.js';

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

// Use absolute position for host element
onMounted(() => {
  host.style.position = 'absolute';
});

/** @type {Ref<'small' | 'medium' | 'large'>} */
const size = ref('small');

const imageSrc = image.currentSrc || image.src;
if (!imageSrc) throw new Error('Missing image source');

/** @type {AbortController} */
let aborter;

useResizeObserver(image, async () => {
  aborter?.abort();
  aborter = new AbortController();

  const signal = aborter.signal;
  await waitForStablePosition(image);
  if (signal.aborted) return;

  const imgRect = image?.getBoundingClientRect();
  const offsetRect = image?.offsetParent?.getBoundingClientRect();

  // Skip if one of the rects can't get found, this element is being removed.
  if (!imgRect || !offsetRect) return;

  const top = Math.max(imgRect.top - offsetRect.top, 0);
  const left = Math.max(imgRect.left - offsetRect.left, 0);

  host.style.top = `${top}px`;
  host.style.left = `${left}px`;

  const width = Math.min(imgRect.width, offsetRect.width);
  const height = Math.min(imgRect.height, offsetRect.height);

  if (width > 300 && height > 150) {
    size.value = 'large';
  } else if (width > 100 && height > 50) {
    size.value = 'medium';
  } else {
    size.value = 'small';
  }
});

const analysis = useImageAnalysis(imageSrc);
const storedAuth = useAuth();
const menuOpen = ref(false);

// Wait for the size to become medium or large
let pending = false;
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
        pending = true;
        analysis.value = await checkImage(imageSrc);
        pending = false;
      } catch (error) {
        debugError(error);
      }
    }
  },
  { immediate: true }
);

const iconColor = computed(() => {
  const auth = storedAuth.value;
  const needsAuth = auth !== null && auth?.verification !== 'verified';

  if (needsAuth) return DefaultIndicatorColor;
  else if (analysis.value) return getIndicatorColor(analysis.value.artificial);
  else return null;
});
</script>

<template>
  <StyleProvider v-if="size !== 'small'">
    <v-menu
      v-model="menuOpen"
      location="right top"
      z-index="2147483647"
      open-on-hover
      :offset="[6, -8]"
      :close-on-content-click="false"
      @click.stop
    >
      <template #activator="{ props: menu }">
        <v-fade-transition>
          <button
            v-if="iconColor"
            class="button"
            :class="[size, { 'menu-open': menuOpen }]"
            v-bind="menu"
            aria-label="AI Image Detector"
            @click.stop.prevent
          >
            <div class="icon-wrapper">
              <v-icon
                v-if="size === 'large'"
                class="icon"
                :icon="DetectorSvg"
              />

              <div v-else-if="size === 'medium'" class="icon"></div>
            </div>
          </button>
        </v-fade-transition>
      </template>
      <StyleProvider v-if="storedAuth !== null">
        <VerifyLoginCard v-if="storedAuth?.verification === 'pending'" />
        <CreateLoginCard v-else-if="storedAuth?.verification !== 'verified'" />
        <AnalysisCard v-if="analysis" v-model="analysis" :image="imageSrc" />
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
    margin-top: 8px;
    margin-left: 8px;

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

        stroke: v-bind(iconColor);
        fill: v-bind(iconColor);
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
    width: 17px;
    height: 17px;

    margin-top: 8px;
    margin-left: 8px;

    .icon-wrapper {
      transition: transform var(--transition-dur);
      transform-origin: 15% 15%;

      .icon {
        height: 7px;
        width: 7px;

        transition:
          background-color var(--transition-dur),
          filter var(--transition-dur);

        filter: drop-shadow(0 0 1.4px v-bind(iconColor));
        background-color: v-bind(iconColor);
        border-radius: 50%;
      }
    }

    &:hover,
    &:focus,
    &.menu-open {
      .icon-wrapper {
        transform: scale(2.5);
      }
    }
  }
}
</style>
