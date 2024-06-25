output "comm_service_connection_string" {
  sensitive = true
  value     = azurerm_communication_service.comm_service.primary_connection_string
}

output "comm_service_secondary_connection_string" {
  sensitive = true
  value     = azurerm_communication_service.comm_service.secondary_connection_string
}
