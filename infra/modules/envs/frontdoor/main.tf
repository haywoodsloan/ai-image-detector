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
}

resource "azurerm_cdn_frontdoor_origin" "origin" {
  for_each                       = var.function_hostnames
  name                           = "origin-${each.key}"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.origin_group.id
  host_name                      = each.value
  certificate_name_check_enabled = true
  enabled                        = true
}

resource "azurerm_cdn_frontdoor_route" "route_all" {
  name                          = "route-all"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.endpoint.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.origin_group.id
  cdn_frontdoor_origin_ids      = values(azurerm_cdn_frontdoor_origin.origin)[*].id
  supported_protocols           = ["Https", "Http"]
  https_redirect_enabled        = true
  patterns_to_match             = ["/*"]
}
