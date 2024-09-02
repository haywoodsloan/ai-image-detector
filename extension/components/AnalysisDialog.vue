<script setup>
import { PopupAction } from '@/entrypoints/background/actions/index.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { AiIndicatorColor } from '@/utilities/color.js';
import { analyzeImage, useImageAnalysis } from '@/utilities/image.js';
import { userAuth } from '@/utilities/storage.js';

import AnalysisCard from './AnalysisCard.vue';
import StyleProvider from './StyleProvider.vue';

const SignInError = 'Please sign in to check for AI generated images.';

const emit = defineEmits(['close']);
const { image } = defineProps({
  image: {
    type: String,
    required: true,
  },
});

const error = ref('');
const analysis = useImageAnalysis(image);

(async () => {
  const storedAuth = await userAuth.getValue();
  if (storedAuth?.verification === 'verified') {
    analysis.value = await analyzeImage(image);
  } else {
    error.value = SignInError;
    await invokeBackgroundTask(PopupAction);
  }
})();
</script>

<template>
  <v-snackbar
    v-if="error"
    timer
    :model-value="true"
    :color="AiIndicatorColor"
    @update:model-value="!$event && emit('close')"
  >
    <StyleProvider>
      {{ error }}
    </StyleProvider>
  </v-snackbar>

  <v-dialog
    v-else-if="analysis"
    :model-value="true"
    max-width="max-content"
    @after-leave="emit('close')"
  >
    <template #default="{ isActive }">
      <StyleProvider>
        <AnalysisCard
          v-model="analysis"
          show-close
          :image="image"
          @close="isActive.value = false"
        />
      </StyleProvider>
    </template>
  </v-dialog>
</template>
