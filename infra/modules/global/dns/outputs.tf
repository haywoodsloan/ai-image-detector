output "domain_ns" {
  value = azurerm_dns_zone.dns.name_servers
}

output "dns_zone_id" {
  value = azurerm_dns_zone.dns.id
}
