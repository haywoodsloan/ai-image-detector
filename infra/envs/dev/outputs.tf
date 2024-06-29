output "api_endpoint" {
  value = "https://${module.frontdoor.api_subdomain}.${local.domain_name}"
}

output "dns_nameservers" {
  value = module.dns.domain_ns
}

output "dev_keys" {
  sensitive = true
  value     = module.frontdoor.dev_keys
}
