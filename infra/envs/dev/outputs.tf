output "api_endpoint" {
  value = "https://${local.domain_name}/api"
}

output "dns_nameservers" {
  value = module.dns.domain_ns
}
