<script setup>
import DetectorSvg from '@/assets/detector.svg';

const props = defineProps({
  aiScore: {
    type: Number,
    required: true,
  },
});

const score = (props.aiScore * 100).toFixed(1);
</script>

<template>
  <v-card elevation="16" max-width="344">
    <v-card-title>AI Analysis Score: {{ score }}%</v-card-title>
    <v-card-subtitle>Based on detector model</v-card-subtitle>
    <v-card-actions class="pt-0">
      <v-list density="compact" class="w-100 pr-2">
        <v-list-item rounded="pill" :link="true">
          <template #prepend>
            <DetectorSvg class="icon red mr-5"></DetectorSvg>
          </template>
          <v-list-item-title>
            <p class="title">Report AI Image</p>
          </v-list-item-title>
        </v-list-item>
        <v-list-item rounded="pill" :link="true">
          <template #prepend>
            <DetectorSvg class="icon green mr-5"></DetectorSvg>
          </template>
          <v-list-item-title>
            <p class="title">Report Real Image</p>
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card-actions>
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  height: 24px;
  width: 24px;

  &.red {
    :deep(path) {
      stroke: red;
      fill: red;
    }
  }

  &.green {
    :deep(path) {
      stroke: lawngreen;
      fill: lawngreen;
    }
  }
}

.title {
  text-anchor: middle;
}
</style>
