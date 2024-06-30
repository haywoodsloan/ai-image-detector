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

output "db_connection_strings" {
  sensitive = true
  value     = [module.db.connection_string, module.db.secondary_connection_string]
}

output "comm_endpoint" {
  value = module.comm.comm_service_endpoint
}

output "pubsub_hostnames" {
  value = zipmap(keys(module.region), values(module.region)[*].pubsub_hostname)
}
