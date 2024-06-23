output "connection_string" {
  value = azurerm_cosmosdb_account.cosmos_account.primary_mongodb_connection_string
}

output "secondary_connection_string" {
  value = azurerm_cosmosdb_account.cosmos_account.secondary_mongodb_connection_string
}
