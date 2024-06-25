resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_storage_account" "function_storage" {
  name                     = "functionstore${random_string.resource_code.result}"
  resource_group_name      = var.rg_name
  location                 = var.region_name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "function_service_plan" {
  name                = "function-service-plan"
  resource_group_name = var.rg_name
  location            = var.region_name
  os_type             = "Windows"
  sku_name            = "Y1"
}

resource "azurerm_windows_function_app" "function_app" {
  name                = "ai-image-detector-${var.env_name}-${var.region_name}"
  resource_group_name = var.rg_name
  location            = var.region_name

  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  storage_account_name       = azurerm_storage_account.function_storage.name
  service_plan_id            = azurerm_service_plan.function_service_plan.id
  https_only                 = true

  app_settings = {
    NODE_ENV        = var.env_name
    HF_KEY          = var.hf_key
    DB_CONN_STR     = var.db_connection_string
    DB_CONN_STR_2   = var.db_secondary_connection_string
    COMM_CONN_STR   = var.comm_service_connection_string
    COMM_CONN_STR_2 = var.comm_service_secondary_connection_string
  }

  site_config {
    application_insights_connection_string = var.insights_connection_string
    use_32_bit_worker                      = false
    ftps_state                             = "FtpsOnly"

    application_stack {
      node_version = "~20"
    }
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["AzureWebJobsFeatureFlags"],
    ]
  }
}

data "azurerm_function_app_host_keys" "function_keys" {
  name                = azurerm_windows_function_app.function_app.name
  resource_group_name = var.rg_name
}
