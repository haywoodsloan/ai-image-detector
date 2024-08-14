<script setup>
import StyleProvider from './StyleProvider.vue';
</script>

<template>
  <StyleProvider>
    <v-card class="card">
      <v-card-title>AI Image Detector</v-card-title>
      <v-card-subtitle>Login required</v-card-subtitle>
      <v-card-actions> </v-card-actions>
    </v-card>
  </StyleProvider>
</template>

<style lang="scss" scoped>
.card {
  font-family: Arial, Helvetica, sans-serif !important;
}
</style>
