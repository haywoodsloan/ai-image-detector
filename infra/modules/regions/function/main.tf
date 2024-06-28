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

  identity {
    type = "SystemAssigned"
  }

  sticky_settings {
    app_setting_names = ["HUB_NAME"]
  }

  app_settings = {
    NODE_ENV      = var.env_name
    HF_KEY        = var.hf_key
    DB_CONN_STR   = var.db_connection_string
    DB_CONN_STR_2 = var.db_secondary_connection_string
    COMM_ENDPOINT = var.comm_service_endpoint
    HUB_NAME      = "default"
  }

  site_config {
    application_insights_connection_string = var.insights_connection_string
    use_32_bit_worker                      = false
    ftps_state                             = "FtpsOnly"

    application_stack {
      node_version = "~20"
    }

    ip_restriction_default_action = "Deny"
    ip_restriction {
      service_tag = "AzureFrontDoor.Backend"
      headers {
        x_azure_fdid = [var.frontdoor_guid]
      }
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

resource "azurerm_role_assignment" "function_email_role" {
  scope                = var.comm_service_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_windows_function_app.function_app.identity[0].principal_id
}

resource "azurerm_windows_function_app_slot" "function_app_slot" {
  count           = var.env_name == "prod" ? 1 : 0
  name            = "slot"
  function_app_id = azurerm_windows_function_app.function_app.id

  storage_account_access_key = azurerm_windows_function_app.function_app.storage_account_access_key
  storage_account_name       = azurerm_windows_function_app.function_app.storage_account_name
  https_only                 = azurerm_windows_function_app.function_app.https_only

  identity {
    type = "SystemAssigned"
  }

  app_settings = merge(azurerm_windows_function_app.function_app.app_settings, {
    HUB_NAME = "staging"
  })

  site_config {
    application_insights_connection_string = azurerm_windows_function_app.function_app.site_config[0].application_insights_connection_string
    use_32_bit_worker                      = azurerm_windows_function_app.function_app.site_config[0].use_32_bit_worker
    ftps_state                             = azurerm_windows_function_app.function_app.site_config[0].ftps_state

    application_stack {
      node_version = azurerm_windows_function_app.function_app.site_config[0].application_stack[0].node_version
    }

    ip_restriction_default_action = azurerm_windows_function_app.function_app.site_config[0].ip_restriction_default_action
    ip_restriction {
      service_tag = azurerm_windows_function_app.function_app.site_config[0].ip_restriction[0].service_tag
      headers {
        x_azure_fdid = azurerm_windows_function_app.function_app.site_config[0].ip_restriction[0].headers[0].x_azure_fdid
      }
    }
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["AzureWebJobsFeatureFlags"],
    ]
  }
}

resource "azurerm_role_assignment" "function_slot_email_role" {
  count                = var.env_name == "prod" ? 1 : 0
  scope                = var.comm_service_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_windows_function_app_slot.function_app_slot[0].identity[0].principal_id
}
