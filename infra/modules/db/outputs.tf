output "mongo_db_connection_string" {
  value = azurerm_cosmosdb_account.cosmos_account.primary_mongodb_connection_string
}