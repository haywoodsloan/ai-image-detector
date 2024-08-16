<script setup>
import LoginCard from '@/components/LoginCard.vue';
import { useAuthVerified } from '@/utilities/auth.js';

const authVerified = useAuthVerified();
</script>

<template>
  <div v-if="authVerified">TODO Create More!</div>
  <LoginCard v-else />
</template>
