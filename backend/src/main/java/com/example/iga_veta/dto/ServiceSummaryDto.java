package com.example.iga_veta.dto;

import java.math.BigDecimal;

public record ServiceSummaryDto(
        String serviceCode,
        String service,
        BigDecimal total
) {}
