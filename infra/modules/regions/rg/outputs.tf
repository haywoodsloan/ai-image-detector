output "region_rg_name" {
  description = "The name of the resource group for the detector components"
  value       = azurerm_resource_group.region_rg.name
}
