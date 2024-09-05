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

/** @type {Ref<ImageAnalysis>} */
const analysis = useImageAnalysis(image);
const error = ref('');

const pending = ref(true);
onMounted(async () => {
  const storedAuth = await userAuth.getValue();
  if (storedAuth?.verification === 'verified') {
    analysis.value = await analyzeImage(image);
    pending.value = false;
  } else {
    error.value = SignInError;
    await invokeBackgroundTask(PopupAction);
  }
});

// Close the dialog if the TTL expires
watch(analysis, (newVal) => {
  if (!newVal && !pending.value) emit('close');
});
</script>

<template>
  <v-snackbar
    :model-value="error"
    :color="AiIndicatorColor"
    @update:model-value="!$event && emit('close')"
  >
    <StyleProvider>
      {{ error }}
    </StyleProvider>
  </v-snackbar>

  <v-dialog
    :model-value="!pending"
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
