output "frontdoor_guid" {
  value = azurerm_cdn_frontdoor_profile.frontdoor.resource_guid
}

output "api_subdomain" {
  value = local.sub_domain
}

output "dev_keys" {
  sensitive = true
  value     = local.dev_keys
}
