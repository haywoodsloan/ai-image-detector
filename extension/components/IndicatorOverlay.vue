<script setup>
import { checkImage } from '@/api/detector.js';
import DetectorSvg from '@/assets/detector.svg';
import { waitForAuth } from '@/utilities/auth.js';
import { getIndicatorColor } from '@/utilities/color';
import { useResizeObserver } from '@vueuse/core';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';
import memoize from 'memoize';

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

const iconColor = ref('');
const check = memoize(() => {
  // waitForAuth().then(async () => {
  //   const analysis = await checkImage(image.src);
  //   iconColor.value = getIndicatorColor(analysis.artificial)
  // });

  wait(TimeSpan.fromSeconds(1)).then(() => {
    iconColor.value = getIndicatorColor(Math.random());
  });
});

// Wait for the size to become medium or large
if (size.value !== 'small') check();
else {
  const unwatch = watch(size, (newSize) => {
    if (newSize !== 'small') check();
    unwatch();
  });
}
</script>

<template>
  <StyleProvider v-if="size !== 'small'">
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
            v-if="iconColor"
            class="button"
            :class="size"
            v-bind="menu"
            aria-label="AI Image Detector"
            @click.stop.prevent
          >
            <div class="icon-wrapper">
              <div class="underlay"></div>
              <DetectorSvg v-if="size === 'large'" class="icon" />
              <div v-else-if="size === 'medium'" class="icon"></div>
            </div>
          </button>
        </v-fade-transition>
      </template>
      <AnalysisCard />
    </v-menu>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.button {
  display: flex;
  position: relative;

  padding: 0;
  border: none;

  height: fit-content;
  width: fit-content;

  margin-top: 7px;
  margin-left: 7px;

  .icon-wrapper {
    position: relative;

    .underlay {
      position: absolute;
      border-radius: 50%;

      top: 0;
      left: 0;
      bottom: 0;
      right: 0;

      opacity: 0.3;
      background-color: v-bind(iconColor);
    }

    .icon {
      display: block;
    }
  }

  &.large {
    transform-origin: center;
    transition: transform 0.3s;

    .underlay {
      box-shadow: 0 0 5px 2.5px v-bind(iconColor);
    }

    .icon {
      height: 24px;
      width: 24px;

      opacity: 0.8;
      transition: opacity 0.3s;

      :deep(path) {
        stroke: v-bind(iconColor);
        fill: v-bind(iconColor);
      }
    }

    &:hover,
    &:focus {
      transform: scale(1.1);

      .icon {
        opacity: 1;
      }
    }
  }

  &.medium {
    width: 17px;
    height: 17px;

    .icon-wrapper {
      transition: transform 0.3s;
      transform-origin: 15% 15%;

      .underlay {
        opacity: 0.6;
        box-shadow: 0 0 2px 1px v-bind(iconColor);
      }

      .icon {
        height: 7px;
        width: 7px;

        background-color: v-bind(iconColor);
        border-radius: 50%;
      }
    }

    &:hover .icon-wrapper,
    &:focus .icon-wrapper {
      transform: scale(2.5);
    }
  }
}
</style>
