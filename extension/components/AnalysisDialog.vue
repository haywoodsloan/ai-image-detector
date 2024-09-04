<script setup>
import { PopupAction } from '@/entrypoints/background/actions/index.js';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { AiIndicatorColor } from '@/utilities/color.js';
import { analyzeImage } from '@/utilities/image.js';
import { getAnalysisStorage, userAuth } from '@/utilities/storage.js';

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

/** @type {Ref<ImageAnalysis>} */
const analysis = ref(null);
const error = ref('');

const pending = ref(true);
(async () => {
  const storedAuth = await userAuth.getValue();
  if (storedAuth?.verification === 'verified') {
    analysis.value = await analyzeImage(image);
    const item = await getAnalysisStorage(image);

    await item.setValue(analysis.value);
    pending.value = false;
  } else {
    error.value = SignInError;
    await invokeBackgroundTask(PopupAction);
  }
})();

/**
 * @param {ImageAnalysis} newVal
 */
async function onChange(newVal) {
  analysis.value = newVal;
  const item = await getAnalysisStorage(image);
  await item.setValue(newVal);
}
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
    v-else-if="!pending"
    :model-value="true"
    max-width="max-content"
    @after-leave="emit('close')"
  >
    <template #default="{ isActive }">
      <StyleProvider>
        <AnalysisCard
          show-close
          :model-value="analysis"
          :image="image"
          @close="isActive.value = false"
          @update:model-value="onChange"
        />
      </StyleProvider>
    </template>
  </v-dialog>
</template>
