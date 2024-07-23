<script setup>
defineProps({
  imageEle: {
    type: HTMLElement,
    required: true
  }
});
</script>

<template>
  <div class="circle"></div>
</template>

<style scoped>
.circle {
  width: 8px;
  height: 8px;

  border-radius: 50%;
  background-color: red;
}
</style>
