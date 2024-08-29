<script setup>
import CreateLoginCard from '@/components/CreateLoginCard.vue';
import SettingsCard from '@/components/SettingsCard.vue';
import StyleProvider from '@/components/StyleProvider.vue';
import VerifyLoginCard from '@/components/VerifyLoginCard.vue';
import { useAuth } from '@/utilities/auth.js';

import { InitAction } from '../background/actions/init.js';

InitAction.invoke();
const storedAuth = useAuth();
</script>

<template>
  <StyleProvider>
    <v-scroll-x-reverse-transition v-if="storedAuth !== null" mode="out-in">
      <VerifyLoginCard v-if="storedAuth?.verification === 'pending'" />
      <CreateLoginCard v-else-if="storedAuth?.verification !== 'verified'" />
      <SettingsCard v-else />
    </v-scroll-x-reverse-transition>
  </StyleProvider>
</template>
