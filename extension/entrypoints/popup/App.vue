<script setup>
import LoginCard from '@/components/LoginCard/index.vue';
import SettingsCard from '@/components/SettingsCard.vue';
import StyleProvider from '@/components/StyleProvider.vue';
import { useAuthVerified } from '@/utilities/auth.js';

import { InitAction } from '../background/actions/init.js';

InitAction.invoke();
const authVerified = useAuthVerified();
</script>

<template>
  <StyleProvider>
    <v-scroll-x-reverse-transition v-if="authVerified !== null" mode="out-in">
      <SettingsCard v-if="authVerified" />
      <LoginCard v-else />
    </v-scroll-x-reverse-transition>
  </StyleProvider>
</template>
