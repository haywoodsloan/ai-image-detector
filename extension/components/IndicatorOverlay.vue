<script setup>
const props = defineProps({
  parent: {
    type: HTMLElement,
    required: true
  }
})

onMounted(() => {
  console.log('parent of indicator', props.parent);
})
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
