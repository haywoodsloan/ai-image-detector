<script setup>
import { getParentChain } from '@/utilities/element.js';
import { AltProviderClasses } from '@/utilities/vue.js';

const DataSetId = 'aid-3bi9lk5g';

/** @type {Ref<HTMLElement>} */
const wrapper = ref(null);

onMounted(() => {
  // Walk up the parent chain and look for overlay wrappers
  for (const ancestor of getParentChain(wrapper.value)) {
    if (AltProviderClasses.some((cls) => ancestor.classList.contains(cls))) {
      // Stop after the first overlay wrapper
      ancestor.dataset[DataSetId] = '';
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
  &.aid-style-root {
    @extend :root, html, body;
    display: contents !important;
  }

  * {
    font-family: 'Roboto', sans-serif !important;
    text-transform: unset;
  }
}
</style>
