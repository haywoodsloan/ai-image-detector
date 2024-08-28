<template>
  <div data-aid-style-provider>
    <slot />
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

[data-aid-style-provider] {
  @extend :root;

  display: contents !important;
  box-sizing: border-box !important;

  line-height: 1.5 !important;
  font-size: 1rem !important;

  -webkit-text-size-adjust: 100% !important;
  word-break: normal !important;

  -moz-tab-size: 4 !important;
  tab-size: 4 !important;

  * {
    font-family: 'Roboto', sans-serif !important;
  }
}
</style>
