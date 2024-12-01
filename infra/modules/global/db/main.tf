resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_role_definition" "cosmos_role" {
  name              = "CosmosDB Connection String Reader (${upper(var.env_name)})"
  scope             = azurerm_cosmosdb_account.cosmos_account.id
  assignable_scopes = [azurerm_cosmosdb_account.cosmos_account.id]

  permissions {
    actions = ["Microsoft.DocumentDB/databaseAccounts/listConnectionStrings/*"]
  }
}

resource "azurerm_cosmosdb_account" "cosmos_account" {
  name                             = "cosmos-db-${random_string.resource_code.result}"
  location                         = var.region_names[0]
  resource_group_name              = var.rg_name
  free_tier_enabled                = var.env_name == "prod"
  offer_type                       = "Standard"
  kind                             = "MongoDB"
  mongo_server_version             = "7.0"
  multiple_write_locations_enabled = true

  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "mongoEnableDocLevelTTL"
  }

  capabilities {
    name = "DisableRateLimitingResponses"
  }

  consistency_policy {
    consistency_level = "BoundedStaleness"
  }

  dynamic "geo_location" {
    for_each = var.region_names
    content {
      location          = geo_location.value
      failover_priority = geo_location.key
    }
  }
}

resource "azurerm_cosmosdb_mongo_database" "mongo_db" {
  name                = "service"
  resource_group_name = var.rg_name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name

  autoscale_settings {
    max_throughput = 1000
  }
}

resource "azurerm_cosmosdb_mongo_collection" "auths" {
  name                = "auths"
  resource_group_name = var.rg_name

  account_name  = azurerm_cosmosdb_account.cosmos_account.name
  database_name = azurerm_cosmosdb_mongo_database.mongo_db.name

  default_ttl_seconds = -1

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys   = ["accessToken"]
    unique = true
  }

  index {
    keys   = ["verifyCode"]
    unique = true
  }

  index {
    keys = ["userId", "status"]
  }

  index {
    keys = ["verifyCode", "status"]
  }

  index {
    keys = ["accessToken", "status"]
  }
}

resource "azurerm_cosmosdb_mongo_collection" "users" {
  name                = "users"
  resource_group_name = var.rg_name

  account_name  = azurerm_cosmosdb_account.cosmos_account.name
  database_name = azurerm_cosmosdb_mongo_database.mongo_db.name

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys   = ["emailHash"]
    unique = true
  }
}

resource "azurerm_cosmosdb_mongo_collection" "votes" {
  name                = "votes"
  resource_group_name = var.rg_name

  account_name  = azurerm_cosmosdb_account.cosmos_account.name
  database_name = azurerm_cosmosdb_mongo_database.mongo_db.name

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys   = ["imageHash", "userId"]
    unique = true
  }

  index {
    keys = ["imageHash"]
  }

  index {
    keys = ["userId"]
  }

  index {
    keys = ["voteLabel"]
  }
}
