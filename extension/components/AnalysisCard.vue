<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { getIndicatorColor } from '@/utilities/color.js';

import StyleProvider from './StyleProvider.vue';

const props = defineProps({
  // aiScore: {
  //   type: Number,
  //   required: true,
  // },
});

const score = (Math.random() * 100).toFixed(1);
const aiColor = getIndicatorColor(1);
const realColor = getIndicatorColor(0);
</script>

<template>
  <StyleProvider>
    <v-card class="card">
      <v-card-title>AI Analysis Score: {{ score }}%</v-card-title>
      <v-card-subtitle>Based on detector model</v-card-subtitle>
      <v-card-actions class="pt-0">
        <v-list density="compact" class="w-100 overflow-x-hidden">
          <v-list-item rounded="pill" :link="true">
            <template #prepend>
              <DetectorSvg class="icon ai mr-5"></DetectorSvg>
            </template>
            <v-list-item-title>
              <p class="title">Report AI Image</p>
            </v-list-item-title>
          </v-list-item>
          <v-list-item rounded="pill" :link="true">
            <template #prepend>
              <DetectorSvg class="icon real mr-5"></DetectorSvg>
            </template>
            <v-list-item-title>
              <p class="title">Report Real Image</p>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-actions>
    </v-card>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.card {
  font-family: Arial, Helvetica, sans-serif !important;

  .title {
    text-anchor: middle;
  }

  .icon {
    height: 24px;
    width: 24px;

    &.ai {
      :deep(path) {
        stroke: v-bind(aiColor);
        fill: v-bind(aiColor);
      }
    }

    &.real {
      :deep(path) {
        stroke: v-bind(realColor);
        fill: v-bind(realColor);
      }
    }
  }
}
</style>
