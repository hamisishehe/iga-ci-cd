package com.example.iga_veta.Service;

import com.example.iga_veta.Repository.PaymentRepository;
import com.example.iga_veta.Repository.projections.PaymentRowView;
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

    private final PaymentRepository repo;

    public ReportService(PaymentRepository repo) {
        this.repo = repo;
    }

    public CollectionsReportResponse collectionsReport(
            LocalDate fromDate,
            LocalDate toDate,
            String centre,
            String zone,
            String serviceCode, // ✅ NOW means gfsCode.code
            int page,
            int size
    ) {
        centre = (centre == null || centre.isBlank()) ? null : centre;
        zone = (zone == null || zone.isBlank()) ? null : zone;
        serviceCode = (serviceCode == null || serviceCode.isBlank()) ? null : serviceCode;

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime endExclusive = toDate.plusDays(1).atStartOfDay();

        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "paymentDate")
        );

        TotalsView tv = repo.totalsView(start, endExclusive, centre, zone, serviceCode);
        BigDecimal totalIncome = (tv != null && tv.getTotalIncome() != null) ? tv.getTotalIncome() : BigDecimal.ZERO;
        BigDecimal totalPaid = (tv != null && tv.getTotalPaid() != null) ? tv.getTotalPaid() : BigDecimal.ZERO;
        long totalTx = (tv != null && tv.getTotalTransactions() != null) ? tv.getTotalTransactions() : 0L;

        Page<PaymentRowView> rowsPage = repo.reportRows(start, endExclusive, centre, zone, serviceCode, pageable);

        List<ServiceSummaryView> byService = repo.summaryByService(start, endExclusive, centre, zone, serviceCode);

        BigDecimal totalAmount = repo.totalAmount(start, endExclusive, centre, zone, serviceCode);
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;

        List<String> centres = repo.centreOptions();
        List<String> zones = repo.zoneOptions();

        List<ServiceOptionDto> services = new ArrayList<>();
        for (Object[] r : repo.serviceOptions()) {
            String code = (r != null && r.length > 0) ? String.valueOf(r[0]) : null;
            String desc = (r != null && r.length > 1) ? String.valueOf(r[1]) : null;
            if (code != null && desc != null) services.add(new ServiceOptionDto(code, desc));
        }

        CollectionsReportResponse out = new CollectionsReportResponse();
        out.setTotalIncome(totalIncome);
        out.setTotalPaid(totalPaid);
        out.setTotalTransactions(totalTx);

        out.setPage(rowsPage.getNumber());
        out.setSize(rowsPage.getSize());
        out.setTotalElements(rowsPage.getTotalElements());
        out.setTotalPages(rowsPage.getTotalPages());

        out.setRows(rowsPage.getContent());
        out.setSummaryByService(byService);
        out.setTotalAmount(totalAmount);

        out.setCentres(centres);
        out.setZones(zones);
        out.setServices(services);

        return out;
    }
}