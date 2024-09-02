<script setup>
import { validate as validateEmail } from 'email-validator';

import { createAuth } from '@/api/auth.js';
import DetectorSvg from '@/assets/detector.svg';
import { useAuth } from '@/utilities/auth.js';
import { PrimaryColor } from '@/utilities/color.js';

import DonateLinks from './DonateLinks.vue';

const InvalidEmailMsg = 'A valid email is required';
const FailedToSendMsg = 'Verification email failed to send, please try again';

const newEmail = ref('');
const storedAuth = useAuth();

const valid = ref(null);
const isValidEmail = (email) => validateEmail(email) || InvalidEmailMsg;

const createError = ref();
const createPending = ref(false);

async function login() {
  try {
    createPending.value = true;
    const email = newEmail.value;

    const newAuth = await createAuth(email);
    storedAuth.value = { ...newAuth, email };

    createError.value = null;
  } catch (error) {
    createError.value = FailedToSendMsg;
    throw error;
  } finally {
    createPending.value = false;
  }
}
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>AI Image Detector</v-card-title>
      <v-card-subtitle>Sign In Required</v-card-subtitle>
      <template #append>
        <v-icon class="icon" :icon="DetectorSvg" />
      </template>
    </v-card-item>
    <v-card-text>
      <v-form
        v-model="valid"
        class="d-flex flex-column"
        @submit.prevent="login"
      >
        <v-text-field
          v-model="newEmail"
          min-width="350"
          type="email"
          label="Please enter your email to sign in"
          hide-details="auto"
          :readonly="createPending"
          :rules="[isValidEmail]"
          :validate-on="(valid ?? true) ? 'blur' : 'input'"
        />

        <v-btn
          size="large"
          type="submit"
          aria-describedby="create-error-message"
          :class="(valid ?? true) ? 'mt-6' : 'mt-2'"
          :color="(valid ?? true) && newEmail.length ? PrimaryColor : null"
          :disabled="!(valid ?? true) || !newEmail.length"
          :loading="createPending"
        >
          Sign In
        </v-btn>

        <p
          v-if="createError"
          id="create-error-message"
          class="text-error text-caption mt-3"
          role="alert"
          aria-live="polite"
        >
          {{ createError }}
        </p>
      </v-form>
    </v-card-text>
    <DonateLinks />
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  height: 40px;
  width: 40px;
}
</style>
