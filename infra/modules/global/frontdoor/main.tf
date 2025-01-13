
locals {
  sub_domain = "api"
  host_name  = "${local.sub_domain}.${var.domain_name}"
}

resource "time_rotating" "dev_key_refresh" {
  count           = var.env_name != "prod" ? 1 : 0
  rotation_months = 1
}

resource "time_rotating" "secondary_dev_key_refresh" {
  count           = var.env_name != "prod" ? 1 : 0
  rotation_months = 1
}

resource "random_bytes" "dev_key" {
  count   = var.env_name != "prod" ? 1 : 0
  keepers = { refresh = time_rotating.dev_key_refresh[0].id }
  length  = 128
}

resource "random_bytes" "secondary_dev_key" {
  count   = var.env_name != "prod" ? 1 : 0
  keepers = { refresh = time_rotating.secondary_dev_key_refresh[0].id }
  length  = 128
}

locals {
  dev_keys = var.env_name != "prod" ? [random_bytes.dev_key[0].base64, random_bytes.secondary_dev_key[0].base64] : []
}

resource "azurerm_cdn_frontdoor_profile" "frontdoor" {
  name                = "frontdoor"
  resource_group_name = var.rg_name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_origin_group" "origin_group" {
  name                     = "function-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
  load_balancing {}
}

resource "azurerm_cdn_frontdoor_endpoint" "endpoint" {
  name                     = "ai-image-detector-${var.env_name}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
  enabled                  = true
}

resource "azurerm_cdn_frontdoor_origin" "origin" {
  for_each                       = var.function_hostnames
  name                           = "origin-${each.key}"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.origin_group.id
  host_name                      = each.value
  certificate_name_check_enabled = true
  enabled                        = true
}

resource "azurerm_cdn_frontdoor_custom_domain" "custom_domain" {
  name                     = "custom-domain"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
  host_name                = local.host_name
  tls {}
}

resource "azurerm_cdn_frontdoor_firewall_policy" "firewall_policy" {
  name                = "firewall"
  resource_group_name = var.rg_name

  enabled  = true
  sku_name = "Standard_AzureFrontDoor"
  mode     = "Prevention"

  custom_rule {
    name     = "AuthLimitShort"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 1

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 3

    match_condition {
      match_variable = "RequestUri"
      operator       = "RegEx"
      match_values   = ["(?i)\\/auth"]
    }

    match_condition {
      match_variable = "RequestMethod"
      match_values   = ["POST"]
      operator       = "Equal"
    }
  }
  custom_rule {
    name     = "AuthLimitLong"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 2

    rate_limit_duration_in_minutes = 60
    rate_limit_threshold           = 15

    match_condition {
      match_variable = "RequestUri"
      operator       = "RegEx"
      match_values   = ["(?i)\\/auth"]
    }

    match_condition {
      match_variable = "RequestMethod"
      match_values   = ["POST"]
      operator       = "Equal"
    }
  }

  custom_rule {
    name     = "ImageVoteLimitShort"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 3

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 10

    match_condition {
      match_variable = "RequestUri"
      operator       = "RegEx"
      match_values   = ["(?i)\\/imageVote"]
    }

    match_condition {
      match_variable = "RequestMethod"
      match_values   = ["POST"]
      operator       = "Equal"
    }
  }

  custom_rule {
    name     = "ImageVoteLimitLong"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 4

    rate_limit_duration_in_minutes = 60
    rate_limit_threshold           = 50

    match_condition {
      match_variable = "RequestUri"
      operator       = "RegEx"
      match_values   = ["(?i)\\/imageVote"]
    }

    match_condition {
      match_variable = "RequestMethod"
      match_values   = ["POST"]
      operator       = "Equal"
    }
  }

  custom_rule {
    name     = "ImageAnalyzeLimitShort"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 5

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 15

    match_condition {
      match_variable = "RequestUri"
      operator       = "RegEx"
      match_values   = ["(?i)\\/imageAnalysis"]
    }

    match_condition {
      match_variable = "RequestMethod"
      match_values   = ["POST"]
      operator       = "Equal"
    }
  }

  custom_rule {
    name     = "ImageAnalyzeLimitLong"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 6

    rate_limit_duration_in_minutes = 60
    rate_limit_threshold           = 100

    match_condition {
      match_variable = "RequestUri"
      operator       = "RegEx"
      match_values   = ["(?i)\\/imageAnalysis"]
    }

    match_condition {
      match_variable = "RequestMethod"
      match_values   = ["POST"]
      operator       = "Equal"
    }
  }

  custom_rule {
    name     = "DefaultLimit"
    action   = "Block"
    type     = "RateLimitRule"
    priority = 3

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100

    match_condition {
      match_variable = "RequestUri"
      operator       = "Any"
      match_values   = []
    }
  }

  dynamic "custom_rule" {
    for_each = var.env_name != "prod" ? [1] : []
    content {
      name     = "BlockIfMissingKey"
      action   = "Block"
      type     = "MatchRule"
      priority = 4

      match_condition {
        match_variable     = "RequestHeader"
        match_values       = local.dev_keys
        negation_condition = true
        selector           = "X-Dev-Key"
        operator           = "Equal"
      }

      match_condition {
        match_variable     = "RequestMethod"
        match_values       = ["OPTIONS"]
        negation_condition = true
        operator           = "Equal"
      }

      match_condition {
        match_variable     = "RequestUri"
        match_values       = ["(?i)\\/verifyAuth"]
        negation_condition = true
        operator           = "RegEx"
      }
    }
  }
}

resource "azurerm_cdn_frontdoor_security_policy" "security_policy" {
  name                     = "security-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.firewall_policy.id

      association {
        patterns_to_match = ["/*"]

        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.custom_domain.id
        }
      }
    }
  }
}

resource "azurerm_cdn_frontdoor_rule_set" "default" {
  name                     = "default"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.frontdoor.id
}

resource "azurerm_cdn_frontdoor_rule" "url_rewrite" {
  depends_on = [azurerm_cdn_frontdoor_origin.origin, azurerm_cdn_frontdoor_origin_group.origin_group]

  name                      = "UrlRewrite"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.default.id
  order                     = 1

  actions {
    url_rewrite_action {
      source_pattern          = "/"
      destination             = "/api/"
      preserve_unmatched_path = true
    }
  }
}

resource "azurerm_cdn_frontdoor_rule" "preflight_headers" {
  count      = var.env_name != "prod" ? 1 : 0
  depends_on = [azurerm_cdn_frontdoor_origin.origin, azurerm_cdn_frontdoor_origin_group.origin_group]

  name                      = "PreflightHeaders"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.default.id
  order                     = 2

  conditions {
    request_method_condition {
      operator     = "Equal"
      match_values = ["OPTIONS"]
    }
  }

  actions {
    response_header_action {
      header_action = "Append"
      header_name   = "Access-Control-Allow-Headers"
      value         = ",X-Dev-Key"
    }
  }
}

resource "azurerm_cdn_frontdoor_route" "default" {
  name                            = "default"
  cdn_frontdoor_endpoint_id       = azurerm_cdn_frontdoor_endpoint.endpoint.id
  cdn_frontdoor_origin_group_id   = azurerm_cdn_frontdoor_origin_group.origin_group.id
  cdn_frontdoor_origin_ids        = values(azurerm_cdn_frontdoor_origin.origin)[*].id
  cdn_frontdoor_custom_domain_ids = [azurerm_cdn_frontdoor_custom_domain.custom_domain.id]
  cdn_frontdoor_rule_set_ids      = [azurerm_cdn_frontdoor_rule_set.default.id]
  link_to_default_domain          = false
  supported_protocols             = ["Https", "Http"]
  https_redirect_enabled          = true
  patterns_to_match               = ["/*"]
  enabled                         = true
}
resource "azurerm_dns_cname_record" "frontdoor_cname" {
  depends_on          = [azurerm_cdn_frontdoor_route.default]
  name                = local.sub_domain
  zone_name           = var.domain_name
  resource_group_name = var.rg_name
  ttl                 = 3600
  record              = azurerm_cdn_frontdoor_endpoint.endpoint.host_name
}

resource "azurerm_dns_txt_record" "frontdoor_txt" {
  name                = "_dnsauth.${local.sub_domain}"
  zone_name           = var.domain_name
  resource_group_name = var.rg_name
  ttl                 = 3600

  record {
    value = azurerm_cdn_frontdoor_custom_domain.custom_domain.validation_token
  }
}

resource "time_sleep" "wait_for_records" {
  create_duration = "60s"
  triggers = {
    cname_id = azurerm_dns_cname_record.frontdoor_cname.id
    txt_id   = azurerm_dns_txt_record.frontdoor_txt.id
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "custom_domain_association" {
  depends_on                     = [time_sleep.wait_for_records]
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.custom_domain.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.default.id]
}
