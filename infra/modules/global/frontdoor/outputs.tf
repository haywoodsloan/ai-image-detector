output "frontdoor_guid" {
  value = azurerm_cdn_frontdoor_profile.frontdoor.resource_guid
}

output "dev_keys" {
  sensitive = true
  value     = local.dev_keys
}
