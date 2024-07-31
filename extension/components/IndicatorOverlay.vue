<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { useResizeObserver } from '@vueuse/core';
import interpolate from 'color-interpolate';

import PopupMenu from './PopupMenu.vue';

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

const menuOpen = ref(false);
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
  const width = Math.min(imgRect.width, offsetRect.width);
  const height = Math.min(imgRect.height, offsetRect.height);

  host.style.top = `${top}px`;
  host.style.left = `${left}px`;
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;

  if (width > 300 && height > 150) {
    size.value = 'large';
  } else if (width > 100 && height > 50) {
    size.value = 'medium';
  } else {
    size.value = 'small';
  }
});

const colors = ['red', 'orange', 'gold', 'greenyellow', 'lawngreen'];
const colorMap = interpolate(colors);
const iconColor = colorMap(Math.random());
</script>

<template>
  <v-menu
    v-model="menuOpen"
    location="right top"
    :attach="true"
    :offset="[6, -8]"
    z-index="99999"
    open-on-hover
    @click.stop.prevent
  >
    <template #activator="{ props: menu }">
      <v-fade-transition>
        <button
          v-if="size !== 'small'"
          class="button"
          :class="size"
          v-bind="menu"
          @click.stop.prevent="menuOpen = !menuOpen"
        >
          <DetectorSvg v-if="size === 'large'" class="icon large" />
          <div v-else-if="size === 'medium'" class="icon medium"></div>
        </button>
      </v-fade-transition>
    </template>
    <PopupMenu />
  </v-menu>
</template>

<style lang="scss" scoped>
.icon {
  border-radius: 50%;

  &.large {
    height: 24px;
    width: 24px;

    box-shadow: 0 0 12px 1px black;
    background-color: rgba(0, 0, 0, 0.5);

    :deep(path) {
      stroke: v-bind(iconColor);
      fill: v-bind(iconColor);
    }
  }

  &.medium {
    height: 6px;
    width: 6px;

    box-shadow: 0 0 6px 2px rgba(0, 0, 0, 0.7);
    background-color: v-bind(iconColor);
  }
}

.button {
  display: block;
  cursor: pointer;

  will-change: transform, opacity;
  transition:
    transform 0.3s,
    opacity 0.3s;

  background: none;
  border: none;

  padding: 0;
  margin: 0;

  &.large {
    transform-origin: center;
    opacity: 0.6;

    margin-top: 6px;
    margin-left: 6px;

    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  &.medium {
    transform-origin: 0 0;
    margin-top: 6px;
    margin-left: 6px;

    &:hover {
      transform: scale(2.5);
    }
  }
}
</style>
