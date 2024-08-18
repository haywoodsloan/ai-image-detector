<script setup>
import LoginCard from '@/components/LoginCard/index.vue';
import StyleProvider from '@/components/StyleProvider.vue';
import { useAuthVerified } from '@/utilities/auth.js';
import { userAuth } from '@/utilities/storage.js';

import { InitAction } from '../background/actions/init.js';
import SettingsCard from '@/components/SettingsCard.vue';

InitAction.invoke();
const authVerified = useAuthVerified();

async function reset() {
  await userAuth.removeValue();
}
</script>

<template>
  <StyleProvider>
    <v-scroll-x-reverse-transition v-if="authVerified !== null" mode="out-in">
      <SettingsCard v-if="authVerified" />
      <LoginCard v-else />
    </v-scroll-x-reverse-transition>
  </StyleProvider>
</template>
