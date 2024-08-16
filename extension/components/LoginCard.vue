<script setup>
import { createAuth } from '@/api/auth.js';
import DetectorSvg from '@/assets/detector.svg';
import {
  useAuthPending,
  useEmail,
  useVerificationSocket,
} from '@/utilities/auth.js';
import { RealIndicatorColor } from '@/utilities/color.js';
import { subForAuthVerify } from '@/utilities/pubsub.js';
import { userAuth } from '@/utilities/storage.js';
import { validate as validateEmail } from 'email-validator';

import StyleProvider from './StyleProvider.vue';

const InvalidEmailMsg = 'A valid email is required';
const FailedToSendMsg = 'Verification email failed to send, please try again';

const newEmail = ref('');
const storedEmail = useEmail();

const valid = ref(null);
const isValidEmail = (email) => validateEmail(email) || InvalidEmailMsg;

const createError = ref();
const createPending = ref(false);

const authPending = useAuthPending();
const verificationSocket = useVerificationSocket();

/** @type {() => void} */
let unsubForAuthVerify;
watch([authPending, verificationSocket], () => {
  if (authPending.value) {
    unsubForAuthVerify?.();
    const socket = verificationSocket.value;

    unsubForAuthVerify = subForAuthVerify(socket, async () => {
      unsubForAuthVerify();
      const storedAuth = await userAuth.getValue();
      await userAuth.setValue({ ...storedAuth, verification: 'verified' });
    });
  }
});

// Unsub from the auth subscription when unmounted
onUnmounted(() => {
  unsubForAuthVerify?.();
});

/**
 * @param {string} email
 */
async function login(email) {
  try {
    createPending.value = true;
    const newAuth = await createAuth(email);
    await userAuth.setValue({ ...newAuth, email });
    createError.value = null;
  } catch (error) {
    console.error(error);
    createError.value = FailedToSendMsg;
  } finally {
    createPending.value = false;
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
        <div v-if="authPending" class="d-flex flex-column">
          <div class="d-flex gc-6">
            <div class="flex-fill">
              <div class="text-no-wrap text-body-1">
                Please check your email for a verification link
              </div>
              <div class="text-no-wrap text-body-2 text-medium-emphasis">
                {{ storedEmail }}
              </div>
            </div>

            <v-progress-circular :color="RealIndicatorColor" indeterminate />
          </div>

          <v-btn
            class="mt-3"
            color="#0085dd"
            :loading="createPending"
            size="large"
            @click.prevent="login(storedEmail)"
          >
            Resend Link
          </v-btn>

          <p v-if="createError" class="text-error text-caption mt-3">
            {{ createError }}
          </p>
        </div>

        <v-form
          v-else
          v-model="valid"
          class="d-flex flex-column"
          @submit.prevent="login(newEmail)"
        >
          <v-text-field
            v-model="newEmail"
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
