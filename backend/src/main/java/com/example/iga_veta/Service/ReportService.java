package com.example.iga_veta.Service;

import com.example.iga_veta.Repository.CollectionRepository;
import com.example.iga_veta.Repository.CollectionRowView;
import com.example.iga_veta.Repository.projections.ServiceSummaryView;
import com.example.iga_veta.Repository.projections.TotalsView;
import com.example.iga_veta.dto.CollectionsReportResponse;
import com.example.iga_veta.dto.ServiceOptionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReportService {

    private final CollectionRepository repo;

    public ReportService(CollectionRepository repo) {
        this.repo = repo;
    }

    public CollectionsReportResponse collectionsReport(
            LocalDate fromDate,
            LocalDate toDate,
            String centre,
            String zone,
            String serviceCode,
            int page,
            int size
    ) {
        // normalize blanks -> null
        centre = (centre == null || centre.isBlank()) ? null : centre;
        zone = (zone == null || zone.isBlank()) ? null : zone;
        serviceCode = (serviceCode == null || serviceCode.isBlank()) ? null : serviceCode;

        // inclusive start, exclusive end
        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();

        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "date")
        );

        // totals with filters
        TotalsView tv = repo.totalsView(start, endExclusive, centre, zone, serviceCode);
        BigDecimal totalIncome = (tv != null && tv.getTotalIncome() != null) ? tv.getTotalIncome() : BigDecimal.ZERO;
        long totalTx = (tv != null && tv.getTotalTransactions() != null) ? tv.getTotalTransactions() : 0L;

        // rows
        Page<CollectionRowView> rowsPage = repo.reportRows(start, endExclusive, centre, zone, serviceCode, pageable);

        // summary by service (for bottom table + dropdown)
        List<ServiceSummaryView> byService = repo.summaryByService(start, endExclusive, centre, zone);

        // exact total amount matching filters
        BigDecimal totalAmount = repo.totalAmount(start, endExclusive, centre, zone, serviceCode);
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;

        // options: centres, zones, services
        List<String> centres = repo.centreOptions();
        List<String> zones = repo.zoneOptions();

        List<ServiceOptionDto> services = new ArrayList<>();
        for (Object[] r : repo.serviceOptions()) {
            String code = r != null && r.length > 0 ? String.valueOf(r[0]) : null;
            String desc = r != null && r.length > 1 ? String.valueOf(r[1]) : null;
            if (code != null && desc != null) services.add(new ServiceOptionDto(code, desc));
        }

        CollectionsReportResponse out = new CollectionsReportResponse();
        out.setTotalIncome(totalIncome);
        out.setTotalTransactions(totalTx);

        out.setPage(rowsPage.getNumber());
        out.setSize(rowsPage.getSize());
        out.setTotalElements(rowsPage.getTotalElements());
        out.setTotalPages(rowsPage.getTotalPages());

        out.setRows(rowsPage.getContent());
        out.setSummaryByService(byService);
        out.setTotalAmount(totalAmount);

        // ✅ include options in same endpoint
        out.setCentres(centres);
        out.setZones(zones);
        out.setServices(services);

        return out;
    }
}
