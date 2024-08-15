<script setup>
import { checkImage } from '@/api/detector.js';
import DetectorSvg from '@/assets/detector.svg';
import { useAuthVerified } from '@/utilities/auth.js';
import { DefaultIndicatorColor, getIndicatorColor } from '@/utilities/color';
import { useResizeObserver } from '@vueuse/core';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';

import AnalysisCard from './AnalysisCard.vue';
import StyleProvider from './StyleProvider.vue';

const { value: host } = defineModel('host', {
  type: HTMLElement,
  required: true,
});

const { image } = defineProps({
  image: {
    type: HTMLImageElement,
    required: true,
  },
});

const menuOpen = ref(false);

// Use absolute position for host element
onMounted(() => {
  host.style.position = 'absolute';
});

const size = ref('small');
useResizeObserver([image, image.offsetParent], () => {
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

/** @type {Ref<ImageAnalysis>} */
const analysis = ref(null);

const hasAuth = useAuthVerified();
const unwatch = watch([size, hasAuth], async () => {
  // Wait for the size to become medium or large
  if (hasAuth.value && size.value !== 'small') {
    // waitForAuth().then(async () => {
    //   const analysis = await checkImage(image.src);
    //   iconColor.value = getIndicatorColor(analysis.artificial)
    // });

    // This only needs to run once
    unwatch();

    await wait(TimeSpan.fromSeconds(1));
    analysis.value = { artificial: Math.random(), scoreType: 'detector' };
  }
});

const iconColor = computed(() => {
  if (analysis.value) return getIndicatorColor(analysis.value.artificial);
  else if (!(hasAuth.value ?? true)) return DefaultIndicatorColor;
  else return null;
});
</script>

<template>
  <StyleProvider v-if="size !== 'small'">
    <v-menu
      v-model="menuOpen"
      location="right top"
      z-index="2147483647"
      open-on-click
      open-on-hover
      :offset="[6, -8]"
      :close-on-content-click="false"
      @click.stop.prevent
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
              <DetectorSvg v-if="size === 'large'" class="icon" />
              <div v-else-if="size === 'medium'" class="icon"></div>
            </div>
          </button>
        </v-fade-transition>
      </template>
      <AnalysisCard :analysis="analysis" />
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

  .icon-wrapper {
    position: relative;

    .icon {
      display: block;
    }
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
