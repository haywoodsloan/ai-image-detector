<script setup>
import DetectorSvg from '@/assets/detector.svg';

const props = defineProps({
  // aiScore: {
  //   type: Number,
  //   required: true,
  // },
});

const score = (props.aiScore * 100).toFixed(1);
</script>

<template>
  <div style="all: initial !important">
    <v-card elevation="16" class="card">
      <v-card-title>AI Analysis Score: {{ score }}%</v-card-title>
      <v-card-subtitle>Based on detector model</v-card-subtitle>
      <v-card-actions class="pt-0">
        <v-list density="compact" class="w-100 overflow-x-hidden">
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
  </div>
</template>

<style lang="scss" scoped>
.card {
  font-family: Arial, Helvetica, sans-serif !important;
}

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
