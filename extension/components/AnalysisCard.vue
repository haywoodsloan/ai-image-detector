<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { AiIndicatorColor, RealIndicatorColor } from '@/utilities/color.js';
import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';

import DonateLinks from './DonateLinks.vue';

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
  <v-card>
    <v-card-item class="pb-0">
      <v-card-title>AI Analysis Score: {{ scoreText }}%</v-card-title>
      <v-card-subtitle>Based on detector model</v-card-subtitle>
    </v-card-item>

    <v-card-actions class="pt-0">
      <v-list density="compact" min-width="100%" class="pa-0 overflow-visible">
        <v-list-item class="px-0">
          <v-list-item-action>
            <v-btn
              size="large"
              class="justify-start flex-fill"
              :loading="pendingVote === 'artificial' ? aiColor : false"
              :disabled="!!pendingVote && pendingVote !== 'artificial'"
              @click="vote('artificial')"
            >
              <template #prepend>
                <v-icon class="icon ai" :icon="DetectorSvg" />
              </template>
              Report AI Image
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-list-item class="px-0">
          <v-list-item-action>
            <v-btn
              size="large"
              class="justify-start flex-fill"
              :loading="pendingVote === 'real' ? realColor : false"
              :disabled="!!pendingVote && pendingVote !== 'real'"
              @click="vote('real')"
            >
              <template #prepend>
                <v-icon class="icon real" :icon="DetectorSvg" />
              </template>
              Report Real Image
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-actions>
    <DonateLinks />
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  height: 24px;
  width: 24px;

  &.ai {
    :deep(path) {
      stroke: v-bind(AiIndicatorColor);
      fill: v-bind(AiIndicatorColor);
    }
  }

  &.real {
    :deep(path) {
      stroke: v-bind(RealIndicatorColor);
      fill: v-bind(RealIndicatorColor);
    }
  }
}
</style>
