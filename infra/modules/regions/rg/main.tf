resource "azurerm_resource_group" "region_rg" {
  name     = "ai-image-detector-${var.env_name}-${var.region_name}"
  location = var.region_name
}
