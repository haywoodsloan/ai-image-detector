resource "azurerm_resource_group" "env_rg" {
  name     = "ai-image-detector-${var.env_name}"
  location = var.region_name
}
