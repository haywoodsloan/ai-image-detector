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
