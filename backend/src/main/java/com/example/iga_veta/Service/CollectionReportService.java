package com.example.iga_veta.Service;

import com.example.iga_veta.Repository.CollectionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CollectionReportService {

    private final CollectionRepository repo;

    public CollectionReportService(CollectionRepository repo) {
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
    private static String emptyToNull(String s) {
        if (s == null) return null;
        s = s.trim();
        return s.isEmpty() ? null : s;
    }

    public Map<String, Object> report(LocalDate fromDate, LocalDate toDate,
                                      String centre, String zone, String service,
                                      int page, int size) {

        centre = emptyToNull(centre);
        zone = emptyToNull(zone);
        service = emptyToNull(service);

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();

        var pageable = org.springframework.data.domain.PageRequest.of(page, size);

        var rowsPage = repo.reportRows(start, endExclusive, centre, zone, service, pageable);

        // totals
        var totalsRows = repo.reportTotals(start, endExclusive, centre, zone, service);
        Object[] totals = (!totalsRows.isEmpty() ? totalsRows.get(0) : null);

        BigDecimal totalAmount = totals == null ? BigDecimal.ZERO : toBigDecimal(totals[0]);
        long totalRows = totals == null ? 0L : toLong(totals[1]);

        // summary by service
        List<Map<String, Object>> summaryByService = new ArrayList<>();
        for (Object[] r : repo.reportSummaryByService(start, endExclusive, centre, zone, service)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("serviceCode", String.valueOf(r[0]));
            m.put("service", String.valueOf(r[1]));
            m.put("total", toBigDecimal(r[2]));
            summaryByService.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("rows", rowsPage.getContent());
        out.put("page", page);
        out.put("size", size);
        out.put("totalRows", totalRows);
        out.put("totalAmount", totalAmount);
        out.put("summaryByService", summaryByService);
        return out;
    }
}
