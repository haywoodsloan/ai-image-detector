<script setup>
import StyleProvider from '@/components/StyleProvider.vue';

import CreateLoginCard from '@/components/CreateLoginCard.vue';
import SettingsCard from '@/components/SettingsCard.vue';
import VerifyLoginCard from '@/components/VerifyLoginCard.vue';
import { useVerifyStatus } from '@/utilities/auth.js';

import { InitAction } from '../background/actions/init.js';

InitAction.invoke();
const verifyStatus = useVerifyStatus();
</script>

<template>
  <StyleProvider>
    <v-scroll-x-reverse-transition v-if="verifyStatus !== null" mode="out-in">
      <SettingsCard v-if="verifyStatus === 'verified'" />
      <VerifyLoginCard v-else-if="verifyStatus === 'pending'" />
      <CreateLoginCard v-else />
    </v-scroll-x-reverse-transition>
  </StyleProvider>
</template>
