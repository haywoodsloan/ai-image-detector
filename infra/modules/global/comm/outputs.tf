locals {
  location = lower(join("", split(" ", azurerm_communication_service.comm_service.data_location)))
}

output "comm_service_endpoint" {
  sensitive = true
  value     = "https://${azurerm_communication_service.comm_service.name}.${local.location}.communication.azure.com"
}

output "comm_service_id" {
  value = azurerm_communication_service.comm_service.id
}
