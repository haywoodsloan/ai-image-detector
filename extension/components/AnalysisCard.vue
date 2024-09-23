<script setup>
import { mdiCloseCircle } from '@mdi/js';

import DetectorSvg from '@/assets/detector.svg';
import {
  AiIndicatorColor,
  RealIndicatorColor,
  getIndicatorColor,
} from '@/utilities/color.js';
import {
  checkImage,
  deleteImageReport,
  reportImage,
} from '@/utilities/image.js';

import DonateLinks from './DonateLinks.vue';

defineEmits(['close']);
const props = defineProps({
  image: {
    type: String,
    required: true,
  },
  showClose: {
    type: Boolean,
    default: false,
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

const scoreColor = computed(() => {
  if (model.value.scoreType === 'detector') {
    return getIndicatorColor(model.value.artificial);
  } else {
    return model.value.artificial > 0 ? AiIndicatorColor : RealIndicatorColor;
  }
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
      await deleteImageReport(model.value.voteId);
      model.value = await checkImage(props.image);
    } else {
      const vote = await reportImage(props.image, label);
      model.value = {
        artificial: label === 'artificial' ? 1 : 0,
        scoreType: 'user',
        voteId: vote._id,
      };
    }
  } finally {
    pendingVote.value = null;
  }
}
</script>

<template>
  <v-card>
    <v-card-item class="pb-0" :class="{ 'pr-2': showClose }">
      <div class="d-flex">
        <div>
          <v-card-title>
            <template v-if="model.scoreType === 'detector'">
              AI Analysis Score:
            </template>

            <template v-else-if="model.scoreType === 'vote'">
              Users Reported As:
            </template>

            <template v-else-if="model.scoreType === 'user'">
              You Reported As:
            </template>

            <span :style="{ color: scoreColor }">
              {{ scoreText }}
            </span>
          </v-card-title>
          <v-card-subtitle>
            <template v-if="model.scoreType === 'detector'">
              <template v-if="model.artificial >= 0.9">
                Very likely AI
              </template>

              <template v-else-if="model.artificial >= 0.75">
                Likely AI
              </template>

              <template v-else-if="model.artificial >= 0.5">
                Possibly AI
              </template>

              <template v-else-if="model.artificial >= 0.25">
                Likely real
              </template>

              <template v-else> Very likely real </template>
            </template>

            <template v-else-if="model.scoreType === 'vote'">
              Based on {{ model.voteCount }} user reports
            </template>

            <template v-else-if="model.scoreType === 'user'">
              Thank you for your input!
            </template>
          </v-card-subtitle>
        </div>

        <v-btn
          v-if="showClose"
          icon
          class="ml-4"
          variant="plain"
          size="20"
          @click="$emit('close')"
        >
          <v-icon :icon="mdiCloseCircle" size="20" />
        </v-btn>
      </div>
    </v-card-item>

    <v-card-actions class="pt-0">
      <v-list
        v-if="model.scoreType !== 'user'"
        density="compact"
        min-width="100%"
        class="pa-0 overflow-visible"
      >
        <v-list-item class="px-0">
          <v-list-item-action>
            <v-btn
              size="large"
              class="justify-start flex-fill"
              :loading="pendingVote === 'artificial' ? AiIndicatorColor : false"
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
              :loading="pendingVote === 'real' ? RealIndicatorColor : false"
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

      <template v-else>
        <v-btn
          class="justify-start flex-fill"
          :loading="pendingVote === 'cancel'"
          :color="AiIndicatorColor"
          @click="vote('cancel')"
        >
          Cancel my report
        </v-btn>
      </template>
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
