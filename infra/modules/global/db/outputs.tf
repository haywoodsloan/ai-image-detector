output "db_id" {
  value = azurerm_cosmosdb_account.cosmos_account.id
}

output "db_name" {
  value = azurerm_cosmosdb_account.cosmos_account.name
}

output "db_role_id" {
  value = azurerm_role_definition.cosmos_role.role_definition_resource_id
}
