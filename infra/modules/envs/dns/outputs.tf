output "domain_name" {
  value = azurerm_dns_zone.dns.name
}

output "domain_ns" {
  value = azurerm_dns_zone.dns.name_servers
}