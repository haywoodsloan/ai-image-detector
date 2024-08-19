<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@fontsource/roboto/scss/mixins' as Roboto;
@include Roboto.faces(
  $directory: '@fontsource/roboto/files',
  $weights: all,
  $styles: all
);

div {
  @extend :root;
  box-sizing: border-box;

  line-height: 1.5;
  font-size: 1rem;
  
  -webkit-text-size-adjust: 100%; /* Prevent adjustments of font size after orientation changes in iOS */
  word-break: normal;
  
  -moz-tab-size: 4;
  tab-size: 4;
}

:deep() {
  $color-pack: false;
  $layers: true;
  @import 'vuetify';

  * {
    font-family: 'Roboto', sans-serif !important;
  }
}
</style>
