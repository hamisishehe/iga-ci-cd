package com.example.iga_veta.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RecentPaymentDto(
        String customerName,
        String center,
        String zone,
        String serviceCode,
        String service,
        BigDecimal amount,
        LocalDateTime date
) {}
