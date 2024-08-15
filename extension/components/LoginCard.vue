<script setup>
import { createAuth } from '@/api/auth.js';
import DetectorSvg from '@/assets/detector.svg';
import { useAuthPending } from '@/utilities/auth.js';
import { userAuth } from '@/utilities/storage.js';
import { validate as validateEmail } from 'email-validator';

import StyleProvider from './StyleProvider.vue';

const InvalidEmailMsg = 'A valid email is required';
const FailedToSendMsg = 'Verification email failed to send, please try again';

const email = ref('');
const valid = ref(null);
const isValidEmail = (email) => validateEmail(email) || InvalidEmailMsg;

const createError = ref();
const createPending = ref(false);

const authPending = useAuthPending();
async function login() {
  try {
    const newAuth = await createAuth(email.value);
    await userAuth.setValue({ ...newAuth, email: email.value });
  } catch (error) {
    console.error(error);
    createError.value = FailedToSendMsg;
  }
}
</script>

<template>
  <StyleProvider>
    <v-card>
      <v-card-item>
        <v-card-title>AI Image Detector</v-card-title>
        <v-card-subtitle>
          {{ authPending ? 'Pending Email Verification' : 'Sign In Required' }}
        </v-card-subtitle>
        <template #append>
          <DetectorSvg class="icon" />
        </template>
      </v-card-item>
      <v-card-text>
        <v-form
          v-if="!authPending"
          v-model="valid"
          class="d-flex flex-column"
          @submit.prevent="login"
        >
          <v-text-field
            v-model="email"
            min-width="350"
            density="compact"
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
            :color="(valid ?? true) ? '#0085dd' : null"
            :disabled="!(valid ?? true)"
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
  </StyleProvider>
</template>

<style lang="scss" scoped>
.icon {
  display: block;
  height: 40px;
  width: 40px;
}
</style>
