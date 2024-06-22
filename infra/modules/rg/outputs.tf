output "ai_image_detector_rg_name" {
  description = "The name of the resource group for the detector components"
  value       = azurerm_resource_group.ai_image_detector.name
}

output "ai_image_detector_rg_location" {
  description = "The location of the resource group for the detector components"
  value       = azurerm_resource_group.ai_image_detector.location
}