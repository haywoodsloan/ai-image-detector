<script setup>
import CreateLoginCard from '@/components/CreateLoginCard.vue';
import SettingsCard from '@/components/SettingsCard.vue';
import StyleProvider from '@/components/StyleProvider.vue';
import VerifyLoginCard from '@/components/VerifyLoginCard.vue';
import { useVerifyStatus } from '@/utilities/auth.js';

import { InitAction } from '../background/actions/init.js';

InitAction.invoke();
const authStatus = useVerifyStatus();
</script>

<template>
  <StyleProvider>
    <v-scroll-x-reverse-transition v-if="authStatus !== null" mode="out-in">
      <SettingsCard v-if="authStatus === 'verified'" />
      <VerifyLoginCard v-else-if="authStatus === 'pending'" />
      <CreateLoginCard v-else />
    </v-scroll-x-reverse-transition>
  </StyleProvider>
</template>
