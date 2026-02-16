package com.example.iga_veta.Service;

import com.example.iga_veta.Repository.CollectionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
public class DashboardService {

    private final CollectionRepository repo;

    public DashboardService(CollectionRepository repo) {
        this.repo = repo;
    }

    // ---- helpers (safe casting) ----
    private static BigDecimal toBigDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue()); // OK for display
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private static long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return 0L;
        }
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

    /**
     * ✅ FULL FIXED SUMMARY
     * - Adds zoneName filtering
     * - Applies centre+zone filters to totals, topServices, topCenters, bottomCenters, recentPayments
     * - recentPayments now filters by date range (previously it was GLOBAL)
     */
    public Map<String, Object> summary(
            LocalDate fromDate,
            LocalDate toDate,
            String centreName,
            String zoneName
    ) {
        // ✅ inclusive start, exclusive end
        centreName = clean(centreName);
        zoneName = clean(zoneName);

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();

        // ✅ totals() -> [sum(amountBilled), count]
        List<Object[]> totalsRows = repo.totals(start, endExclusive, centreName, zoneName);
        Object[] totalsRow = (totalsRows != null && !totalsRows.isEmpty()) ? totalsRows.get(0) : null;

        BigDecimal totalIncome = BigDecimal.ZERO;
        long totalTransactions = 0;

        if (totalsRow != null) {
            totalIncome = toBigDecimal(totalsRow.length > 0 ? totalsRow[0] : null);
            totalTransactions = toLong(totalsRow.length > 1 ? totalsRow[1] : null);
        }

        // ✅ top services (3) for selected range + centre + zone
        List<Object[]> topServicesRows =
                repo.topServices(start, endExclusive, centreName, zoneName, PageRequest.of(0, 3));

        List<Map<String, Object>> topServices = new ArrayList<>();
        for (Object[] r : topServicesRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("serviceCode", toStr(r != null && r.length > 0 ? r[0] : null));
            m.put("service", toStr(r != null && r.length > 1 ? r[1] : null));
            m.put("total", toBigDecimal(r != null && r.length > 2 ? r[2] : null));
            topServices.add(m);
        }

        // ✅ centers (top/bottom) — CURRENT MONTH but still must respect centre+zone scope
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

        // ✅ recent payments (8) — NOW FILTERED BY RANGE + centre + zone
        List<Object[]> recentRows =
                repo.recentPayments(start, endExclusive, centreName, zoneName, PageRequest.of(0, 8));

        List<Map<String, Object>> recentPayments = new ArrayList<>();
        for (Object[] r : recentRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", toStr(r != null && r.length > 0 ? r[0] : null));
            m.put("center", toStr(r != null && r.length > 1 ? r[1] : null));
            m.put("zone", toStr(r != null && r.length > 2 ? r[2] : null));
            m.put("serviceCode", toStr(r != null && r.length > 3 ? r[3] : null));
            m.put("service", toStr(r != null && r.length > 4 ? r[4] : null));
            m.put("amount", toBigDecimal(r != null && r.length > 5 ? r[5] : null));
            m.put("datePaid", r != null && r.length > 6 ? r[6] : null);
            recentPayments.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalIncome", totalIncome);
        out.put("totalTransactions", totalTransactions);
        out.put("topServices", topServices);
        out.put("topCenters", topCenters);
        out.put("bottomCenters", bottomCenters);
        out.put("recentPayments", recentPayments);

        // ✅ debug
        System.out.println("CENTRE PARAM = [" + centreName + "]");
        System.out.println("ZONE PARAM   = [" + zoneName + "]");
        System.out.println("TOTALS ROW   = " + java.util.Arrays.deepToString(totalsRow));
        System.out.println("START=" + start + " END=" + endExclusive);

        return out;
    }

    /**
     * ✅ Convenience overload: if controller sends zone or zoneName separately.
     * Use this if you want to keep old controller call style.
     */
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
