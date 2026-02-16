package com.example.iga_veta.Controller;

import com.example.iga_veta.Service.DashboardService;
import com.example.iga_veta.Service.ReportService;
import com.example.iga_veta.dto.*;
import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Repository.CollectionRepository;
import com.example.iga_veta.Service.CollectionService;
import com.example.iga_veta.dto.CollectionsReportResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/collections")
public class CollectionController {

    @Autowired
    private CollectionService collectionDataService;

    @Autowired
    private CollectionRepository collectionRepository;

    @Autowired
    private ApiUsageRepository apiUsageRepository;

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private ReportService reportService;

    @PostMapping("/storeCollection")
    public String storeCollection() {
        trackUsage("/save", "POST");
        collectionDataService.fetchDataFromApi();
        return "Collections fetched and stored successfully!";
    }

    // ✅ helper: read string from Map with multiple key options
    private String readFirst(Map<String, Object> body, String... keys) {
        for (String k : keys) {
            Object v = body.get(k);
            if (v != null) {
                String s = v.toString().trim();
                if (!s.isEmpty() && !"null".equalsIgnoreCase(s)) return s;
            }
        }
        return null;
    }

    @PostMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(@RequestBody Map<String, Object> body) {

        System.out.println("SUMMARY BODY: " + body);

        String fromDateStr = readFirst(body, "fromDate");
        String toDateStr   = readFirst(body, "toDate");

        // ✅ support both keys (frontend sometimes sends centreName / zoneName too)
        String centre = readFirst(body, "centre", "centreName", "center");
        String zone   = readFirst(body, "zone", "zoneName");

        if (fromDateStr == null || toDateStr == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "fromDate and toDate are required (YYYY-MM-DD)"
            ));
        }

        LocalDate fromDate = LocalDate.parse(fromDateStr); // expects YYYY-MM-DD
        LocalDate toDate   = LocalDate.parse(toDateStr);

        // ✅ NEW: pass zone into service (this is what fixes Amount + Transactions)
        return ResponseEntity.ok(dashboardService.summary(fromDate, toDate, centre, zone));
    }

    @PostMapping("/report")
    public ResponseEntity<CollectionsReportResponse> report(@RequestBody CollectionsReportRequest req) {
        int page = req.getPage() == null ? 0 : req.getPage();
        int size = req.getSize() == null ? 10 : req.getSize();

        CollectionsReportResponse out = reportService.collectionsReport(
                req.getFromDate(),
                req.getToDate(),
                req.getCentre(),
                req.getZone(),
                req.getServiceCode(),
                page,
                size
        );

        return ResponseEntity.ok(out);
    }

    @GetMapping("/get")
    public List<Collections> getCollections() {
        return collectionDataService.findAll();
    }

    @GetMapping("/getByDate")
    public ResponseEntity<List<Collections>> getCollections(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        trackUsage("/get_by_date", "GET");

        List<Collections> collections = collectionRepository.findByDateBetween(
                fromDate.atStartOfDay(),
                toDate.atTime(23, 59, 59)
        );
        return ResponseEntity.ok(collections);
    }

    @GetMapping("/get-all")
    public Map<String, Object> getCollectionsByDTO() {
        trackUsage("/get_all", "GET");

        List<Collections> collections = collectionDataService.findAllData();
        return Map.of(
                "count", collections.size(),
                "data", collections
        );
    }

    @GetMapping("/get-by-centre/{name}")
    public ResponseEntity<List<Collections>> getByCentreName(@PathVariable("name") String name) {
        trackUsage("/by-centre", "GET");
        return ResponseEntity.ok(collectionDataService.findAllByCentre_Name(name));
    }

    @GetMapping("/by-gfs_code/{code}")
    public ResponseEntity<List<Collections>> getByGfsCode(@PathVariable("code") String code) {
        trackUsage("/BY-gfs_code", "GET");
        return ResponseEntity.ok(collectionDataService.findAllByGfsCode_Name(code));
    }

    @GetMapping("/totalAmount-by-gfs_code/{code}")
    public ResponseEntity<BigDecimal> getTotalAmountByGfsCode(@PathVariable("code") String code) {
        trackUsage("/totalAmount-by-centreAnd-gfs_code", "GET");
        return ResponseEntity.ok(collectionDataService.findTotalAmountByGfsCode_Name(code));
    }

    @PostMapping("/totalAmount-by-centreAnd-gfs_code")
    public ResponseEntity<BigDecimal> getTotalAmountByCentreAndGfsCode(@RequestBody Map<String, String> body) {
        trackUsage("/totalAmount-by-centreAnd-gfs_code", "GET");

        String code = body.get("gfs_code");
        String centre_name = body.get("centre_name");

        return ResponseEntity.ok(collectionDataService.getTotalAmountByCentreAndGfsCode(centre_name, code));
    }

    private void trackUsage(String endpoint, String method) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/api/collections" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }
}
