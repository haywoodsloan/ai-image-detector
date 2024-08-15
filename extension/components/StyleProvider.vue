<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
:deep() {
  $color-pack: false;
  @import 'vuetify';

  & > * {
    @extend :root;
    font-family: Arial, Helvetica, sans-serif !important;
  }
}
</style>
