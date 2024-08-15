<script setup>
import DetectorSvg from '@/assets/detector.svg';
import { validate as validateEmail } from 'email-validator';

import StyleProvider from './StyleProvider.vue';

const email = ref('');
const valid = ref(null);
const pending = ref(false);

const emailValidator = (email) =>
  validateEmail(email) || 'A valid email is required';
</script>

<template>
  <StyleProvider>
    <v-card>
      <v-card-item>
        <v-card-title>AI Image Detector</v-card-title>
        <v-card-subtitle>Sign In Required</v-card-subtitle>
        <template #append>
          <div class="position-relative">
            <div class="underlay"></div>
            <DetectorSvg class="icon" />
          </div>
        </template>
      </v-card-item>
      <v-card-text>
        <v-form
          v-model="valid"
          class="d-flex flex-column"
          :class="(valid ?? true) ? 'gr-6' : 'gr-2'"
          @submit.prevent
        >
          <v-text-field
            v-model="email"
            min-width="350"
            density="compact"
            type="email"
            label="Please enter your email to sign in"
            hide-details="auto"
            :readonly="pending"
            :rules="[emailValidator]"
            :validate-on="(valid ?? true) ? 'blur' : 'input'"
          />
          <v-btn
            size="large"
            type="submit"
            :color="(valid ?? true) ? '#09f' : null"
            :disabled="!(valid ?? true)"
            :loading="pending"
          >
            Sign In
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.icon {
  display: block;
  height: 40px;
  width: 40px;
}

.underlay {
  position: absolute;
  border-radius: 50%;

  top: 0;
  left: 0;
  bottom: 0;
  right: 0;

  opacity: 0.3;
  box-shadow: 0 0 9px 1px #09f;
  background-color: #09f;
}
</style>
