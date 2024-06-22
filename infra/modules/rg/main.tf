resource "azurerm_resource_group" "ai_image_detector" {
  name     = "ai-image-detector-${var.env_name}-${var.region_name}"
  location = var.region_name
}
