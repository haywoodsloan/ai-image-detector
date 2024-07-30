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
        <div v-if="size !== 'small'" class="container" :class="size">
          <button
            class="button"
            :class="size"
            v-bind="menu"
            @click.stop.prevent="menuOpen = !menuOpen"
          >
            <DetectorSvg v-if="size === 'large'" class="icon large" />
            <div v-else-if="size === 'medium'" class="icon medium"></div>
          </button>
        </div>
      </v-fade-transition>
    </template>
    <PopupMenu />
  </v-menu>
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
  overflow: hidden;
  clip-path: polygon(100% 0, 0 0, 0 100%);

  &.large {
    width: 70px;
    height: 70px;

    will-change: opacity;
    transition: opacity 0.3s;

    opacity: 0.6;
    background-image: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.7) 0%,
      rgba(0, 0, 0, 0.3) 35%,
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
    width: 40px;
    height: 40px;

    &:hover {
      .button {
        transform: scale(2.5);
      }
    }
  }
}
</style>
