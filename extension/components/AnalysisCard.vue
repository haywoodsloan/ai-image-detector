<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { IndicatorColors } from '@/utilities/color.js';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';

import StyleProvider from './StyleProvider.vue';

const aiColor = IndicatorColors.at(-1);
const realColor = IndicatorColors.at(0);

/** @type {{readonly analysis: ImageAnalysis}} */
const props = defineProps({
  analysis: {
    type: Object,
    required: true,
  },
});

// Show the score as a percent
const scoreText = computed(() => {
  const percent = props.analysis?.artificial * 100;
  return percent?.toFixed(1);
});

/** @type {Ref<LabelType>} */
const pendingVote = ref(null);

/**
 * @param {LabelType} label
 */
async function vote(label) {
  pendingVote.value = label;
  await wait(TimeSpan.fromSeconds(2));
  pendingVote.value = '';
}
</script>

<template>
  <StyleProvider>
    <v-card>
      <v-card-title>AI Analysis Score: {{ scoreText }}%</v-card-title>
      <v-card-subtitle>Based on detector model</v-card-subtitle>
      <v-card-actions>
        <v-list density="compact" width="100%" class="pa-0 overflow-hidden">
          <v-list-item class="px-0">
            <v-list-item-action>
              <v-btn
                size="large"
                class="justify-start flex-grow-1"
                :loading="pendingVote === 'artificial' ? aiColor : false"
                :disabled="!!pendingVote && pendingVote !== 'artificial'"
                @click="vote('artificial')"
              >
                <template #prepend>
                  <DetectorSvg class="icon ai"></DetectorSvg>
                </template>
                Report AI Image
              </v-btn>
            </v-list-item-action>
          </v-list-item>
          <v-list-item class="px-0">
            <v-list-item-action>
              <v-btn
                size="large"
                class="justify-start flex-grow-1"
                :loading="pendingVote === 'real' ? realColor : false"
                :disabled="!!pendingVote && pendingVote !== 'real'"
                @click="vote('real')"
              >
                <template #prepend>
                  <DetectorSvg class="icon real"></DetectorSvg>
                </template>
                Report Real Image
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-card-actions>
    </v-card>
  </StyleProvider>
</template>

<style lang="scss" scoped>
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
</style>
