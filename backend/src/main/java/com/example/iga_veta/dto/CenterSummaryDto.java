package com.example.iga_veta.dto;

import java.math.BigDecimal;

public record CenterSummaryDto(
        String center,
        BigDecimal total
) {}
