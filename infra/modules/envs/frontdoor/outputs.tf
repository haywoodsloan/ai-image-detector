output "frontdoor_guid" {
  value = azurerm_cdn_frontdoor_profile.frontdoor.resource_guid
}

output "api_subdomain" {
  value = local.sub_domain
}

output "dev_keys" {
  sensitive = true
  value = [random_bytes.dev_key[0].base64, random_bytes.secondary_dev_key[0].base64]
}
