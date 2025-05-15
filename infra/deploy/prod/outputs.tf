output "api_endpoint" {
  value = "https://${module.frontdoor.api_subdomain}.${local.domain_name}"
}

output "inference_endpoint" {
  value = "https://${module.function.function_hostname}/api/invoke"
}

output "inference_key" {
  sensitive = true
  value     = module.function.function_key
}

output "dns_nameservers" {
  value = module.dns.domain_ns
}

output "dev_keys" {
  sensitive = true
  value     = module.frontdoor.dev_keys
}

output "sub_id" {
  value = data.azurerm_subscription.current.subscription_id
}

output "db_name" {
  value = module.db.db_name
}

output "db_rg_name" {
  value = module.rg.env_rg_name
}

output "comm_endpoint" {
  value = module.comm.comm_service_endpoint
}

output "pubsub_hostnames" {
  value = { for name, region in module.region : name => region.pubsub_hostname }
}
