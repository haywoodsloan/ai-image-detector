output "functions" {
  sensitive = true
  value = zipmap(keys(module.region), [
    for outputs in values(module.region) : {
      hostname = outputs.function_hostname
      key     = outputs.function_keys.default_function_key
    }
  ])
}
