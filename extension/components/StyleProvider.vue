<template>
  <div data-aid-bi39lk5g>
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

[data-aid-bi39lk5g] {
  @extend :root, html, body;
  display: contents !important;

  * {
    font-family: 'Roboto', sans-serif !important;
    text-transform: unset;
  }
}
</style>
