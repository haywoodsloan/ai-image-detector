<!-- eslint-disable vue/no-mutating-props -->
<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { useResizeObserver } from '@vueuse/core';
import interpolate from 'color-interpolate';

const { value: host } = defineModel('host', {
  type: HTMLElement,
  required: true,
});

const { image } = defineProps({
  image: {
    type: HTMLElement,
    required: true,
  },
});

onMounted(() => {
  host.style.position = 'absolute';
});

const size = ref('medium');
useResizeObserver([image, image.offsetParent], () => {
  const imgRect = image.getBoundingClientRect();
  const offsetRect = image.offsetParent.getBoundingClientRect();

  const top = imgRect.top - offsetRect.top;
  const left = imgRect.left - offsetRect.left;

  host.style.top = `${top}px`;
  host.style.left = `${left}px`;

  if (imgRect.width > 250) {
    size.value = 'large';
  } else if (imgRect.width > 100) {
    size.value = 'medium';
  } else {
    size.value = 'small';
  }
});

const colors = ['red', 'orange', 'gold', 'greenyellow', 'lawngreen'];
const colorMap = interpolate(colors);
const iconColor = computed(() => colorMap(Math.random()));
</script>

<template>
  <div class="container" :class="size">
    <DetectorSvg v-if="size === 'large'" class="icon" :class="size" />
    <div v-else-if="size === 'medium'" class="icon" :class="size"></div>
  </div>
</template>

<style lang="scss" scoped>
.icon {
  &.large {
    height: 25px;
    width: 25px;

    margin-top: 6px;
    margin-left: 6px;

    :deep(path) {
      stroke: v-bind(iconColor);
      fill: v-bind(iconColor);

      &.unknown {
        stroke: grey;
        fill: grey;
      }
    }
  }

  &.medium {
    height: 8px;
    width: 8px;

    margin-top: 2px;
    margin-left: 2px;

    border-radius: 50%;
    background-color: v-bind(iconColor);
  }
}

.container {
  &.large {
    width: 70px;
    height: 70px;

    will-change: opacity;
    transition: opacity 0.25s;
    clip-path: polygon(100% 0, 0 0, 0 100%);

    opacity: 0.6;
    background-image: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.5) 35%,
      rgba(0, 0, 0, 0) 50%
    );

    &:hover {
      opacity: 1;
    }
  }
}
</style>
