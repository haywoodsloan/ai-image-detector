<script setup>
import LoginCard from '@/components/LoginCard.vue';
import { useAuthVerified } from '@/utilities/auth.js';

import { InitAction } from '../background/actions/init.js';

InitAction.invoke();
const authVerified = useAuthVerified();
</script>

<template>
  <v-scroll-x-reverse-transition v-if="authVerified !== null" mode="out-in">
    <div v-if="authVerified">TODO Create More!</div>
    <LoginCard v-else />
  </v-scroll-x-reverse-transition>
</template>
