<script setup>
import { createAuth } from '@/api/auth.js';
import { useEmail, useVerificationSocket } from '@/utilities/auth.js';
import { RealIndicatorColor } from '@/utilities/color.js';
import { subAuthVerify } from '@/utilities/pubsub.js';
import { userAuth } from '@/utilities/storage.js';

const FailedToSendMsg = 'Verification email failed to send, please try again';

const storedEmail = useEmail();

const createError = ref();
const createPending = ref(false);

/** @type {() => void} */
let unsubAuthVerify;
const verifySocket = useVerificationSocket();

watch(
  verifySocket,
  (newSocket) => {
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
    const newAuth = await createAuth(storedEmail.value);
    await userAuth.setValue({ ...newAuth, email: storedEmail.value });
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
          color="#0085dd"
          :loading="createPending"
          size="large"
          @click.prevent="login"
        >
          Resend Link
        </v-btn>

        <p v-if="createError" class="text-error text-caption mt-3">
          {{ createError }}
        </p>

        <v-btn
          class="mt-3"
          :color="!createPending ? '#e10035' : null"
          size="large"
          :disabled="createPending"
          @click.prevent="cancel"
        >
          Cancel
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
