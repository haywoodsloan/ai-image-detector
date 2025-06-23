data "azurerm_subscription" "current" {}

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

  sticky_settings {
    app_setting_names = ["HUB_NAME"]
  }

  app_settings = {
    NODE_ENV         = var.env_name
    HF_KEY           = var.hf_key
    DB_NAME          = var.db_name
    DB_RG_NAME       = var.env_rg_name
    SUB_ID           = data.azurerm_subscription.current.subscription_id
    COMM_ENDPOINT    = var.comm_service_endpoint
    PUBSUB_HOSTNAME  = var.pubsub_hostname
    INFERENCE_API    = var.inference_api
    INFERENCE_REG_ID = var.inference_reg_id
    INFERENCE_KEY    = var.inference_key
    HUB_NAME         = "live"
  }

  identity {
    type = "SystemAssigned"
  }

  site_config {
    scm_ip_restriction_default_action = "Deny"

    application_insights_connection_string = var.insights_connection_string
    use_32_bit_worker                      = false
    ftps_state                             = "FtpsOnly"
    http2_enabled                          = true

    application_stack {
      node_version = "~20"
    }

    cors {
      allowed_origins = ["*"]
    }

    # TODO: restore once frontdoor is back
    # ip_restriction_default_action = "Deny"
    # ip_restriction {
    #   service_tag = "AzureFrontDoor.Backend"
    #   headers {
    #     x_azure_fdid = [var.frontdoor_guid]
    #   }
    # }
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }
}

resource "azurerm_role_assignment" "function_email_role" {
  scope                = var.comm_service_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_windows_function_app.function_app.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_pubsub_role" {
  scope                = var.pubsub_id
  role_definition_name = "Web PubSub Service Owner"
  principal_id         = azurerm_windows_function_app.function_app.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_cosmos_role" {
  scope              = var.db_id
  role_definition_id = var.db_role_id
  principal_id       = azurerm_windows_function_app.function_app.identity[0].principal_id
}

# TODO: remove this CNAME record in favor of frontdoor once we can afford it
resource "azurerm_dns_cname_record" "function_cname" {
  name                = var.api_subdomain
  zone_name           = var.domain_name
  resource_group_name = var.env_rg_name
  ttl                 = 3600
  record              = azurerm_windows_function_app.function_app.default_hostname
}

resource "azurerm_dns_txt_record" "function_txt" {
  name                = "asuid.${var.api_subdomain}"
  zone_name           = var.domain_name
  resource_group_name = var.env_rg_name
  ttl                 = 3600

  record {
    value = azurerm_windows_function_app.function_app.custom_domain_verification_id
  }
}

resource "time_sleep" "wait_for_records" {
  create_duration = "60s"
  triggers = {
    txt_id   = azurerm_dns_txt_record.function_txt.id
    cname_id = azurerm_dns_cname_record.function_cname.id
  }
}

resource "azurerm_app_service_custom_hostname_binding" "custom_domain" {
  depends_on          = [time_sleep.wait_for_records]
  hostname            = "${var.api_subdomain}.${var.domain_name}"
  app_service_name    = azurerm_windows_function_app.function_app.name
  resource_group_name = var.rg_name

  # TODO: remove once we are using frontdoor again
  # Ignore ssl_state and thumbprint as they are managed using
  # azurerm_app_service_certificate_binding.example
  lifecycle {
    ignore_changes = [ssl_state, thumbprint]
  }
}

# TODO: remove once we are using frontdoor again
resource "azurerm_app_service_managed_certificate" "domain_cert" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.custom_domain.id
}

# TODO: remove once we are using frontdoor again
resource "azurerm_app_service_certificate_binding" "cert_binding" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.custom_domain.id
  certificate_id      = azurerm_app_service_managed_certificate.domain_cert.id
  ssl_state           = "SniEnabled"
}

resource "azurerm_windows_function_app_slot" "function_app_slot" {
  name            = "staging"
  function_app_id = azurerm_windows_function_app.function_app.id

  storage_account_access_key = azurerm_windows_function_app.function_app.storage_account_access_key
  storage_account_name       = azurerm_windows_function_app.function_app.storage_account_name
  https_only                 = azurerm_windows_function_app.function_app.https_only

  app_settings = merge(azurerm_windows_function_app.function_app.app_settings, {
    HUB_NAME = "staging"
  })

  identity {
    type = azurerm_windows_function_app.function_app.identity[0].type
  }

  site_config {
    auto_swap_slot_name           = "production"
    ip_restriction_default_action = "Deny"

    application_insights_connection_string = azurerm_windows_function_app.function_app.site_config[0].application_insights_connection_string
    use_32_bit_worker                      = azurerm_windows_function_app.function_app.site_config[0].use_32_bit_worker
    ftps_state                             = azurerm_windows_function_app.function_app.site_config[0].ftps_state
    http2_enabled                          = azurerm_windows_function_app.function_app.site_config[0].http2_enabled

    application_stack {
      node_version = azurerm_windows_function_app.function_app.site_config[0].application_stack[0].node_version
    }
  }
}

resource "azurerm_role_assignment" "function_slot_email_role" {
  scope              = azurerm_role_assignment.function_email_role.scope
  role_definition_id = azurerm_role_assignment.function_email_role.role_definition_id
  principal_id       = azurerm_windows_function_app_slot.function_app_slot.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_slot_pubsub_role" {
  scope              = azurerm_role_assignment.function_pubsub_role.scope
  role_definition_id = azurerm_role_assignment.function_pubsub_role.role_definition_id
  principal_id       = azurerm_windows_function_app_slot.function_app_slot.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_slot_cosmos_role" {
  scope              = azurerm_role_assignment.function_cosmos_role.scope
  role_definition_id = azurerm_role_assignment.function_cosmos_role.role_definition_id
  principal_id       = azurerm_windows_function_app_slot.function_app_slot.identity[0].principal_id
}
