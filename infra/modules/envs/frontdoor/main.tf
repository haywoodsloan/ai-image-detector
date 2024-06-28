resource "azurerm_cdn_frontdoor_profile" "frontdoor" {
  name                = "frontdoor"
  resource_group_name = var.rg_name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_origin_group" "origin_group" {
  name                     = "function-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
  load_balancing {}
}

resource "azurerm_cdn_frontdoor_endpoint" "endpoint" {
  name                     = "ai-image-detector"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
  enabled                  = true
}

locals {
  sub_domain = "api"
  host_name  = "${local.sub_domain}.${var.domain_name}"
}

resource "azurerm_cdn_frontdoor_origin" "origin" {
  for_each                       = var.function_hostnames
  name                           = "origin-${each.key}"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.origin_group.id
  host_name                      = each.value
  certificate_name_check_enabled = false
  enabled                        = true
}

resource "azurerm_cdn_frontdoor_custom_domain" "custom_domain" {
  name                     = "custom-domain"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
  host_name                = local.host_name
  tls {}
}

resource "azurerm_cdn_frontdoor_rule_set" "default" {
  name                     = "default"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
}

resource "azurerm_cdn_frontdoor_rule" "name" {
  name                      = "urlRewrite"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.default.id
  order                     = 1

  actions {
    url_rewrite_action {
      source_pattern          = "/"
      destination             = "/api/"
      preserve_unmatched_path = true
    }
  }
}

resource "azurerm_cdn_frontdoor_route" "default" {
  name                            = "default"
  cdn_frontdoor_endpoint_id       = azurerm_cdn_frontdoor_endpoint.endpoint.id
  cdn_frontdoor_origin_group_id   = azurerm_cdn_frontdoor_origin_group.origin_group.id
  cdn_frontdoor_origin_ids        = values(azurerm_cdn_frontdoor_origin.origin)[*].id
  cdn_frontdoor_custom_domain_ids = [azurerm_cdn_frontdoor_custom_domain.custom_domain.id]
  cdn_frontdoor_rule_set_ids      = [azurerm_cdn_frontdoor_rule_set.default.id]
  supported_protocols             = ["Https", "Http"]
  https_redirect_enabled          = true
  patterns_to_match               = ["/*"]
  enabled                         = true
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "custom_domain_association" {
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.custom_domain.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.default.id]
}

resource "azurerm_dns_cname_record" "frontdoor_cname" {
  depends_on          = [azurerm_cdn_frontdoor_route.default]
  name                = local.sub_domain
  zone_name           = var.domain_name
  resource_group_name = var.rg_name
  ttl                 = 3600
  record              = azurerm_cdn_frontdoor_endpoint.endpoint.host_name
}

resource "azurerm_dns_txt_record" "frontdoor_txt" {
  name                = "_dnsauth.${local.sub_domain}"
  zone_name           = var.domain_name
  resource_group_name = var.rg_name
  ttl                 = 3600

  record {
    value = azurerm_cdn_frontdoor_custom_domain.custom_domain.validation_token
  }
}
