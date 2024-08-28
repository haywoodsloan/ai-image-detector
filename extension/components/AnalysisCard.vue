<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { AiIndicatorColor, RealIndicatorColor } from '@/utilities/color.js';
import {
  analyzeImage,
  deleteImageReport,
  reportImage,
} from '@/utilities/image.js';

import DonateLinks from './DonateLinks.vue';

const props = defineProps({
  image: {
    type: HTMLImageElement,
    required: true,
  },
});

/** @type {ModelRef<ImageAnalysis>} */
const model = defineModel({
  type: Object,
  required: true,
});

// Show the score as a percent
const scoreText = computed(() => {
  if (model.value.scoreType === 'detector') {
    const percent = model.value?.artificial * 100;
    return `${percent?.toFixed(1)}%`;
  } else return model.value.artificial > 0 ? 'AI' : 'Real';
});

/** @type {Ref<LabelType>} */
const pendingVote = ref(null);

/**
 * @param {LabelType | 'cancel'} label
 */
async function vote(label) {
  try {
    pendingVote.value = label;
    if (label === 'cancel') {
      await deleteImageReport(props.image);
      model.value = await analyzeImage(props.image);
    } else {
      await reportImage(props.image, label);
      model.value = {
        artificial: label === 'artificial' ? 1 : 0,
        scoreType: 'user',
      };
    }
  } finally {
    pendingVote.value = '';
  }
}
</script>

<template>
  <v-card>
    <v-card-item class="pb-0">
      <v-card-title>
        <template v-if="model.scoreType === 'detector'">
          AI Analysis Score: {{ scoreText }}
        </template>

        <template v-else-if="model.scoreType === 'vote'">
          Users Reported: {{ scoreText }}
        </template>

        <template v-else-if="model.scoreType === 'user'">
          You Reported: {{ scoreText }}
        </template>
      </v-card-title>
      <v-card-subtitle v-if="model.scoreType !== 'user'">
        <template v-if="model.scoreType === 'detector'">
          <template v-if="model.artificial >= 0.9"> Very likely AI </template>

          <template v-else-if="model.artificial >= 0.75"> Likely AI </template>

          <template v-else-if="model.artificial >= 0.5"> Possibly AI </template>

          <template v-else-if="model.artificial >= 0.25">
            Likely Real
          </template>

          <template v-else> Very Likely Real </template>
        </template>

        <template v-else-if="model.scoreType === 'vote'">
          Based on {{ model.voteCount }} user reports
        </template>
      </v-card-subtitle>
    </v-card-item>

    <v-card-actions class="pt-0">
      <v-list density="compact" min-width="100%" class="pa-0 overflow-visible">
        <template v-if="model.scoreType !== 'user'">
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
                :color="AiIndicatorColor"
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
