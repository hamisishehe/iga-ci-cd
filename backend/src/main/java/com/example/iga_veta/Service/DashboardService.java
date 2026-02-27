package com.example.iga_veta.Service;

import com.example.iga_veta.Repository.PaymentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
public class DashboardService {

    private final PaymentRepository repo;

    public DashboardService(PaymentRepository repo) {
        this.repo = repo;
    }

    private static BigDecimal toBigDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(String.valueOf(v)); }
        catch (Exception e) { return BigDecimal.ZERO; }
    }

    private static long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(String.valueOf(v)); }
        catch (Exception e) { return 0L; }
    }

    private static String toStr(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static String clean(String v) {
        if (v == null) return null;
        String s = v.trim();
        return s.isEmpty() ? null : s;
    }

    private static String firstNonBlank(String a, String b) {
        a = clean(a);
        if (a != null) return a;
        return clean(b);
    }

    public Map<String, Object> summary(
            LocalDate fromDate,
            LocalDate toDate,
            String centreName,
            String zoneName
    ) {
        centreName = clean(centreName);
        zoneName = clean(zoneName);

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();

        // totals -> [sumBilled, count, sumPaid]
        List<Object[]> totalsRows = repo.totals(start, endExclusive, centreName, zoneName);
        Object[] totalsRow = (totalsRows != null && !totalsRows.isEmpty()) ? totalsRows.get(0) : null;

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        long totalTransactions = 0;

        if (totalsRow != null) {
            totalIncome = toBigDecimal(totalsRow.length > 0 ? totalsRow[0] : null);
            totalTransactions = toLong(totalsRow.length > 1 ? totalsRow[1] : null);
            totalPaid = toBigDecimal(totalsRow.length > 2 ? totalsRow[2] : null);
        }

        // top services (paymentType)
        List<Object[]> topServicesRows =
                repo.topPaymentTypes(start, endExclusive, centreName, zoneName, PageRequest.of(0, 3));

        List<Map<String, Object>> topServices = new ArrayList<>();
        for (Object[] r : topServicesRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("serviceCode", null);
            m.put("service", toStr(r != null && r.length > 0 ? r[0] : null));
            m.put("total", toBigDecimal(r != null && r.length > 1 ? r[1] : null));
            topServices.add(m);
        }

        // top/bottom centers CURRENT MONTH
        YearMonth ym = YearMonth.now();
        LocalDateTime monthStart = ym.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Object[]> topCentersRows =
                repo.topCenters(monthStart, monthEnd, centreName, zoneName, PageRequest.of(0, 3));

        List<Object[]> bottomCentersRows =
                repo.bottomCenters(monthStart, monthEnd, centreName, zoneName, PageRequest.of(0, 3));

        List<Map<String, Object>> topCenters = new ArrayList<>();
        for (Object[] r : topCentersRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("center", toStr(r != null && r.length > 0 ? r[0] : null));
            m.put("total", toBigDecimal(r != null && r.length > 1 ? r[1] : null));
            topCenters.add(m);
        }

        List<Map<String, Object>> bottomCenters = new ArrayList<>();
        for (Object[] r : bottomCentersRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("center", toStr(r != null && r.length > 0 ? r[0] : null));
            m.put("total", toBigDecimal(r != null && r.length > 1 ? r[1] : null));
            bottomCenters.add(m);
        }

        // recent payments -> [name, centre, zone, paymentType, totalBilled, totalPaid, paymentDate]
        List<Object[]> recentRows =
                repo.recentPayments(start, endExclusive, centreName, zoneName, PageRequest.of(0, 8));

        List<Map<String, Object>> recentPayments = new ArrayList<>();
        for (Object[] r : recentRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name",   toStr(r != null && r.length > 0 ? r[0] : null));
            m.put("center", toStr(r != null && r.length > 1 ? r[1] : null));
            m.put("zone",   toStr(r != null && r.length > 2 ? r[2] : null));

            m.put("serviceCode", null);
            m.put("service", toStr(r != null && r.length > 3 ? r[3] : null));

            // ✅ billed + paid
            m.put("amount", toBigDecimal(r != null && r.length > 4 ? r[4] : null));
            m.put("paid",   toBigDecimal(r != null && r.length > 5 ? r[5] : null));

            m.put("datePaid", r != null && r.length > 6 ? r[6] : null);

            recentPayments.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalIncome", totalIncome);
        out.put("totalPaid", totalPaid); // ✅
        out.put("totalTransactions", totalTransactions);
        out.put("topServices", topServices);
        out.put("topCenters", topCenters);
        out.put("bottomCenters", bottomCenters);
        out.put("recentPayments", recentPayments);

        return out;
    }

    public Map<String, Object> summary(
            LocalDate fromDate,
            LocalDate toDate,
            String centreName,
            String zone,
            String zoneName
    ) {
        String z = firstNonBlank(zone, zoneName);
        return summary(fromDate, toDate, centreName, z);
    }
}