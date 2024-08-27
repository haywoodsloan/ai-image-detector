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

  display: contents !important;
  box-sizing: border-box !important;

  line-height: 1.5 !important;
  font-size: 1rem !important;

  -webkit-text-size-adjust: 100% !important;
  word-break: normal !important;

  -moz-tab-size: 4 !important;
  tab-size: 4 !important;
}

@layer base, vuetify;
:deep() {
  $layers: true;
  $color-pack: false;
  @import 'vuetify';

  @layer base {
    * {
      font-family: 'Roboto', sans-serif !important;
    }
  }
}
</style>
