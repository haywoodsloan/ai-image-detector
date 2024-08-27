<script setup>
import { createAuth } from '@/api/auth.js';
import { useEmail, useVerifySocket } from '@/utilities/auth.js';
import { PrimaryColor, RealIndicatorColor } from '@/utilities/color.js';
import { subAuthVerify } from '@/utilities/pubsub.js';
import { userAuth } from '@/utilities/storage.js';

import DonateLinks from './DonateLinks.vue';

const FailedToSendMsg = 'Verification email failed to send, please try again';

const storedEmail = useEmail();

const createError = ref();
const createPending = ref(false);

/** @type {() => void} */
let unsubAuthVerify;
const verifySocket = useVerifySocket();

watch(
  verifySocket,
  (newSocket) => {
    if (!newSocket) return;
    unsubAuthVerify?.();

    unsubAuthVerify = subAuthVerify(newSocket, async () => {
      unsubAuthVerify();
      const storedAuth = await userAuth.getValue();
      await userAuth.setValue({ ...storedAuth, verification: 'verified' });
    });
  },
  { immediate: true }
);

// Unsub from the auth subscription when unmounted
onUnmounted(() => {
  unsubAuthVerify?.();
});

async function login() {
  try {
    createPending.value = true;
    const email = storedEmail.value;

    const newAuth = await createAuth(email);
    await userAuth.setValue({ ...newAuth, email });

    createError.value = null;
  } catch (error) {
    createError.value = FailedToSendMsg;
    throw error;
  } finally {
    createPending.value = false;
  }
}

async function cancel() {
  await userAuth.removeValue();
}
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>AI Image Detector</v-card-title>
      <v-card-subtitle>Pending Email Verification</v-card-subtitle>
      <template #append>
        <v-progress-circular
          size="38"
          :color="RealIndicatorColor"
          :indeterminate="!createPending"
        />
      </template>
    </v-card-item>
    <v-card-text>
      <div class="d-flex flex-column">
        <div class="text-no-wrap text-body-1">
          Please check your email for a verification link
        </div>
        <div class="text-no-wrap text-body-2 text-medium-emphasis">
          {{ storedEmail }}
        </div>

        <v-btn
          class="mt-3"
          aria-describedby="create-error-message"
          :color="PrimaryColor"
          :loading="createPending"
          size="large"
          @click="login"
        >
          Resend Link
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

        <v-btn
          class="mt-3"
          :color="!createPending ? '#e10035' : null"
          size="large"
          :disabled="createPending"
          @click="cancel"
        >
          Cancel
        </v-btn>
      </div>
    </v-card-text>
    <DonateLinks />
  </v-card>
</template>
