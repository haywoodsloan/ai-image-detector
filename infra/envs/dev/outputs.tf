output "api_endpoint" {
  value = "https://${module.frontdoor.api_subdomain}.${local.domain_name}"
}

output "function_slot_hostnames" {
  value = {
    for name, region in module.region : name => region.function_slot_hostname
    if region.function_slot_hostname != null
  }
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
  value = zipmap(keys(module.region), values(module.region)[*].pubsub_hostname)
}
