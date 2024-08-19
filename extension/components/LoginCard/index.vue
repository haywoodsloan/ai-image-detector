<script setup>
import { useAuthPending } from '@/utilities/auth.js';

import CreateLoginCard from './CreateLoginCard.vue';
import VerifyLoginCard from './VerifyLoginCard.vue';

const authPending = useAuthPending();
</script>

<template>
  <v-scroll-x-reverse-transition v-if="authPending !== null" mode="out-in">
    <CreateLoginCard v-if="!authPending" />
    <VerifyLoginCard v-else />
  </v-scroll-x-reverse-transition>
</template>
