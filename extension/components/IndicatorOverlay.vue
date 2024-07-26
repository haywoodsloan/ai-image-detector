<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { useResizeObserver } from '@vueuse/core';
import interpolate from 'color-interpolate';
import { mergeProps } from 'vue';

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
  const imgRect = image?.getBoundingClientRect();
  const offsetRect = image?.offsetParent?.getBoundingClientRect();

  // Skip if one of the rects can't get found, this element is being removed.
  if (!imgRect || !offsetRect) return;

  const top = imgRect.top - offsetRect.top;
  const left = imgRect.left - offsetRect.left;

  host.style.top = `${top}px`;
  host.style.left = `${left}px`;
  host.style.width = `${imgRect.width}px`;
  host.style.height = `${imgRect.height}px`;

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
const iconColor = colorMap(Math.random());

const menuOpen = ref(false);
</script>

<template>
  <v-menu
    v-if="size !== 'small'"
    v-model="menuOpen"
    location="right top"
    :attach="true"
  >
    <template #activator="{ props: menu }">
      <v-tooltip location="right top" :attach="true" :disabled="menuOpen">
        <template #activator="{ props: tooltip }">
          <div class="container" :class="size">
            <button
              class="button"
              :class="size"
              v-bind="mergeProps(menu, tooltip)"
            >
              <DetectorSvg v-if="size === 'large'" class="icon large" />
              <div v-else-if="size === 'medium'" class="icon medium"></div>
            </button>
          </div>
        </template>

        AI Analysis: 98%
      </v-tooltip>
    </template>

    <v-card elevation="16" max-width="344">
      <v-card-item>
        <v-card-title> Card title </v-card-title>

        <v-card-subtitle> Card subtitle secondary text </v-card-subtitle>
      </v-card-item>

      <v-card-text>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </v-card-text>
    </v-card>
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
