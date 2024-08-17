<script setup>
import { createAuth } from '@/api/auth.js';
import DetectorSvg from '@/assets/detector.svg';
import {
  useAuthPending,
  useEmail,
  useVerificationSocket,
} from '@/utilities/auth.js';
import { RealIndicatorColor } from '@/utilities/color.js';
import { subAuthVerify } from '@/utilities/pubsub.js';
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
let unsubAuthVerify;
watch([authPending, verificationSocket], () => {
  if (authPending.value) {
    unsubAuthVerify?.();
    const socket = verificationSocket.value;

    unsubAuthVerify = subAuthVerify(socket, async () => {
      unsubAuthVerify();
      const storedAuth = await userAuth.getValue();
      await userAuth.setValue({ ...storedAuth, verification: 'verified' });
    });
  }
});

// Unsub from the auth subscription when unmounted
onUnmounted(() => {
  unsubAuthVerify?.();
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
  <StyleProvider>
    <v-scroll-x-reverse-transition v-if="authPending !== null" mode="out-in">
      <v-card v-if="!authPending">
        <v-card-item>
          <v-card-title>AI Image Detector</v-card-title>
          <v-card-subtitle> Sign In Required </v-card-subtitle>
          <template #append>
            <DetectorSvg class="icon" />
          </template>
        </v-card-item>
        <v-card-text>
          <v-form
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
              :color="(valid ?? true) && newEmail.length ? '#0085dd' : null"
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

      <v-card v-else>
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
              @click.prevent="login(storedEmail)"
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
    </v-scroll-x-reverse-transition>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.icon {
  display: block;
  height: 40px;
  width: 40px;
}
</style>
