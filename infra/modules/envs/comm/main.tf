resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_communication_service" "comm_service" {
  name                = "comm-service-${random_string.resource_code.result}"
  resource_group_name = var.rg_name
}

resource "azurerm_email_communication_service" "email_service" {
  name                = "email-service"
  resource_group_name = var.rg_name
  data_location       = "United States"
}

resource "azurerm_email_communication_service_domain" "email_domain" {
  name              = var.domain_name
  email_service_id  = azurerm_email_communication_service.email_service.id
  domain_management = "CustomerManaged"
}

resource "azurerm_dns_txt_record" "email_txt" {
  name                = var.domain_name
  resource_group_name = var.rg_name
  zone_name           = var.domain_name
  ttl                 = azurerm_email_communication_service_domain.email_domain.verification_records[0].domain[0].ttl

  record {
    value = azurerm_email_communication_service_domain.email_domain.verification_records[0].domain[0].value
  }

  record {
    value = azurerm_email_communication_service_domain.email_domain.verification_records[0].spf[0].value
  }
}

resource "azurerm_dns_cname_record" "email_dkim" {
  name                = azurerm_email_communication_service_domain.email_domain.verification_records[0].dkim[0].name
  resource_group_name = var.rg_name
  zone_name           = var.domain_name
  ttl                 = azurerm_email_communication_service_domain.email_domain.verification_records[0].dkim[0].ttl
  record              = azurerm_email_communication_service_domain.email_domain.verification_records[0].dkim[0].value
}

resource "azurerm_dns_cname_record" "email_dkim2" {
  name                = azurerm_email_communication_service_domain.email_domain.verification_records[0].dkim2[0].name
  resource_group_name = var.rg_name
  zone_name           = var.domain_name
  ttl                 = azurerm_email_communication_service_domain.email_domain.verification_records[0].dkim2[0].ttl
  record              = azurerm_email_communication_service_domain.email_domain.verification_records[0].dkim2[0].value
}


