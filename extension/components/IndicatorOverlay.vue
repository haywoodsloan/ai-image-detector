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
  visibility: visible !important;
  display: inline-block;

  width: 25px;
  height: 25px;

  border-radius: 50%;
  background-color: red;
}
</style>
