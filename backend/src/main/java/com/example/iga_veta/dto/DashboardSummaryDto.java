package com.example.iga_veta.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryDto(
        BigDecimal totalIncome,
        long totalTransactions,
        List<ServiceSummaryDto> topServices,
        List<CenterSummaryDto> topCenters,
        List<CenterSummaryDto> bottomCenters,
        List<RecentPaymentDto> recentPayments
) {}
