<script setup>
import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';

import DetectorSvg from '@/assets/detector.svg';
import { AiIndicatorColor, RealIndicatorColor } from '@/utilities/color.js';

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
  if (props.analysis.scoreType === 'detector') {
    const percent = props.analysis?.artificial * 100;
    return `${percent?.toFixed(1)}%`;
  } else return props.analysis.artificial > 0 ? 'AI' : 'Real';
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
      <v-card-title>
        <template v-if="analysis.scoreType === 'detector'">
          AI Analysis Score: {{ scoreText }}
        </template>

        <template v-else-if="analysis.scoreType === 'vote'">
          Users Reported: {{ scoreText }}
        </template>

        <template v-else-if="analysis.scoreType === 'user'">
          You Reported: {{ scoreText }}
        </template>
      </v-card-title>
      <v-card-subtitle v-if="analysis.scoreType !== 'user'">
        <template v-if="analysis.scoreType === 'detector'">
          <template v-if="analysis.artificial >= 0.9">
            Very likely AI
          </template>

          <template v-else-if="analysis.artificial >= 0.75">
            Likely AI
          </template>

          <template v-else-if="analysis.artificial >= 0.5">
            Possibly AI
          </template>

          <template v-else-if="analysis.artificial >= 0.25">
            Likely Real
          </template>

          <template v-else> Very Likely Real </template>
        </template>

        <template v-else-if="analysis.scoreType === 'vote'">
          Based on {{ analysis.voteCount }} user reports
        </template>
      </v-card-subtitle>
    </v-card-item>

    <v-card-actions class="pt-0">
      <v-list density="compact" min-width="100%" class="pa-0 overflow-visible">
        <template v-if="analysis.scoreType !== 'user'">
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
        </template>

        <template v-else>
          <v-list-item class="px-0">
            <v-list-item-action>
              <v-btn
                size="large"
                class="justify-start flex-fill"
                :loading="pendingVote === 'cancel'"
                @click="vote('cancel')"
              >
                Cancel my report
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </template>
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
