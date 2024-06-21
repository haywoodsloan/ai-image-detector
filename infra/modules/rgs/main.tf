# Configure the Azure provider
terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.109.0"
    }
  }
}

resource "azurerm_resource_group" "ai_image_detector" {
  name     = "ai-image-detector-${var.env_name}-${var.region_name}"
  location = var.region_name
}
