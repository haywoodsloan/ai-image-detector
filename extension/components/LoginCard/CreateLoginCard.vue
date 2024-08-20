<script setup>
import { createAuth } from '@/api/auth.js';
import DetectorSvg from '@/assets/detector.svg';
import { PrimaryColor } from '@/utilities/color.js';
import { userAuth } from '@/utilities/storage.js';
import { validate as validateEmail } from 'email-validator';

const InvalidEmailMsg = 'A valid email is required';
const FailedToSendMsg = 'Verification email failed to send, please try again';

const newEmail = ref('');

const valid = ref(null);
const isValidEmail = (email) => validateEmail(email) || InvalidEmailMsg;

const createError = ref();
const createPending = ref(false);

async function login() {
  try {
    createPending.value = true;
    const newAuth = await createAuth(newEmail.value);
    await userAuth.setValue({ ...newAuth, email: newEmail.value });
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
          :class="(valid ?? true) ? 'mt-6' : 'mt-2'"
          :color="(valid ?? true) && newEmail.length ? PrimaryColor : null"
          :disabled="!(valid ?? true) || !newEmail.length"
          :loading="createPending"
        >
          Sign In
        </v-btn>

        <p v-if="createError" class="text-error text-caption mt-3">
          {{ createError }}
        </p>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.icon {
  display: block;
  height: 40px;
  width: 40px;
}
</style>
