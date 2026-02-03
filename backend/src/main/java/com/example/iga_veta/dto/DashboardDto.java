package com.example.iga_veta.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class DashboardDto {

    public record ServiceSummary(
            String serviceCode,
            String service,
            BigDecimal total
    ) {}

    public record CenterSummary(
            String center,
            BigDecimal total
    ) {}

    public record RecentPayment(
            String customerName,
            String center,
            String zone,
            String serviceCode,
            String service,
            BigDecimal amount,
            LocalDateTime date
    ) {}

    public record Response(
            BigDecimal totalIncome,
            long totalTransactions,
            List<ServiceSummary> topServices,
            List<CenterSummary> topCenters,
            List<CenterSummary> bottomCenters,
            List<RecentPayment> recentPayments
    ) {}
}
