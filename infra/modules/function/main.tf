resource "random_string" "resource_code" {
  length  = 10
  special = false
  upper   = false
}

resource "azurerm_storage_account" "function_storage" {
  name                     = "function${random_string.resource_code.result}"
  resource_group_name      = var.rg_name
  location                 = var.region_name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "function_service_plan" {
  name                = "function-service-plan"
  resource_group_name = var.rg_name
  location            = var.region_name
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "function_app" {
  name                = "ai-image-detector-${var.env_name}-${var.region_name}-function-app"
  resource_group_name = var.rg_name
  location            = var.region_name

  storage_uses_managed_identity = true
  storage_account_name          = azurerm_storage_account.function_storage.name
  service_plan_id               = azurerm_service_plan.function_service_plan.id

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    NODE_ENV = var.env_name
    HF_KEY   = var.hf_key
  }

  site_config {
    application_stack {
      node_version = 20
    }
  }
}

resource "azurerm_role_assignment" "function_storage_writer_role" {
  scope                = azurerm_storage_account.function_storage.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_manager_role" {
  scope                = azurerm_storage_account.function_storage.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}
