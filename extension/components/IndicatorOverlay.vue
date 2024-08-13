<script setup>
import { checkImage } from '@/api/detector.js';
import DetectorSvg from '@/assets/detector.svg';
import { waitForAuth } from '@/utilities/auth.js';
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

const iconColor = ref(DefaultIndicatorColor);
// waitForAuth().then(async () => {
//   const analysis = await checkImage(image.src);
//   iconColor.value = getIndicatorColor(analysis.artificial)
// });

wait(TimeSpan.fromSeconds(5)).then(() => {
  iconColor.value = getIndicatorColor(Math.random());
});
</script>

<template>
  <StyleProvider>
    <v-menu
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
            v-if="size !== 'small'"
            class="button"
            :class="size"
            v-bind="menu"
            aria-label="AI Image Detector"
            @click.stop.prevent
          >
            <DetectorSvg v-if="size === 'large'" class="icon large" />
            <div v-else-if="size === 'medium'" class="icon medium"></div>
          </button>
        </v-fade-transition>
      </template>
      <AnalysisCard />
    </v-menu>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.icon {
  &.large {
    height: 24px;
    width: 24px;

    filter: drop-shadow(0 0 1.8px v-bind(iconColor));
    transition: filter 0.3s;

    :deep(path) {
      transition:
        stroke 0.3s,
        fill 0.3s;

      stroke: v-bind(iconColor);
      fill: v-bind(iconColor);
    }
  }

  &.medium {
    height: 7px;
    width: 7px;

    filter: drop-shadow(0 0 1.6px v-bind(iconColor));
    transform-origin: 15% 15%;

    transition:
      filter 0.3s,
      background-color 0.3s,
      transform 0.3s;

    background-color: v-bind(iconColor);
    border-radius: 50%;
  }
}

.button {
  display: flex;
  background: none;

  padding: 0;
  border: none;

  &.large {
    transition:
      transform 0.3s,
      opacity 0.3s;

    transform-origin: center;
    opacity: 0.8;

    margin-top: 7px;
    margin-left: 7px;

    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  &.medium {
    width: 17px;
    height: 17px;

    margin-top: 6px;
    margin-left: 6px;

    &:hover .icon {
      transform: scale(2.5);
    }
  }
}
</style>
