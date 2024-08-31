<script setup>
import { PopupAction } from '@/entrypoints/background/actions/index.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { AiIndicatorColor } from '@/utilities/color.js';
import { analyzeImage } from '@/utilities/image.js';
import { userAuth } from '@/utilities/storage.js';

import AnalysisCard from './AnalysisCard.vue';
import StyleProvider from './StyleProvider.vue';

const NeedsSignInError =
  'Please sign into the AI Image Detector ' +
  'extension to check for AI generated images.';

const emit = defineEmits(['close']);
const { image } = defineProps({
  image: {
    type: String,
    required: true,
  },
});

const error = ref('');
const analysis = ref(null);

(async () => {
  const storedAuth = await userAuth.getValue();
  if (storedAuth?.verification === 'verified') {
    analysis.value = await analyzeImage(image);
  } else {
    error.value = NeedsSignInError;
    await invokeBackgroundTask(PopupAction);
  }
})();
</script>

<template>
  <v-snackbar
    v-if="error"
    :model-value="true"
    :color="AiIndicatorColor"
    @update:model-value="!$event && emit('close')"
  >
    <StyleProvider>
      {{ error }}
    </StyleProvider>
  </v-snackbar>

  <v-dialog v-else-if="analysis">
    <AnalysisCard v-model="analysis" :image="image" />
  </v-dialog>
</template>
