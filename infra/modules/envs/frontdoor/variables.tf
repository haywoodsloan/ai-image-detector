variable "rg_name" {
  type        = string
  description = "The name of the resource group to deploy the function app to"
}

variable "function_hostnames" {
  type        = map(string)
  description = "The hostnames of the regional functions"
}
