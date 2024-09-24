<script setup>
import { mdiCloseCircle } from '@mdi/js';

import { AiIndicatorColor, PrimaryColor } from '@/utilities/color.js';
import { checkImage, useImageAnalysis } from '@/utilities/image.js';
import { debugError } from '@/utilities/log.js';
import { userAuth } from '@/utilities/storage.js';

import AnalysisCard from './AnalysisCard.vue';
import StyleProvider from './StyleProvider.vue';

const SignInError = 'Please sign in to check for AI generated images.';
const AnalysisError = 'Failed to check image, please try again.';

const emit = defineEmits(['close', 'error']);
const { image } = defineProps({
  image: {
    type: String,
    required: true,
  },
});

/** @type {Ref<ImageAnalysis>} */
const analysis = useImageAnalysis(image);
const error = ref('');

const pending = ref(true);
onMounted(async () => {
  const storedAuth = await userAuth.getValue();
  if (storedAuth?.verification === 'verified') {
    try {
      analysis.value = await checkImage(image, true);
      pending.value = false;
    } catch (err) {
      error.value = AnalysisError;
      debugError(err);
    }
  } else {
    error.value = SignInError;
  }
});

// Close the dialog if the TTL expires
watch(analysis, (newVal) => {
  if (!newVal && !pending.value) emit('close');
});
</script>

<template>
  <v-snackbar
    :model-value="!!error"
    :color="AiIndicatorColor"
    @update:model-value="!$event && emit('close')"
  >
    <StyleProvider>
      {{ error }}
    </StyleProvider>
  </v-snackbar>

  <v-dialog
    :model-value="!error"
    max-width="max-content"
    @after-leave="emit('close')"
  >
    <template #default="{ isActive }">
      <StyleProvider>
        <v-scroll-x-reverse-transition mode="out-in">
          <AnalysisCard
            v-if="!pending"
            v-model="analysis"
            show-close
            :image="image"
            @close="isActive.value = false"
          />
          <v-card v-else>
            <v-card-item class="pr-2">
              <div class="d-flex">
                <div>
                  <v-card-title> Image Analysis </v-card-title>
                  <v-card-subtitle> In progress... </v-card-subtitle>
                </div>

                <v-btn
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
            <v-card-text class="text-center">
              <v-progress-circular
                :color="PrimaryColor"
                size="50"
                indeterminate
              />
            </v-card-text>
          </v-card>
        </v-scroll-x-reverse-transition>
      </StyleProvider>
    </template>
  </v-dialog>
</template>
