output "function_hostnames" {
  value = zipmap(keys(module.region), values(module.region)[*].function_hostname)
}
