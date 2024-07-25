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
  <div v-if="size !== 'small'" class="container" :class="size">
    <button class="button" :class="size">
      <DetectorSvg v-if="size === 'large'" class="icon large" />
      <div v-else-if="size === 'medium'" class="icon medium"></div>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.icon {
  &.large {
    height: 24px;
    width: 24px;

    :deep(path) {
      stroke: v-bind(iconColor);
      fill: v-bind(iconColor);
    }
  }

  &.medium {
    height: 6px;
    width: 6px;

    border-radius: 50%;
    background-color: v-bind(iconColor);
  }
}

.button {
  display: block;
  cursor: pointer;

  will-change: transform;
  transition: transform 0.3s;

  background: none;
  border: none;

  padding: 0;
  margin: 0;

  &.large {
    transform-origin: center;
    margin-top: 6px;
    margin-left: 6px;
  }

  &.medium {
    transform-origin: 0 0;
    margin-top: 6px;
    margin-left: 6px;
  }
}

.container {
  position: absolute;
  clip-path: polygon(100% 0, 0 0, 0 100%);

  &.large {
    width: 70px;
    height: 70px;

    will-change: opacity;
    transition: opacity 0.3s;

    opacity: 0.5;
    background-image: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.5) 35%,
      rgba(0, 0, 0, 0) 50%
    );

    &:hover {
      opacity: 1;

      .button {
        transform: scale(1.1);
      }
    }
  }

  &.medium {
    width: 35px;
    height: 35px;

    &:hover {
      .button {
        transform: scale(2.5);
      }
    }
  }
}
</style>
