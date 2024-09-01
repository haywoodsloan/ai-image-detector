<script setup>
import { getParentChain } from '@/utilities/element.js';
import { OverlayClasses } from '@/utilities/vue.js';

const DataSetId = 'aid-3bi9lk5g';

/** @type {Ref<HTMLElement>} */
const wrapper = ref(null);

onMounted(() => {
  // Walk up the parent chain and look for overlay wrappers
  for (const { classList, dataset } of getParentChain(wrapper.value)) {
    if (OverlayClasses.some((c) => classList.contains(c))) {
      // Stop after the first overlay wrapper
      dataset[DataSetId] = '';
      break;
    }
  }
});
</script>

<template>
  <div ref="wrapper" class="aid-style-root" data-aid-3bi9lk5g>
    <slot></slot>
  </div>
</template>

<style lang="scss">
@use 'vuetify' with (
  $color-pack: false
);

@use '@fontsource/roboto/scss/mixins' as Roboto;
@include Roboto.faces(
  $directory: '@fontsource/roboto/files',
  $weights: all,
  $styles: all
);

[data-aid-3bi9lk5g] {
  @extend :root;

  &.aid-style-root {
    @extend html, body;
    display: contents !important;
  }

  * {
    font-family: 'Roboto', sans-serif !important;
    text-transform: unset;
  }
}
</style>
