<script setup>
import { analyzeImage } from '@/utilities/image.js';
import { userAuth } from '@/utilities/storage.js';

import AnalysisCard from './AnalysisCard.vue';

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
    error.value =
      'Please sign into the AI Image Detector extension to check for AI generated images';
  }
})();
</script>

<template>
  <v-app>
    <v-snackbar
      v-if="error"
      :model-value="true"
      :timeout="-1"
      @update:model-value="!$event && emit('close')"
    >
      {{ error }}
    </v-snackbar>
    <v-dialog v-else-if="analysis">
      <AnalysisCard v-model="analysis" :image="image" />
    </v-dialog>
  </v-app>
</template>
